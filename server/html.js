/** Підстановка конфіга в зібраний index.html. Усі значення екрануються. */

const TITLE = 'Налий собі кави ☕';
const DESCRIPTION = 'Налий собі віртуальної кави й отримай маленьку подяку від баристи ☕';

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderIndex(
  template,
  { jarUrl = '', signature = '', siteUrl = '' },
  { hasOgImage = false, hasTouchIcon = false } = {},
) {
  const values = { MONOBANK_JAR_URL: jarUrl, BARISTA_SIGNATURE: signature };
  // функція замість рядка-заміни, щоб $& та $` у значеннях не інтерпретувались
  const html = template.replace(/\{\{(MONOBANK_JAR_URL|BARISTA_SIGNATURE)\}\}/g, (_, key) =>
    escapeHtml(values[key]),
  );

  const head = [
    '<meta property="og:type" content="website">',
    `<meta property="og:title" content="${escapeHtml(TITLE)}">`,
    `<meta property="og:description" content="${escapeHtml(DESCRIPTION)}">`,
    '<meta property="og:locale" content="uk_UA">',
  ];
  if (siteUrl) {
    head.push(`<meta property="og:url" content="${escapeHtml(siteUrl)}/">`);
    if (hasOgImage) {
      head.push(
        `<meta property="og:image" content="${escapeHtml(siteUrl)}/og.png">`,
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
      );
    }
  }
  if (hasTouchIcon) head.push('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');

  return html.replace('</head>', () => `  ${head.join('\n  ')}\n</head>`);
}
