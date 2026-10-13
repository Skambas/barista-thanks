/** Чиста логіка валідації фраз. Без залежностей. */

export const MAX_LEN = 300;

const BIDI = /[\u202A-\u202E\u2066-\u2069]/g; // керуючі символи напрямку тексту (спуфінг)
const CONTROL = /\p{Cc}/gu; // переноси рядків, табуляція тощо

/** Прибирає керуючі символи, зайві пробіли й переноси. Нерядок: порожній рядок. */
export function cleanText(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(BIDI, '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
}

/** Ключ для захисту від дублікатів: без регістру, розділових знаків і смайликів. */
export function normalizeKey(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function validatePhrase(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'not_text' };
  const text = cleanText(raw);
  if (!text) return { ok: false, error: 'empty' };
  const length = Array.from(text).length; // рахуємо символи, а не UTF-16 одиниці (емодзі)
  if (length > MAX_LEN) return { ok: false, error: 'too_long', length, max: MAX_LEN };
  const key = normalizeKey(text);
  if (!key) return { ok: false, error: 'no_letters' };
  return { ok: true, text, key };
}

/** "12" або "#12" → 12; усе інше → null. */
export function parseId(arg) {
  const s = String(arg ?? '')
    .trim()
    .replace(/^#/, '');
  if (!/^\d{1,9}$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}
