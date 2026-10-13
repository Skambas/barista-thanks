const PLACEHOLDER = /^\{\{.*\}\}$/;
export const DEFAULT_SIGNATURE = '- Ваша бариста🦊 ☕';

/** Порожній рядок, якщо значення не задане або це нерозпарсений плейсхолдер сервера. */
function clean(value) {
  const s = (value ?? '').trim();
  return s && !PLACEHOLDER.test(s) ? s : '';
}

/** Лише https: захист від javascript: та інших схем. Повертає '' якщо URL непридатний. */
export function parseJarUrl(raw) {
  const s = clean(raw);
  if (!s) return '';
  try {
    const url = new URL(s);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

/**
 * Продакшен: сервер підставляє значення в data-атрибути <body> (етап 4).
 * Dev: беремо з .env (VITE_MONOBANK_JAR_URL, VITE_BARISTA_SIGNATURE).
 */
export function readConfig(root = document.body, env = import.meta.env) {
  const d = root.dataset;
  return {
    jarUrl: parseJarUrl(clean(d.jarUrl) || env.VITE_MONOBANK_JAR_URL),
    signature: clean(d.signature) || clean(env.VITE_BARISTA_SIGNATURE) || DEFAULT_SIGNATURE,
  };
}
