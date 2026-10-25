import { readFileSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { calcOrderTotals } from '../app/lib/money';
import { validateModelFile } from '../app/lib/model-file';
import { calcQuote, quoteLimits } from '../app/lib/quote';
import { createOrder } from '../app/lib/orders.server';
import { createQuote, expireQuotes, quoteByCode, respondQuote, saveQuotePrice } from '../app/lib/quotes.server';
import type { Env } from '../app/lib/types';

const ascii = new TextEncoder().encode('solid demo\nfacet normal 0 0 0\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid demo\n');
function binaryStl() {
  const bytes = new Uint8Array(84 + 50);
  new DataView(bytes.buffer).setUint32(80, 1, true);
  return bytes;
}

const obj = new TextEncoder().encode('# demo\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');

describe('model files and quote formula', () => {
  it('reads upload limits, colors, and max quantity from shop config', () => {
    const limits = quoteLimits();
    expect(limits).toMatchObject({ maxFileMB: 50, maxFiles: 5, allowedExt: ['stl', '3mf', 'obj'], maxQty: 50 });
    expect(limits.colors.map(color => color.name)).toEqual(['Trắng', 'Đen', 'Xám', 'Đỏ', 'Cam', 'Vàng', 'Xanh lá', 'Xanh dương', 'Tím', 'Hồng']);
  });
  it('accepts STL, 3MF, and OBJ content and rejects lookalikes', () => {
    expect(validateModelFile('part.stl', ascii)).toBe('stl');
    expect(validateModelFile('part.STL', binaryStl())).toBe('stl');
    expect(validateModelFile('part.3mf', new Uint8Array([0x50, 0x4b, 3, 4, ...new Uint8Array(20)]))).toBe('3mf');
    expect(validateModelFile('part.obj', obj)).toBe('obj');
    expect(() => validateModelFile('part.obj', ascii)).toThrow(/OBJ/);
    expect(() => validateModelFile('part.txt', obj)).toThrow(/\.stl, \.3mf hoặc \.obj/);
    expect(() => validateModelFile('part.stl', new TextEncoder().encode('solid only a header without facets end'))).toThrow();
    expect(() => validateModelFile('part.3mf', ascii)).toThrow();
  });
  it('prices from customPrint.formula and rounds up to a thousand', () => {
    const plain = calcQuote({ materialId: 'PLA', colorName: 'Trắng', postProcess: 'none', quantity: 1, grams: 20, hours: 1 });
    expect(plain.amount).toBe(50000);
    const painted = calcQuote({ materialId: 'PLA', colorName: 'Trắng', postProcess: 'paint', quantity: 2, grams: 80, hours: 3 });
    expect(painted.amount).toBe(409000);
    expect(calcOrderTotals([{ unitPrice: plain.amount, quantity: 1 }], 20000)).toMatchObject({ depositAmount: 35000, codAmount: 35000, shippingFee: 20000 });
  });
});

let mf: Miniflare;
let env: Env;
const now = Date.UTC(2026, 9, 24, 12);
beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("ok"); } }', d1Databases: ['DB'], r2Buckets: ['IMAGES'], compatibilityDate: '2026-07-30' });
  const db = await mf.getD1Database('DB') as unknown as D1Database;
  const images = await mf.getR2Bucket('IMAGES') as unknown as R2Bucket;
  env = { DB: db, IMAGES: images } as Env;
  for (const file of ['migrations/0001_store.sql', 'migrations/0002_quotes.sql', 'migrations/0003_ops.sql', 'migrations/0004_shipping.sql', 'migrations/0007_accounts.sql', 'migrations/0008_order_province.sql']) {
    const sql = readFileSync(file, 'utf8');
    await db.prepare(sql).run().catch(async () => { await db.exec(sql); });
  }
});
beforeEach(async () => {
  for (const table of ['quote_events', 'quote_files', 'quotes', 'payments', 'order_events', 'order_items', 'orders', 'customers', 'variants', 'products']) await env.DB.prepare(`DELETE FROM ${table}`).run();
  await env.DB.prepare("INSERT INTO products(id,slug,name,category,image,created_at,updated_at) VALUES('p','product','Product','mo-hinh-3d','/images/dragon.webp',?,?)").bind(now, now).run();
  await env.DB.prepare("INSERT INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('v','p','SKU','Cam','#d86b38','PLA',149000,5)").run();
});
afterAll(async () => { await mf?.dispose(); });

describe('quote orders', () => {
  const input = { project: 'Khay thử', name: 'Nguyễn Văn An', phone: '0912345678', email: '', note: 'in thử', materialId: 'PLA', colorName: 'Trắng', postProcess: 'none', quantity: 1 };
  it('keeps catalog stock when a quote becomes a deposit order', async () => {
    const quote = await createQuote(env, input, [{ filename: 'dragon.stl', bytes: ascii }], 'b'.repeat(64), now);
    expect(quote.computed_amount).toBeNull();
    expect(quote.status).toBe('cho_bao_gia');
    await saveQuotePrice(env, quote.code, 'owner@shop.test', { grams: 80, hours: 3, materialId: 'PLA', postProcess: 'paint', quantity: 2, colorName: 'Trắng', override: 420000, reason: 'File lớn hơn ước tính', leadNote: '4 ngày', reject: false }, now + 1);
    const saved = (await quoteByCode(env.DB, quote.code))!.quote;
    expect(saved.computed_amount).toBe(409000);
    expect(saved.status).toBe('da_bao_gia');
    const accepted = await respondQuote(env, saved, true, { street: '12 Đường Mẫu', provinceId: 2, wardId: 49236, provinceName: 'Thành phố Hồ Chí Minh', wardName: 'Phường Bến Thành' }, now + 2);
    expect(accepted?.code).toMatch(/^[A-F0-9]{12}$/);
    const order = await env.DB.prepare('SELECT status,deposit_amount,cod_amount,channel FROM orders WHERE code=?').bind(accepted!.code).first<{ status: string; deposit_amount: number; cod_amount: number; channel: string }>();
    expect(order).toMatchObject({ status: 'cho_coc', deposit_amount: 220000, cod_amount: 220000, channel: 'quote' });
    expect((await env.DB.prepare("SELECT stock FROM variants WHERE id='v'").first<{ stock: number }>())!.stock).toBe(5);
    const catalog = await createOrder(env, { name: 'Nguyễn Văn An', phone: '0912345678', street: '12 Đường Mẫu', provinceId: 2, wardId: 49236, provinceName: 'Thành phố Hồ Chí Minh', wardName: 'Phường Bến Thành', note: '', checkoutKey: crypto.randomUUID(), items: [{ variantId: 'v', quantity: 1 }] }, 'a'.repeat(64), now);
    expect(catalog.deposit_amount).toBe(85000);
    expect((await env.DB.prepare("SELECT stock FROM variants WHERE id='v'").first<{ stock: number }>())!.stock).toBe(4);
  });
  it('expires an unanswered quote once', async () => {
    const quote = await createQuote(env, input, [{ filename: 'a.3mf', bytes: new Uint8Array([0x50, 0x4b, 3, 4, ...new Uint8Array(20)]) }], 'c'.repeat(64), now);
    await saveQuotePrice(env, quote.code, 'owner@shop.test', { grams: 20, hours: 1, materialId: 'PLA', postProcess: 'none', quantity: 1, colorName: 'Trắng', override: null, reason: '', leadNote: '', reject: false }, now);
    const sent = (await quoteByCode(env.DB, quote.code))!.quote;
    await expireQuotes(env.DB, sent.expires_at - 1);
    expect((await quoteByCode(env.DB, quote.code))!.quote.status).toBe('da_bao_gia');
    await expireQuotes(env.DB, sent.expires_at);
    await expireQuotes(env.DB, sent.expires_at + 1);
    expect((await quoteByCode(env.DB, quote.code))!.quote.status).toBe('het_han');
  });
});
