import { shopConfig } from './config';
import { calcOrderTotals } from './money';
import { validateModelFile } from './model-file';
import { calcQuote, quoteLimits, type QuoteSelection } from './quote';
import { hash } from './security.server';
import type { Env } from './types';

export interface Quote {
  id: string; code: string; access_hash: string; customer_name: string; phone: string; note: string;
  material_id: string; color_id: string; finish_id: string; quantity: number; design_help: number; rush: number;
  computed_amount: number | null; quoted_amount: number | null; override_reason: string; status: string;
  order_id: string | null; expires_at: number; created_at: number; updated_at: number;
}
export interface QuoteFile { id: string; quote_id: string; r2_key: string; filename: string; bytes: number; created_at: number }
export interface QuoteEvent { id: number; quote_id: string; actor: string; action: string; detail: string; created_at: number }

export function selectionOf(quote: Quote): QuoteSelection {
  return { materialId: quote.material_id, colorId: quote.color_id, finishId: quote.finish_id, quantity: quote.quantity, designHelp: quote.design_help === 1, rush: quote.rush === 1 };
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

export async function createQuote(env: Env, input: QuoteSelection & { name: string; phone: string; note: string }, files: { filename: string; bytes: Uint8Array }[], accessToken: string, now = Date.now()) {
  const limits = quoteLimits();
  if (files.length < 1 || files.length > limits.maxFiles) throw new Error('Số file không hợp lệ.');
  const priced = calcQuote(input);
  const id = crypto.randomUUID();
  const code = crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  const accessHash = await hash(accessToken);
  const expires = now + shopConfig.customPrint.quoteExpiryHours * 3_600_000;
  const stored: { id: string; key: string; filename: string; bytes: number }[] = [];
  for (const file of files) {
    const ext = validateModelFile(file.filename, file.bytes, limits);
    const key = `quotes/${id}/${crypto.randomUUID()}.${ext}`;
    await env.IMAGES.put(key, file.bytes, { httpMetadata: { contentType: 'application/octet-stream' } });
    stored.push({ id: crypto.randomUUID(), key, filename: file.filename.slice(0, 180), bytes: file.bytes.byteLength });
  }
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO quotes(id,code,access_hash,customer_name,phone,note,material_id,color_id,finish_id,quantity,design_help,rush,computed_amount,status,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'moi_yeu_cau',?,?,?)`)
      .bind(id, code, accessHash, input.name, input.phone, input.note, input.materialId, input.colorId, input.finishId, input.quantity, input.designHelp ? 1 : 0, input.rush ? 1 : 0, priced.amount, expires, now, now),
    ...stored.map(file => env.DB.prepare('INSERT INTO quote_files(id,quote_id,r2_key,filename,bytes,created_at) VALUES(?,?,?,?,?,?)').bind(file.id, id, file.key, file.filename, file.bytes, now)),
    env.DB.prepare('INSERT INTO quote_events(quote_id,actor,action,detail,created_at) VALUES(?,?,?,?,?)').bind(id, 'customer', 'create', JSON.stringify({ computed: priced.amount, formula: priced.formula }), now),
  ]);
  return (await env.DB.prepare('SELECT * FROM quotes WHERE id=?').bind(id).first<Quote>())!;
}

export async function saveQuotePrice(env: Env, code: string, actor: string, next: { status: string; override: number | null; reason: string }, now = Date.now()) {
  const found = await quoteByCode(env.DB, code);
  if (!found) throw new Error('Không tìm thấy báo giá.');
  const { quote } = found;
  if (!['moi_yeu_cau', 'dang_bao_gia', 'da_gui'].includes(quote.status)) throw new Error('Báo giá này đã khóa.');
  if (!shopConfig.customPrint.quoteStatuses.includes(next.status as typeof shopConfig.customPrint.quoteStatuses[number])) throw new Error('Trạng thái không hợp lệ.');
  if (!['dang_bao_gia', 'da_gui', quote.status].includes(next.status) || next.status === 'da_chap_nhan' || next.status === 'het_han' || next.status === 'tu_choi') throw new Error('Chỉ gửi được trạng thái đang báo giá hoặc đã gửi.');
  const computed = calcQuote(selectionOf(quote)).amount;
  const quoted = next.override ?? computed;
  if (!Number.isSafeInteger(quoted) || quoted < 1000) throw new Error('Giá chốt chưa hợp lệ.');
  const reason = next.reason.trim();
  if (quoted !== computed && (reason.length < 5 || reason.length > 500)) throw new Error('Cần lý do khi giá khác công thức (5–500 ký tự).');
  await env.DB.batch([
    env.DB.prepare(`UPDATE quotes SET status=?,computed_amount=?,quoted_amount=?,override_reason=?,updated_at=? WHERE id=? AND status=?`).bind(next.status, computed, quoted, quoted === computed ? '' : reason, now, quote.id, quote.status),
    env.DB.prepare('INSERT INTO quote_events(quote_id,actor,action,detail,created_at) VALUES(?,?,?,?,?)').bind(quote.id, actor, 'price', JSON.stringify({ from: quote.status, to: next.status, computed, quoted, reason: quoted === computed ? '' : reason, formula: shopConfig.customPrint.formula }), now),
  ]);
}

export async function respondQuote(env: Env, quote: Quote, accept: boolean, now = Date.now()) {
  if (quote.status !== 'da_gui' || quote.expires_at <= now || !quote.quoted_amount) throw new Error('Báo giá chưa thể xác nhận.');
  if (!accept) {
    await env.DB.batch([
      env.DB.prepare(`UPDATE quotes SET status='tu_choi',updated_at=? WHERE id=? AND status='da_gui'`).bind(now, quote.id),
      env.DB.prepare('INSERT INTO quote_events(quote_id,actor,action,detail,created_at) VALUES(?,?,?,?,?)').bind(quote.id, 'customer', 'reject', '{}', now),
    ]);
    return null;
  }
  const totals = calcOrderTotals([{ unitPrice: quote.quoted_amount, quantity: 1 }]);
  const orderId = crypto.randomUUID();
  const orderCode = crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const accessHash = await hash(token.slice(0, 64));
  const priced = calcQuote(selectionOf(quote));
  const customerId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO customers(id,phone,name,created_at) VALUES(?,?,?,?) ON CONFLICT(phone) DO UPDATE SET name=excluded.name').bind(customerId, quote.phone, quote.customer_name, now),
    env.DB.prepare(`INSERT INTO orders(id,code,customer_id,customer_name,phone,address,note,items_subtotal,shipping_fee,deposit_amount,cod_amount,expires_at,created_at,updated_at,access_hash,checkout_key,channel,quote_id) VALUES(?,?,(SELECT id FROM customers WHERE phone=?),?,?,?,?,?,?,?,?,?,?,?,?,?,'quote',?)`)
      .bind(orderId, orderCode, quote.phone, quote.customer_name, quote.phone, 'Nhận hàng theo báo giá in 3D — địa chỉ khách sẽ bổ sung khi cửa hàng liên hệ.', quote.note, totals.itemsSubtotal, totals.shippingFee, totals.depositAmount, totals.codAmount, now + shopConfig.payment.depositExpiryMinutes * 60000, now, now, accessHash, crypto.randomUUID(), quote.id),
    env.DB.prepare('INSERT INTO order_items(id,order_id,variant_id,product_name,variant_name,image,unit_price,quantity) VALUES(?,?,NULL,?,?,?,?,1)').bind(crypto.randomUUID(), orderId, 'In theo yêu cầu', `${priced.material.name} · ${priced.color.name} · ${priced.finish.name}`, '/images/hero.webp', quote.quoted_amount),
    env.DB.prepare(`UPDATE quotes SET status='da_chap_nhan',order_id=?,updated_at=? WHERE id=? AND status='da_gui'`).bind(orderId, now, quote.id),
    env.DB.prepare('INSERT INTO quote_events(quote_id,actor,action,detail,created_at) VALUES(?,?,?,?,?)').bind(quote.id, 'customer', 'accept', JSON.stringify({ orderCode, amount: quote.quoted_amount }), now),
  ]);
  return { code: orderCode, token: token.slice(0, 64) };
}

export async function expireQuotes(db: D1Database, now = Date.now()) {
  await db.prepare(`UPDATE quotes SET status='het_han',updated_at=? WHERE status IN ('moi_yeu_cau','dang_bao_gia','da_gui') AND expires_at<=?`).bind(now, now).run();
}
