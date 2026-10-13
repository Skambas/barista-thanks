import fs from 'node:fs';
import { buildApp } from './app.js';
import { createBot } from './bot.js';
import { loadConfig } from './config.js';
import { openStore } from './db.js';

// Підхоплюємо .env у dev. У Docker/Portainer змінні приходять із оточення.
try {
  process.loadEnvFile();
} catch {
  /* .env немає, це нормально */
}

const config = loadConfig();
const store = openStore(config.dbPath);
const app = await buildApp({ store, config, logger: { level: config.logLevel } });
const log = app.log;

// Стартові фрази: лише раз за життя бази
try {
  const seed = JSON.parse(fs.readFileSync(config.seedPath, 'utf8'));
  const added = store.seed(seed);
  if (added) log.info(`Імпортовано стартових фраз: ${added}`);
} catch (err) {
  log.warn(`Не вдалося імпортувати стартові фрази (${config.seedPath}): ${err.message}`);
}

try {
  await app.listen({ port: config.port, host: config.host });
} catch (err) {
  log.error(err);
  process.exit(1);
}

// Telegram-бот
let bot = null;
if (config.botToken) {
  if (config.invalidAdminIds.length) {
    log.warn(`Пропущено некоректні значення в ADMIN_TELEGRAM_IDS: ${config.invalidAdminIds.join(', ')}`);
  }
  if (config.adminIds.size === 0) {
    log.warn('ADMIN_TELEGRAM_IDS порожній: бот відповідатиме всім відмовою, але покаже їхній Telegram ID.');
  }
  bot = createBot({
    token: config.botToken,
    admins: config.adminIds,
    store,
    signature: config.signature,
    log,
  });
  bot.start();
} else {
  log.info('TELEGRAM_BOT_TOKEN не заданий: бот вимкнено.');
}

let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  log.info(`${signal}: зупиняюсь`);
  try {
    await bot?.stop();
  } catch {
    /* бот міг не стартувати */
  }
  try {
    await app.close();
  } catch {
    /* ignore */
  }
  store.close();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
