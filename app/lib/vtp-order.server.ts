import { shopConfig } from './config';
import { secureEqual } from './security.server';
import { fetchShippingQuote } from './shipping';
import { createOrderBody, parseCreateOrderReply, VTP_MANUAL_WAYBILL_MESSAGE, vtpCodAmount, vtpWebhookAction, vtpWeightGram } from './vtp-order';
import type { Env, Order } from './types';
import { notifyOrder, type WaitUntil } from './notify.server';

const vtp = shopConfig.shipping.viettelPost;
/** A "sending" lock older than this is treated as a crashed request and may be retried. */
export const VTP_LOCK_MS = 120000;

type ItemRow = { product_name: string; unit_price: number; quantity: number; variant_id: string | null; packed_weight_gram: number | null };

async function orderLines(db: D1Database, order: Pick<Order, 'id'> & { quote_id?: string | null }) {
  const { results } = await db.prepare('SELECT i.product_name,i.unit_price,i.quantity,i.variant_id,p.packed_weight_gram FROM order_items i LEFT JOIN variants v ON v.id=i.variant_id LEFT JOIN products p ON p.id=v.product_id WHERE i.order_id=?').bind(order.id).all<ItemRow>();
  const quote = order.quote_id ? await db.prepare('SELECT grams,quantity FROM quotes WHERE id=?').bind(order.quote_id).first<{ grams: number | null; quantity: number }>() : null;
  const productLines = results.filter(r => r.variant_id).map(r => ({ weightGram: r.packed_weight_gram, quantity: r.quantity }));
  const printLines = quote ? [{ gramsPerUnit: Number(quote.grams || 0), quantity: quote.quantity }] : results.filter(r => !r.variant_id).map(r => ({ gramsPerUnit: 0, quantity: r.quantity }));
  return { items: results.map(r => ({ name: r.product_name, quantity: r.quantity, unitPrice: r.unit_price })), weightGram: vtpWeightGram(productLines, printLines) };
}

/** What the admin confirm dialog shows: warehouse, COD and weight. */
export async function vtpPreview(db: D1Database, order: Order) {
  const { weightGram } = await orderLines(db, order);
  return { weightGram, codAmount: vtpCodAmount(order), warehouse: `${vtp.warehouse.name} · ${vtp.warehouse.address}` };
}

export type VtpCreateResult = { ok: true; trackingNumber: string; already: boolean } | { ok: false; error: string; unknown?: boolean; manual?: boolean; status: number };

/**
 * Create the VTP order once. A conditional UPDATE takes a per-order lock, so double clicks, two tabs or
 * retries never send twice; a finished order returns its saved number. A timeout leaves state "unknown"
 * and needs confirmUnknown=true, because VTP may have created the order anyway.
 */
export async function createVtpShipment(env: Env, code: string, actor: string, opts: { confirmUnknown?: boolean; fetcher?: typeof fetch; now?: number; ctx?: WaitUntil } = {}): Promise<VtpCreateResult> {
  const now = opts.now ?? Date.now(), fetcher = opts.fetcher ?? fetch;
  const order = await env.DB.prepare('SELECT * FROM orders WHERE code=?').bind(code).first<Order>();
  if (!order) return { ok: false, error: 'Không tìm thấy đơn.', status: 404 };
  if (order.vtp_order_number) return { ok: true, trackingNumber: order.vtp_order_number, already: true };
  if (order.status !== 'da_coc') return { ok: false, error: 'Chỉ tạo đơn Viettel Post cho đơn Đã cọc.', status: 409 };
  if (!env.VTP_API_TOKEN) return { ok: false, error: 'Chưa cấu hình VTP_API_TOKEN.', status: 503 };
  if (order.vtp_state === 'unknown' && !opts.confirmUnknown) return { ok: false, unknown: true, error: 'Lần gửi trước không nhận được phản hồi. Kiểm tra trên Viettel Post xem đã có đơn này chưa rồi mới thử lại.', status: 409 };
  const lock = await env.DB.prepare("UPDATE orders SET vtp_state='sending',vtp_locked_at=?,vtp_error=NULL WHERE id=? AND status='da_coc' AND vtp_order_number IS NULL AND (vtp_state IS NULL OR vtp_state IN('error','unknown') OR (vtp_state='sending' AND vtp_locked_at<?))").bind(now, order.id, now - VTP_LOCK_MS).run();
  if (!lock.meta.changes) {
    const fresh = await env.DB.prepare('SELECT vtp_order_number FROM orders WHERE id=?').bind(order.id).first<{ vtp_order_number: string | null }>();
    if (fresh?.vtp_order_number) return { ok: true, trackingNumber: fresh.vtp_order_number, already: true };
    return { ok: false, error: 'Đơn đang được gửi sang Viettel Post. Vui lòng đợi rồi tải lại trang.', status: 409 };
  }
  let body;
  let requoted: { service: string; fee: number } | null = null;
  try {
    const { items, weightGram } = await orderLines(env.DB, order);
    if (!order.shipping_service && shopConfig.vtpOrder.fallbackService === 'requote_cheapest_then_manual' && order.province_id && order.ward_id) {
      // Fallback-fee order: re-quote now and use the cheapest service. The stored shipping_fee and COD stay
      // as the customer saw them; the shop absorbs any difference.
      const quote = await fetchShippingQuote({ provinceId: order.province_id, wardId: order.ward_id, weightGram, goodsValue: order.items_subtotal, cod: vtpCodAmount(order) }, env.VTP_API_TOKEN, fetcher);
      if (quote.fallback || !quote.service) { await setState(env.DB, order.id, 'error', VTP_MANUAL_WAYBILL_MESSAGE); return { ok: false, manual: true, error: VTP_MANUAL_WAYBILL_MESSAGE, status: 502 }; }
      requoted = { service: quote.service, fee: quote.fee };
    }
    body = createOrderBody(order, items, weightGram, now, undefined, undefined, requoted?.service ?? null);
  }
  catch (error) { const message = error instanceof Error ? error.message : 'Không tạo được dữ liệu đơn.'; await setState(env.DB, order.id, 'error', message); return { ok: false, error: message, status: 400 }; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), vtp.createOrderTimeoutMs);
  let reply: ReturnType<typeof parseCreateOrderReply>;
  try {
    const response = await fetcher(`${vtp.baseUrl}${vtp.createOrderPath}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Token: env.VTP_API_TOKEN }, body: JSON.stringify(body), signal: controller.signal });
    let json: unknown = null; try { json = await response.json(); } catch { /* non-JSON error page */ }
    reply = parseCreateOrderReply(response.status, json);
  } catch {
    // Never log the token or the customer payload; the order code is enough to look it up.
    console.warn('VTP createOrder no reply', order.code);
    await setState(env.DB, order.id, 'unknown', 'Không nhận được phản hồi từ Viettel Post.');
    return { ok: false, unknown: true, error: 'Không nhận được phản hồi từ Viettel Post. Kiểm tra trên Viettel Post xem đã có đơn này chưa rồi mới thử lại.', status: 504 };
  } finally { clearTimeout(timer); }
  if (!reply.ok) {
    console.warn('VTP createOrder rejected', order.code);
    await setState(env.DB, order.id, 'error', reply.message);
    return { ok: false, error: reply.message, status: 502 };
  }
  const saved = await env.DB.batch([
    env.DB.prepare("UPDATE orders SET vtp_order_number=?,tracking_code=?,vtp_state='done',vtp_error=NULL,status='da_giao_van_chuyen',updated_at=? WHERE id=? AND vtp_state='sending' AND vtp_order_number IS NULL").bind(reply.orderNumber, reply.orderNumber, now, order.id),
    env.DB.prepare('INSERT INTO audit_logs(actor,action,entity_id,detail,created_at) VALUES(?,?,?,?,?)').bind(actor, 'vtp_create_order', order.id, JSON.stringify({ code: order.code, vtpOrderNumber: reply.orderNumber, cod: body.MONEY_COLLECTION, weight: body.PRODUCT_WEIGHT, service: body.ORDER_SERVICE, ...(requoted ? { requotedFee: requoted.fee, storedShippingFee: order.shipping_fee } : {}) }), now),
  ]);
  if (saved[0]?.meta.changes) notifyOrder(env, opts.ctx, 'waybill', order.code);
  return { ok: true, trackingNumber: reply.orderNumber, already: false };
}

function setState(db: D1Database, id: string, state: 'error' | 'unknown', message: string) {
  return db.prepare("UPDATE orders SET vtp_state=?,vtp_error=? WHERE id=? AND vtp_state='sending'").bind(state, message.slice(0, 300), id).run();
}

function json(body: unknown, status = 200) { return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } }); }

/**
 * VTP status webhook. VTP sends the "Secret parameter" in the Authorization header and as TOKEN in the body;
 * either must equal VTP_WEBHOOK_SECRET. Repeated deliveries are ignored, and only 501 (delivered) moves the
 * order to hoan_thanh. Unknown orders still get 200 so VTP does not retry forever.
 */
export async function vtpWebhook(request: Request, env: Env, now = Date.now(), ctx?: WaitUntil) {
  if (request.method !== 'POST') return json({ success: false }, 405);
  if (!env.VTP_WEBHOOK_SECRET) return json({ success: false, error: 'Integration not configured' }, 503);
  if (Number(request.headers.get('content-length') || 0) > 32768) return json({ success: false }, 413);
  const raw = await request.text(); if (raw.length > 32768) return json({ success: false }, 413);
  let payload: { DATA?: { ORDER_NUMBER?: unknown; ORDER_STATUS?: unknown; STATUS_NAME?: unknown }; TOKEN?: unknown };
  try { payload = JSON.parse(raw); } catch { return json({ success: false, error: 'Invalid payload' }, 400); }
  const header = (request.headers.get('authorization') || request.headers.get('token') || '').replace(/^Bearer\s+/i, '');
  const token = typeof payload?.TOKEN === 'string' ? payload.TOKEN : '';
  const authorized = (header && await secureEqual(header, env.VTP_WEBHOOK_SECRET)) || (token && await secureEqual(token, env.VTP_WEBHOOK_SECRET));
  if (!authorized) return json({ success: false }, 401);
  const number = String(payload.DATA?.ORDER_NUMBER ?? '').trim(), status = Number(payload.DATA?.ORDER_STATUS);
  if (!/^[A-Za-z0-9-]{5,60}$/.test(number) || !Number.isInteger(status)) return json({ success: false, error: 'Invalid payload' }, 400);
  const statusName = typeof payload.DATA?.STATUS_NAME === 'string' ? payload.DATA.STATUS_NAME.slice(0, 200) : '';
  const next = vtpWebhookAction(status);
  const statements = [env.DB.prepare('INSERT INTO vtp_webhook_events(order_number,status,status_name,received_at) VALUES(?,?,?,?) ON CONFLICT(order_number,status) DO NOTHING').bind(number, status, statusName, now)];
  if (next === 'hoan_thanh') statements.push(env.DB.prepare("UPDATE orders SET status='hoan_thanh',updated_at=? WHERE (vtp_order_number=? OR tracking_code=?) AND status='da_giao_van_chuyen' RETURNING code").bind(now, number, number));
  const results = await env.DB.batch(statements);
  for (const row of (results[1]?.results || []) as { code: string }[]) notifyOrder(env, ctx, 'completed', row.code);
  return json({ success: true, duplicate: results[0].meta.changes === 0, updated: results[1]?.meta.changes ? true : false });
}
