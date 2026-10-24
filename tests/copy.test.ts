import { describe, expect, it } from 'vitest';
import { legalCopy, productDescription, renderMarkdown, renderTokens, routeSeo } from '../app/lib/copy';
import { extensionPhrase } from '../app/lib/quote';
import { robotsTxt } from '../app/lib/http';

describe('copy tokens', () => {
  it('renders money and rates from shop config', () => {
    expect(renderTokens('Cọc {config.deposit.rate}, phí ship {config.shipping.flatFee}.')).toBe('Cọc 50%, phí ship 20.000đ.');
  });
  it('keeps unknown identity placeholders visible', () => {
    expect(renderTokens('Đơn vị {TEN_SHOP} tại {DIA_CHI}.')).toBe('Đơn vị AXT 3D tại {DIA_CHI}.');
  });
  it('escapes markdown text', () => {
    expect(renderMarkdown('**<script>alert(1)</script>**')).toBe('<p><strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong></p>');
  });
  it('falls back when a product description file is absent', () => {
    expect(productDescription('khong-co', 'Mô tả gốc')).toBe('Mô tả gốc');
  });
  it('renders legal pages and replaces hard-coded upload types with config', () => {
    const terms = legalCopy('dieu-khoan');
    expect(terms?.body).toContain('Phạm vi');
    const datIn = routeSeo('/dat-in');
    expect(datIn?.title).toContain('AXT 3D');
    expect(datIn?.description).toContain(extensionPhrase());
    expect(datIn?.description).not.toMatch(/STL\/3MF|STL hoặc 3MF/);
    expect(renderTokens('Kéo thả file STL / 3MF vào đây. Tối đa {config dung lượng} MB.')).toContain(extensionPhrase());
  });
});

describe('robots.txt', () => {
  it('disallows admin, pos and api on production', () => {
    const text = robotsTxt({ APP_ENV: 'production', SITE_URL: 'https://shop.example' });
    expect(text).toContain('Allow: /');
    expect(text).toContain('Disallow: /admin');
    expect(text).toContain('Disallow: /pos');
    expect(text).toContain('Disallow: /api/');
    expect(text).toContain('Sitemap: https://shop.example/sitemap.xml');
  });
  it('keeps local crawlers out unless ALLOW_INDEXING=true', () => {
    const closed = robotsTxt({ APP_ENV: 'local', SITE_URL: 'http://localhost:5173', ALLOW_INDEXING: '' });
    expect(closed).toContain('Disallow: /\n');
    expect(closed).not.toContain('Allow: /');
    const open = robotsTxt({ APP_ENV: 'local', SITE_URL: 'http://localhost:5173', ALLOW_INDEXING: 'true' });
    expect(open).toContain('Allow: /');
    expect(open).toContain('Disallow: /admin');
    expect(open).toContain('Disallow: /pos');
    expect(open).toContain('Disallow: /api/');
    expect(open).not.toContain('Disallow: /\n');
  });
});
