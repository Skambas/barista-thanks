/** Чиста логіка розкладки тексту для картинки. measure(рядок) повертає ширину в px. */

/** Жадібний перенос по словах. Слово ширше за рядок розбивається за символами. */
export function wrapText(text, maxWidth, measure) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) {
      lines.push(line);
      line = '';
    }
    if (measure(word) <= maxWidth) {
      line = word;
      continue;
    }
    for (const ch of Array.from(word)) {
      const next = line + ch;
      if (line && measure(next) > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line = next;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Те саме, але рядки вирівняні за довжиною (аналог text-wrap: balance): та сама кількість рядків, вужчий блок. */
export function balanceLines(text, maxWidth, measure) {
  const greedy = wrapText(text, maxWidth, measure);
  const longest = Math.max(0, ...text.split(/\s+/).filter(Boolean).map(measure));
  if (greedy.length < 2 || longest > maxWidth) return greedy;

  let lo = longest; // уже вужче не можна: слова не рвемо
  let hi = maxWidth;
  let best = greedy;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const attempt = wrapText(text, mid, measure);
    if (attempt.length <= greedy.length) {
      best = attempt;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return best;
}

/**
 * Шукає найбільший розмір шрифту (від maxSize вниз із кроком step),
 * при якому текст вміщується в maxHeight. measure(рядок, розмір) повертає ширину.
 * Якщо не вміщується навіть мінімальний, повертає результат для minSize.
 */
export function fitText(text, { maxWidth, maxHeight, maxSize, minSize, lineHeight, measure, step = 2 }) {
  let result = null;
  for (let size = maxSize; size >= minSize; size -= step) {
    const lines = balanceLines(text, maxWidth, (s) => measure(s, size));
    result = { size, lines, height: lines.length * size * lineHeight };
    if (result.height <= maxHeight) return result;
  }
  return result;
}
