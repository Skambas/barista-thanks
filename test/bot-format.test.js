import { describe, it, expect } from 'vitest';
import { formatListPage, shorten } from '../server/bot.js';

describe('shorten', () => {
  it('ріже по символах, разом із "…" вкладається в ліміт', () => {
    expect(shorten('привіт', 10)).toBe('привіт');
    expect(shorten('привіт світ', 6)).toBe('приві…');
    expect(shorten('😀😀😀😀', 3)).toBe('😀😀…');
  });
});

describe('formatListPage', () => {
  it('позначає вимкнені та золоті фрази й показує сторінку', () => {
    const text = formatListPage({
      items: [
        { id: 1, text: 'Перша', rare: false, active: true },
        { id: 2, text: 'Друга', rare: true, active: false },
      ],
      total: 2,
      activeCount: 1,
      page: 1,
      pages: 1,
    });
    expect(text).toContain('#1 ✅ Перша');
    expect(text).toContain('#2 ⏸ ✨ Друга');
    expect(text).toContain('Сторінка 1/1');
  });
  it('порожній список: підказка', () => {
    expect(formatListPage({ items: [], total: 0, activeCount: 0, page: 1, pages: 1 })).toContain(
      'Фраз поки немає',
    );
  });
});
