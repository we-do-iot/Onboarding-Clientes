import { describe, it, expect } from 'vitest';
import { sanitizeText, validateEmail, validateIP, getRequiredFields, buildPayload } from '../app.js';

// ─── sanitizeText ─────────────────────────────────────────────────────────────

describe('sanitizeText', () => {
  it('trims leading and trailing whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('strips script tags', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe('alert(1)');
  });

  it('strips arbitrary HTML tags', () => {
    expect(sanitizeText('<b>texto</b>')).toBe('texto');
    expect(sanitizeText('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('leaves plain text unchanged', () => {
    expect(sanitizeText('Acme S.A.')).toBe('Acme S.A.');
  });

  it('handles empty string', () => {
    expect(sanitizeText('')).toBe('');
  });
});

// ─── validateEmail ────────────────────────────────────────────────────────────

describe('validateEmail', () => {
  it('accepts standard emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user.name+tag@empresa.com.ar')).toBe(true);
  });

  it('rejects missing @', () => {
    expect(validateEmail('noatsign.com')).toBe(false);
  });

  it('rejects missing domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  it('rejects missing TLD', () => {
    expect(validateEmail('user@domain')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false);
  });
});

// ─── validateIP ───────────────────────────────────────────────────────────────

describe('validateIP', () => {
  it('accepts valid IPv4 addresses', () => {
    expect(validateIP('192.168.1.1')).toBe(true);
    expect(validateIP('10.0.0.1')).toBe(true);
    expect(validateIP('255.255.255.0')).toBe(true);
    expect(validateIP('0.0.0.0')).toBe(true);
  });

  it('rejects octets above 255', () => {
    expect(validateIP('256.0.0.1')).toBe(false);
    expect(validateIP('192.168.1.999')).toBe(false);
  });

  it('rejects incomplete addresses', () => {
    expect(validateIP('192.168.1')).toBe(false);
    expect(validateIP('192.168')).toBe(false);
  });

  it('rejects non-numeric input', () => {
    expect(validateIP('not-an-ip')).toBe(false);
    expect(validateIP('abc.def.ghi.jkl')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateIP('')).toBe(false);
  });
});

// ─── getRequiredFields ────────────────────────────────────────────────────────

describe('getRequiredFields', () => {
  const base = ['empresa', 'nombre', 'apellido', 'email', 'provincia', 'ciudad'];

  it('returns only base fields for DHCP primary + NONE secondary', () => {
    const fields = getRequiredFields('DHCP', 'NONE');
    base.forEach(f => expect(fields).toContain(f));
    expect(fields).not.toContain('ip');
    expect(fields).not.toContain('ssid');
  });

  it('returns only base fields for 4G primary + NONE secondary', () => {
    const fields = getRequiredFields('4G', 'NONE');
    expect(fields).toEqual(base);
  });

  it('includes primary IP fields for FIJA primary', () => {
    const fields = getRequiredFields('FIJA', 'NONE');
    expect(fields).toContain('ip');
    expect(fields).toContain('mascara');
    expect(fields).toContain('gateway');
    expect(fields).not.toContain('ip-sec');
  });

  it('includes primary WiFi fields for WIFI primary', () => {
    const fields = getRequiredFields('WIFI', 'NONE');
    expect(fields).toContain('ssid');
    expect(fields).toContain('wifi-pass');
  });

  it('includes secondary IP fields for FIJA secondary', () => {
    const fields = getRequiredFields('DHCP', 'FIJA');
    expect(fields).toContain('ip-sec');
    expect(fields).toContain('mascara-sec');
    expect(fields).toContain('gateway-sec');
    expect(fields).not.toContain('ip');
  });

  it('includes secondary WiFi fields for WIFI secondary', () => {
    const fields = getRequiredFields('DHCP', 'WIFI');
    expect(fields).toContain('ssid-sec');
    expect(fields).toContain('wifi-pass-sec');
  });

  it('combines primary and secondary required fields', () => {
    const fields = getRequiredFields('FIJA', 'WIFI');
    expect(fields).toContain('ip');
    expect(fields).toContain('ssid-sec');
    expect(fields).toContain('wifi-pass-sec');
  });

  it('adds no extra fields when secondary is 4G', () => {
    const fields = getRequiredFields('DHCP', '4G');
    expect(fields).toEqual(base);
  });
});

// ─── buildPayload ─────────────────────────────────────────────────────────────

describe('buildPayload', () => {
  const base = {
    empresa: 'Acme S.A.',
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan@acme.com',
    telefono: '',
    provincia: 'Buenos Aires',
    ciudad: 'Mar del Plata',
  };

  it('maps base fields correctly for DHCP primary', () => {
    const p = buildPayload(base, 'DHCP', 'NONE');
    expect(p.Empresa).toBe('Acme S.A.');
    expect(p.Nombre).toBe('Juan Pérez');
    expect(p.Email).toBe('juan@acme.com');
    expect(p['Conexión primaria']).toBe('ETH DHCP');
    expect(p).not.toHaveProperty('Conexión secundaria');
  });

  it('maps 4G primary with readable label', () => {
    const p = buildPayload(base, '4G', 'NONE');
    expect(p['Conexión primaria']).toBe('Chip 4G');
    expect(p).not.toHaveProperty('IP primaria');
  });

  it('omits Teléfono when empty', () => {
    const p = buildPayload(base, 'DHCP', 'NONE');
    expect(p).not.toHaveProperty('Teléfono');
  });

  it('includes Teléfono when provided', () => {
    const p = buildPayload({ ...base, telefono: '+54 11 1234-5678' }, 'DHCP', 'NONE');
    expect(p['Teléfono']).toBe('+54 11 1234-5678');
  });

  it('includes primary IP fields for FIJA primary', () => {
    const p = buildPayload({ ...base, ip: '192.168.1.100', mascara: '255.255.255.0', gateway: '192.168.1.1' }, 'FIJA', 'NONE');
    expect(p['IP primaria']).toBe('192.168.1.100');
    expect(p['Máscara primaria']).toBe('255.255.255.0');
    expect(p['Gateway primaria']).toBe('192.168.1.1');
  });

  it('includes primary WiFi fields for WIFI primary', () => {
    const p = buildPayload({ ...base, ssid: 'MiRed', 'wifi-pass': 'secret' }, 'WIFI', 'NONE');
    expect(p['SSID primaria']).toBe('MiRed');
    expect(p['Contraseña WiFi primaria']).toBe('secret');
  });

  it('omits secondary connection when NONE', () => {
    const p = buildPayload(base, 'DHCP', 'NONE');
    expect(p).not.toHaveProperty('Conexión secundaria');
    expect(p).not.toHaveProperty('IP secundaria');
    expect(p).not.toHaveProperty('SSID secundaria');
  });

  it('includes secondary label when set', () => {
    const p = buildPayload(base, 'DHCP', '4G');
    expect(p['Conexión secundaria']).toBe('Chip 4G');
  });

  it('includes secondary IP fields for FIJA secondary', () => {
    const p = buildPayload(
      { ...base, 'ip-sec': '10.0.0.1', 'mascara-sec': '255.255.255.0', 'gateway-sec': '10.0.0.254' },
      'DHCP', 'FIJA'
    );
    expect(p['IP secundaria']).toBe('10.0.0.1');
    expect(p['Máscara secundaria']).toBe('255.255.255.0');
    expect(p['Gateway secundaria']).toBe('10.0.0.254');
  });

  it('includes secondary WiFi fields for WIFI secondary', () => {
    const p = buildPayload(
      { ...base, 'ssid-sec': 'BackupRed', 'wifi-pass-sec': 'backuppwd' },
      '4G', 'WIFI'
    );
    expect(p['SSID secundaria']).toBe('BackupRed');
    expect(p['Contraseña WiFi secundaria']).toBe('backuppwd');
  });

  it('handles primary FIJA + secondary WIFI combo', () => {
    const p = buildPayload(
      {
        ...base,
        ip: '192.168.1.100', mascara: '255.255.255.0', gateway: '192.168.1.1',
        'ssid-sec': 'Backup', 'wifi-pass-sec': 'pwd',
      },
      'FIJA', 'WIFI'
    );
    expect(p['IP primaria']).toBe('192.168.1.100');
    expect(p['SSID secundaria']).toBe('Backup');
    expect(p['Conexión primaria']).toBe('ETH IP fija');
    expect(p['Conexión secundaria']).toBe('WiFi');
  });

  it('sets subject with company name', () => {
    const p = buildPayload(base, 'DHCP', 'NONE');
    expect(p.subject).toBe('Alta de cliente — Acme S.A.');
  });
});
