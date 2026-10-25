import { shopConfig } from "./config";
export type MoneyLine = { unitPrice: number; quantity: number };
export type OrderTotals = { itemsSubtotal: number; shippingFee: number; depositAmount: number; codAmount: number; total: number; shippingPending?: boolean };
/**
 * Money for one order. shippingFee is the carrier fee (null = address not chosen yet).
 * Deposit = rate × (goods + ship when depositIncludesShipping), rounded up to 1.000đ, never above the total.
 */
export function calcOrderTotals(items: MoneyLine[], shippingFee: number | null = null, config = shopConfig): OrderTotals {
  for (const item of items) {
    if (!Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0 || !Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error("Số tiền hoặc số lượng không hợp lệ.");
  }
  const itemsSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (!Number.isSafeInteger(itemsSubtotal)) throw new Error("Tổng tiền vượt giới hạn.");
  const ship = config.shipping;
  if (config.deposit.rounding !== "ceilTo1000" || ship.mode !== "viettelpost_api") throw new Error("Cấu hình tính tiền chưa được hỗ trợ.");
  if (config.deposit.rate <= 0 || config.deposit.rate > 1 || !Number.isSafeInteger(ship.fallbackFee) || ship.fallbackFee < 0 || !Number.isSafeInteger(ship.shopSubsidy) || ship.shopSubsidy < 0) throw new Error("Cấu hình tiền không hợp lệ.");
  if (shippingFee !== null && (!Number.isSafeInteger(shippingFee) || shippingFee < 0)) throw new Error("Phí vận chuyển không hợp lệ.");
  const threshold = ship.freeShippingThreshold as number | null;
  const carrierFee = itemsSubtotal === 0 ? 0 : shippingFee ?? 0;
  const shippingCharged = threshold !== null && itemsSubtotal >= threshold ? 0 : Math.max(0, carrierFee - ship.shopSubsidy);
  const total = itemsSubtotal + shippingCharged;
  const base = itemsSubtotal + (ship.depositIncludesShipping ? shippingCharged : 0);
  const depositAmount = Math.min(total, Math.ceil(base * config.deposit.rate / 1000) * 1000);
  return { itemsSubtotal, shippingFee: shippingCharged, depositAmount, codAmount: total - depositAmount, total, shippingPending: shippingFee === null && itemsSubtotal > 0 };
}
export function money(value: number) { return `${new Intl.NumberFormat("vi-VN").format(value)}đ`; }