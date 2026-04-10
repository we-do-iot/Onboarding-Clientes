// ─── Pure functions (exported for testing) ───────────────────────────────────

export function sanitizeText(str) {
  return String(str).trim().replace(/<[^>]*>/g, '');
}

export function validateEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

export function validateIP(str) {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(str)) return false;
  return str.split('.').every(n => {
    const num = Number(n);
    return Number.isInteger(num) && num >= 0 && num <= 255;
  });
}

export function getRequiredFields(connType) {
  const base = ['empresa', 'nombre', 'apellido', 'email', 'provincia', 'ciudad'];
  if (connType === 'FIJA') return [...base, 'ip', 'mascara', 'gateway'];
  if (connType === 'WIFI') return [...base, 'ssid', 'wifi-pass'];
  return base;
}

export function buildPayload(fields, connType) {
  const payload = {
    access_key: '63c641c8-5ae6-4cf9-9a50-0f1a2ef3c50b',
    subject: `Alta de cliente — ${fields.empresa}`,
    from_name: 'WeDo IoT Onboarding',
    Empresa: fields.empresa,
    Nombre: `${fields.nombre} ${fields.apellido}`.trim(),
    Email: fields.email,
    Provincia: fields.provincia,
    Ciudad: fields.ciudad,
    'Tipo de conexión': connType,
  };
  if (fields.telefono) payload['Teléfono'] = fields.telefono;
  if (connType === 'FIJA') {
    payload['IP'] = fields.ip;
    payload['Máscara'] = fields.mascara;
    payload['Gateway'] = fields.gateway;
  }
  if (connType === 'WIFI') {
    payload['SSID'] = fields.ssid;
    payload['Contraseña WiFi'] = fields['wifi-pass'];
  }
  return payload;
}

// ─── DOM (browser only) ──────────────────────────────────────────────────────

const IP_FIELDS = ['ip', 'mascara', 'gateway'];
const STORAGE_KEY = 'wedo_onboarding_draft';
const SAVEABLE_FIELDS = ['empresa', 'nombre', 'apellido', 'email', 'telefono', 'provincia', 'ciudad', 'ip', 'mascara', 'gateway', 'ssid'];
let currentConn = 'DHCP';

function saveDraft() {
  const draft = { conn: currentConn };
  SAVEABLE_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) draft[id] = el.value;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

function restoreDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const draft = JSON.parse(raw);
    SAVEABLE_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el && draft[id]) el.value = draft[id];
    });
    if (draft.conn) setConn(draft.conn);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

function mark(id, ok) {
  const el = document.getElementById(id);
  if (el) el.style.borderColor = ok ? '' : '#E24B4A';
}

function setConn(type) {
  currentConn = type;
  document.querySelectorAll('.conn-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.conn === type)
  );
  document.getElementById('ip-fields').style.display = type === 'FIJA' ? 'block' : 'none';
  document.getElementById('wifi-fields').style.display = type === 'WIFI' ? 'block' : 'none';
}

function togglePw() {
  const inp = document.getElementById('wifi-pass');
  const btn = document.getElementById('pw-btn');
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? 'ver' : 'ocultar';
}

async function submitForm() {
  const required = getRequiredFields(currentConn);
  let ok = true;

  required.forEach(id => {
    const el = document.getElementById(id);
    const v = id === 'wifi-pass' ? el.value.trim() : sanitizeText(el.value);
    let valid;
    if (id === 'email') {
      valid = validateEmail(v);
    } else if (IP_FIELDS.includes(id)) {
      valid = validateIP(v);
    } else {
      valid = v.length > 0;
    }
    mark(id, valid);
    if (!valid) ok = false;
  });

  const errorMsg = document.getElementById('error-msg');
  if (!ok) {
    errorMsg.classList.add('visible');
    return;
  }
  errorMsg.classList.remove('visible');

  const g = id => sanitizeText(document.getElementById(id).value);

  const fields = {
    empresa:   g('empresa'),
    nombre:    g('nombre'),
    apellido:  g('apellido'),
    email:     g('email'),
    telefono:  g('telefono'),
    provincia: g('provincia'),
    ciudad:    g('ciudad'),
  };
  if (currentConn === 'FIJA') {
    fields.ip      = g('ip');
    fields.mascara = g('mascara');
    fields.gateway = g('gateway');
  }
  if (currentConn === 'WIFI') {
    fields.ssid        = g('ssid');
    fields['wifi-pass'] = document.getElementById('wifi-pass').value;
  }

  const payload = buildPayload(fields, currentConn);

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      clearDraft();
      document.getElementById('email-confirm').textContent = fields.email;
      document.getElementById('form-body').style.display = 'none';
      document.getElementById('success-box').style.display = 'block';
    } else {
      btn.disabled = false;
      btn.textContent = 'Enviar alta de cliente';
      alert('Hubo un error al enviar el formulario. Por favor intentá nuevamente.');
    }
  } catch {
    btn.disabled = false;
    btn.textContent = 'Enviar alta de cliente';
    alert('Error de conexión. Por favor verificá tu red e intentá nuevamente.');
  }
}

// ─── Event listeners (browser only) ──────────────────────────────────────────

if (typeof document !== 'undefined') {
  document.querySelectorAll('.conn-tab').forEach(tab =>
    tab.addEventListener('click', () => { setConn(tab.dataset.conn); saveDraft(); })
  );
  document.getElementById('pw-btn').addEventListener('click', togglePw);
  document.getElementById('submit-btn').addEventListener('click', submitForm);

  SAVEABLE_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', saveDraft);
  });

  restoreDraft();
}
