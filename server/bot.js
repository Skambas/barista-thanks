import { Bot, InlineKeyboard } from 'grammy';
import { parseId } from './validate.js';

const PAGE_SIZE = 8;
const PREVIEW_LEN = 110;
const REFUSAL_EVERY_MS = 60_000;

export const HELP_TEXT = [
  'Привіт! Я керую подяками для сторінки з кавою ☕',
  '',
  'Щоб додати фразу, просто надішли її мені повідомленням (або /add текст).',
  '',
  '/list: усі фрази по сторінках',
  '/random: показати випадкову, як на листочку',
  '/off 12: тимчасово вимкнути фразу №12',
  '/on 12: увімкнути назад',
  '/gold 12: зробити фразу золотою (рідкісною) або зняти це',
  '/del 12: видалити назавжди',
  '',
  'Зміни з’являються на сайті приблизно за хвилину.',
].join('\n');

const COMMANDS = [
  { command: 'add', description: 'Додати фразу' },
  { command: 'list', description: 'Усі фрази' },
  { command: 'random', description: 'Показати випадкову' },
  { command: 'off', description: 'Вимкнути фразу за номером' },
  { command: 'on', description: 'Увімкнути фразу за номером' },
  { command: 'gold', description: 'Золота (рідкісна) фраза' },
  { command: 'del', description: 'Видалити фразу' },
  { command: 'help', description: 'Довідка' },
];

export function shorten(text, max) {
  const chars = Array.from(text);
  return chars.length <= max
    ? text
    : `${chars
        .slice(0, max - 1)
        .join('')
        .trimEnd()}…`;
}

export function formatListPage({ items, total, activeCount, page, pages }) {
  if (total === 0) return 'Фраз поки немає. Надішли першу повідомленням ✍️';
  const lines = items.map(
    (p) => `#${p.id} ${p.active ? '✅' : '⏸'}${p.rare ? ' ✨' : ''} ${shorten(p.text, PREVIEW_LEN)}`,
  );
  return [
    `Фраз: ${total}, активних: ${activeCount}`,
    '',
    lines.join('\n\n'),
    '',
    `Сторінка ${page}/${pages}  ·  ✅ активна  ⏸ вимкнена  ✨ золота`,
  ].join('\n');
}

function listKeyboard(page, pages) {
  const kb = new InlineKeyboard();
  if (page > 1) kb.text('‹ Назад', `list:${page - 1}`);
  if (page < pages) kb.text('Далі ›', `list:${page + 1}`);
  return kb;
}

/**
 * Telegram-бот на long polling (публічний webhook не потрібен).
 * admins: Set числових Telegram ID. Усім іншим бот ввічливо відмовляє.
 */
export function createBot({ token, admins, store, signature, log }) {
  const bot = new Bot(token);
  const lastRefusal = new Map();

  // ---- Доступ: лише whitelist ----
  bot.use(async (ctx, next) => {
    const uid = ctx.from?.id;
    if (uid && admins.has(uid)) return next();
    // Чужим відповідаємо лише в приватному чаті й не частіше разу на хвилину
    if (uid && ctx.chat?.type === 'private' && ctx.message) {
      const now = Date.now();
      if (now - (lastRefusal.get(uid) ?? 0) > REFUSAL_EVERY_MS) {
        if (lastRefusal.size > 1000) lastRefusal.clear();
        lastRefusal.set(uid, now);
        await ctx.reply(
          `Вибач, цей бот приватний 🙈 Він слухається лише власника.\n\nТвій Telegram ID: ${uid}\n(якщо ти власник, додай його в ADMIN_TELEGRAM_IDS і перезапусти сервіс)`,
        );
      }
    }
  });

  // ---- Додавання ----
  async function addPhrase(ctx, raw) {
    const res = store.add(raw);
    if (res.ok) {
      const { id, text } = res.phrase;
      return ctx.reply(`Додано ✅ #${id}\n\n${text}\n\nПомилилась? /del ${id}`);
    }
    switch (res.error) {
      case 'empty':
        return ctx.reply('Напиши фразу після /add або просто надішли її окремим повідомленням 🙂');
      case 'too_long':
        return ctx.reply(`Задовга 🙈 ${res.length} символів, а можна до ${res.max}. Скороти, будь ласка.`);
      case 'no_letters':
        return ctx.reply('Тут зовсім немає слів, самі смайлики не підійдуть 🙂');
      case 'duplicate':
        return ctx.reply(`Така (або дуже схожа) фраза вже є: #${res.existingId} 🙂`);
      default:
        return ctx.reply('Не вийшло додати цю фразу.');
    }
  }

  bot.command(['start', 'help'], (ctx) => ctx.reply(HELP_TEXT));
  bot.command('add', (ctx) => addPhrase(ctx, ctx.match));

  // ---- Список з пагінацією ----
  bot.command('list', async (ctx) => {
    const data = store.listPage(parseId(ctx.match) ?? 1, PAGE_SIZE);
    await ctx.reply(formatListPage(data), {
      reply_markup: data.pages > 1 ? listKeyboard(data.page, data.pages) : undefined,
    });
  });

  bot.callbackQuery(/^list:(\d{1,4})$/, async (ctx) => {
    const data = store.listPage(Number(ctx.match[1]), PAGE_SIZE);
    try {
      await ctx.editMessageText(formatListPage(data), {
        reply_markup: listKeyboard(data.page, data.pages),
      });
    } catch (err) {
      if (!String(err?.description ?? err).includes('not modified')) throw err;
    }
    await ctx.answerCallbackQuery();
  });

  // ---- Дії за номером ----
  const withId = (ctx, command, action) => {
    const id = parseId(ctx.match);
    if (!id) return ctx.reply(`Вкажи номер фрази, наприклад: ${command} 12`);
    return action(id);
  };
  const notFound = (id) => `Фрази #${id} немає. Номери дивись у /list`;

  bot.command('del', (ctx) =>
    withId(ctx, '/del', async (id) => {
      const phrase = store.remove(id);
      if (!phrase) return ctx.reply(notFound(id));
      return ctx.reply(
        `Видалено #${id}:\n${shorten(phrase.text, 200)}\n\nНа майбутнє: /off лише вимикає, а не видаляє.`,
      );
    }),
  );

  bot.command('off', (ctx) =>
    withId(ctx, '/off', async (id) => {
      const phrase = store.setActive(id, false);
      return ctx.reply(phrase ? `Вимкнено ⏸ #${id}. Повернути: /on ${id}` : notFound(id));
    }),
  );

  bot.command('on', (ctx) =>
    withId(ctx, '/on', async (id) => {
      const phrase = store.setActive(id, true);
      return ctx.reply(phrase ? `Увімкнено ✅ #${id}` : notFound(id));
    }),
  );

  bot.command('gold', (ctx) =>
    withId(ctx, '/gold', async (id) => {
      const phrase = store.toggleRare(id);
      if (!phrase) return ctx.reply(notFound(id));
      return ctx.reply(
        phrase.rare
          ? `✨ #${id} тепер золота. Вона випадатиме рідко, десь у кожному двадцятому листочку.`
          : `#${id} більше не золота.`,
      );
    }),
  );

  // ---- Як це виглядатиме ----
  bot.command('random', async (ctx) => {
    const phrase = store.random();
    if (!phrase) return ctx.reply('Активних фраз немає. Надішли першу повідомленням ✍️');
    return ctx.reply(`🎲 #${phrase.id}${phrase.rare ? ' ✨ золота' : ''}\n\n${phrase.text}\n\n${signature}`);
  });

  // ---- Звичайне повідомлення: нова фраза ----
  bot.on('message:text', (ctx) => {
    if (ctx.message.text.startsWith('/')) return ctx.reply('Не знаю такої команди 🤔 Дивись /help');
    return addPhrase(ctx, ctx.message.text);
  });
  bot.on('message', (ctx) => ctx.reply('Я розумію лише текст 🙂'));

  bot.catch((err) => {
    log.error({ err: err.error?.message ?? String(err.error ?? err) }, 'Помилка в обробнику бота');
  });

  return {
    start() {
      bot
        .start({
          drop_pending_updates: true, // старі команди, надіслані поки сервіс був вимкнений, не виконуємо
          onStart: async (me) => {
            log.info(`Telegram-бот @${me.username} запущено`);
            try {
              await bot.api.setMyCommands(COMMANDS);
            } catch {
              /* меню команд не критичне */
            }
          },
        })
        .catch((err) =>
          log.error({ err: err?.message ?? String(err) }, 'Бот не запустився: перевір TELEGRAM_BOT_TOKEN'),
        );
    },
    async stop() {
      await bot.stop();
    },
  };
}
