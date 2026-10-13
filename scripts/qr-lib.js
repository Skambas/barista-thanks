import { escapeHtml } from '../server/html.js';

/** Локальні адреси, які гість із вулиці не відкриє. */
export function isLocalHost(hostname) {
  const h = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || h === '::1' || h.endsWith('.local')) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return (
    a === 127 ||
    a === 10 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 169 && b === 254)
  );
}

/** Перевіряє адресу для QR. Повертає { ok, url, warnings } або { ok: false, error }. */
export function normalizeSiteUrl(raw) {
  const s = String(raw ?? '').trim();
  if (!s) {
    return { ok: false, error: 'Не задано адресу: додай SITE_URL у .env або запусти з --url https://...' };
  }
  let u;
  try {
    u = new URL(s);
  } catch {
    return { ok: false, error: `Некоректна адреса: ${s} (потрібно разом із https://)` };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    return { ok: false, error: 'Адреса має починатись з https://' };
  }

  const warnings = [];
  if (isLocalHost(u.hostname)) {
    warnings.push('Це локальна адреса: телефон гостя її не відкриє. Для друку потрібен публічний домен.');
  } else if (u.protocol === 'http:') {
    warnings.push('Адреса починається з http://. Для друку використовуй HTTPS-домен.');
  }
  return { ok: true, url: u.origin + u.pathname + u.search, warnings };
}

/** "https://kava.example.com/x/" → "kava.example.com/x" */
export function displayAddress(url) {
  const u = new URL(url);
  return u.host + (u.pathname === '/' ? '' : u.pathname.replace(/\/$/, ''));
}

/** Самодостатня HTML-сторінка розміру A6 для друку (PDF із браузера). */
export function buildPrintHtml({
  qrSvg,
  url,
  title = 'Налий собі кави',
  subtitle = 'Наведи камеру телефона',
  showUrl = true,
  fontCss = '',
}) {
  const address = showUrl ? `<p class="url">${escapeHtml(displayAddress(url))}</p>` : '';
  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}: макет A6</title>
<style>
${fontCss}
:root { --bg: #766149; --bg-deep: #5f4d3a; --card: #fffdf7; --paper: #f1e8d6; }
@page { size: A6; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  display: flex;
  justify-content: center;
  padding: 24px;
  background: #d9d2c5;
  font-family: Georgia, 'Times New Roman', serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.sheet {
  width: 105mm;
  height: 148mm;
  padding: 9mm 8mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5mm;
  text-align: center;
  color: var(--paper);
  background: radial-gradient(ellipse at 50% 40%, var(--bg) 0%, var(--bg-deep) 100%);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
h1 {
  margin: 0;
  font-family: 'Caveat', 'Segoe Script', cursive;
  font-weight: 700;
  font-size: 13mm;
  line-height: 1.05;
}
.card {
  width: 72mm;
  background: var(--card);
  border-radius: 5mm;
  box-shadow: 0 1mm 3mm rgba(0, 0, 0, 0.3);
}
.card svg { display: block; width: 100%; height: auto; border-radius: 5mm; }
.sub { margin: 0; font-style: italic; font-size: 4.2mm; }
.url { margin: 0; font-size: 3.2mm; letter-spacing: 0.02em; opacity: 0.85; }
.fox { font-size: 7mm; line-height: 1; }
@media print {
  html, body { width: 105mm; height: 148mm; overflow: hidden; }
  body { padding: 0; background: none; }
  .sheet { box-shadow: none; }
}
</style>
</head>
<body>
<main class="sheet">
  <h1>${escapeHtml(title)} ☕</h1>
  <div class="card">${qrSvg}</div>
  <p class="sub">${escapeHtml(subtitle)}</p>
  ${address}
  <div class="fox">🦊</div>
</main>
</body>
</html>
`;
}
