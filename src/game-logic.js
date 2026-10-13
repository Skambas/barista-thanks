/** Чиста логіка гри: параметри налаштовуються тут. */

export const FILL_SECONDS = 2.6; // за скільки секунд склянка наповнюється повністю
export const MIN_OK = 0.6; // нижче цього рівня відпускання не завершує гру
export const PERFECT_FROM = 0.78; // ≈ пунктирна риска на склянці
export const OVERFLOW_FROM = 0.97;

export const TEXT = {
  idle: 'Потримай склянку, щоб налити каву',
  pouring: 'Лий… і відпусти біля пунктирної риски',
  more: 'Ще трішки — потримай склянку',
  skipped: 'Дякую, що заглянули ☕',
};

export const MESSAGES = {
  overflow: 'Ой, через край! Це за рахунок закладу 😄',
  perfect: 'Ідеально! Рівно стільки, скільки треба ☕',
  low: 'Трохи не доверху, але теж смачно ☕',
};

export function advance(level, dtSeconds) {
  return Math.min(1, Math.max(0, level + dtSeconds / FILL_SECONDS));
}

export function canFinishOnRelease(level) {
  return level >= MIN_OK;
}

export function outcomeFor(level) {
  if (level >= OVERFLOW_FROM) return 'overflow';
  if (level >= PERFECT_FROM) return 'perfect';
  return 'low';
}
