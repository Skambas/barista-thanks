/** Чиста логіка для назви закладу та Instagram. Спільна для сервера й фронтенду. */

export const MAX_NAME_LEN = 40;

/** Назва закладу: без керуючих символів і спуфінгу, пробіли стиснуті, довжина обмежена. */
export function cleanName(raw) {
  if (typeof raw !== 'string') return '';
  const s = raw
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(s).slice(0, MAX_NAME_LEN).join('').trim();
}

/** "@hygge.te", "hygge.te" або посилання instagram.com/hygge.te → "hygge.te". Некоректне → ''. */
export function parseInstagram(raw) {
  const s = String(raw ?? '')
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(s) ? s : '';
}
