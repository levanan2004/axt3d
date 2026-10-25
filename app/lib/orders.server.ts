import { z } from 'zod';
import { shopConfig } from './config';
import { calcOrderTotals } from './money';
import { orderWeightGram } from './shipping';
import { quoteShipping, resolveAddress } from './shipping.server';
import { hash } from './security.server';
import type { Env, Order, Variant } from './types';
export const checkoutSchema = z.object({
 name:z.string().trim().min(2,'Vui lòng nhập họ tên.').max(100),
 phone:z.string().transform(normalizePhone).pipe(z.string().regex(/^0[35789]\d{8}$/,'Số điện thoại Việt Nam chưa đúng.')),
 ...addressFields(),
 note:z.string().trim().max(500).default(''),
 checkoutKey:z.string().uuid(),
 items:z.array(z.object({variantId:z.string().min(1).max(100),quantity:z.number().int().min(1).max(99)})).min(1).max(30)
});
export function addressFields(){return {
 street:z.string().trim().min(3,'Vui lòng nhập số nhà, tên đường.').max(200),
 provinceId:z.coerce.number().int().positive('Vui lòng chọn tỉnh/thành phố.'),
 wardId:z.coerce.number().int().positive('Vui lòng chọn phường/xã.'),
 provinceName:z.string().trim().min(2,'Vui lòng chọn tỉnh/thành phố.').max(100),
 wardName:z.string().trim().min(2,'Vui lòng chọn phường/xã.').max(100),
};}
export const addressSchema=z.object(addressFields());
export function normalizePhone(value:string) { return value.replace(/[\s.()-]/g,'').replace(/^\+84/,'0'); }
export async function createOrder(env: Env, input: z.infer<typeof checkoutSchema>, accessToken:string, now=Date.now(), accountId:string|null=null) {
 const parsed=checkoutSchema.parse(input);
 const grouped=new Map<string,number>();
 for(const line of parsed.items) grouped.set(line.variantId,(grouped.get(line.variantId)||0)+line.quantity);
 if([...grouped.values()].some(q=>q>99)) throw new Error('Mỗi biến thể tối đa 99 sản phẩm.');
 const existing=await env.DB.prepare('SELECT * FROM orders WHERE checkout_key=?').bind(parsed.checkoutKey).first<Order>();
 if(existing) {
  if(existing.access_hash!==await hash(accessToken)) throw new Error('Yêu cầu đặt hàng đã tồn tại. Vui lòng tra cứu đơn.');
  return existing;
 }
 const ids=[...grouped.keys()];
 const {results:variants}=await env.DB.prepare(`SELECT v.*,p.name AS product_name,p.image,p.packed_weight_gram FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id IN(${ids.map(()=>'?').join(',')}) AND v.active=1 AND p.active=1`).bind(...ids).all<Variant & {product_name:string;image:string;packed_weight_gram:number|null}>();
 if(variants.length!==ids.length) throw new Error('Một sản phẩm không còn bán. Vui lòng cập nhật giỏ hàng.');
 const lines=variants.map(v=>({unitPrice:v.price,quantity:grouped.get(v.id)!,weightGram:v.packed_weight_gram}));
 const resolved=await resolveAddress(env,parsed);
 // The fee is always recomputed here from DB prices and weights. Client-side quotes are only a preview.
 const goods=calcOrderTotals(lines,0).itemsSubtotal, weightGram=orderWeightGram(lines);
 const ship=await quoteShipping(env,{provinceId:parsed.provinceId,wardId:parsed.wardId,weightGram,goodsValue:goods,cod:goods});
 const totals=calcOrderTotals(lines,ship.fee);
 const id=crypto.randomUUID(),code=crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase();
 const customerId=crypto.randomUUID(), accessHash=await hash(accessToken);
 const statements=[
  env.DB.prepare('INSERT INTO customers(id,phone,name,created_at) VALUES(?,?,?,?) ON CONFLICT(phone) DO UPDATE SET name=excluded.name').bind(customerId,parsed.phone,parsed.name,now),
  env.DB.prepare(`INSERT INTO orders(id,code,customer_id,customer_name,phone,address,note,items_subtotal,shipping_fee,deposit_amount,cod_amount,expires_at,created_at,updated_at,access_hash,checkout_key,province_id,ward_id,shipping_weight_gram,shipping_service,shipping_fee_fallback,account_id) VALUES(?,?,(SELECT id FROM customers WHERE phone=?),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,code,parsed.phone,parsed.name,parsed.phone,resolved.address,parsed.note,totals.itemsSubtotal,totals.shippingFee,totals.depositAmount,totals.codAmount,now+shopConfig.payment.depositExpiryMinutes*60000,now,now,accessHash,parsed.checkoutKey,parsed.provinceId,parsed.wardId,weightGram,ship.service,ship.fallback?1:0,accountId),
  ...variants.map(v=>env.DB.prepare('INSERT INTO order_items(id,order_id,variant_id,product_name,variant_name,image,unit_price,quantity) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,v.id,v.product_name,`${v.color} · ${v.material} · ${v.size}`,v.image,v.price,grouped.get(v.id)!))
 ];
 try { await env.DB.batch(statements); }
 catch(error) {
  const winner=await env.DB.prepare('SELECT * FROM orders WHERE checkout_key=?').bind(parsed.checkoutKey).first<Order>();
  if(winner && winner.access_hash===accessHash) return winner;
  if(String(error).includes('STOCK_OR_PRICE_CHANGED')) throw new Error('Số lượng hoặc giá vừa thay đổi. Vui lòng kiểm tra lại giỏ hàng.');
  throw error;
 }
 return (await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first<Order>())!;
}
export async function expireOrders(db:D1Database,now=Date.now()) {
 // Bounded batches keep cron work predictable. Repeated calls safely continue the queue.
 return db.batch([
  db.prepare("UPDATE orders SET status='da_huy',updated_at=? WHERE id IN(SELECT id FROM orders WHERE status='cho_coc' AND expires_at<=? ORDER BY expires_at LIMIT 100)").bind(now,now),
  db.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(now)
 ]);
}
export const sepaySchema=z.object({id:z.union([z.number().int().positive(),z.string().regex(/^\d+$/)]),transferType:z.enum(['in','out']),transferAmount:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),content:z.string().max(2000),accountNumber:z.string().max(100),subAccount:z.string().max(100).nullish()});
export function transferContent(code:string) { return shopConfig.payment.transferContentPattern.replace('{orderCode}',code); }
export async function recordPayment(db:D1Database,payload:z.infer<typeof sepaySchema>,now=Date.now()) {
 const parsed=sepaySchema.parse(payload);
 const patterns=[shopConfig.payment.transferContentPattern, shopConfig.pos.transferContentPattern];
 const code=patterns.map(pattern=>{const escaped=pattern.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace('\\{orderCode\\}','([A-F0-9]{12})');return parsed.content.toUpperCase().match(new RegExp(`${escaped}(?![A-Z0-9])`,'i'))?.[1]||'';}).find(Boolean)||'';
 const order=code?await db.prepare('SELECT id FROM orders WHERE code=?').bind(code).first<{id:string}>():null;
 const result=await db.prepare('INSERT INTO payments(transaction_id,order_id,amount,direction,content,account_number,received_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(transaction_id) DO NOTHING').bind(String(parsed.id),order?.id||null,parsed.transferAmount,parsed.transferType,parsed.content,parsed.accountNumber,now).run();
 return {duplicate:result.meta.changes===0};
}
