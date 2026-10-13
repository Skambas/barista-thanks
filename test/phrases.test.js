import { describe, it, expect } from 'vitest';
import { shuffle, normalizePhrases, sizeClass, createPicker } from '../src/phrases.js';

const texts = (n) => Array.from({ length: n }, (_, i) => `фраза ${i}`);

describe('shuffle', () => {
  it('зберігає елементи і не мутує вхід', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src);
    expect([...out].sort()).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('normalizePhrases', () => {
  it('приймає рядки та об’єкти, чистить пробіли, відкидає сміття', () => {
    const out = normalizePhrases([
      '  Дякую   тобі ',
      { text: 'Золота', rare: true },
      '',
      '   ',
      42,
      null,
      {},
    ]);
    expect(out).toEqual([
      { text: 'Дякую тобі', rare: false },
      { text: 'Золота', rare: true },
    ]);
  });
  it('не масив: порожній результат', () => {
    expect(normalizePhrases(null)).toEqual([]);
    expect(normalizePhrases({})).toEqual([]);
  });
});

describe('sizeClass', () => {
  it('межі довжини', () => {
    expect(sizeClass('x'.repeat(80))).toBe('');
    expect(sizeClass('x'.repeat(81))).toBe('mid');
    expect(sizeClass('x'.repeat(131))).toBe('long');
  });
});

describe('createPicker', () => {
  it('без повторів у межах кола', () => {
    const p = createPicker(texts(6), { rng: Math.random });
    const got = Array.from({ length: 6 }, () => p.next().text);
    expect(new Set(got).size).toBe(6);
  });

  it('не повторює фразу на стику кіл', () => {
    for (let run = 0; run < 100; run++) {
      const p = createPicker(texts(3));
      const got = Array.from({ length: 12 }, () => p.next().text);
      for (let i = 1; i < got.length; i++) expect(got[i]).not.toBe(got[i - 1]);
    }
  });

  it('золота фраза випадає, коли rng нижче шансу, і не випадає інакше', () => {
    const list = [{ text: 'звичайна' }, { text: 'золота', rare: true }];
    expect(createPicker(list, { rng: () => 0 }).next().text).toBe('золота');
    expect(createPicker(list, { rng: () => 0.99 }).next().text).toBe('звичайна');
  });

  it('якщо є лише золоті, показує їх', () => {
    const p = createPicker([{ text: 'a', rare: true }], { rng: () => 0.99 });
    expect(p.next().text).toBe('a');
  });

  it('відновлює стан із seen', () => {
    const p = createPicker(['a', 'b', 'c'], { seen: ['a', 'b'] });
    expect(p.next().text).toBe('c');
  });

  it('порожній список: null', () => {
    expect(createPicker([]).next()).toBeNull();
  });
});
