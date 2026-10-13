import { advance, canFinishOnRelease, outcomeFor, TEXT, MESSAGES } from './game-logic.js';

const FINISH_DELAY_MS = 1100;
const HAPTICS = { start: 8, perfect: 30, low: 20, overflow: [40, 60, 40] };

function vibrate(pattern) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export function createGame({ stage, hint, coffee, audio, onFinish }) {
  let level = 0;
  let pouring = false;
  let finished = false;
  let raf = 0;
  let prevT = 0;
  let timer = 0;
  let activePointer = null;

  const setHint = (text) => {
    hint.textContent = text;
  };

  function tick(t) {
    if (!pouring) return;
    const dt = Math.min(0.05, (t - prevT) / 1000); // стрибки після лагів не ламають гру
    prevT = t;
    level = advance(level, dt);
    coffee.render(level, true);
    audio.setLevel(level);
    if (level >= 1) {
      finish();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (finished || pouring) return;
    pouring = true;
    setHint(TEXT.pouring);
    audio.start();
    vibrate(HAPTICS.start);
    prevT = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (!pouring) return;
    pouring = false;
    cancelAnimationFrame(raf);
    audio.stop();
    coffee.render(level, false);
    if (canFinishOnRelease(level)) finish();
    else setHint(TEXT.more);
  }

  function finish() {
    if (finished) return;
    finished = true;
    pouring = false;
    cancelAnimationFrame(raf);
    audio.stop();
    coffee.render(level, false);

    const outcome = outcomeFor(level);
    const message = MESSAGES[outcome];
    if (outcome === 'overflow') coffee.setSpill(true);
    setHint(message);
    vibrate(HAPTICS[outcome]);
    timer = setTimeout(() => onFinish({ outcome, message }), FINISH_DELAY_MS);
  }

  /** Зупинити все без переходу на результат (кнопка "Пропустити"). */
  function abort() {
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    pouring = false;
    activePointer = null;
    audio.stop();
  }

  function reset() {
    abort();
    level = 0;
    finished = false;
    coffee.reset();
    setHint(TEXT.idle);
  }

  function release(e) {
    if (e && activePointer !== null && e.pointerId !== activePointer) return;
    activePointer = null;
    stop();
  }

  // ---- Вказівник ----
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || activePointer !== null) return; // другий палець ігноруємо
    e.preventDefault();
    activePointer = e.pointerId;
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    start();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => stage.addEventListener(ev, release));

  // ---- Захист від системних жестів (iOS Safari, Android) ----
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  stage.addEventListener('dblclick', (e) => e.preventDefault());
  stage.addEventListener('dragstart', (e) => e.preventDefault());
  stage.addEventListener('selectstart', (e) => e.preventDefault());
  stage.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  // ---- Клавіатура: утримуй пробіл або Enter ----
  stage.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      start();
    }
  });
  stage.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') stop();
  });
  stage.addEventListener('blur', () => stop());

  // ---- Вкладка пішла у фон під час наливання ----
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) release();
  });
  window.addEventListener('pagehide', () => release());

  coffee.reset();
  return { reset, abort };
}
