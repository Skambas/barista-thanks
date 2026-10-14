import { fitText } from './story-layout.js';
import logoUrl from './assets/logo.png';

export const STORY_W = 1080;
export const STORY_H = 1920;

const FONT_TIMEOUT_MS = 3000;
const CAPTION = 'Записка від баристи';
const OLIVE = '#9fa26b'; // колір логотипа

// Instagram перекриває ~250 px зверху і знизу: усе важливе лишається між y=250 і y=1670
const LAYOUT_BRAND = { captionY: 520, noteTop: 600, noteBottom: 1440 };
const LAYOUT_PLAIN = { captionY: 400, noteTop: 480, noteBottom: 1520 };
const BADGE = { cx: STORY_W / 2, cy: 360, r: 100, logo: 140 };
const FOOTER_NAME_Y = 1530;
const FOOTER_IG_Y = 1612;

const NOTE = {
  width: 880,
  padX: 84,
  padTop: 120,
  padBottom: 100,
  gap: 56,
  signH: 60,
  minH: 620,
  tilt: (-1.6 * Math.PI) / 180,
  jag: 14, // амплітуда рваного краю
};
const FONT = { max: 96, min: 44, lineHeight: 1.22 };

// Емодзі йдуть до generic-сімейства, інакше canvas може не підхопити кольорові гліфи
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';
const hand = (weight, size) =>
  `${weight} ${size}px "Caveat", ${EMOJI}, "Segoe Script", "Bradley Hand", cursive`;
const serif = (size) => `italic 400 ${size}px "Lora", ${EMOJI}, Georgia, serif`;

const timeout = (ms) => new Promise((resolve) => setTimeout(() => resolve(null), ms));

/** Чекаємо шрифти ДО малювання, інакше canvas візьме fallback. Таймаут, щоб не зависнути. */
async function loadFonts({ phrase, signature, cafeName, cafeInstagram }) {
  if (!document.fonts?.load) return;
  const jobs = [
    document.fonts.load('500 64px Caveat', phrase + CAPTION),
    document.fonts.load('italic 400 40px Lora', signature + cafeInstagram),
  ];
  if (cafeName) jobs.push(document.fonts.load('700 64px Caveat', cafeName));
  await Promise.race([Promise.allSettled(jobs), timeout(FONT_TIMEOUT_MS)]);
}

/** Логотип; null, якщо не завантажився (тоді малюємо без нього). */
function loadLogo() {
  const load = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });
  return Promise.race([load, timeout(FONT_TIMEOUT_MS)]);
}

function drawRing(ctx, x, y, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(x, y, r, 0.2 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, r - 22, 0.9 * Math.PI, 2.2 * Math.PI);
  ctx.stroke();
}

function drawBackground(ctx) {
  const g = ctx.createRadialGradient(
    STORY_W / 2,
    STORY_H * 0.4,
    0,
    STORY_W / 2,
    STORY_H * 0.4,
    STORY_H * 0.75,
  );
  g.addColorStop(0, '#766149');
  g.addColorStop(1, '#5f4d3a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  drawRing(ctx, 170, 1500, 120, 'rgba(40, 28, 16, .10)');
  drawRing(ctx, 930, 330, 90, 'rgba(40, 28, 16, .10)');
}

/** Кремовий бейдж із логотипом: оливковий знак на коричневому фоні був би тьмяним. */
function drawBadge(ctx, logo) {
  const { cx, cy, r } = BADGE;
  ctx.save();
  ctx.shadowColor = 'rgba(40, 28, 16, .35)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#f1e8d6';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(159, 162, 107, .5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.drawImage(logo, cx - BADGE.logo / 2, cy - BADGE.logo / 2, BADGE.logo, BADGE.logo);
}

function drawCaption(ctx, y) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(241, 232, 214, .95)';
  ctx.font = hand(500, 60);
  ctx.fillText(CAPTION, STORY_W / 2, y);
}

/** Контур листочка з рваним верхом і низом, координати від центру. */
function tornPath(ctx, w, h, rng) {
  const steps = 40;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const x = -w / 2 + (w * i) / steps;
    const y = -h / 2 + rng() * NOTE.jag;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const x = -w / 2 + (w * i) / steps;
    ctx.lineTo(x, h / 2 - rng() * NOTE.jag);
  }
  ctx.closePath();
}

/** Смужка скотчу зверху листочка (малюється в системі координат листочка). */
function drawTape(ctx, noteH) {
  ctx.save();
  ctx.translate(0, -noteH / 2 + 6);
  ctx.rotate((3 * Math.PI) / 180);
  ctx.shadowColor = 'rgba(40, 28, 16, .25)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(159, 162, 107, .9)';
  ctx.fillRect(-120, -34, 240, 68);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255, 255, 255, .16)';
  for (let x = -120; x < 120; x += 28) ctx.fillRect(x, -34, 12, 68);
  ctx.restore();
}

function drawNote(ctx, { phrase, rare, signature, rng, layout }) {
  const w = NOTE.width;
  const textW = w - NOTE.padX * 2;
  const maxH = layout.noteBottom - layout.noteTop;
  const cy = (layout.noteTop + layout.noteBottom) / 2;
  const maxTextH = maxH - NOTE.padTop - NOTE.padBottom - NOTE.gap - NOTE.signH;

  const measure = (s, size) => {
    ctx.font = hand(500, size);
    return ctx.measureText(s).width;
  };
  const fit = fitText(phrase, {
    maxWidth: textW,
    maxHeight: maxTextH,
    maxSize: FONT.max,
    minSize: FONT.min,
    lineHeight: FONT.lineHeight,
    measure,
  });
  const lineH = fit.size * FONT.lineHeight;
  const textH = fit.lines.length * lineH;
  const noteH = Math.min(
    maxH,
    Math.max(NOTE.minH, NOTE.padTop + textH + NOTE.gap + NOTE.signH + NOTE.padBottom),
  );

  ctx.save();
  ctx.translate(STORY_W / 2, cy);
  ctx.rotate(NOTE.tilt);
  tornPath(ctx, w, noteH, rng);

  let paint = '#f1e8d6';
  if (rare) {
    paint = ctx.createLinearGradient(-w / 2, -noteH / 2, w / 2, noteH / 2);
    paint.addColorStop(0, '#fff1bd');
    paint.addColorStop(0.55, '#f0cf73');
    paint.addColorStop(1, '#f7e29a');
    ctx.shadowColor = 'rgba(255, 214, 102, .65)'; // золоте сяйво
    ctx.shadowBlur = 80;
    ctx.fillStyle = paint;
    ctx.fill();
  }
  ctx.shadowColor = 'rgba(40, 28, 16, .45)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 26;
  ctx.fillStyle = paint;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.clip();

  // ледь помітна фактура паперу
  ctx.fillStyle = 'rgba(120, 95, 65, .05)';
  for (let y = -noteH / 2; y < noteH / 2; y += 6) ctx.fillRect(-w / 2, y, w, 2);

  // відбиток від чашки в нижньому лівому куті
  drawRing(ctx, -w / 2 + 110, noteH / 2 - 70, 62, 'rgba(110, 72, 40, .14)');

  // текст подяки (блок по центру вільної області)
  const availH = noteH - NOTE.padTop - NOTE.padBottom - NOTE.gap - NOTE.signH;
  let y = -noteH / 2 + NOTE.padTop + (availH - textH) / 2 + lineH / 2;
  ctx.fillStyle = '#4a3828';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = hand(500, fit.size);
  for (const line of fit.lines) {
    ctx.fillText(line, -w / 2 + NOTE.padX, y);
    y += lineH;
  }

  // підпис баристи, зменшуємо шрифт, якщо довгий
  let signSize = 44;
  ctx.font = serif(signSize);
  while (signSize > 28 && ctx.measureText(signature).width > textW) {
    signSize -= 2;
    ctx.font = serif(signSize);
  }
  ctx.fillStyle = '#6f5a46';
  ctx.textAlign = 'right';
  ctx.fillText(signature, w / 2 - NOTE.padX, noteH / 2 - NOTE.padBottom - NOTE.signH / 2);
  ctx.restore();

  // скотч поверх листочка, у тій самій системі координат (без обрізання)
  ctx.save();
  ctx.translate(STORY_W / 2, cy);
  ctx.rotate(NOTE.tilt);
  drawTape(ctx, noteH);
  ctx.restore();
}

function drawFooter(ctx, { cafeName, cafeInstagram }) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let igY = FOOTER_NAME_Y;

  if (cafeName) {
    let size = 100;
    ctx.font = hand(700, size);
    while (size > 56 && ctx.measureText(cafeName).width > 860) {
      size -= 4;
      ctx.font = hand(700, size);
    }
    ctx.fillStyle = '#f1e8d6';
    ctx.fillText(cafeName, STORY_W / 2, FOOTER_NAME_Y);
    igY = FOOTER_IG_Y;
  }
  if (cafeInstagram) {
    ctx.fillStyle = 'rgba(241, 232, 214, .85)';
    ctx.font = serif(40);
    ctx.fillText(`@${cafeInstagram}`, STORY_W / 2, igY);
  }
}

function toBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

/** Малює картинку 1080x1920 і повертає PNG Blob. Не залежить від розміру екрана гостя. */
export async function renderStory({
  phrase,
  rare = false,
  signature = '',
  cafeName = '',
  cafeInstagram = '',
  rng = Math.random,
}) {
  const hasBrand = Boolean(cafeName || cafeInstagram);
  const [, logo] = await Promise.all([
    loadFonts({ phrase, signature, cafeName, cafeInstagram }),
    hasBrand ? loadLogo() : null,
  ]);
  const layout = logo ? LAYOUT_BRAND : LAYOUT_PLAIN;

  const canvas = document.createElement('canvas');
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d');

  drawBackground(ctx);
  if (logo) drawBadge(ctx, logo);
  drawCaption(ctx, layout.captionY);
  drawNote(ctx, { phrase, rare, signature, rng, layout });
  if (hasBrand) drawFooter(ctx, { cafeName, cafeInstagram });
  return toBlob(canvas);
}
