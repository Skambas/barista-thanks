import { describe, it, expect } from 'vitest';
import {
  loadConfig,
  parseAdminIds,
  parseHttpsUrl,
  parseSiteUrl,
  DEFAULT_SIGNATURE,
} from '../server/config.js';

describe('parseAdminIds', () => {
  it('розбирає список ID, некоректне складає окремо', () => {
    const { ids, invalid } = parseAdminIds('123, 456;789  abc -1 0');
    expect([...ids]).toEqual([123, 456, 789]);
    expect(invalid).toEqual(['abc', '-1', '0']);
  });
  it('порожнє значення: порожній набір', () => {
    expect(parseAdminIds(undefined).ids.size).toBe(0);
  });
});

describe('parseHttpsUrl', () => {
  it('лише https', () => {
    expect(parseHttpsUrl('https://send.monobank.ua/jar/abc')).toBe('https://send.monobank.ua/jar/abc');
    expect(parseHttpsUrl('http://send.monobank.ua/jar/abc')).toBe('');
    expect(parseHttpsUrl('javascript:alert(1)')).toBe('');
    expect(parseHttpsUrl('')).toBe('');
  });
});

describe('parseSiteUrl', () => {
  it('прибирає кінцевий слеш, приймає лише http(s)', () => {
    expect(parseSiteUrl('https://kava.example.com/')).toBe('https://kava.example.com');
    expect(parseSiteUrl('http://localhost:3000')).toBe('http://localhost:3000');
    expect(parseSiteUrl('ftp://x.com')).toBe('');
    expect(parseSiteUrl('не url')).toBe('');
  });
});

describe('loadConfig', () => {
  it('значення за замовчуванням і обрізання пробілів', () => {
    const cfg = loadConfig({ TELEGRAM_BOT_TOKEN: '  tok  ' });
    expect(cfg.port).toBe(3000);
    expect(cfg.signature).toBe(DEFAULT_SIGNATURE);
    expect(cfg.botToken).toBe('tok');
    expect(cfg.trustProxy).toBe(true);
    expect(cfg.adminIds.size).toBe(0);
  });
  it('некоректний PORT: повертається 3000; TRUST_PROXY=false вимикає довіру', () => {
    expect(loadConfig({ PORT: 'abc' }).port).toBe(3000);
    expect(loadConfig({ PORT: '8080', TRUST_PROXY: 'false' })).toMatchObject({
      port: 8080,
      trustProxy: false,
    });
  });
});
