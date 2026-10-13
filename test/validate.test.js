import { describe, it, expect } from 'vitest';
import { cleanText, normalizeKey, validatePhrase, parseId, MAX_LEN } from '../server/validate.js';

describe('cleanText', () => {
  it('стискає пробіли, переноси й керуючі символи', () => {
    expect(cleanText('  Дякую \n\n  вам\t😊 ')).toBe('Дякую вам 😊');
  });
  it('прибирає символи зміни напрямку тексту', () => {
    expect(cleanText('до\u202Eб\u202Cре')).toBe('добре');
  });
});

describe('normalizeKey', () => {
  it('ігнорує регістр, розділові знаки та смайлики', () => {
    expect(normalizeKey('Дякую! 🍪')).toBe(normalizeKey('дякую'));
    expect(normalizeKey("З'явився — ура")).toBe(normalizeKey('з’явився ура'));
  });
});

describe('validatePhrase', () => {
  it('нормальна фраза: повертає чистий текст і ключ', () => {
    expect(validatePhrase('  Дякую   вам! ')).toEqual({ ok: true, text: 'Дякую вам!', key: 'дякую вам' });
  });
  it('порожня', () => {
    expect(validatePhrase('   ')).toEqual({ ok: false, error: 'empty' });
  });
  it('самі смайлики', () => {
    expect(validatePhrase('🍪🍪 ☕')).toEqual({ ok: false, error: 'no_letters' });
  });
  it('межа довжини', () => {
    expect(validatePhrase('а'.repeat(MAX_LEN)).ok).toBe(true);
    expect(validatePhrase('а'.repeat(MAX_LEN + 1))).toMatchObject({
      ok: false,
      error: 'too_long',
      length: MAX_LEN + 1,
    });
  });
  it('не рядок', () => {
    expect(validatePhrase(42)).toEqual({ ok: false, error: 'not_text' });
    expect(validatePhrase(undefined)).toEqual({ ok: false, error: 'not_text' });
  });
});

describe('parseId', () => {
  it('приймає додатні цілі та #-префікс, решту відкидає', () => {
    expect(parseId('12')).toBe(12);
    expect(parseId(' #7 ')).toBe(7);
    for (const bad of ['0', '-3', 'abc', '12abc', '', undefined, '1234567890']) {
      expect(parseId(bad)).toBeNull();
    }
  });
});
