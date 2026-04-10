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

  it('returns base fields for DHCP', () => {
    const fields = getRequiredFields('DHCP');
    base.forEach(f => expect(fields).toContain(f));
    expect(fields).not.toContain('ip');
    expect(fields).not.toContain('ssid');
  });

  it('includes IP fields for FIJA', () => {
    const fields = getRequiredFields('FIJA');
    base.forEach(f => expect(fields).toContain(f));
    expect(fields).toContain('ip');
    expect(fields).toContain('mascara');
    expect(fields).toContain('gateway');
    expect(fields).not.toContain('ssid');
  });

  it('includes WiFi fields for WIFI', () => {
    const fields = getRequiredFields('WIFI');
    base.forEach(f => expect(fields).toContain(f));
    expect(fields).toContain('ssid');
    expect(fields).toContain('wifi-pass');
    expect(fields).not.toContain('ip');
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

  it('maps fields correctly for DHCP', () => {
    const p = buildPayload(base, 'DHCP');
    expect(p.Empresa).toBe('Acme S.A.');
    expect(p.Nombre).toBe('Juan Pérez');
    expect(p.Email).toBe('juan@acme.com');
    expect(p.Provincia).toBe('Buenos Aires');
    expect(p.Ciudad).toBe('Mar del Plata');
    expect(p['Tipo de conexión']).toBe('DHCP');
  });

  it('omits Teléfono when empty', () => {
    const p = buildPayload(base, 'DHCP');
    expect(p).not.toHaveProperty('Teléfono');
  });

  it('includes Teléfono when provided', () => {
    const p = buildPayload({ ...base, telefono: '+54 11 1234-5678' }, 'DHCP');
    expect(p['Teléfono']).toBe('+54 11 1234-5678');
  });

  it('includes IP fields for FIJA', () => {
    const p = buildPayload({ ...base, ip: '192.168.1.100', mascara: '255.255.255.0', gateway: '192.168.1.1' }, 'FIJA');
    expect(p['IP']).toBe('192.168.1.100');
    expect(p['Máscara']).toBe('255.255.255.0');
    expect(p['Gateway']).toBe('192.168.1.1');
  });

  it('does not include IP fields for DHCP', () => {
    const p = buildPayload(base, 'DHCP');
    expect(p).not.toHaveProperty('IP');
    expect(p).not.toHaveProperty('Máscara');
  });

  it('includes WiFi fields for WIFI', () => {
    const p = buildPayload({ ...base, ssid: 'MiRed_2.4G', 'wifi-pass': 'secret123' }, 'WIFI');
    expect(p['SSID']).toBe('MiRed_2.4G');
    expect(p['Contraseña WiFi']).toBe('secret123');
  });

  it('sets subject with company name', () => {
    const p = buildPayload(base, 'DHCP');
    expect(p.subject).toBe('Alta de cliente — Acme S.A.');
  });
});
