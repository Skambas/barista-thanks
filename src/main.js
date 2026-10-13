import '@fontsource/caveat/cyrillic-500.css';
import '@fontsource/caveat/latin-500.css';
import '@fontsource/caveat/cyrillic-700.css';
import '@fontsource/caveat/latin-700.css';
import '@fontsource/lora/cyrillic-400.css';
import '@fontsource/lora/latin-400.css';
import '@fontsource/lora/cyrillic-400-italic.css';
import '@fontsource/lora/latin-400-italic.css';
import './styles.css';

import fallbackPhrases from './phrases.json';
import { readConfig } from './config.js';
import { createPicker, fetchPhrases, sizeClass } from './phrases.js';
import { createCoffee } from './coffee-svg.js';
import { createAudio } from './audio.js';
import { createGame } from './game.js';
import { TEXT } from './game-logic.js';
import { renderStory } from './story.js';
import { canShareFile, downloadFile, makeFile, shareFile } from './share.js';

const $ = (id) => document.getElementById(id);
const cfg = readConfig();

/* ---------- Чайові: без URL банки кнопок немає взагалі ---------- */
if (cfg.jarUrl) {
  for (const id of ['tip', 'tip-link']) {
    const a = $(id);
    a.href = cfg.jarUrl;
    a.hidden = false;
  }
}

/* ---------- Фрази ---------- */
const SEEN_KEY = 'seen-phrases';
const loadSeen = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(SEEN_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const saveSeen = (list) => {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
};

let picker = createPicker(fallbackPhrases, { seen: loadSeen() });
fetchPhrases().then((list) => {
  if (list) picker = createPicker(list, { seen: loadSeen() });
});

/* ---------- Картинка для сторіз: готуємо заздалегідь, щоб share йшов із жесту ---------- */
const shareBtn = $('share');
const SHARE_LABEL = {
  preparing: 'Готую картинку…',
  share: 'Поділитись у сторіз',
  save: 'Зберегти картинку',
};
let storyFile = null;
let storyToken = 0; // застарілі результати відкидаємо
let sharing = false;

const idle = (fn) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 700);

function cancelStory() {
  storyToken++;
  storyFile = null;
}

function prepareStory(item) {
  const token = ++storyToken;
  storyFile = null;
  shareBtn.hidden = false;
  shareBtn.disabled = true;
  shareBtn.textContent = SHARE_LABEL.preparing;

  idle(async () => {
    if (token !== storyToken) return; // гість уже натиснув "Ще одна"
    try {
      const blob = await renderStory({
        phrase: item.text,
        rare: item.rare,
        signature: cfg.signature,
      });
      if (token !== storyToken) return;
      storyFile = makeFile(blob);
      shareBtn.textContent = canShareFile(storyFile) ? SHARE_LABEL.share : SHARE_LABEL.save;
      shareBtn.disabled = false;
    } catch {
      if (token === storyToken) shareBtn.hidden = true; // краще без кнопки, ніж зламана
    }
  });
}

shareBtn.addEventListener('click', async () => {
  if (!storyFile || sharing) return;
  const file = storyFile;

  if (!canShareFile(file)) {
    downloadFile(file); // підпис кнопки вже каже "Зберегти картинку", тож без повідомлень
    return;
  }
  sharing = true;
  try {
    await shareFile(file); // navigator.share викликається синхронно, без await до нього
  } catch {
    downloadFile(file); // меню не відкрилось: тихо зберігаємо
  } finally {
    sharing = false;
  }
});

/* ---------- Листочок ---------- */
const noteEl = $('note');
const noteWrap = $('note-wrap');

function tornEdge() {
  const jag = (max) => Math.random() * max;
  const top = [];
  const bottom = [];
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 100;
    top.push(`${x.toFixed(2)}% ${jag(3.2).toFixed(2)}%`);
    bottom.push(`${(100 - x).toFixed(2)}% ${(100 - jag(3.2)).toFixed(2)}%`);
  }
  return `polygon(${top.join(',')},${bottom.join(',')})`;
}

function showNote() {
  const item = picker.next() ?? { text: 'Дякую! 🤍', rare: false };
  saveSeen(picker.seen());

  const phrase = $('phrase');
  phrase.textContent = item.text; // тільки textContent, без innerHTML
  phrase.className = `phrase ${sizeClass(item.text)}`.trim();
  $('sign').textContent = cfg.signature;

  noteEl.classList.toggle('rare', item.rare);
  noteWrap.classList.toggle('is-rare', item.rare);
  noteEl.style.clipPath = tornEdge();

  noteEl.classList.remove('drop');
  void noteEl.offsetWidth; // перезапуск анімації
  noteEl.classList.add('drop');

  prepareStory(item);
}

/* ---------- Екрани ---------- */
const gameSection = $('game');
const resultSection = $('result');
const stage = $('stage');

function showResult(caption) {
  $('caption').textContent = caption;
  gameSection.hidden = true;
  resultSection.hidden = false;
  showNote();
  window.scrollTo(0, 0);
  resultSection.focus({ preventScroll: true });
}

/* ---------- Звук ---------- */
const audio = createAudio();
const soundBtn = $('sound');
function paintSound() {
  soundBtn.textContent = audio.enabled ? '🔊' : '🔇';
  soundBtn.setAttribute('aria-pressed', String(audio.enabled));
}
if (audio.supported) {
  paintSound();
  soundBtn.addEventListener('click', () => {
    audio.setEnabled(!audio.enabled);
    paintSound();
  });
} else {
  soundBtn.hidden = true;
}

/* ---------- Гра ---------- */
const game = createGame({
  stage,
  hint: $('hint'),
  coffee: createCoffee(stage),
  audio,
  onFinish: ({ message }) => showResult(message),
});

$('skip').addEventListener('click', () => {
  game.abort();
  showResult(TEXT.skipped);
});
$('again').addEventListener('click', showNote);
$('replay').addEventListener('click', () => {
  cancelStory();
  game.reset();
  resultSection.hidden = true;
  gameSection.hidden = false;
  stage.focus({ preventScroll: true });
});
