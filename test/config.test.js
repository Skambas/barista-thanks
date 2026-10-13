import { describe, it, expect } from 'vitest';
import { parseJarUrl } from '../src/config.js';

describe('parseJarUrl', () => {
  it('приймає https-посилання на банку', () => {
    expect(parseJarUrl('https://send.monobank.ua/jar/abc123')).toBe('https://send.monobank.ua/jar/abc123');
  });
  it('відкидає небезпечні схеми та сміття', () => {
    expect(parseJarUrl('javascript:alert(1)')).toBe('');
    expect(parseJarUrl('http://send.monobank.ua/jar/abc')).toBe('');
    expect(parseJarUrl('не url')).toBe('');
  });
  it('порожнє значення або нерозпарсений плейсхолдер: порожньо', () => {
    expect(parseJarUrl('')).toBe('');
    expect(parseJarUrl(undefined)).toBe('');
    expect(parseJarUrl('{{MONOBANK_JAR_URL}}')).toBe('');
  });
});
