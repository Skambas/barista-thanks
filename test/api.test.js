import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it, expect } from 'vitest';
import { buildApp } from '../server/app.js';
import { openStore } from '../server/db.js';

const TEMPLATE =
  '<html><head></head><body data-jar-url="{{MONOBANK_JAR_URL}}" data-signature="{{BARISTA_SIGNATURE}}"></body></html>';

const baseConfig = {
  trustProxy: false,
  distDir: path.join(os.tmpdir(), 'no-such-dist-dir'),
  jarUrl: 'https://send.monobank.ua/jar/abc',
  signature: '- Бариста',
  siteUrl: '',
};

const cleanup = [];
afterEach(async () => {
  for (const fn of cleanup.splice(0)) await fn();
});

async function makeApp(overrides = {}) {
  const store = openStore();
  store.add('Перша фраза');
  const app = await buildApp({ store, config: { ...baseConfig, ...overrides } });
  cleanup.push(() => app.close());
  return app;
}

describe('API', () => {
  it('GET /api/phrases віддає активні фрази з коротким кешем і ETag', async () => {
    const app = await makeApp();
    const res = await app.inject({ url: '/api/phrases' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(res.headers.etag).toBeTruthy();
    expect(res.json()).toEqual([{ id: 1, text: 'Перша фраза', rare: false }]);
  });

  it('повторний запит з If-None-Match: 304', async () => {
    const app = await makeApp();
    const first = await app.inject({ url: '/api/phrases' });
    const res = await app.inject({ url: '/api/phrases', headers: { 'if-none-match': first.headers.etag } });
    expect(res.statusCode).toBe(304);
  });

  it('/healthz', async () => {
    const app = await makeApp();
    const res = await app.inject({ url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('невідомий /api/...: 404 у JSON', async () => {
    const app = await makeApp();
    const res = await app.inject({ url: '/api/nothing' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
  });

  it('заголовки безпеки: CSP без unsafe-inline, HSTS лише для HTTPS', async () => {
    const app = await makeApp({ trustProxy: true });
    const http = await app.inject({ url: '/healthz' });
    expect(http.headers['content-security-policy']).toContain("script-src 'self'");
    expect(http.headers['content-security-policy']).not.toContain('unsafe-inline');
    expect(http.headers['x-content-type-options']).toBe('nosniff');
    expect(http.headers['strict-transport-security']).toBeUndefined();

    const https = await app.inject({ url: '/healthz', headers: { 'x-forwarded-proto': 'https' } });
    expect(https.headers['strict-transport-security']).toContain('max-age=');
  });

  it('віддає index.html з підставленим конфігом, статику з кешем і 404 на решту', async () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'));
    cleanup.push(() => fs.rmSync(dist, { recursive: true, force: true }));
    fs.mkdirSync(path.join(dist, 'assets'));
    fs.writeFileSync(path.join(dist, 'index.html'), TEMPLATE);
    fs.writeFileSync(path.join(dist, 'assets', 'app-abc123.js'), 'console.log(1)');
    fs.writeFileSync(path.join(dist, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');

    const app = await makeApp({ distDir: dist });

    for (const url of ['/', '/index.html']) {
      const page = await app.inject({ url });
      expect(page.statusCode).toBe(200);
      expect(page.headers['cache-control']).toBe('no-cache');
      expect(page.body).toContain('data-signature="- Бариста"');
      expect(page.body).toContain('data-jar-url="https://send.monobank.ua/jar/abc"');
      expect(page.body).not.toContain('{{');
    }

    const asset = await app.inject({ url: '/assets/app-abc123.js' });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers['cache-control']).toContain('immutable');

    const icon = await app.inject({ url: '/favicon.svg' });
    expect(icon.headers['cache-control']).toBe('public, max-age=86400');

    const missing = await app.inject({ url: '/nope' });
    expect(missing.statusCode).toBe(404);
  });
});
