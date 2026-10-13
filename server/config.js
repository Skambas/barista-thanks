import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_SIGNATURE = '- Ваша бариста🦊 ☕';

/** Лише https. '' якщо URL порожній або непридатний (так само, як на фронтенді). */
export function parseHttpsUrl(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  try {
    const url = new URL(s);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

/** Адреса сайту для OG-тегів: http(s), без кінцевого слеша. */
export function parseSiteUrl(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  try {
    const url = new URL(s);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return url.origin + url.pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

/** "123, 456" → Set {123, 456}; усе нечислове потрапляє в invalid (для попередження в лог). */
export function parseAdminIds(raw) {
  const ids = new Set();
  const invalid = [];
  for (const part of String(raw ?? '')
    .split(/[\s,;]+/)
    .filter(Boolean)) {
    if (/^\d{1,15}$/.test(part) && Number(part) > 0) ids.add(Number(part));
    else invalid.push(part);
  }
  return { ids, invalid };
}

function parsePort(raw, fallback) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : fallback;
}

export function loadConfig(env = process.env) {
  const admins = parseAdminIds(env.ADMIN_TELEGRAM_IDS);
  return {
    port: parsePort(env.PORT, 3000),
    host: env.HOST || '0.0.0.0',
    dbPath: env.DB_PATH || path.resolve('data', 'phrases.db'),
    distDir: env.DIST_DIR || path.resolve(here, '../dist'),
    seedPath: env.SEED_PATH || path.resolve(here, '../src/phrases.json'),
    siteUrl: parseSiteUrl(env.SITE_URL),
    jarUrl: parseHttpsUrl(env.MONOBANK_JAR_URL),
    signature: String(env.BARISTA_SIGNATURE ?? '').trim() || DEFAULT_SIGNATURE,
    botToken: String(env.TELEGRAM_BOT_TOKEN ?? '').trim(),
    adminIds: admins.ids,
    invalidAdminIds: admins.invalid,
    // За замовчуванням довіряємо X-Forwarded-* (сервер стоїть за Nginx Proxy Manager).
    // Якщо порт відкрито напряму в інтернет, постав TRUST_PROXY=false.
    trustProxy: String(env.TRUST_PROXY ?? '').toLowerCase() !== 'false',
    logLevel: env.LOG_LEVEL || 'info',
  };
}
