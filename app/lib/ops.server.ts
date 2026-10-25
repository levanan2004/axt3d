import { shopConfig } from './config';
import { hash } from './security.server';
import type { Env } from './types';

export async function createPosSale(env: Env, input: { items: { variantId: string; quantity: number }[]; method: string; actor: string }, now = Date.now()) {
  if (!shopConfig.pos.methods.includes(input.method as 'cash' | 'bank_transfer_qr')) throw new Error('Phương thức tại quầy không có trong cấu hình.');
  if (!input.items.length) throw new Error('Giỏ tại quầy đang trống.');
  const lines = [];
  for (const item of input.items) {
    const variant = await env.DB.prepare(`SELECT v.id,v.price,v.color,v.material,v.size,p.name,p.image FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id=? AND v.active=1 AND p.active=1`).bind(item.variantId).first<{ id: string; price: number; color: string; material: string; size: string; name: string; image: string }>();
    if (!variant || !Number.isInteger(item.quantity) || item.quantity < 1) throw new Error('Sản phẩm tại quầy không còn bán.');
    lines.push({ ...variant, quantity: item.quantity });
  }
  const itemsSubtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const shippingFee = shopConfig.pos.shippingFee;
  const depositAmount = itemsSubtotal;
  const codAmount = shippingFee;
  if (depositAmount + codAmount !== itemsSubtotal + shippingFee) throw new Error('Tiền tại quầy không khớp cấu hình.');
  const orderId = crypto.randomUUID();
  const code = crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  const token = crypto.randomUUID().replaceAll('-', '');
  const accessHash = await hash(token);
  const phone = '0900000000';
  const name = 'Khách tại quầy';
  await env.DB.batch([
    env.DB.prepare('INSERT INTO customers(id,phone,name,created_at) VALUES(?,?,?,?) ON CONFLICT(phone) DO UPDATE SET name=excluded.name').bind(crypto.randomUUID(), phone, name, now),
    env.DB.prepare(`INSERT INTO orders(id,code,customer_id,customer_name,phone,address,note,items_subtotal,shipping_fee,deposit_amount,cod_amount,expires_at,created_at,updated_at,access_hash,checkout_key,channel) VALUES(?,?,(SELECT id FROM customers WHERE phone=?),?,?,?,?,?,?,?,?,?,?,?,?,?,'pos')`)
      .bind(orderId, code, phone, name, phone, 'Bán tại quầy', input.actor, itemsSubtotal, shippingFee, depositAmount, codAmount, now + 60_000, now, now, accessHash, crypto.randomUUID()),
    ...lines.map(line => env.DB.prepare('INSERT INTO order_items(id,order_id,variant_id,product_name,variant_name,image,unit_price,quantity) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), orderId, line.id, line.name, `${line.color} · ${line.material} · ${line.size}`, line.image, line.price, line.quantity)),
  ]);
  if (input.method === 'cash') {
    const due = depositAmount + shippingFee;
    await env.DB.prepare('INSERT INTO payments(transaction_id,order_id,amount,direction,content,account_number,received_at) VALUES(?,?,?,?,?,?,?)').bind(`cash-${crypto.randomUUID()}`, orderId, due, 'in', shopConfig.pos.transferContentPattern.replace('{orderCode}', code), 'POS', now).run();
  }
  const order = await env.DB.prepare('SELECT status,deposit_amount,cod_amount,channel,code FROM orders WHERE id=?').bind(orderId).first<{ status: string; deposit_amount: number; cod_amount: number; channel: string; code: string }>();
  return { ...order!, content: shopConfig.pos.transferContentPattern.replace('{orderCode}', code) };
}
