import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Fastify, { LogController } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { renderIndex } from './html.js';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

export async function buildApp({ store, config, logger = false }) {
  const app = Fastify({
    logger,
    trustProxy: config.trustProxy,
    // не пишемо в лог кожен запит гостя
    logController: new LogController({ disableRequestLogging: true }),
  });

  app.addHook('onRequest', async (req, reply) => {
    reply.header('Content-Security-Policy', CSP);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (req.protocol === 'https') reply.header('Strict-Transport-Security', 'max-age=15552000');
  });

  // Ліміт тільки на API й щедрий: гості сидять за однією Wi-Fi мережею / CGNAT
  await app.register(rateLimit, { global: false });

  app.get(
    '/api/phrases',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = JSON.stringify(store.listActive());
      const etag = `"${crypto.createHash('sha1').update(body).digest('base64url')}"`;
      reply.header('Cache-Control', 'public, max-age=60').header('ETag', etag);
      if (req.headers['if-none-match'] === etag) return reply.code(304).send();
      return reply.type('application/json; charset=utf-8').send(body);
    },
  );

  // Для Docker healthcheck
  app.get('/healthz', async (req, reply) => {
    store.stats(); // торкаємось бази, щоб перевірити, що вона жива
    reply.header('Cache-Control', 'no-store');
    return { ok: true };
  });

  const indexFile = path.join(config.distDir, 'index.html');
  if (fs.existsSync(indexFile)) {
    const has = (name) => fs.existsSync(path.join(config.distDir, name));
    const html = renderIndex(fs.readFileSync(indexFile, 'utf8'), config, {
      hasOgImage: has('og.png'),
      hasTouchIcon: has('apple-touch-icon.png'),
    });
    const sendHtml = async (req, reply) =>
      reply.header('Cache-Control', 'no-cache').type('text/html; charset=utf-8').send(html);
    app.get('/', sendHtml);
    app.get('/index.html', sendHtml); // сирий шаблон із {{...}} ніколи не віддаємо

    // Vite кладе в assets/ файли з хешем у назві: кешуємо на рік
    const assetsDir = path.join(config.distDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      await app.register(fastifyStatic, {
        root: assetsDir,
        prefix: '/assets/',
        index: false,
        preCompressed: true, // віддає готові .br/.gz, які зібрав Vite
        maxAge: '365d',
        immutable: true,
      });
    }
    // Решта статики (favicon, manifest тощо): на добу
    await app.register(fastifyStatic, {
      root: config.distDir,
      index: false,
      preCompressed: true,
      maxAge: '1d',
      decorateReply: false,
    });
  } else {
    app.log.warn(`Немає ${indexFile}: фронтенд не віддається. Виконай npm run build.`);
  }

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'not_found' });
    return reply.code(404).type('text/plain; charset=utf-8').send('Тут нічого немає ☕');
  });

  return app;
}
