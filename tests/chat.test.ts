import { readFileSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildContext, docChunks, handleChat, pricingChunk, purgeChatUsage, reindexChat, retrieve, systemPrompt, terms, vnDay, type ChatConfig } from '../app/lib/chat.server';
import { chatCopy, retryCountdown } from '../app/lib/chat-copy';
import { homeFaq } from '../app/lib/copy';
import { money } from '../app/lib/money';
import { shopConfig } from '../app/lib/config';
import type { Env } from '../app/lib/types';

let mf: Miniflare, db: D1Database, env: Env;
const now = Date.UTC(2026, 9, 25, 5), base = shopConfig.chatbot;
const cfg = (over: Partial<ChatConfig> = {}) => ({ ...base, ...over }) as ChatConfig;
beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("ok"); } }', d1Databases: ['DB'], compatibilityDate: '2026-07-30' });
  db = await mf.getD1Database('DB') as unknown as D1Database;
  env = { DB: db, GEMINI_API_KEY: 'test-key', CHAT_IP_SALT: 'test-salt' } as Env;
  for (const file of ['0001_store', '0002_quotes', '0003_ops', '0004_shipping', '0005_vtp_order', '0006_chat']) { const sql = readFileSync(`migrations/${file}.sql`, 'utf8'); await db.prepare(sql).run().catch(async () => { await db.exec(sql); }); }
});
beforeEach(async () => {
  for (const t of ['chat_usage', 'chat_spend', 'chat_chunks', 'rate_limits', 'audit_logs', 'variants', 'products']) await db.prepare(`DELETE FROM ${t}`).run();
  await db.prepare("INSERT INTO products(id,slug,name,category,description,image,created_at,updated_at) VALUES('dragon','rong-khop-dong','Rồng khớp động','mo-hinh-3d','Rồng in 3D có khớp cử động.','/images/dragon.webp',?,?)").bind(now, now).run();
  await db.prepare("INSERT INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('d1','dragon','D1','Cam','#f4511e','PLA',89000,7)").run();
  await reindexChat(env, now);
});
afterAll(async () => { await mf?.dispose(); });

const req = (message: unknown, init: { ip?: string; origin?: string; method?: string } = {}) => new Request('https://shop.test/api/chat', {
  method: init.method || 'POST', headers: { 'Content-Type': 'application/json', Origin: init.origin ?? 'https://shop.test', 'CF-Connecting-IP': init.ip || '203.0.113.9' },
  body: init.method === 'GET' ? undefined : JSON.stringify({ message }),
});
const sse = (parts: string[], usage = { promptTokenCount: 1000, candidatesTokenCount: 100 }) => {
  const events = parts.map((t, i) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] } }], ...(i === parts.length - 1 ? { usageMetadata: usage } : {}) })}\r\n\r\n`).join('');
  return new Response(events, { headers: { 'Content-Type': 'text/event-stream' } });
};
function fakeFetch(parts = ['Rồng khớp động ', 'giá 89.000đ ạ.']) {
  const calls: { url: string; body: any }[] = [];
  const f = (async (url: string, init: RequestInit) => { calls.push({ url, body: JSON.parse(String(init.body)) }); return sse(parts); }) as unknown as typeof fetch;
  return { f, calls };
}
const events = async (res: Response) => (await res.text()).split('\n\n').filter(Boolean).map(l => JSON.parse(l.replace(/^data: /, '')));

describe('chatbot retrieval', () => {
  it('folds Vietnamese and finds a product by an unaccented question', async () => {
    expect(terms('Giá Rồng')).toEqual(expect.arrayContaining(['gia', 'rong', 'gia_rong']));
    const hits = await retrieve(env, 'rong khop dong gia bao nhieu');
    expect(hits[0].id).toBe('product:dragon');
  });
  it('indexes policy docs and the 36 Q&A plus homepage FAQ', async () => {
    const n = (await db.prepare("SELECT kind,count(*) n FROM chat_chunks GROUP BY kind").all<{ kind: string; n: number }>()).results;
    const by = Object.fromEntries(n.map(r => [r.kind, r.n]));
    expect(by.qa).toBe(36); expect(by.faq).toBe(10); expect(by.policy).toBeGreaterThan(5); expect(by.product).toBe(1);
  });
  it('finds nothing for an off-topic question', async () => {
    expect(await retrieve(env, 'Viết giúp tôi bài thơ về mùa thu')).toEqual([]);
  });
  it('fills the system prompt and injects live price from D1', async () => {
    const { f, calls } = fakeFetch();
    await db.prepare("UPDATE variants SET price=99000 WHERE id='d1'").run();
    await (await handleChat(req('Rồng khớp động giá bao nhiêu?'), env, { fetch: f, now })).text();
    const sys = calls[0].body.systemInstruction.parts[0].text as string;
    expect(sys).toContain(shopConfig.shop.name); expect(sys).not.toContain('{NGU_CANH_RAG}'); expect(sys).not.toContain('{TEN_SHOP}');
    expect(sys).toMatch(/99\.000/); expect(sys).not.toMatch(/89\.000/);
    expect(calls[0].body.generationConfig.maxOutputTokens).toBe(base.maxOutputTokens);
    expect(systemPrompt('X')).toContain('FALLBACK');
  });
});

describe('/api/chat', () => {
  it('streams the answer and records tokens and cost', async () => {
    const { f, calls } = fakeFetch();
    const res = await handleChat(req('Rồng khớp động giá bao nhiêu?'), env, { fetch: f, now });
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const ev = await events(res);
    expect(ev.map(e => e.t || '').join('')).toBe('Rồng khớp động giá 89.000đ ạ.');
    expect(ev.at(-1)).toEqual({ done: true });
    expect(calls[0].url).toContain(`models/${base.model}:streamGenerateContent`);
    const spend = await db.prepare('SELECT * FROM chat_spend').first<any>();
    expect(spend).toMatchObject({ requests: 1, input_tokens: 1000, output_tokens: 100 });
    expect(spend.cost_vnd).toBeCloseTo((1000 * base.usdPer1MInputTokens + 100 * base.usdPer1MOutputTokens) / 1e6 * base.vndPerUsd);
  });
  it('turns a FALLBACK reply into {fallback:true} without leaking the word', async () => {
    const { f } = fakeFetch(['FALL', 'BACK']);
    const ev = await events(await handleChat(req('phí ship bao nhiêu'), env, { fetch: f, now }));
    expect(ev).toEqual([{ fallback: true }]);
  });
  it('returns fallback for off-topic questions without calling the API', async () => {
    const { f, calls } = fakeFetch();
    const res = await handleChat(req('Viết giúp tôi bài thơ về mùa thu'), env, { fetch: f, now });
    expect(await res.json()).toEqual({ fallback: true }); expect(calls).toHaveLength(0);
  });
  it('rejects input over maxInputChars without calling the API', async () => {
    const { f, calls } = fakeFetch();
    const res = await handleChat(req('a'.repeat(base.maxInputChars + 1)), env, { fetch: f, now });
    expect(res.status).toBe(400); expect(await res.json()).toEqual({ error: 'too_long' }); expect(calls).toHaveLength(0);
    expect((await handleChat(req('rồng ' + 'a'.repeat(base.maxInputChars - 5)), env, { fetch: f, now })).status).toBe(200);
  });
  it('blocks a visitor after perVisitorPerDay questions with 429 and Retry-After', async () => {
    const { f, calls } = fakeFetch();
    const c = cfg({ perVisitorPerDay: 2, burstPerWindow: 99 });
    for (let i = 0; i < 2; i++) await (await handleChat(req('rồng giá'), env, { fetch: f, now, config: c })).text();
    const res = await handleChat(req('rồng giá'), env, { fetch: f, now, config: c });
    expect(res.status).toBe(429); expect(await res.json()).toEqual({ error: 'rate_limited', reason: 'daily', fallback: true });
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0); expect(calls).toHaveLength(2);
    expect((await handleChat(req('rồng giá', { ip: '198.51.100.1' }), env, { fetch: f, now, config: c })).status).toBe(200);
  });
  it('blocks everyone after globalPerDay', async () => {
    const { f, calls } = fakeFetch();
    const c = cfg({ globalPerDay: 2, burstPerWindow: 99 });
    for (const ip of ['10.0.0.1', '10.0.0.2']) await (await handleChat(req('rồng giá', { ip }), env, { fetch: f, now, config: c })).text();
    const res = await handleChat(req('rồng giá', { ip: '10.0.0.3' }), env, { fetch: f, now, config: c });
    expect(res.status).toBe(429); expect((await res.json() as any).reason).toBe('shop'); expect(calls).toHaveLength(2);
  });
  it('applies the short burst limit', async () => {
    const { f } = fakeFetch();
    const c = cfg({ burstPerWindow: 1 });
    await (await handleChat(req('rồng giá'), env, { fetch: f, now, config: c })).text();
    const res = await handleChat(req('rồng giá'), env, { fetch: f, now, config: c });
    expect(res.status).toBe(429); expect((await res.json() as any)).toMatchObject({ reason: 'burst', fallback: false });
  });
  it('stops calling the API once the monthly budget is spent', async () => {
    const { f, calls } = fakeFetch();
    await db.prepare("INSERT INTO chat_spend(month,requests,cost_vnd) VALUES('2026-10',1,?)").bind(base.monthlyBudgetVnd).run();
    const res = await handleChat(req('rồng giá'), env, { fetch: f, now });
    expect(res.status).toBe(429); expect((await res.json() as any).reason).toBe('shop'); expect(calls).toHaveLength(0);
  });
  it('alerts once when spend crosses alertAtPercent', async () => {
    const { f } = fakeFetch();
    await db.prepare("INSERT INTO chat_spend(month,requests,cost_vnd) VALUES('2026-10',1,?)").bind(base.monthlyBudgetVnd * base.alertAtPercent / 100 - 0.001).run();
    for (let i = 0; i < 2; i++) await (await handleChat(req('rồng giá', { ip: `10.1.0.${i}` }), env, { fetch: f, now })).text();
    const n = (await db.prepare("SELECT count(*) n FROM audit_logs WHERE action='chat_budget_alert'").first<{ n: number }>())!.n;
    expect(n).toBe(1);
  });
  it('refuses cross-origin and GET', async () => {
    expect((await handleChat(req('rồng', { origin: 'https://evil.test' }), env, { now })).status).toBe(403);
    expect((await handleChat(req('', { method: 'GET' }), env, { now })).status).toBe(405);
  });
  it('returns {error:"server"} when Gemini fails', async () => {
    const f = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    const res = await handleChat(req('rồng giá'), env, { fetch: f, now });
    expect(res.status).toBe(502); expect(await res.json()).toEqual({ error: 'server' });
  });
});

describe('chat privacy', () => {
  it('stores only a salted hash of the IP and purges old days', async () => {
    const { f } = fakeFetch();
    await (await handleChat(req('rồng giá', { ip: '203.0.113.77' }), env, { fetch: f, now })).text();
    const rows = (await db.prepare('SELECT * FROM chat_usage').all<any>()).results;
    expect(JSON.stringify(rows)).not.toContain('203.0.113.77');
    const subjects = rows.map(r => r.subject).sort();
    expect(subjects[0]).toBe('shop'); expect(subjects[1]).toMatch(/^v:[0-9a-f]{64}$/); expect(subjects).toHaveLength(2);
    const burst = (await db.prepare('SELECT key,expires_at FROM rate_limits').all<any>()).results;
    expect(burst).toHaveLength(1); expect(burst[0].key).toMatch(/^[0-9a-f]{64}$/); expect(JSON.stringify(burst)).not.toContain('203.0.113.77');
    expect(burst[0].expires_at - now).toBeLessThanOrEqual(base.burstWindowSeconds * 1000);
    await purgeChatUsage(env, now + (base.usageRetentionDays + 1) * 86400000);
    expect((await db.prepare('SELECT count(*) n FROM rate_limits').first<{ n: number }>())!.n).toBe(0);
    expect((await db.prepare('SELECT count(*) n FROM chat_usage').first<{ n: number }>())!.n).toBe(0);
    expect(vnDay(Date.UTC(2026, 9, 25, 18))).toBe('2026-10-26');
  });
});

describe('chat copy and FAQ', () => {
  it('fills tokens and limits from config', () => {
    expect(JSON.stringify(chatCopy)).not.toMatch(/\{TEN_SHOP\}|\[PH/);
    expect(chatCopy.quota_daily).toContain(`${base.perVisitorPerDay} câu`);
    expect(chatCopy.too_long).toContain(`${base.maxInputChars} ký tự`);
    expect(chatCopy.bot_chao_alt).toBe(`Linh vật ${shopConfig.shop.name} vẫy tay chào`); expect(shopConfig.shop.name).toBe('AXT 3D');
    expect(retryCountdown(42)).toContain('42'); expect(retryCountdown(90)).toContain('1:30');
  });
  it('homepage FAQ has the 10 items and JSON-LD text matches', () => {
    const items = homeFaq();
    expect(items).toHaveLength(10);
    expect(items.every(i => i.q && i.a && !/\{config\./.test(i.a))).toBe(true);
  });
});

describe('chatbot never states prices that are not in config or D1', () => {
  const allowed = () => { const c = shopConfig; return new Set([money(c.shipping.fallbackFee), money(c.customPrint.minOrder), `${Math.round(c.deposit.rate * 100)}%`]); };
  it('every amount and percentage in the bot knowledge comes from shop-config', () => {
    const ok = allowed();
    for (const ch of docChunks()) {
      const found = `${ch.title} ${ch.body}`.match(/\d{1,3}(?:\.\d{3})+\s?(?:đ|₫|VND)|(?<![±\d,.])\d+(?:[.,]\d+)?\s?%/g) || []; // ±x% is a print tolerance, not money
      for (const f of found) expect(ok.has(f.replace(/\s/g, '')) || ok.has(f), `${ch.id}: ${f}`).toBe(true);
      expect(`${ch.title} ${ch.body}`, ch.id).not.toMatch(/\{config\./);
    }
  });
  it('pricing chunk follows config changes', () => {
    const before = pricingChunk().body; expect(before).toContain(money(shopConfig.shipping.fallbackFee)); expect(before).toContain(`${Math.round(shopConfig.deposit.rate * 100)}%`);
  });
  it('product prices come live from D1, not from the index', async () => {
    await db.prepare("UPDATE variants SET price=123000 WHERE id='d1'").run();
    const rows = (await db.prepare("SELECT id,kind,title,url,body,terms,ref FROM chat_chunks WHERE ref='dragon'").all()).results as never[];
    const ctx = await buildContext(env, rows);
    expect(ctx).toContain(money(123000)); expect(ctx).not.toContain(money(89000));
    const indexed = (await db.prepare("SELECT body FROM chat_chunks WHERE ref='dragon'").first<{ body: string }>())!.body; expect(indexed).not.toMatch(/\d{2,3}\.\d{3}/);
  });
});
