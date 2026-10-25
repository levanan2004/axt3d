import { shopConfig, type OrderStatus } from './config';
import { customPrintOrderWeightGram, orderWeightGram, type PrintLine, type WeightLine } from './shipping';

export type ShippingConfig = typeof shopConfig.shipping;
export type CodOrder = { items_subtotal: number; shipping_fee: number; deposit_amount: number; credited_amount?: number };

export type VtpOrderRules = typeof shopConfig.vtpOrder;

/**
 * COD the shipper collects (vtpOrder.codAmount "goods_plus_ship_minus_deposit") = (goods + ship) − deposit,
 * using the amounts STORED on the order. Shipping is never recomputed here. Deposit covering everything → 0.
 */
export function vtpCodAmount(order: CodOrder, rules: VtpOrderRules = shopConfig.vtpOrder) {
  if (rules.codAmount !== 'goods_plus_ship_minus_deposit') throw new Error(`Unsupported vtpOrder.codAmount ${rules.codAmount}`);
  return Math.max(0, order.items_subtotal + order.shipping_fee - order.deposit_amount);
}

/** VTP ORDER_PAYMENT from vtpOrder.shippingFeePaidBy + codFeePaidBy.
 *  shop + shop → 3 (VTP collects only MONEY_COLLECTION, shop pays freight and COD fee; receiver pays nothing extra).
 *  customer + customer → 2 (VTP collects goods + fees from receiver). Mixed payers have no VTP value → error. */
export function vtpOrderPayment(rules: VtpOrderRules = shopConfig.vtpOrder) {
  const ship = String(rules.shippingFeePaidBy), cod = String(rules.codFeePaidBy);
  if (ship === 'shop' && cod === 'shop') return 3;
  if (ship === 'customer' && cod === 'customer') return 2;
  throw new Error(`Unsupported vtpOrder payers shippingFeePaidBy=${ship} codFeePaidBy=${cod}`);
}

export const VTP_MANUAL_WAYBILL_MESSAGE = 'Không báo giá lại được với Viettel Post cho đơn này (đơn dùng phí ship dự phòng). Hãy tạo vận đơn thủ công trên Viettel Post. Đơn vẫn ở trạng thái Đã cọc.';

/** vtpOrder.serviceCode "sameAsQuote": the service saved on the order when the web quoted shipping.
 *  Orders quoted with the fallback fee have none; with fallbackService "requote_cheapest_then_manual" the
 *  caller re-quotes at waybill time and passes the cheapest service here. No service → manual waybill. */
export function vtpOrderService(order: { shipping_service?: string | null }, rules: VtpOrderRules = shopConfig.vtpOrder, requotedService: string | null = null) {
  if (rules.serviceCode !== 'sameAsQuote') throw new Error(`Unsupported vtpOrder.serviceCode ${rules.serviceCode}`);
  if (order.shipping_service) return order.shipping_service;
  if (rules.fallbackService === 'requote_cheapest_then_manual' && requotedService) return requotedService;
  throw new Error(VTP_MANUAL_WAYBILL_MESSAGE);
}

export function vtpAllowsInspection(rules: VtpOrderRules = shopConfig.vtpOrder) {
  return rules.allowInspection === true;
}

/** Same rules as the fee code: product packed weights (default 300 g), custom prints = plastic grams + packaging once per order. */
export function vtpWeightGram(productLines: WeightLine[], printLines: PrintLine[] = [], config: ShippingConfig = shopConfig.shipping) {
  const products = productLines.length ? orderWeightGram(productLines, config) : 0;
  const prints = printLines.length ? customPrintOrderWeightGram(printLines, config) : 0;
  return Math.max(1, products + prints);
}

/** VTP ORDER_NOTE from vtpOrder.allowInspection / allowTryOn. */
export function vtpOrderNote(rules: VtpOrderRules = shopConfig.vtpOrder) {
  if (!vtpAllowsInspection(rules)) return 'Không cho xem hàng';
  return rules.allowTryOn === true ? 'Cho xem hàng, cho thử' : 'Cho xem hàng, không cho thử';
}

export function vtpTrackingUrl(trackingNumber: string, config: ShippingConfig = shopConfig.shipping) {
  return config.viettelPost.publicTrackingUrl.replace('{maVanDon}', encodeURIComponent(trackingNumber));
}

/** dd/MM/yyyy HH:mm:ss in Vietnam time, the format VTP expects for DELIVERY_DATE. */
export function vtpDate(ms: number) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(ms).map(p => [p.type, p.value]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}:${parts.second}`;
}

export type VtpOrderInput = {
  code: string; customer_name: string; phone: string; address: string; note?: string;
  province_id?: number | null; ward_id?: number | null; shipping_service?: string | null;
  items_subtotal: number; shipping_fee: number; deposit_amount: number; credited_amount?: number;
};
export type VtpItem = { name: string; quantity: number; unitPrice: number };

/** Map an order to the VTP createOrder body. Sender = the registered warehouse (old 3-level ids),
 *  receiver = new 2-level ids, matching how priceAllBody sends RECEIVER_PROVINCE/RECEIVER_WARD. */
export function createOrderBody(order: VtpOrderInput, items: VtpItem[], weightGram: number, now = Date.now(), config: ShippingConfig = shopConfig.shipping, rules: VtpOrderRules = shopConfig.vtpOrder, requotedService: string | null = null) {
  if (!order.province_id || !order.ward_id) throw new Error('Đơn chưa có mã tỉnh/phường Viettel Post. Hãy cập nhật địa chỉ.');
  const w = config.viettelPost.warehouse;
  const cod = vtpCodAmount(order, rules);
  const service = vtpOrderService(order, rules, requotedService);
  const quantity = items.reduce((n, i) => n + i.quantity, 0) || 1;
  const name = items.map(i => `${i.name} x${i.quantity}`).join(', ').slice(0, 200) || `Đơn ${order.code}`;
  return {
    ORDER_NUMBER: order.code,
    GROUPADDRESS_ID: w.groupAddressId,
    CUS_ID: 0,
    DELIVERY_DATE: vtpDate(now),
    SENDER_FULLNAME: w.name,
    SENDER_ADDRESS: w.address,
    SENDER_PHONE: w.phone,
    SENDER_EMAIL: '',
    SENDER_PROVINCE: w.provinceId,
    SENDER_DISTRICT: w.districtId,
    SENDER_WARD: w.wardId,
    RECEIVER_FULLNAME: order.customer_name,
    RECEIVER_ADDRESS: order.address,
    RECEIVER_PHONE: order.phone,
    RECEIVER_EMAIL: '',
    RECEIVER_PROVINCE: order.province_id,
    RECEIVER_DISTRICT: 0,
    RECEIVER_WARD: order.ward_id,
    PRODUCT_NAME: name,
    PRODUCT_DESCRIPTION: name,
    PRODUCT_QUANTITY: quantity,
    PRODUCT_PRICE: order.items_subtotal,
    PRODUCT_WEIGHT: weightGram,
    PRODUCT_LENGTH: 0,
    PRODUCT_WIDTH: 0,
    PRODUCT_HEIGHT: 0,
    PRODUCT_TYPE: config.viettelPost.productType,
    ORDER_PAYMENT: vtpOrderPayment(rules),
    ORDER_SERVICE: service,
    ORDER_SERVICE_ADD: '',
    ORDER_VOUCHER: '',
    ORDER_NOTE: vtpOrderNote(rules),
    MONEY_COLLECTION: cod,
    MONEY_TOTALFEE: 0,
    MONEY_FEECOD: 0,
    MONEY_FEEVAS: 0,
    MONEY_FEEINSURRANCE: 0,
    MONEY_FEE: 0,
    MONEY_FEEOTHER: 0,
    MONEY_TOTALVAT: 0,
    MONEY_TOTAL: 0,
    LIST_ITEM: items.map(i => ({ PRODUCT_NAME: i.name.slice(0, 200), PRODUCT_PRICE: i.unitPrice, PRODUCT_WEIGHT: 0, PRODUCT_QUANTITY: i.quantity })),
  };
}

export type CreateOrderResult = { ok: true; orderNumber: string } | { ok: false; message: string };

/** Read a VTP createOrder reply. VTP answers { error, message, data: { ORDER_NUMBER, ... } }. */
export function parseCreateOrderReply(status: number, body: unknown): CreateOrderResult {
  const b = (body && typeof body === 'object' ? body : {}) as { error?: unknown; message?: unknown; data?: { ORDER_NUMBER?: unknown } };
  const number = b.data?.ORDER_NUMBER;
  if (status >= 200 && status < 300 && b.error === false && (typeof number === 'string' || typeof number === 'number') && /^[A-Za-z0-9-]{5,60}$/.test(String(number))) return { ok: true, orderNumber: String(number) };
  const raw = Array.isArray(b.message) ? b.message.join('; ') : typeof b.message === 'string' ? b.message : '';
  return { ok: false, message: (raw || `Viettel Post trả lỗi HTTP ${status}.`).slice(0, 300) };
}

/** What a VTP webhook status means for our order. Only delivered (501) changes our status. */
export function vtpWebhookAction(status: number, config: ShippingConfig = shopConfig.shipping): OrderStatus | null {
  return status === config.viettelPost.deliveredStatus ? 'hoan_thanh' : null;
}

export type ShippingCardOrder = CodOrder & { status: OrderStatus; tracking_code: string | null; vtp_order_number?: string | null };
/** Customer "Vận chuyển" card: only for orders handed to VTP, with copy text from Nhất. */
export function shippingCard(order: ShippingCardOrder, config = shopConfig) {
  const tracking = order.vtp_order_number || order.tracking_code;
  if (!tracking || (order.status !== 'da_giao_van_chuyen' && order.status !== 'hoan_thanh')) return null;
  const shop = config.shop.name;
  const delivered = order.status === 'hoan_thanh';
  return {
    trackingNumber: tracking,
    trackingUrl: vtpTrackingUrl(tracking, config.shipping),
    step: delivered ? 3 : 2,
    title: delivered ? 'Bạn đã nhận hàng' : 'Đơn hàng đang trên đường đến bạn',
    description: delivered
      ? `Cảm ơn bạn đã mua hàng tại ${shop}. Nếu cần hỗ trợ, bạn nhắn Zalo cho shop nhé.`
      : `${shop} đã gửi đơn qua Viettel Post. Khi nhận hàng, bạn thanh toán phần còn lại cho nhân viên giao hàng.`,
    codAmount: delivered ? null : vtpCodAmount(order, config.vtpOrder),
    inspectionNote: !delivered && vtpAllowsInspection(config.vtpOrder) ? 'Bạn được kiểm tra hàng trước khi thanh toán. Nếu sản phẩm bị vỡ hoặc không đúng mẫu, bạn chụp ảnh và nhắn Zalo cho shop trong 48 giờ.' : null,
  };
}
