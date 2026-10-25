import type { Product, Variant, Order, OrderItem, OrderEvent, Env } from "./types";
import {cloudflareContext} from './context';
import type {RouterContextProvider} from 'react-router';
export function getEnv(context: unknown): Env { return (context as RouterContextProvider).get(cloudflareContext).env; }
export async function listProducts(db: D1Database, params = new URLSearchParams()) {
 const conditions = ['p.active=1', 'v.active=1']; const values: (string | number)[] = [];
 const search = params.get('q')?.trim().slice(0,100);
 if (search) { conditions.push("(p.name LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\')"); const term = `%${search.replace(/[\\%_]/g,'\\$&')}%`; values.push(term,term); }
 const category = params.get('category'); if (category) { conditions.push('p.category=?'); values.push(category); }
 const material = params.get('material'); if (material) { conditions.push('v.material=?'); values.push(material); }
 const color = params.get('color'); if (color) { conditions.push('v.color=?'); values.push(color); }
 for (const [key,op] of [['min','>='],['max','<=']]) { const n = Number(params.get(key)); if (params.has(key) && Number.isFinite(n) && n>=0) { conditions.push(`v.price ${op} ?`); values.push(n); } }
 const sort = ({ price_asc:'price ASC', price_desc:'price DESC', newest:'p.created_at DESC', popular:'p.name ASC' } as Record<string,string>)[params.get('sort') || ''] || 'p.created_at ASC, p.id ASC';
 const page = Math.max(1, Math.min(1000, Number(params.get('page')) || 1));
 const base = `FROM products p JOIN variants v ON v.product_id=p.id WHERE ${conditions.join(' AND ')}`;
 const [rows, count] = await Promise.all([
  db.prepare(`SELECT p.*,MIN(v.price) AS price,SUM(v.stock) AS stock ${base} GROUP BY p.id ORDER BY ${sort} LIMIT 20 OFFSET ?`).bind(...values,(page-1)*20).all<Product>(),
  db.prepare(`SELECT COUNT(DISTINCT p.id) AS total ${base}`).bind(...values).first<{total:number}>()
 ]);
 return { products: rows.results, total: count?.total || 0, page };
}
export async function getProduct(db: D1Database, slug: string) {
 const product = await db.prepare('SELECT * FROM products WHERE slug=? AND active=1').bind(slug).first<Product>();
 if (!product) throw new Response('Sản phẩm không tồn tại.', { status:404 });
 const { results: variants } = await db.prepare('SELECT * FROM variants WHERE product_id=? AND active=1 ORDER BY id').bind(product.id).all<Variant>();
 return { product, variants };
}
export async function orderDetails(db: D1Database, code: string) {
 const order = await db.prepare('SELECT * FROM orders WHERE code=?').bind(code).first<Order>();
 if (!order) return null;
 const [items, events] = await Promise.all([
  db.prepare('SELECT * FROM order_items WHERE order_id=?').bind(order.id).all<OrderItem>(),
  db.prepare('SELECT * FROM order_events WHERE order_id=? ORDER BY id').bind(order.id).all<OrderEvent>()
 ]);
 return { order, items:items.results, events:events.results };
}
/** Customer-facing order: also hides internal Viettel Post send state. */
export function customerOrder(order: Order) {
 const { vtp_state, vtp_error, vtp_locked_at, ...safe } = publicOrder(order);
 return safe;
}
export function publicOrder(order: Order) {
 const { access_hash, checkout_key, customer_id, ...safe } = order;
 return safe;
}
