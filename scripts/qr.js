import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import QRCode from 'qrcode';
import { buildPrintHtml, normalizeSiteUrl } from './qr-lib.js';

try {
  process.loadEnvFile();
} catch {
  /* .env немає, це нормально */
}

const { values } = parseArgs({
  options: {
    url: { type: 'string' },
    out: { type: 'string', default: 'qr' },
    title: { type: 'string' },
    'no-url': { type: 'boolean', default: false },
  },
});

const site = normalizeSiteUrl(values.url ?? process.env.SITE_URL);
if (!site.ok) {
  console.error(`✗ ${site.error}`);
  process.exit(1);
}
for (const w of site.warnings) console.warn(`⚠ ${w}`);

// Темно-коричневий на світлому: контраст ~17:1. Рівень корекції Q витримує потертості й блиск
const options = {
  errorCorrectionLevel: 'Q',
  margin: 4, // "тиха зона": 4 модулі за стандартом, не зменшуй
  color: { dark: '#2a1a0e', light: '#fffdf7' },
};

/** Вбудовуємо Caveat у сторінку, щоб файл відкривався будь-де однаково. */
function fontFaceCss() {
  try {
    const file = path.resolve('node_modules/@fontsource/caveat/files/caveat-cyrillic-700-normal.woff2');
    const b64 = fs.readFileSync(file).toString('base64');
    return `@font-face { font-family: 'Caveat'; font-weight: 700; src: url(data:font/woff2;base64,${b64}) format('woff2'); }`;
  } catch {
    console.warn('⚠ Не знайшов шрифт Caveat, заголовок буде звичайним рукописним шрифтом.');
    return '';
  }
}

const outDir = path.resolve(values.out);
fs.mkdirSync(outDir, { recursive: true });

const svg = await QRCode.toString(site.url, { ...options, type: 'svg' });
const png = await QRCode.toBuffer(site.url, { ...options, type: 'png', scale: 24 });
const html = buildPrintHtml({
  qrSvg: svg,
  url: site.url,
  title: values.title,
  showUrl: !values['no-url'],
  fontCss: fontFaceCss(),
});

fs.writeFileSync(path.join(outDir, 'qr.svg'), svg);
fs.writeFileSync(path.join(outDir, 'qr.png'), png);
fs.writeFileSync(path.join(outDir, 'print-a6.html'), html);

console.log(`✓ QR для ${site.url}`);
console.log(`  ${path.join(values.out, 'qr.svg')}   (вектор, для друкарні)`);
console.log(
  `  ${path.join(values.out, 'qr.png')}   (растр ${QRCode.create(site.url, options).modules.size + 8} модулів × 24 px)`,
);
console.log(`  ${path.join(values.out, 'print-a6.html')}   (макет A6: відкрий у Chrome → Ctrl+P)`);
