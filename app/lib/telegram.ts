import { shopConfig, statusLabels, type OrderStatus } from './config';

/** Order events that send a Telegram message to the shop. */
export type OrderEventKind = 'created' | 'deposited' | 'cancelled' | 'expired' | 'waybill' | 'completed';

/** The only order fields a Telegram message may use. Phone, full address and email are deliberately absent. */
export interface NotifyOrder {
  code: string; customer_name: string; province: string; status: OrderStatus;
  items_subtotal: number; shipping_fee: number; deposit_amount: number; cod_amount: number;
  tracking_code?: string | null;
}
export interface NotifyItem { product_name: string; quantity: number }

const MAX_LEN = 4000; // Telegram limit is 4096 characters.

export function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}
/** 450000 -> "450.000đ" */
export function formatVnd(value: number) {
  const sign = value < 0 ? '-' : '';
  return `${sign}${String(Math.abs(Math.trunc(value))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}
/** "Nguyễn Văn An" -> "An". Only the given name goes to the chat. */
export function shortName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return parts.at(-1) || 'Khách';
}

const headlines: Record<OrderEventKind, string> = {
  created: '🆕 ĐƠN MỚI',
  deposited: '💰 ĐÃ NHẬN CỌC',
  cancelled: '❌ ĐƠN ĐÃ HUỶ',
  expired: `⌛ ĐƠN HẾT HẠN (quá ${shopConfig.payment.depositExpiryMinutes} phút chưa cọc)`,
  waybill: '🚚 ĐÃ TẠO VẬN ĐƠN VIETTEL POST',
  completed: '✅ KHÁCH ĐÃ NHẬN HÀNG',
};

export function adminOrderUrl(siteUrl: string, code: string) {
  return `${siteUrl.replace(/\/+$/, '')}/admin/don-hang/${encodeURIComponent(code)}`;
}

/** Render one order event as Telegram HTML. Every money value is read from the stored order. */
export function formatOrderMessage(kind: OrderEventKind, order: NotifyOrder, items: NotifyItem[], siteUrl: string, prefix = '') {
  const e = escapeHtml;
  const lines = [
    `${prefix ? `${e(prefix)}\n` : ''}<b>${e(headlines[kind])}</b>`,
    `Mã đơn: <b>#${e(order.code)}</b>`,
    `Khách: ${e(shortName(order.customer_name))}${order.province ? ` · ${e(order.province)}` : ''}`,
    '',
    '<b>Sản phẩm:</b>',
    ...items.map(i => `• ${e(i.product_name)} x${i.quantity}`),
    '',
    `Tiền hàng: ${formatVnd(order.items_subtotal)}`,
    `Phí ship: ${formatVnd(order.shipping_fee)}`,
    `Tiền cọc: ${formatVnd(order.deposit_amount)}`,
    `COD còn thu: <b>${formatVnd(order.cod_amount)}</b>`,
    `Trạng thái: ${e(statusLabels[order.status] || order.status)}`,
  ];
  if (kind === 'waybill' && order.tracking_code) lines.push(`Mã vận đơn: ${e(order.tracking_code)}`);
  lines.push('', `Quản trị: ${e(adminOrderUrl(siteUrl, order.code))}`);
  let text = lines.join('\n');
  if (text.length > MAX_LEN) text = `${text.slice(0, MAX_LEN - 20)}\n…(rút gọn)`;
  return text;
}

export interface TelegramEnv { TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string }
export function telegramConfigured(env: TelegramEnv) { return !!(env.TELEGRAM_BOT_TOKEN?.trim() && env.TELEGRAM_CHAT_ID?.trim()); }

/**
 * Send one HTML message. Never throws and never logs the token or the API URL (which contains it).
 * Returns true only when Telegram accepted the message; false for no-op or failure.
 */
export async function sendTelegram(env: TelegramEnv, text: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!telegramConfigured(env)) return false;
  try {
    const response = await fetcher(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN!.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID!.trim(), text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) { console.warn('Telegram notify failed', response.status); return false; }
    return true;
  } catch {
    console.warn('Telegram notify error');
    return false;
  }
}
