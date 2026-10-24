import { shopConfig } from "./config";
export type MoneyLine = { unitPrice: number; quantity: number };
export function calcOrderTotals(items: MoneyLine[], config = shopConfig) {
  for (const item of items) {
    if (!Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0 || !Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error("Số tiền hoặc số lượng không hợp lệ.");
  }
  const itemsSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (!Number.isSafeInteger(itemsSubtotal)) throw new Error("Tổng tiền vượt giới hạn.");
  if (config.deposit.base !== "itemsSubtotal" || config.deposit.rounding !== "ceilTo1000" || config.shipping.mode !== "flat") throw new Error("Cấu hình tính tiền chưa được hỗ trợ.");
  if (config.deposit.rate <= 0 || config.deposit.rate > 1 || !Number.isSafeInteger(config.shipping.flatFee) || config.shipping.flatFee < 0) throw new Error("Cấu hình tiền không hợp lệ.");
  const threshold = config.shipping.freeShipThreshold as number | null;
  const shippingFee = itemsSubtotal === 0 || (threshold !== null && itemsSubtotal >= threshold) ? 0 : config.shipping.flatFee;
  // A deposit cannot exceed the merchandise value, even for products below the rounding unit.
  const depositAmount = Math.min(itemsSubtotal, Math.ceil(itemsSubtotal * config.deposit.rate / 1000) * 1000);
  return { itemsSubtotal, shippingFee, depositAmount, codAmount: itemsSubtotal - depositAmount + shippingFee, total: itemsSubtotal + shippingFee };
}
export type OrderTotals = ReturnType<typeof calcOrderTotals>;
export function money(value: number) { return `${new Intl.NumberFormat("vi-VN").format(value)}đ`; }
