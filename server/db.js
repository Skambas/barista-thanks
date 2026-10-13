import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { validatePhrase } from './validate.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS phrases (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  text       TEXT    NOT NULL,
  text_key   TEXT    NOT NULL UNIQUE,
  rare       INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

const toPhrase = (row) =>
  row ? { id: row.id, text: row.text, rare: Boolean(row.rare), active: Boolean(row.active) } : null;

/** Сховище фраз. Для тестів: openStore(':memory:'). */
export function openStore(file = ':memory:') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);

  const q = {
    insert: db.prepare('INSERT INTO phrases (text, text_key, rare) VALUES (?, ?, ?)'),
    idByKey: db.prepare('SELECT id FROM phrases WHERE text_key = ?'),
    byId: db.prepare('SELECT id, text, rare, active FROM phrases WHERE id = ?'),
    active: db.prepare('SELECT id, text, rare FROM phrases WHERE active = 1 ORDER BY id'),
    page: db.prepare('SELECT id, text, rare, active FROM phrases ORDER BY id LIMIT ? OFFSET ?'),
    counts: db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(active), 0) AS active FROM phrases'),
    random: db.prepare(
      'SELECT id, text, rare, active FROM phrases WHERE active = 1 ORDER BY RANDOM() LIMIT 1',
    ),
    delete: db.prepare('DELETE FROM phrases WHERE id = ?'),
    setActive: db.prepare('UPDATE phrases SET active = ? WHERE id = ?'),
    setRare: db.prepare('UPDATE phrases SET rare = ? WHERE id = ?'),
    getMeta: db.prepare('SELECT value FROM meta WHERE key = ?'),
    setMeta: db.prepare(
      'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    ),
  };

  function get(id) {
    return toPhrase(q.byId.get(id));
  }

  /** { ok: true, phrase } або { ok: false, error, ... } (див. validatePhrase, плюс 'duplicate'). */
  function add(raw, { rare = false } = {}) {
    const v = validatePhrase(raw);
    if (!v.ok) return v;
    try {
      const { lastInsertRowid } = q.insert.run(v.text, v.key, rare ? 1 : 0);
      return { ok: true, phrase: get(Number(lastInsertRowid)) };
    } catch (err) {
      if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return { ok: false, error: 'duplicate', existingId: q.idByKey.get(v.key)?.id };
      }
      throw err;
    }
  }

  return {
    add,
    get,

    /** Для публічного API: лише активні. */
    listActive() {
      return q.active.all().map(({ id, text, rare }) => ({ id, text, rare: Boolean(rare) }));
    },

    /** Для бота: усі фрази, по сторінках. Номер сторінки обмежується допустимим діапазоном. */
    listPage(page = 1, pageSize = 8) {
      const { total, active } = q.counts.get();
      const pages = Math.max(1, Math.ceil(total / pageSize));
      const p = Math.min(Math.max(1, Math.trunc(page) || 1), pages);
      const items = q.page.all(pageSize, (p - 1) * pageSize).map(toPhrase);
      return { items, total, activeCount: active, page: p, pages };
    },

    stats() {
      const { total, active } = q.counts.get();
      return { total, active };
    },

    random() {
      return toPhrase(q.random.get());
    },

    /** Повертає видалену фразу або null, якщо такого id немає. */
    remove(id) {
      const phrase = get(id);
      if (!phrase) return null;
      q.delete.run(id);
      return phrase;
    },

    setActive(id, active) {
      const phrase = get(id);
      if (!phrase) return null;
      q.setActive.run(active ? 1 : 0, id);
      return { ...phrase, active: Boolean(active) };
    },

    toggleRare(id) {
      const phrase = get(id);
      if (!phrase) return null;
      const rare = !phrase.rare;
      q.setRare.run(rare ? 1 : 0, id);
      return { ...phrase, rare };
    },

    /** Імпорт стартових фраз: лише раз за життя бази. Повертає кількість доданих. */
    seed(items) {
      if (q.getMeta.get('seeded')) return 0;
      let added = 0;
      db.transaction(() => {
        for (const item of items) {
          const text = typeof item === 'string' ? item : item?.text;
          if (add(text, { rare: item?.rare === true }).ok) added++;
        }
        q.setMeta.run('seeded', '1');
      })();
      return added;
    },

    close() {
      db.close();
    },
  };
}
