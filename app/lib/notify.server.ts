import { expireOrders } from './orders.server';
import { formatOrderMessage, provinceFromAddress, sendTelegram, telegramConfigured, type OrderEventKind } from './telegram';
import type { Env, Order } from './types';

/** The part of ExecutionContext we need. Undefined in tests and scripts: the send then runs unawaited. */
export type WaitUntil = { waitUntil(promise: Promise<unknown>): void } | undefined;

/**
 * Queue a Telegram message for one order event. Silent no-op when TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is
 * missing. Never throws and never delays the response: the work runs inside ctx.waitUntil.
 */
export function notifyOrder(env: Env, ctx: WaitUntil, kind: OrderEventKind, code: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!telegramConfigured(env)) return Promise.resolve(false);
  const task = (async () => {
    const order = await env.DB.prepare('SELECT * FROM orders WHERE code=?').bind(code).first<Order>();
    if (!order) return false;
    const { results: items } = await env.DB.prepare('SELECT product_name,quantity FROM order_items WHERE order_id=? ORDER BY rowid').bind(order.id).all<{ product_name: string; quantity: number }>();
    const text = formatOrderMessage(kind, { ...order, province: provinceFromAddress(order.address) }, items, env.SITE_URL);
    return sendTelegram(env, text, fetcher);
  })().catch(() => { console.warn('Telegram notify skipped', kind); return false; });
  try { ctx?.waitUntil(task); } catch { /* no context: task still runs */ }
  return task;
}

/** expireOrders + one "expired" message per order this call cancelled. */
export async function expireOrdersAndNotify(env: Env, ctx: WaitUntil, now = Date.now()) {
  const results = await expireOrders(env.DB, now);
  for (const row of (results[0]?.results || []) as { code: string }[]) notifyOrder(env, ctx, 'expired', row.code);
  return results;
}
