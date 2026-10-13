import { describe, it, expect } from 'vitest';
import { renderIndex } from '../server/html.js';

const TEMPLATE =
  '<html><head><title>t</title></head><body data-jar-url="{{MONOBANK_JAR_URL}}" data-signature="{{BARISTA_SIGNATURE}}"></body></html>';
const base = { jarUrl: 'https://send.monobank.ua/jar/abc', signature: '- Бариста', siteUrl: '' };

describe('renderIndex', () => {
  it('підставляє значення й екранує HTML', () => {
    const html = renderIndex(TEMPLATE, { ...base, signature: '"><script>alert(1)</script>' });
    expect(html).toContain('data-jar-url="https://send.monobank.ua/jar/abc"');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('{{');
  });

  it('порожнє посилання на банку дає порожній атрибут', () => {
    expect(renderIndex(TEMPLATE, { ...base, jarUrl: '' })).toContain('data-jar-url=""');
  });

  it('спецпослідовності $& у значеннях не ламають шаблон', () => {
    const html = renderIndex(TEMPLATE, { ...base, signature: 'a$&b$`c' });
    expect(html).toContain('data-signature="a$&amp;b$`c"');
  });

  it('без SITE_URL: є og:title, але немає абсолютних og:url та og:image', () => {
    const html = renderIndex(TEMPLATE, base, { hasOgImage: true });
    expect(html).toContain('og:title');
    expect(html).not.toContain('og:url');
    expect(html).not.toContain('og:image');
  });

  it('з SITE_URL: абсолютні og:url та og:image; apple-touch-icon лише за прапорцем', () => {
    const cfg = { ...base, siteUrl: 'https://kava.example.com' };
    const html = renderIndex(TEMPLATE, cfg, { hasOgImage: true, hasTouchIcon: true });
    expect(html).toContain('content="https://kava.example.com/"');
    expect(html).toContain('content="https://kava.example.com/og.png"');
    expect(html).toContain('rel="apple-touch-icon"');
    const plain = renderIndex(TEMPLATE, cfg);
    expect(plain).not.toContain('og:image');
    expect(plain).not.toContain('apple-touch-icon');
  });
});
