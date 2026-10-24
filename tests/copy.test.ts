import { describe, expect, it } from 'vitest';
import { productDescription, renderMarkdown, renderTokens } from '../app/lib/copy';
import { robotsTxt } from '../app/lib/http';

describe('copy tokens', () => {
  it('renders money and rates from shop config', () => {
    expect(renderTokens('Cọc {config.deposit.rate}, phí ship {config.shipping.flatFee}.')).toBe('Cọc 50%, phí ship 20.000đ.');
  });
  it('keeps unknown identity placeholders visible', () => {
    expect(renderTokens('Đơn vị {TEN_SHOP} tại {DIA_CHI}.')).toBe('Đơn vị {TEN_SHOP} tại {DIA_CHI}.');
  });
  it('escapes markdown text', () => {
    expect(renderMarkdown('**<script>alert(1)</script>**')).toBe('<p><strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong></p>');
  });
  it('falls back when a product description file is absent', () => {
    expect(productDescription('rong-khop-dong', 'Mô tả gốc')).toBe('Mô tả gốc');
  });
});

describe('robots.txt', () => {
  it('disallows admin, pos and api on production', () => {
    const text = robotsTxt({ APP_ENV: 'production', SITE_URL: 'https://shop.example' });
    expect(text).toContain('Disallow: /admin');
    expect(text).toContain('Disallow: /pos');
    expect(text).toContain('Disallow: /api/');
    expect(text).toContain('Sitemap: https://shop.example/sitemap.xml');
  });
});
