import { categories, shopConfig } from './config';
import { homeFaq, pageCopy, renderTokens } from './copy';
import { money } from './money';
import { hash } from './security.server';
import type { Env } from './types';
import hoiDap from '../../docs/content/hoi_dap.json';
import giongVan from '../../docs/content/giong_van.md?raw';

export type ChatConfig = typeof shopConfig.chatbot;
export type ChatDeps = { fetch?: typeof fetch; now?: number; config?: ChatConfig };
export type LimitReason = 'burst' | 'daily' | 'shop';
type Chunk = { id: string; kind: string; title: string; url: string | null; body: string; terms: string; ref: string | null };

const VN_OFFSET = 7 * 3600 * 1000;
export const vnDay = (now: number) => new Date(now + VN_OFFSET).toISOString().slice(0, 10);
export const vnMonth = (now: number) => vnDay(now).slice(0, 7);
function secondsUntil(now: number, monthStep: 0 | 1) {
  const d = new Date(now + VN_OFFSET);
  const next = monthStep ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) : Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - VN_OFFSET - now) / 1000));
}

// ---------- retrieval (D1 keyword index, diacritic-insensitive) ----------
export const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
const STOP = new Set('la va co khong cho toi minh ban shop cua nao the bao nhieu gi duoc mot nhung cac voi thi de tren nay do ve khi lam hay nhe oi vay sao can muon em anh chi a ak ha the nhi roi se da dang bi tai neu hoac ma may ai'.split(' '));
export function terms(text: string) {
  const words = fold(text).split(/[^a-z0-9]+/).filter(Boolean);
  const out = new Set<string>();
  words.forEach((w, i) => {
    if (w.length >= 2 && !STOP.has(w)) out.add(w);
    const prev = words[i - 1];
    if (prev && !(STOP.has(prev) && STOP.has(w))) out.add(`${prev}_${w}`);
  });
  return [...out];
}

const legalDocs: [string, string][] = [['van_chuyen', '/van-chuyen'], ['doi_tra_hoan_tien', '/doi-tra-hoan-tien'], ['dieu_khoan', '/dieu-khoan'], ['bao_mat', '/chinh-sach-bao-mat']];
export function docChunks() {
  const chunks: Omit<Chunk, 'terms'>[] = [];
  for (const [id, url] of legalDocs) {
    const doc = pageCopy(id);
    if (!doc) continue;
    const docTitle = doc.body.match(/^#\s+(.+)$/m)?.[1] || doc.title || id;
    doc.body.split(/^##\s+/m).slice(1).forEach((section, i) => {
      const [heading, ...rest] = section.split('\n');
      const body = renderTokens(rest.filter(line => !/^Ghi chú cho/i.test(line)).join('\n').trim());
      if (body) chunks.push({ id: `doc:${id}:${i}`, kind: 'policy', title: `${docTitle} – ${heading.trim()}`, url, body, ref: null });
    });
  }
  for (const qa of hoiDap as { id: string; hoi: string; dap: string }[]) chunks.push({ id: `qa:${qa.id}`, kind: 'qa', title: qa.hoi, url: null, body: renderTokens(qa.dap), ref: null });
  homeFaq().forEach((item, i) => chunks.push({ id: `faq:${i}`, kind: 'faq', title: item.q, url: '/', body: item.a, ref: null }));
  return chunks;
}

export async function reindexChat(env: Env, now = Date.now()) {
  const { results: products } = await env.DB.prepare("SELECT p.id,p.slug,p.name,p.category,p.description FROM products p WHERE p.active=1").all<{ id: string; slug: string; name: string; category: string; description: string }>();
  const categoryName = (slug: string) => categories.find(c => c.slug === slug)?.name || slug;
  const chunks = [
    ...docChunks(),
    ...products.map(p => ({ id: `product:${p.id}`, kind: 'product', title: p.name, url: `/san-pham/${p.slug}`, body: `Sản phẩm: ${p.name}. Danh mục: ${categoryName(p.category)}. ${p.description || ''} Giá bán và tồn kho lấy trực tiếp từ cửa hàng.`.trim(), ref: p.id })),
  ];
  const stmts = [env.DB.prepare('DELETE FROM chat_chunks'), ...chunks.map(c => env.DB.prepare('INSERT INTO chat_chunks(id,kind,title,url,body,terms,ref,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(c.id, c.kind, c.title, c.url, c.body, terms(`${c.title} ${c.title} ${c.body}`).join(' '), c.ref, now))];
  await env.DB.batch(stmts);
  return { chunks: chunks.length, products: products.length };
}

export async function retrieve(env: Env, question: string, config: ChatConfig = shopConfig.chatbot, debug?: (best: number) => void) {
  let { results: rows } = await env.DB.prepare('SELECT id,kind,title,url,body,terms,ref FROM chat_chunks').all<Chunk>();
  if (!rows.length) { await reindexChat(env); rows = (await env.DB.prepare('SELECT id,kind,title,url,body,terms,ref FROM chat_chunks').all<Chunk>()).results; }
  const q = terms(question);
  const unigrams = q.filter(t => !t.includes('_'));
  if (!unigrams.length || !rows.length) return [];
  const sets = rows.map(r => new Set(r.terms.split(' ')));
  const df = new Map<string, number>();
  for (const t of q) df.set(t, sets.reduce((n, s) => n + (s.has(t) ? 1 : 0), 0));
  const idf = (t: string) => Math.log(1 + rows.length / Math.max(df.get(t) || 0, 0.5));
  const scored = rows.map((row, i) => ({ row, set: sets[i], score: q.reduce((sum, t) => sum + (sets[i].has(t) ? idf(t) * (t.includes('_') ? 2 : 1) : 0), 0) }))
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, config.retrieval.topK);
  // Off-topic guard: the best chunk must cover enough of the question, weighted by rarity (word pairs count half),
  // so a question made of common words that happen to appear somewhere never qualifies.
  const weight = (t: string) => idf(t) * (t.includes('_') ? 0.5 : 1);
  const total = q.reduce((n, t) => n + weight(t), 0);
  const best = Math.max(0, ...scored.map(x => q.reduce((n, t) => n + (x.set.has(t) ? weight(t) : 0), 0) / total));
  debug?.(best);
  if (best < config.retrieval.minCoverage) return [];
  return scored.map(x => x.row);
}

/** Context text for {NGU_CANH_RAG}. Product prices and stock are read live from D1, never from the index. */
export async function buildContext(env: Env, chunks: Chunk[]) {
  const ids = chunks.filter(c => c.ref).map(c => c.ref!);
  const live = new Map<string, string[]>();
  if (ids.length) {
    const { results } = await env.DB.prepare(`SELECT product_id,color,material,size,price,stock FROM variants WHERE active=1 AND product_id IN(${ids.map(() => '?').join(',')}) ORDER BY price`).bind(...ids).all<{ product_id: string; color: string; material: string; size: string; price: number; stock: number }>();
    for (const v of results) live.set(v.product_id, [...(live.get(v.product_id) || []), `${v.color} · ${v.material} · ${v.size}: giá ${money(v.price)}, ${v.stock > 0 ? `còn ${v.stock}` : 'hết hàng'}`]);
  }
  const parts = chunks.map(c => {
    const extra = c.ref ? `\nGiá và tồn kho hiện tại:\n${(live.get(c.ref) || ['không còn mẫu nào đang bán']).map(l => `- ${l}`).join('\n')}` : '';
    return `### ${c.title}${c.url ? ` (${c.url})` : ''}\n${c.body}${extra}`;
  });
  return `(Chỗ nào ghi dạng {TEN_GOI} trong ngoặc nhọn là thông tin shop chưa cập nhật, coi như không có dữ liệu.)\n\n${parts.join('\n\n')}`;
}

export function systemPrompt(context: string) {
  const block = giongVan.match(/## System prompt[\s\S]*?```\r?\n([\s\S]*?)```/)?.[1] || '';
  if (!block.includes('{NGU_CANH_RAG}')) throw new Error('giong_van.md system prompt missing {NGU_CANH_RAG}');
  return block.replace(/\{TEN_SHOP\}/g, shopConfig.shop.name).replace('{NGU_CANH_RAG}', () => context).trim();
}

// ---------- limits and spend ----------
async function salt(env: Env) {
  if (env.CHAT_IP_SALT) return env.CHAT_IP_SALT;
  await env.DB.prepare("INSERT OR IGNORE INTO chat_meta(key,value) VALUES('ip_salt',?)").bind(crypto.randomUUID() + crypto.randomUUID()).run();
  return (await env.DB.prepare("SELECT value FROM chat_meta WHERE key='ip_salt'").first<{ value: string }>())!.value;
}
/** Only a salted, day-scoped SHA-256 of the IP is stored, never the IP itself. */
export async function visitorKey(env: Env, request: Request, day: string) {
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  return `v:${await hash(`${await salt(env)}:${day}:${ip}`)}`;
}

export function costVnd(inputTokens: number, outputTokens: number, config: ChatConfig = shopConfig.chatbot) {
  return (inputTokens * config.usdPer1MInputTokens + outputTokens * config.usdPer1MOutputTokens) / 1e6 * config.vndPerUsd;
}

export async function checkLimits(env: Env, request: Request, now: number, config: ChatConfig): Promise<{ reason: LimitReason; retryAfter: number } | null> {
  const day = vnDay(now);
  const spend = await env.DB.prepare('SELECT cost_vnd FROM chat_spend WHERE month=?').bind(vnMonth(now)).first<{ cost_vnd: number }>();
  if ((spend?.cost_vnd || 0) >= config.monthlyBudgetVnd) return { reason: 'shop', retryAfter: secondsUntil(now, 1) };
  const visitor = await visitorKey(env, request, day);
  const window = config.burstWindowSeconds * 1000, bucket = Math.floor(now / window);
  const burst = await env.DB.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(await hash(`chat-burst:${visitor}:${bucket}`), (bucket + 1) * window).first<{ count: number }>();
  if ((burst?.count || 0) > config.burstPerWindow) return { reason: 'burst', retryAfter: Math.max(1, Math.ceil(((bucket + 1) * window - now) / 1000)) };
  const used = await env.DB.prepare('SELECT count FROM chat_usage WHERE day=? AND subject=?').bind(day, visitor).first<{ count: number }>();
  if ((used?.count || 0) >= config.perVisitorPerDay) return { reason: 'daily', retryAfter: secondsUntil(now, 0) };
  const shop = await env.DB.prepare("SELECT count FROM chat_usage WHERE day=? AND subject='shop'").bind(day).first<{ count: number }>();
  if ((shop?.count || 0) >= config.globalPerDay) return { reason: 'shop', retryAfter: secondsUntil(now, 0) };
  const upsert = 'INSERT INTO chat_usage(day,subject,count) VALUES(?,?,1) ON CONFLICT(day,subject) DO UPDATE SET count=count+1 RETURNING count';
  const [v, s] = await env.DB.batch<{ count: number }>([env.DB.prepare(upsert).bind(day, visitor), env.DB.prepare(upsert).bind(day, 'shop')]);
  // Concurrent requests can pass the reads above together; the atomic counters settle it.
  if ((v.results[0]?.count || 0) > config.perVisitorPerDay) return { reason: 'daily', retryAfter: secondsUntil(now, 0) };
  if ((s.results[0]?.count || 0) > config.globalPerDay) return { reason: 'shop', retryAfter: secondsUntil(now, 0) };
  return null;
}

export async function recordSpend(env: Env, now: number, inputTokens: number, outputTokens: number, config: ChatConfig = shopConfig.chatbot) {
  const month = vnMonth(now), cost = costVnd(inputTokens, outputTokens, config);
  const row = await env.DB.prepare('INSERT INTO chat_spend(month,requests,input_tokens,output_tokens,cost_vnd) VALUES(?,1,?,?,?) ON CONFLICT(month) DO UPDATE SET requests=requests+1,input_tokens=input_tokens+excluded.input_tokens,output_tokens=output_tokens+excluded.output_tokens,cost_vnd=cost_vnd+excluded.cost_vnd RETURNING cost_vnd').bind(month, inputTokens, outputTokens, cost).first<{ cost_vnd: number }>();
  const total = row?.cost_vnd || 0;
  if (total >= config.monthlyBudgetVnd * config.alertAtPercent / 100) {
    const flagged = await env.DB.prepare('UPDATE chat_spend SET alerted_at=? WHERE month=? AND alerted_at IS NULL').bind(now, month).run();
    if (flagged.meta.changes) {
      const detail = `Chi phí chatbot tháng ${month} ước tính ${Math.round(total)}đ, đạt ${config.alertAtPercent}% ngân sách ${config.monthlyBudgetVnd}đ.`;
      console.warn('chatbot budget alert', detail);
      await env.DB.prepare('INSERT INTO audit_logs(actor,action,entity_id,detail,created_at) VALUES(?,?,?,?,?)').bind('chatbot', 'chat_budget_alert', month, detail, now).run();
    }
  }
  return total;
}

export async function purgeChatUsage(env: Env, now = Date.now(), config: ChatConfig = shopConfig.chatbot) {
  const cutoff = vnDay(now - config.usageRetentionDays * 86400000);
  await env.DB.batch([env.DB.prepare('DELETE FROM chat_usage WHERE day < ?').bind(cutoff), env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now)]);
}

// ---------- route ----------
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const historySchema = (v: unknown, config: ChatConfig) => Array.isArray(v) ? v.filter((h): h is { role: string; text: string } => !!h && typeof h.text === 'string' && (h.role === 'user' || h.role === 'model')).slice(-config.historyTurns).map(h => ({ role: h.role, parts: [{ text: h.text.slice(0, h.role === 'user' ? config.maxInputChars : 2000) }] })) : [];

export async function handleChat(request: Request, env: Env, deps: ChatDeps = {}): Promise<Response> {
  const config = deps.config || shopConfig.chatbot, now = deps.now ?? Date.now(), doFetch = deps.fetch || fetch;
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403);
  const raw = await request.text();
  if (raw.length > 16384) return json({ error: 'too_long' }, 413);
  let body: { message?: unknown; history?: unknown };
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad_request' }, 400); }
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return json({ error: 'bad_request' }, 400);
  if (message.length > config.maxInputChars) return json({ error: 'too_long' }, 400);
  const limit = await checkLimits(env, request, now, config);
  if (limit) return json({ error: 'rate_limited', reason: limit.reason, fallback: limit.reason !== 'burst' }, 429, { 'Retry-After': String(limit.retryAfter) });
  const chunks = await retrieve(env, message, config);
  if (!chunks.length) return json({ fallback: true });
  if (!env.GEMINI_API_KEY) { console.error('chatbot: GEMINI_API_KEY missing'); return json({ error: 'server' }, 503); }
  const prompt = systemPrompt(await buildContext(env, chunks));
  let upstream: Response;
  try {
    upstream = await doFetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse`, {
      method: 'POST', signal: AbortSignal.timeout(config.apiTimeoutMs),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt }] },
        contents: [...historySchema(body.history, config), { role: 'user', parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: config.maxOutputTokens, temperature: config.temperature, thinkingConfig: { thinkingBudget: 0 } },
      }),
    });
  } catch (error) { console.error('chatbot upstream failed', error instanceof Error ? error.name : 'unknown'); return json({ error: 'server' }, 502); }
  if (!upstream.ok || !upstream.body) { console.error('chatbot upstream status', upstream.status); return json({ error: 'server' }, 502); }
  return new Response(geminiToClient(upstream.body, async (i, o) => { await recordSpend(env, now, i, o, config); }, prompt.length + message.length), {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  });
}

const SIGNAL = 'FALLBACK';
/** Re-emits Gemini SSE as {t}|{fallback}|{done}|{error} events. Holds the first few characters back so a FALLBACK reply never reaches the customer as text. */
export function geminiToClient(source: ReadableStream<Uint8Array>, onUsage: (input: number, output: number) => Promise<void>, promptChars: number) {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const send = (c: ReadableStreamDefaultController<Uint8Array>, v: unknown) => c.enqueue(enc.encode(`data: ${JSON.stringify(v)}\n\n`));
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = source.getReader();
      let buf = '', held = '', all = '', decided = false, fallback = false, usage: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } | null = null;
      const flushHeld = (final: boolean) => {
        if (decided) return;
        const head = held.trimStart();
        if (head.startsWith(SIGNAL) || (final && head.includes(SIGNAL) && head.replace(SIGNAL, '').trim().length < 3)) { decided = true; fallback = true; return; }
        if (final || head.length >= SIGNAL.length + 2 || (head.length > 0 && !SIGNAL.startsWith(head.slice(0, SIGNAL.length)))) { decided = true; if (held.trim()) send(controller, { t: held.trimStart() }); }
      };
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true }).replace(/\r\n/g, '\n');
          let idx;
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const event = buf.slice(0, idx); buf = buf.slice(idx + 2);
            const data = event.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
            if (!data) continue;
            const parsed = JSON.parse(data);
            if (parsed.usageMetadata) usage = parsed.usageMetadata;
            const text: string = (parsed.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('');
            if (!text) continue;
            all += text;
            if (fallback) continue;
            if (!decided) { held += text; flushHeld(false); }
            else send(controller, { t: text.replace(SIGNAL, '') });
          }
        }
        flushHeld(true);
        if (fallback || !all.trim()) send(controller, { fallback: true }); else send(controller, { done: true });
      } catch (error) {
        console.error('chatbot stream failed', error instanceof Error ? error.name : 'unknown');
        send(controller, { error: 'server' });
      } finally {
        const input = usage?.promptTokenCount ?? Math.ceil(promptChars / 4);
        const output = (usage?.candidatesTokenCount ?? Math.ceil(all.length / 4)) + (usage?.thoughtsTokenCount || 0);
        await onUsage(input, output).catch(e => console.error('chatbot spend record failed', e instanceof Error ? e.message : 'unknown'));
        controller.close();
      }
    },
  });
}
