// ─── Pure functions (exported for testing) ───────────────────────────────────

const CONN_LABELS = {
  DHCP: 'ETH DHCP',
  FIJA: 'ETH IP fija',
  WIFI: 'WiFi',
  '4G':  'Chip 4G',
  NONE: 'Ninguna',
};

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

export function getRequiredFields(primaryConn, secondaryConn) {
  const base = ['empresa', 'nombre', 'apellido', 'email', 'provincia', 'ciudad'];
  const fields = [...base];
  if (primaryConn === 'FIJA') fields.push('ip', 'mascara', 'gateway');
  if (primaryConn === 'WIFI') fields.push('ssid', 'wifi-pass');
  if (secondaryConn === 'FIJA') fields.push('ip-sec', 'mascara-sec', 'gateway-sec');
  if (secondaryConn === 'WIFI') fields.push('ssid-sec', 'wifi-pass-sec');
  return fields;
}

export function buildPayload(fields, primaryConn, secondaryConn) {
  const payload = {
    access_key: '63c641c8-5ae6-4cf9-9a50-0f1a2ef3c50b',
    subject: `Alta de cliente — ${fields.empresa}`,
    from_name: 'WeDo IoT Onboarding',
    Empresa: fields.empresa,
    Nombre: `${fields.nombre} ${fields.apellido}`.trim(),
    Email: fields.email,
    Provincia: fields.provincia,
    Ciudad: fields.ciudad,
    'Conexión primaria': CONN_LABELS[primaryConn] || primaryConn,
  };
  if (fields.telefono) payload['Teléfono'] = fields.telefono;

  if (primaryConn === 'FIJA') {
    payload['IP primaria']      = fields.ip;
    payload['Máscara primaria'] = fields.mascara;
    payload['Gateway primaria'] = fields.gateway;
  }
  if (primaryConn === 'WIFI') {
    payload['SSID primaria']            = fields.ssid;
    payload['Contraseña WiFi primaria'] = fields['wifi-pass'];
  }

  if (secondaryConn && secondaryConn !== 'NONE') {
    payload['Conexión secundaria'] = CONN_LABELS[secondaryConn] || secondaryConn;
    if (secondaryConn === 'FIJA') {
      payload['IP secundaria']      = fields['ip-sec'];
      payload['Máscara secundaria'] = fields['mascara-sec'];
      payload['Gateway secundaria'] = fields['gateway-sec'];
    }
    if (secondaryConn === 'WIFI') {
      payload['SSID secundaria']            = fields['ssid-sec'];
      payload['Contraseña WiFi secundaria'] = fields['wifi-pass-sec'];
    }
  }

  return payload;
}

// ─── DOM (browser only) ──────────────────────────────────────────────────────

const IP_FIELDS = ['ip', 'mascara', 'gateway', 'ip-sec', 'mascara-sec', 'gateway-sec'];
const PW_FIELDS = ['wifi-pass', 'wifi-pass-sec'];
const STORAGE_KEY = 'wedo_onboarding_draft_v2';
const SAVEABLE_FIELDS = [
  'empresa', 'nombre', 'apellido', 'email', 'telefono', 'provincia', 'ciudad',
  'ip', 'mascara', 'gateway', 'ssid',
  'ip-sec', 'mascara-sec', 'gateway-sec', 'ssid-sec',
];

let primaryConn = null;
let secondaryConn = 'NONE';

function saveDraft() {
  const draft = { primaryConn, secondaryConn };
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
    if (draft.primaryConn) setConn('primary', draft.primaryConn);
    if (draft.secondaryConn) setConn('secondary', draft.secondaryConn);
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

function setConn(kind, type) {
  if (kind === 'primary') primaryConn = type;
  else secondaryConn = type;

  const tabsEl = document.getElementById(`${kind}-tabs`);
  tabsEl.querySelectorAll('.conn-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.conn === type)
  );

  const suffix = kind === 'primary' ? '' : '-sec';
  document.getElementById(`ip-fields${suffix}`).style.display   = type === 'FIJA' ? 'block' : 'none';
  document.getElementById(`wifi-fields${suffix}`).style.display = type === 'WIFI' ? 'block' : 'none';
}

function togglePw(inputId, btnId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? 'ver' : 'ocultar';
}

async function submitForm() {
  const primaryTabs = document.getElementById('primary-tabs');
  let ok = true;

  if (!primaryConn) {
    primaryTabs.style.outline = '1.5px solid #E24B4A';
    primaryTabs.style.borderRadius = 'var(--border-radius-md)';
    ok = false;
  } else {
    primaryTabs.style.outline = '';
  }

  const required = getRequiredFields(primaryConn, secondaryConn);

  required.forEach(id => {
    const el = document.getElementById(id);
    const v = PW_FIELDS.includes(id) ? el.value.trim() : sanitizeText(el.value);
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
  if (primaryConn === 'FIJA') {
    fields.ip      = g('ip');
    fields.mascara = g('mascara');
    fields.gateway = g('gateway');
  }
  if (primaryConn === 'WIFI') {
    fields.ssid         = g('ssid');
    fields['wifi-pass'] = document.getElementById('wifi-pass').value;
  }
  if (secondaryConn === 'FIJA') {
    fields['ip-sec']      = g('ip-sec');
    fields['mascara-sec'] = g('mascara-sec');
    fields['gateway-sec'] = g('gateway-sec');
  }
  if (secondaryConn === 'WIFI') {
    fields['ssid-sec']      = g('ssid-sec');
    fields['wifi-pass-sec'] = document.getElementById('wifi-pass-sec').value;
  }

  const payload = buildPayload(fields, primaryConn, secondaryConn);

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
  document.getElementById('primary-tabs').querySelectorAll('.conn-tab').forEach(tab =>
    tab.addEventListener('click', () => {
      setConn('primary', tab.dataset.conn);
      document.getElementById('primary-tabs').style.outline = '';
      saveDraft();
    })
  );
  document.getElementById('secondary-tabs').querySelectorAll('.conn-tab').forEach(tab =>
    tab.addEventListener('click', () => {
      setConn('secondary', tab.dataset.conn);
      saveDraft();
    })
  );

  document.getElementById('pw-btn').addEventListener('click', () => togglePw('wifi-pass', 'pw-btn'));
  document.getElementById('pw-btn-sec').addEventListener('click', () => togglePw('wifi-pass-sec', 'pw-btn-sec'));
  document.getElementById('submit-btn').addEventListener('click', submitForm);

  SAVEABLE_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', saveDraft);
  });

  restoreDraft();
}
