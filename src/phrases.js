/** Чиста логіка фраз: нормалізація, "мішок" без повторів, золоті фрази, завантаження з API. */

export const RARE_CHANCE = 0.05;

export function shuffle(items, rng = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Приймає масив рядків або {text, rare}; повертає [{text, rare}] без порожніх. */
export function normalizePhrases(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const item of input) {
    const raw = typeof item === 'string' ? item : item?.text;
    if (typeof raw !== 'string') continue;
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    out.push({ text, rare: typeof item === 'object' && item.rare === true });
  }
  return out;
}

/** Клас розміру шрифту за довжиною фрази. */
export function sizeClass(text) {
  const n = text.length;
  return n > 130 ? 'long' : n > 80 ? 'mid' : '';
}

function createBag(items, rng, seen) {
  const used = new Set(seen.filter((t) => items.some((i) => i.text === t)));
  let queue = [];
  let last = null;

  function refill() {
    queue = shuffle(
      items.filter((i) => !used.has(i.text)),
      rng,
    );
    if (queue.length === 0) {
      used.clear();
      queue = shuffle(items, rng);
      // на стику кіл не повторюємо останню фразу одразу
      if (queue.length > 1 && queue[0].text === last) queue.push(queue.shift());
    }
  }

  return {
    size: items.length,
    next() {
      if (items.length === 0) return null;
      if (queue.length === 0) refill();
      const item = queue.shift();
      used.add(item.text);
      last = item.text;
      return item;
    },
    seen: () => [...used],
  };
}

/**
 * "Мішок": фрази показуються по колу в перемішаному порядку без повторів.
 * Золоті (rare) випадають із шансом rareChance, у власному мішку.
 * `seen` дозволяє відновити стан (наприклад, із sessionStorage).
 */
export function createPicker(phrases, { rng = Math.random, rareChance = RARE_CHANCE, seen = [] } = {}) {
  const list = normalizePhrases(phrases);
  const normal = createBag(
    list.filter((p) => !p.rare),
    rng,
    seen,
  );
  const rare = createBag(
    list.filter((p) => p.rare),
    rng,
    seen,
  );

  return {
    next() {
      const wantRare = rare.size > 0 && (normal.size === 0 || rng() < rareChance);
      return (wantRare ? rare : normal).next();
    },
    seen: () => [...normal.seen(), ...rare.seen()],
  };
}

/** GET /api/phrases з таймаутом. null, якщо недоступно чи відповідь некоректна (тоді працює fallback). */
export async function fetchPhrases({ url = '/api/phrases', timeoutMs = 2500, fetchImpl = fetch } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const list = normalizePhrases(await res.json());
    return list.length ? list : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
