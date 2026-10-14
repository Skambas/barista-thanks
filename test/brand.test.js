import { describe, it, expect } from 'vitest';
import { cleanName, parseInstagram, MAX_NAME_LEN } from '../src/brand.js';
import { loadConfig } from '../server/config.js';
import { renderIndex } from '../server/html.js';

describe('cleanName', () => {
  it('стискає пробіли й переноси', () => {
    expect(cleanName('Хюґе')).toBe('Хюґе');
    expect(cleanName('  Хюґе \n  кафе ')).toBe('Хюґе кафе');
  });
  it('прибирає символи зміни напрямку тексту', () => {
    expect(cleanName('Хю\u202Eґе')).toBe('Хюґе');
  });
  it('обрізає до ліміту за символами', () => {
    expect(Array.from(cleanName('я'.repeat(MAX_NAME_LEN + 10)))).toHaveLength(MAX_NAME_LEN);
  });
  it('не рядок: порожньо', () => {
    expect(cleanName(undefined)).toBe('');
    expect(cleanName(42)).toBe('');
  });
});

describe('parseInstagram', () => {
  it('приймає нік із @, без @ і посилання', () => {
    expect(parseInstagram('@hygge.te')).toBe('hygge.te');
    expect(parseInstagram('hygge.te')).toBe('hygge.te');
    expect(parseInstagram('https://www.instagram.com/hygge.te/?hl=uk')).toBe('hygge.te');
  });
  it('відкидає некоректне', () => {
    for (const bad of ['', 'a b', '@@x', 'x'.repeat(31), '{{CAFE_INSTAGRAM}}', 'кава', undefined]) {
      expect(parseInstagram(bad)).toBe('');
    }
  });
});

describe('конфіг сервера', () => {
  it('читає та чистить CAFE_NAME і CAFE_INSTAGRAM', () => {
    const cfg = loadConfig({ CAFE_NAME: '  Хюґе ', CAFE_INSTAGRAM: '@hygge.te' });
    expect(cfg).toMatchObject({ cafeName: 'Хюґе', cafeInstagram: 'hygge.te' });
  });
  it('без змінних: порожньо', () => {
    expect(loadConfig({})).toMatchObject({ cafeName: '', cafeInstagram: '' });
  });
});

describe('renderIndex: бренд', () => {
  const template =
    '<html><head></head><body data-cafe-name="{{CAFE_NAME}}" data-cafe-instagram="{{CAFE_INSTAGRAM}}"></body></html>';
  it('підставляє й екранує значення', () => {
    const html = renderIndex(template, { cafeName: 'Хюґе', cafeInstagram: 'hygge.te' });
    expect(html).toContain('data-cafe-name="Хюґе"');
    expect(html).toContain('data-cafe-instagram="hygge.te"');
    expect(renderIndex(template, { cafeName: '<b>' })).toContain('data-cafe-name="&lt;b&gt;"');
    expect(html).not.toContain('{{');
  });
});
