import type { OrderStatus } from "./config";
export interface Env {
  DB: D1Database; IMAGES: R2Bucket; ASSETS: Fetcher;
  APP_ENV: string; SITE_URL: string; ACCESS_TEAM_DOMAIN: string; ACCESS_AUD: string; ALLOW_INDEXING?: string;
  SEPAY_WEBHOOK_KEY?: string; LOCAL_ADMIN_TOKEN?: string;
}
export interface Product { id: string; slug: string; name: string; category: string; description: string; image: string; images: string; badge: string; active: number; created_at: number; price: number; stock: number }
export interface Variant { id: string; product_id: string; sku: string; color: string; color_hex: string; material: string; size: string; price: number; stock: number; active: number }
export interface Order { id: string; code: string; customer_id: string; customer_name: string; phone: string; address: string; note: string; status: OrderStatus; items_subtotal: number; shipping_fee: number; deposit_amount: number; cod_amount: number; received_amount: number; credited_amount: number; expires_at: number; created_at: number; updated_at: number; tracking_code: string | null; access_hash: string; checkout_key: string; refund_required: number }
export interface OrderItem { id: string; order_id: string; variant_id: string; product_name: string; variant_name: string; image: string; unit_price: number; quantity: number }
export interface OrderEvent { id: number; order_id: string; status: OrderStatus; created_at: number }
export interface CartLine { variantId: string; productSlug: string; name: string; variantName: string; image: string; unitPrice: number; quantity: number; stock: number; selected: boolean }
