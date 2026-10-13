import { describe, it, expect } from 'vitest';
import { buildPrintHtml, displayAddress, isLocalHost, normalizeSiteUrl } from '../scripts/qr-lib.js';

describe('isLocalHost', () => {
  it('розпізнає локальні адреси й не чіпає публічні', () => {
    for (const h of [
      'localhost',
      '127.0.0.1',
      '192.168.1.50',
      '10.0.0.5',
      '172.20.1.1',
      'nas.local',
      '[::1]',
    ]) {
      expect(isLocalHost(h)).toBe(true);
    }
    for (const h of ['kava.example.com', '8.8.8.8', '172.32.0.1']) {
      expect(isLocalHost(h)).toBe(false);
    }
  });
});

describe('normalizeSiteUrl', () => {
  it('приймає https-адресу без попереджень', () => {
    expect(normalizeSiteUrl('https://kava.example.com')).toEqual({
      ok: true,
      url: 'https://kava.example.com/',
      warnings: [],
    });
  });
  it('прибирає #-фрагмент і зберігає шлях', () => {
    expect(normalizeSiteUrl('https://example.com/barista/#top').url).toBe('https://example.com/barista/');
  });
  it('порожнє значення: помилка', () => {
    expect(normalizeSiteUrl('').ok).toBe(false);
    expect(normalizeSiteUrl(undefined).ok).toBe(false);
  });
  it('без протоколу або з чужою схемою: помилка', () => {
    expect(normalizeSiteUrl('kava.example.com').ok).toBe(false);
    expect(normalizeSiteUrl('ftp://example.com').ok).toBe(false);
    expect(normalizeSiteUrl('javascript:alert(1)').ok).toBe(false);
  });
  it('http на публічному домені: попередження про HTTPS', () => {
    const r = normalizeSiteUrl('http://kava.example.com');
    expect(r.ok).toBe(true);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain('HTTPS');
  });
  it('локальна адреса: одне попередження про публічний домен', () => {
    const r = normalizeSiteUrl('http://192.168.1.50:3000');
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain('локальна');
  });
});

describe('displayAddress', () => {
  it('без протоколу та кінцевого слеша', () => {
    expect(displayAddress('https://kava.example.com/')).toBe('kava.example.com');
    expect(displayAddress('https://example.com/barista/')).toBe('example.com/barista');
  });
});

describe('buildPrintHtml', () => {
  const base = { qrSvg: '<svg id="qr"></svg>', url: 'https://kava.example.com/' };

  it('містить QR, заголовок і адресу', () => {
    const html = buildPrintHtml(base);
    expect(html).toContain('<svg id="qr"></svg>');
    expect(html).toContain('Налий собі кави');
    expect(html).toContain('kava.example.com');
    expect(html).toContain('size: A6');
  });
  it('екранує заголовок', () => {
    const html = buildPrintHtml({ ...base, title: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
  it('showUrl: false прибирає адресу', () => {
    expect(buildPrintHtml({ ...base, showUrl: false })).not.toContain('class="url"');
  });
});
