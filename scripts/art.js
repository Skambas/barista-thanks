/** Малюнок склянки з кавою для іконки та OG-картинки (той самий, що в грі). */

const GLASS = 'M20 60 L140 60 L124 215 Q123 222 116 222 L44 222 Q37 222 36 215 Z';

function wavePath(y) {
  let d = `M0 ${y} Q10 ${y - 3} 20 ${y}`;
  for (let x = 40; x <= 160; x += 20) d += ` T${x} ${y}`;
  return `${d} V${y + 4} H0 Z`;
}

function glassArt({ id, level = 0.78, mark = true }) {
  const top = +(222 - level * 162).toFixed(2);
  return `
  <defs><clipPath id="${id}"><path d="${GLASS}"/></clipPath></defs>
  <g fill="none" stroke="#f1e8d6" stroke-opacity=".7" stroke-width="3" stroke-linecap="round">
    <path d="M66 50 q-6 -8 0 -16 t0 -16"/>
    <path d="M94 50 q-6 -8 0 -16 t0 -16"/>
  </g>
  <path d="${GLASS}" fill="#f1e8d6" fill-opacity=".22"/>
  <g clip-path="url(#${id})">
    <rect x="0" y="${top + 3}" width="160" height="${222 - top}" fill="#4b2f1d"/>
    <path d="${wavePath(top)}" fill="#8a6446"/>
  </g>
  ${mark ? '<line x1="26" x2="134" y1="97" y2="97" stroke="#f1e8d6" stroke-opacity=".75" stroke-width="1.5" stroke-dasharray="4 5"/>' : ''}
  <path d="${GLASS}" fill="none" stroke="#f1e8d6" stroke-width="3" stroke-linejoin="round"/>`;
}

function ring(cx, cy, r) {
  const c = 2 * Math.PI * r;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#281c10" stroke-opacity=".1" stroke-width="${r * 0.15}" stroke-dasharray="${(c * 0.8).toFixed(1)} ${(c * 0.2).toFixed(1)}"/>`;
}

const background = (w, h) => `
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="#766149"/>
      <stop offset="1" stop-color="#5f4d3a"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>`;

/** 180x180: iOS сам округляє кути, тож малюємо на всю площу. */
export function iconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  ${background(180, 180)}
  <g transform="translate(32.4 3.6) scale(.72)">${glassArt({ id: 'g', mark: false })}</g>
</svg>`;
}

/** 1200x630: формат Open Graph. */
export function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${background(1200, 630)}
  ${ring(170, 500, 150)}
  ${ring(1040, 130, 110)}
  ${ring(1030, 520, 70)}
  <g transform="translate(408 27) scale(2.4)">${glassArt({ id: 'g' })}</g>
</svg>`;
}
