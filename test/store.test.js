import { describe, it, expect } from 'vitest';
import { openStore } from '../server/db.js';

describe('store', () => {
  it('додає фразу й віддає її в активних', () => {
    const s = openStore();
    const res = s.add('Дякую вам');
    expect(res).toMatchObject({ ok: true, phrase: { id: 1, text: 'Дякую вам', rare: false, active: true } });
    expect(s.listActive()).toEqual([{ id: 1, text: 'Дякую вам', rare: false }]);
  });

  it('відсікає дублікати за нормалізованим ключем і називає номер існуючої', () => {
    const s = openStore();
    s.add('Дякую вам!');
    expect(s.add('  дякую   ВАМ 🍪')).toEqual({ ok: false, error: 'duplicate', existingId: 1 });
    expect(s.stats().total).toBe(1);
  });

  it('повертає помилку валідації без запису в базу', () => {
    const s = openStore();
    expect(s.add('🍪')).toMatchObject({ ok: false, error: 'no_letters' });
    expect(s.stats().total).toBe(0);
  });

  it('вимкнена фраза зникає з API, але лишається в базі', () => {
    const s = openStore();
    s.add('Перша фраза');
    s.add('Друга фраза');
    expect(s.setActive(1, false)).toMatchObject({ id: 1, active: false });
    expect(s.listActive().map((p) => p.id)).toEqual([2]);
    expect(s.stats()).toEqual({ total: 2, active: 1 });
    s.setActive(1, true);
    expect(s.listActive()).toHaveLength(2);
    expect(s.setActive(99, true)).toBeNull();
  });

  it('перемикає золотий статус', () => {
    const s = openStore();
    s.add('Золота фраза');
    expect(s.toggleRare(1)).toMatchObject({ rare: true });
    expect(s.listActive()[0].rare).toBe(true);
    expect(s.toggleRare(1)).toMatchObject({ rare: false });
    expect(s.toggleRare(99)).toBeNull();
  });

  it('видаляє й повертає видалену фразу', () => {
    const s = openStore();
    s.add('Тимчасова фраза');
    expect(s.remove(1)).toMatchObject({ id: 1, text: 'Тимчасова фраза' });
    expect(s.remove(1)).toBeNull();
    expect(s.listActive()).toEqual([]);
  });

  it('стартові фрази імпортуються один раз і не повертаються після видалення', () => {
    const s = openStore();
    expect(s.seed(['Перша', { text: 'Друга', rare: true }])).toBe(2);
    expect(s.listActive()).toEqual([
      { id: 1, text: 'Перша', rare: false },
      { id: 2, text: 'Друга', rare: true },
    ]);
    s.remove(1);
    expect(s.seed(['Перша', 'Третя'])).toBe(0);
    expect(s.listActive().map((p) => p.id)).toEqual([2]);
  });

  it('пагінація обмежує номер сторінки', () => {
    const s = openStore();
    for (let i = 1; i <= 5; i++) s.add(`Фраза номер ${'я'.repeat(i)}`);
    const first = s.listPage(1, 2);
    expect(first).toMatchObject({ total: 5, activeCount: 5, page: 1, pages: 3 });
    expect(first.items.map((p) => p.id)).toEqual([1, 2]);
    expect(s.listPage(99, 2)).toMatchObject({ page: 3 });
    expect(s.listPage(99, 2).items.map((p) => p.id)).toEqual([5]);
    expect(s.listPage(-4, 2).page).toBe(1);
  });

  it('random віддає лише активні, а якщо їх немає, null', () => {
    const s = openStore();
    expect(s.random()).toBeNull();
    s.add('Єдина активна');
    s.add('Вимкнена фраза');
    s.setActive(2, false);
    for (let i = 0; i < 20; i++) expect(s.random().id).toBe(1);
    s.setActive(1, false);
    expect(s.random()).toBeNull();
  });
});
