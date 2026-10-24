import { Form, useActionData, useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { Button } from '../components/ui/button';
import { shopConfig } from '../lib/config';
import { getEnv } from '../lib/db.server';
import { money } from '../lib/money';
import { createPosSale } from '../lib/ops.server';
import { assertSameOrigin, requireAdmin } from '../lib/security.server';

export function meta() { return [{ title: `POS | ${shopConfig.shop.name}` }, { name: 'robots', content: 'noindex,nofollow' }]; }

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const actor = await requireAdmin(request, env);
  const q = new URL(request.url).searchParams.get('q') || '';
  const products = await env.DB.prepare(`SELECT v.id,v.sku,v.price,v.stock,v.color,p.name FROM variants v JOIN products p ON p.id=v.product_id WHERE v.active=1 AND p.active=1 AND (?='' OR p.name LIKE ? OR v.sku LIKE ?) ORDER BY p.name LIMIT 24`).bind(q, `%${q}%`, `%${q}%`).all<{ id: string; sku: string; price: number; stock: number; color: string; name: string }>();
  return { actor, products: products.results, q };
}

export async function action({ request, context }: ActionFunctionArgs) {
  assertSameOrigin(request);
  const env = getEnv(context);
  const actor = await requireAdmin(request, env);
  const form = await request.formData();
  try {
    const sale = await createPosSale(env, { items: [{ variantId: String(form.get('variantId') || ''), quantity: Number(form.get('quantity') || 1) }], method: String(form.get('method') || ''), actor }, Date.now());
    return { error: null, sale };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Chưa bán được.', sale: null };
  }
}

export default function Pos() {
  const { actor, products, q } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return <main className="container page-content">
    <h1>{shopConfig.shop.name} POS</h1>
    <p className="help-text">Nhân viên {actor}. Thu đủ tiền hàng, phí ship {money(shopConfig.pos.shippingFee)}. Không gọi API vận chuyển.</p>
    <Form method="get"><label className="field">Tìm sản phẩm / SKU<input name="q" defaultValue={q}/></label></Form>
    {result?.error && <p className="error-message" role="alert">{result.error}</p>}
    {result?.sale && <p className="success-message" role="status">Đơn {result.sale.code} · {result.sale.status} · nội dung {result.sale.content}</p>}
    <div className="product-grid">{products.map(product => <Form method="post" key={product.id} className="panel form-section"><h2>{product.name}</h2><p>{product.sku} · {product.color} · {money(product.price)} · còn {product.stock}</p><input type="hidden" name="variantId" value={product.id}/><label className="field">Số lượng<input name="quantity" defaultValue={1} inputMode="numeric"/></label><div className="admin-footer-actions">{shopConfig.pos.methods.map(method => <Button key={method} type="submit" name="method" value={method}>{method === 'cash' ? 'Tiền mặt' : 'QR chuyển khoản'}</Button>)}</div></Form>)}</div>
  </main>;
}
