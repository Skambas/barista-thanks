import { fitText } from './story-layout.js';

export const STORY_W = 1080;
export const STORY_H = 1920;

// Instagram перекриває своїм інтерфейсом ~250 px зверху і знизу, тож усе важливе між ними
const NOTE_CENTER_Y = 880;
const FOOTER_Y = 1600;
const FONT_TIMEOUT_MS = 3000;

const NOTE = {
  width: 880,
  padX: 84,
  padTop: 120,
  padBottom: 100,
  gap: 56,
  signH: 60,
  minH: 620,
  maxH: 1200,
  tilt: (-1.6 * Math.PI) / 180,
  jag: 14, // амплітуда рваного краю
};
const FONT = { max: 96, min: 44, lineHeight: 1.22 };
const FOOTER_TITLE = 'Налий собі кави ☕';

// Емодзі йдуть до generic-сімейства, інакше canvas може не підхопити кольорові гліфи
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';
const hand = (weight, size) =>
  `${weight} ${size}px "Caveat", ${EMOJI}, "Segoe Script", "Bradley Hand", cursive`;
const serif = (size) => `italic 400 ${size}px "Lora", ${EMOJI}, Georgia, serif`;

/** Чекаємо шрифти ДО малювання, інакше canvas візьме fallback. Таймаут, щоб не зависнути. */
async function loadFonts({ phrase, signature }) {
  if (!document.fonts?.load) return;
  const jobs = [
    document.fonts.load('500 64px Caveat', phrase),
    document.fonts.load('700 64px Caveat', FOOTER_TITLE),
    document.fonts.load('italic 400 40px Lora', signature),
  ];
  await Promise.race([
    Promise.allSettled(jobs),
    new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS)),
  ]);
}

function drawRing(ctx, x, y, r) {
  ctx.strokeStyle = 'rgba(40, 28, 16, .10)';
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
  drawRing(ctx, 170, 1500, 120);
  drawRing(ctx, 930, 330, 90);
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

function drawNote(ctx, { phrase, rare, signature, rng }) {
  const w = NOTE.width;
  const textW = w - NOTE.padX * 2;
  const maxTextH = NOTE.maxH - NOTE.padTop - NOTE.padBottom - NOTE.gap - NOTE.signH;

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
    NOTE.maxH,
    Math.max(NOTE.minH, NOTE.padTop + textH + NOTE.gap + NOTE.signH + NOTE.padBottom),
  );

  ctx.save();
  ctx.translate(STORY_W / 2, NOTE_CENTER_Y);
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
}

function drawFooter(ctx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(241, 232, 214, .92)';
  ctx.font = hand(700, 52);
  ctx.fillText(FOOTER_TITLE, STORY_W / 2, FOOTER_Y);
}

function toBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

/** Малює картинку 1080x1920 і повертає PNG Blob. Не залежить від розміру екрана гостя. */
export async function renderStory({ phrase, rare = false, signature = '', rng = Math.random }) {
  await loadFonts({ phrase, signature });

  const canvas = document.createElement('canvas');
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext('2d');

  drawBackground(ctx);
  drawNote(ctx, { phrase, rare, signature, rng });
  drawFooter(ctx);
  return toBlob(canvas);
}
