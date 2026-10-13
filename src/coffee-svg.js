/** Малювання кави в SVG: рівень, хвиля, струмінь. Анімації (хвиля, пара, калюжка) живуть у CSS. */

export const BOTTOM = 222; // низ склянки в координатах SVG
export const HEIGHT = 162; // висота повної склянки

// Хвиля: період 40, довжина 280. Анімація зсуває її на -40, тож шов непомітний.
const WAVE_PATH = (() => {
  let d = 'M0 0 Q10 -3 20 0';
  for (let x = 40; x <= 280; x += 20) d += ` T${x} 0`;
  return `${d} V4 H0 Z`;
})();

export function createCoffee(root) {
  const coffee = root.querySelector('#coffee');
  const surface = root.querySelector('#surface');
  const stream = root.querySelector('#stream');
  root.querySelector('#wave').setAttribute('d', WAVE_PATH);

  function render(level, pouring) {
    const h = level * HEIGHT;
    const y = BOTTOM - h;
    coffee.setAttribute('y', y + 3);
    coffee.setAttribute('height', Math.max(0, h - 3));
    surface.setAttribute('transform', `translate(0 ${y})`);
    stream.setAttribute('height', pouring ? (level > 0.02 ? y : BOTTOM) : 0);
    root.classList.toggle('has-coffee', level > 0.04);
    root.classList.toggle('is-pouring', pouring);
  }

  return {
    render,
    setSpill: (on) => root.classList.toggle('is-spill', on),
    reset() {
      render(0, false);
      root.classList.remove('is-spill');
    },
  };
}
