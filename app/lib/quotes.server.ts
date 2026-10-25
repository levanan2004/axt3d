import { notifyOrder, type WaitUntil } from './notify.server';
import { shopConfig } from './config';
import { calcOrderTotals } from './money';
import { customPrintWeightGram } from './shipping';
import { quoteShipping, resolveAddress } from './shipping.server';
import { addressSchema } from './orders.server';
import { validateModelFile } from './model-file';
import { calcQuote, postProcessLabels, quoteLimits, type QuoteSelection } from './quote';
import { hash } from './security.server';
import type { Env } from './types';

export interface Quote {
  id: string; code: string; access_hash: string; project_name: string; customer_name: string; phone: string; email: string; note: string;
  material_id: string; color_name: string; post_process: string; quantity: number; grams: number | null; hours: number | null;
  computed_amount: number | null; quoted_amount: number | null; override_reason: string; lead_note: string; status: string;
  order_id: string | null; expires_at: number; created_at: number; updated_at: number;
}
export interface QuoteFile { id: string; quote_id: string; r2_key: string; filename: string; bytes: number; created_at: number }
export interface QuoteEvent { id: number; quote_id: string; actor: string; action: string; detail: string; created_at: number }

export function selectionOf(quote: Quote): QuoteSelection {
  return { materialId: quote.material_id, colorName: quote.color_name, postProcess: quote.post_process, quantity: quote.quantity, grams: Number(quote.grams || 0), hours: Number(quote.hours || 0) };
}

export async function quoteByCode(db: D1Database, code: string) {
  const quote = await db.prepare('SELECT * FROM quotes WHERE code=?').bind(code).first<Quote>();
  if (!quote) return null;
  const [files, events] = await Promise.all([
    db.prepare('SELECT * FROM quote_files WHERE quote_id=? ORDER BY created_at').bind(quote.id).all<QuoteFile>(),
    db.prepare('SELECT * FROM quote_events WHERE quote_id=? ORDER BY id').bind(quote.id).all<QuoteEvent>(),
  ]);
  return { quote, files: files.results, events: events.results };
}

export async function createQuote(env: Env, input: Omit<QuoteSelection, 'grams' | 'hours'> & { project: string; name: string; phone: string; email: string; note: string }, files: { filename: string; bytes: Uint8Array }[], accessToken: string, now = Date.now()) {
  const limits = quoteLimits();
  if (files.length < 1 || files.length > limits.maxFiles) throw new Error(`Tối đa ${limits.maxFiles} file mỗi yêu cầu.`);
  const id = crypto.randomUUID();
  const code = crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  const accessHash = await hash(accessToken);
  const stored: { id: string; key: string; filename: string; bytes: number }[] = [];
  for (const file of files) {
    const ext = validateModelFile(file.filename, file.bytes, limits);
    const key = `quotes/${id}/${crypto.randomUUID()}.${ext}`;
    await env.IMAGES.put(key, file.bytes, { httpMetadata: { contentType: 'application/octet-stream' } });
    stored.push({ id: crypto.randomUUID(), key, filename: file.filename.slice(0, 180), bytes: file.bytes.byteLength });
  }
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO quotes(id,code,access_hash,project_name,customer_name,phone,email,note,material_id,color_name,post_process,quantity,status,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'cho_bao_gia',0,?,?)`)
      .bind(id, code, accessHash, input.project, input.name, input.phone, input.email, input.note, input.materialId, input.colorName, input.postProcess, input.quantity, now, now),
    ...stored.map(file => env.DB.prepare('INSERT INTO quote_files(id,quote_id,r2_key,filename,bytes,created_at) VALUES(?,?,?,?,?,?)').bind(file.id, id, file.key, file.filename, file.bytes, now)),
    env.DB.prepare('INSERT INTO quote_events(quote_id,actor,action,detail,created_at) VALUES(?,?,?,?,?)').bind(id, 'customer', 'create', JSON.stringify({ material: input.materialId, color: input.colorName, qty: input.quantity }), now),
  ]);
  return (await env.DB.prepare('SELECT * FROM quotes WHERE id=?').bind(id).first<Quote>())!;
}

export async function saveQuotePrice(env: Env, code: string, actor: string, next: { grams: number; hours: number; materialId: string; postProcess: string; quantity: number; colorName: string; override: number | null; reason: string; leadNote: string; reject: boolean }, now = Date.now()) {
  const found = await quoteByCode(env.DB, code);
  if (!found) throw new Error('Không tìm thấy báo giá.');
  const { quote } = found;
  if (!['cho_bao_gia', 'da_bao_gia'].includes(quote.status)) throw new Error('Báo giá này đã khóa.');
  if (next.reject) {
    const reason = next.reason.trim();
    if (reason.length < 5) throw new Error('Cần lý do khi từ chối yêu cầu.');
    await env.DB.batch([
      env.DB.prepare(`UPDATE quotes SET status='admin_huy',override_reason=?,updated_at=? WHERE id=?`).bind(reason, now, quote.id),
      env.DB.prepare('INSERT INTO quote_events(quote_id,actor,action,detail,created_at) VALUES(?,?,?,?,?)').bind(quote.id, actor, 'reject', JSON.stringify({ reason }), now),
    ]);
    return;
  }
  const priced = calcQuote({ materialId: next.materialId, colorName: next.colorName, postProcess: next.postProcess, quantity: next.quantity, grams: next.grams, hours: next.hours });
  const quoted = next.override ?? priced.amount;
  if (!Number.isSafeInteger(quoted) || quoted < shopConfig.customPrint.minOrder) throw new Error('Giá chốt chưa hợp lệ.');
  const reason = next.reason.trim();
  if (quoted !== priced.amount && (reason.length < 5 || reason.length > 500)) throw new Error('Cần lý do khi giá khác công thức (5–500 ký tự).');
  const expires = now + shopConfig.customPrint.quoteValidHours * 3_600_000;
  await env.DB.batch([
    env.DB.prepare(`UPDATE quotes SET status='da_bao_gia',material_id=?,color_name=?,post_process=?,quantity=?,grams=?,hours=?,computed_amount=?,quoted_amount=?,override_reason=?,lead_note=?,expires_at=?,updated_at=? WHERE id=?`)
      .bind(next.materialId, next.colorName, next.postProcess, next.quantity, next.grams, next.hours, priced.amount, quoted, quoted === priced.amount ? '' : reason, next.leadNote.trim(), expires, now, quote.id),
    env.DB.prepare('INSERT INTO quote_events(quote_id,actor,action,detail,created_at) VALUES(?,?,?,?,?)').bind(quote.id, actor, 'price', JSON.stringify({ computed: priced.amount, quoted, reason: quoted === priced.amount ? '' : reason, grams: next.grams, hours: next.hours, formula: priced.formula, parts: priced.parts }), now),
  ]);
}

export function quoteWeightGram(quote: Pick<Quote, 'grams' | 'quantity'>) { return customPrintWeightGram(Number(quote.grams || 0), quote.quantity); }
export async function respondQuote(env: Env, quote: Quote, accept: boolean, address: unknown, now = Date.now(), ctx?: WaitUntil) {
  if (quote.status !== 'da_bao_gia' || quote.expires_at <= now || !quote.quoted_amount) throw new Error('Báo giá chưa thể xác nhận.');
  if (!accept) {
    await env.DB.batch([
      env.DB.prepare(`UPDATE quotes SET status='tu_choi',updated_at=? WHERE id=? AND status='da_bao_gia'`).bind(now, quote.id),
      env.DB.prepare('INSERT INTO quote_events(quote_id,actor,action,detail,created_at) VALUES(?,?,?,?,?)').bind(quote.id, 'customer', 'reject', '{}', now),
    ]);
    return null;
  }
  const parsedAddress = addressSchema.safeParse(address);
  if (!parsedAddress.success) throw new Error(parsedAddress.error.issues[0]?.message || 'Cần địa chỉ nhận hàng trước khi cọc.');
  const where = parsedAddress.data;
  const trimmed = (await resolveAddress(env, where)).address;
  const weightGram = quoteWeightGram(quote);
  const ship = await quoteShipping(env, { provinceId: where.provinceId, wardId: where.wardId, weightGram, goodsValue: quote.quoted_amount, cod: quote.quoted_amount });
  const totals = calcOrderTotals([{ unitPrice: quote.quoted_amount, quantity: 1 }], ship.fee);
  const orderId = crypto.randomUUID();
  const orderCode = crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const accessHash = await hash(token.slice(0, 64));
  const customerId = crypto.randomUUID();
  const label = postProcessLabels[quote.post_process] || quote.post_process;
  await env.DB.batch([
    env.DB.prepare('INSERT INTO customers(id,phone,name,created_at) VALUES(?,?,?,?) ON CONFLICT(phone) DO UPDATE SET name=excluded.name').bind(customerId, quote.phone, quote.customer_name, now),
    env.DB.prepare(`INSERT INTO orders(id,code,customer_id,customer_name,phone,address,note,items_subtotal,shipping_fee,deposit_amount,cod_amount,expires_at,created_at,updated_at,access_hash,checkout_key,channel,quote_id,province_id,ward_id,shipping_weight_gram,shipping_service,shipping_fee_fallback) VALUES(?,?,(SELECT id FROM customers WHERE phone=?),?,?,?,?,?,?,?,?,?,?,?,?,?,'quote',?,?,?,?,?,?)`)
      .bind(orderId, orderCode, quote.phone, quote.customer_name, quote.phone, trimmed, quote.note, totals.itemsSubtotal, totals.shippingFee, totals.depositAmount, totals.codAmount, now + shopConfig.payment.depositExpiryMinutes * 60000, now, now, accessHash, crypto.randomUUID(), quote.id, where.provinceId, where.wardId, weightGram, ship.service, ship.fallback ? 1 : 0),
    env.DB.prepare('INSERT INTO order_items(id,order_id,variant_id,product_name,variant_name,image,unit_price,quantity) VALUES(?,?,NULL,?,?,?,?,1)').bind(crypto.randomUUID(), orderId, quote.project_name || 'In theo yêu cầu', `${quote.material_id} · ${quote.color_name} · ${label}`, '/images/hero.webp', quote.quoted_amount),
    env.DB.prepare(`UPDATE quotes SET status='da_chap_nhan',order_id=?,updated_at=? WHERE id=? AND status='da_bao_gia'`).bind(orderId, now, quote.id),
    env.DB.prepare('INSERT INTO quote_events(quote_id,actor,action,detail,created_at) VALUES(?,?,?,?,?)').bind(quote.id, 'customer', 'accept', JSON.stringify({ orderCode, amount: quote.quoted_amount }), now),
  ]);
  notifyOrder(env, ctx, 'created', orderCode);
  return { code: orderCode, token: token.slice(0, 64) };
}

export async function expireQuotes(db: D1Database, now = Date.now()) {
  await db.prepare(`UPDATE quotes SET status='het_han',updated_at=? WHERE status='da_bao_gia' AND expires_at>0 AND expires_at<=?`).bind(now, now).run();
}
