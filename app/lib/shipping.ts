import { shopConfig } from './config';

export type ShippingConfig = typeof shopConfig.shipping;
export type WeightLine = { weightGram?: number | null; quantity: number };
export type ShippingQuote = { fee: number; fallback: boolean; days: number | null; service: string | null; weightGram: number };
export type VtpService = { MA_DV_CHINH?: string; GIA_CUOC?: number; THOI_GIAN?: string };
export type FeeRequest = { provinceId: number; wardId: number; weightGram: number; goodsValue: number; cod: number };

/** Packed weight of an order: per-item packed grams × quantity. Missing weights use the config default. */
export function orderWeightGram(lines: WeightLine[], config: ShippingConfig = shopConfig.shipping) {
  return lines.reduce((sum, line) => {
    const grams = typeof line.weightGram === 'number' && Number.isFinite(line.weightGram) && line.weightGram > 0 ? line.weightGram : config.defaultPackedWeightGram;
    return sum + Math.ceil(grams) * line.quantity;
  }, 0);
}

/** Custom print: quoted plastic grams (per unit × quantity) plus one box. */
export function customPrintWeightGram(gramsPerUnit: number, quantity = 1, config: ShippingConfig = shopConfig.shipping) {
  const plastic = Number.isFinite(gramsPerUnit) && gramsPerUnit > 0 ? gramsPerUnit * Math.max(1, quantity) : 0;
  return Math.ceil(plastic) + config.customPrintPackagingGram;
}

/** "72 giờ" -> 3 days. Returns null when VTP gives no usable time. */
export function deliveryDays(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*(giờ|h|ngày)/i);
  if (!match) return null;
  const n = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return /ngày/i.test(match[2]) ? Math.ceil(n) : Math.max(1, Math.ceil(n / 24));
}

export function pickService(services: unknown): VtpService | null {
  if (!Array.isArray(services)) return null;
  const valid = (services as VtpService[]).filter(s => typeof s?.GIA_CUOC === 'number' && Number.isFinite(s.GIA_CUOC) && s.GIA_CUOC > 0);
  if (!valid.length) return null;
  return valid.reduce((best, s) => (s.GIA_CUOC! < best.GIA_CUOC! ? s : best));
}

export function fallbackQuote(weightGram: number, config: ShippingConfig = shopConfig.shipping): ShippingQuote {
  return { fee: config.fallbackFee, fallback: true, days: null, service: null, weightGram };
}

export function priceAllBody(req: FeeRequest, config: ShippingConfig = shopConfig.shipping) {
  return {
    SENDER_PROVINCE: config.sender.provinceId,
    SENDER_WARD: config.sender.wardId,
    RECEIVER_PROVINCE: req.provinceId,
    RECEIVER_WARD: req.wardId,
    PRODUCT_TYPE: config.viettelPost.productType,
    PRODUCT_WEIGHT: req.weightGram,
    PRODUCT_PRICE: req.goodsValue,
    MONEY_COLLECTION: req.cod,
    TYPE: config.viettelPost.orderType,
  };
}

/**
 * Ask Viettel Post getPriceAll for the cheapest service. Any error, empty answer or a reply slower
 * than config.apiTimeoutMs returns the configured fallback fee instead of throwing.
 */
export async function fetchShippingQuote(req: FeeRequest, token: string | undefined, fetcher: typeof fetch = fetch, config: ShippingConfig = shopConfig.shipping): Promise<ShippingQuote> {
  if (!token || !req.provinceId || !req.wardId) return fallbackQuote(req.weightGram, config);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>(resolve => { timer = setTimeout(() => { controller.abort(); resolve(null); }, config.apiTimeoutMs); });
  try {
    const call = (async () => {
      const response = await fetcher(`${config.viettelPost.baseUrl}/order/getPriceAll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Token: token },
        body: JSON.stringify(priceAllBody(req, config)),
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return pickService(await response.json());
    })().catch(() => null);
    const best = await Promise.race([call, timeout]);
    if (!best) return fallbackQuote(req.weightGram, config);
    return { fee: Math.ceil(best.GIA_CUOC!), fallback: false, days: deliveryDays(best.THOI_GIAN), service: best.MA_DV_CHINH || null, weightGram: req.weightGram };
  } finally {
    if (timer) clearTimeout(timer);
  }
}