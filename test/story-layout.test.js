import { describe, it, expect } from 'vitest';
import { wrapText, balanceLines, fitText } from '../src/story-layout.js';

const m = (s) => s.length * 10; // кожен символ 10 px

describe('wrapText', () => {
  it('жадібний перенос по словах', () => {
    expect(wrapText('aa bb cc', 50, m)).toEqual(['aa bb', 'cc']);
  });
  it('слово ширше за рядок ріжеться за символами', () => {
    expect(wrapText('abcdefgh', 30, m)).toEqual(['abc', 'def', 'gh']);
  });
  it('порожній текст: без рядків', () => {
    expect(wrapText('   ', 100, m)).toEqual([]);
  });
});

describe('balanceLines', () => {
  it('та сама кількість рядків, але вужчий блок', () => {
    const text = 'aaaaaaaa b cc dd';
    const greedy = wrapText(text, 100, m);
    const balanced = balanceLines(text, 100, m);
    expect(balanced).toHaveLength(greedy.length);
    expect(Math.max(...balanced.map(m))).toBeLessThan(Math.max(...greedy.map(m)));
    expect(balanced).toEqual(['aaaaaaaa', 'b cc dd']);
  });
  it('один рядок лишається як є', () => {
    expect(balanceLines('aa bb', 200, m)).toEqual(['aa bb']);
  });
});

describe('fitText', () => {
  const measure = (s, size) => s.length * size * 0.5;
  const base = { maxWidth: 100, lineHeight: 1, maxSize: 40, minSize: 10, measure };

  it('бере найбільший розмір, при якому текст вміщується', () => {
    const r = fitText('aaaa bbbb', { ...base, maxHeight: 40 });
    expect(r.size).toBe(22);
    expect(r.lines).toHaveLength(1);
    expect(r.height).toBeLessThanOrEqual(40);
  });
  it('якщо нічого не вміщується, повертає мінімальний розмір', () => {
    const r = fitText('aaaa bbbb cccc dddd eeee', { ...base, maxHeight: 1 });
    expect(r.size).toBe(10);
  });
});
