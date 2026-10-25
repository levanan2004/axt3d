import { readFileSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { recordPayment } from '../app/lib/orders.server';
import { codSettlement, profitFromFigures } from '../app/lib/ops';
import { createPosSale } from '../app/lib/ops.server';
import type { Env } from '../app/lib/types';

let mf: Miniflare;
let env: Env;
const now = Date.UTC(2026, 9, 24, 12);
beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("ok"); } }', d1Databases: ['DB'], r2Buckets: ['IMAGES'], compatibilityDate: '2026-07-30' });
  const db = await mf.getD1Database('DB') as unknown as D1Database;
  env = { DB: db, IMAGES: await mf.getR2Bucket('IMAGES') as unknown as R2Bucket } as Env;
  for (const file of ['migrations/0001_store.sql', 'migrations/0002_quotes.sql', 'migrations/0003_ops.sql']) {
    const sql = readFileSync(file, 'utf8');
    await db.prepare(sql).run().catch(async () => { await db.exec(sql); });
  }
});
beforeEach(async () => {
  for (const table of ['cod_reconciliations', 'production_jobs', 'payments', 'order_events', 'order_items', 'orders', 'customers', 'variants', 'products']) await env.DB.prepare(`DELETE FROM ${table}`).run();
  await env.DB.prepare("INSERT INTO products(id,slug,name,category,image,created_at,updated_at) VALUES('p','product','Product','mo-hinh-3d','/images/dragon.webp',?,?)").bind(now, now).run();
  await env.DB.prepare("INSERT INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('v','p','SKU','Cam','#d86b38','PLA',149000,5)").run();
});
afterAll(async () => { await mf?.dispose(); });

describe('phase 3 money', () => {
  it('flags COD and profit when the carrier fee rate is null', () => {
    expect(codSettlement(64000, 20000)).toEqual({ feeStatus: 'needs fee config', carrierFee: null, expected: null });
    expect(profitFromFigures({ revenue: 100000, materialCost: 1000, machineCost: 0, electricityCost: 0, postProcessCost: 0, carrierCodFee: null, shippingCostPaid: 0, refunds: 0 }).feeStatus).toBe('needs fee config');
  });
  it('sells at the counter for the full goods amount and decrements stock', async () => {
    const sale = await createPosSale(env, { items: [{ variantId: 'v', quantity: 1 }], method: 'cash', actor: 'owner@shop.test' }, now);
    expect(sale).toMatchObject({ status: 'hoan_thanh', deposit_amount: 149000, cod_amount: 0, channel: 'pos' });
    expect(sale.content.startsWith('POS')).toBe(true);
    expect((await env.DB.prepare("SELECT stock FROM variants WHERE id='v'").first<{ stock: number }>())!.stock).toBe(4);
    const bank = await createPosSale(env, { items: [{ variantId: 'v', quantity: 1 }], method: 'bank_transfer_qr', actor: 'owner@shop.test' }, now);
    expect(bank.status).toBe('cho_coc');
    await recordPayment(env.DB, { id: 77, transferType: 'in', transferAmount: 149000, content: bank.content, accountNumber: 'LOCAL' }, now);
    await recordPayment(env.DB, { id: 77, transferType: 'in', transferAmount: 149000, content: bank.content, accountNumber: 'LOCAL' }, now);
    const paid = await env.DB.prepare('SELECT status FROM orders WHERE code=?').bind(bank.code).first<{ status: string }>();
    expect(paid?.status).toBe('hoan_thanh');
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM payments').first<{ n: number }>())!.n).toBe(2);
  });
});
