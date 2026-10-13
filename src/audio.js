/** Звук наливання через Web Audio: фільтрований шум без файлів. За замовчуванням вимкнено. */

const KEY = 'sound';

function readPref() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
function writePref(on) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* приватний режим */
  }
}

export function createAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const supported = Boolean(Ctx);
  let enabled = supported && readPref();
  let ctx = null;
  let gain = null;
  let filter = null;

  // Контекст створюємо лише в обробнику жесту (вимога iOS/Chrome)
  function ensure() {
    if (!supported) return false;
    if (!ctx) {
      ctx = new Ctx();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 500;
      filter.Q.value = 0.9;
      gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  return {
    supported,
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = supported && on;
      writePref(enabled);
      if (enabled) ensure();
      else this.stop();
    },
    start() {
      if (!enabled || !ensure()) return;
      gain.gain.setTargetAtTime(0.12, ctx.currentTime, 0.04);
    },
    /** Чим повніша склянка, тим вищий тон, як у справжньому наливанні. */
    setLevel(level) {
      if (!ctx || !enabled) return;
      filter.frequency.setTargetAtTime(400 + level * 1400, ctx.currentTime, 0.05);
    },
    stop() {
      if (!ctx) return;
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    },
  };
}
