import { Form, redirect, useActionData, useLoaderData, useNavigation, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { LoaderCircle } from 'lucide-react';
import { StoreLayout, Breadcrumb, PriceSummary } from '../components/store';
import { Button } from '../components/ui/button';
import { getEnv } from '../lib/db.server';
import { calcOrderTotals, money } from '../lib/money';
import { quoteStatusLabels } from '../lib/quote';
import { quoteByCode, respondQuote } from '../lib/quotes.server';
import { normalizePhone } from '../lib/orders.server';
import { assertSameOrigin, hash, orderCookie, rateLimit, secureEqual } from '../lib/security.server';
import { shopConfig } from '../lib/config';

async function allowed(request: Request, accessHash: string) {
  const token = request.headers.get('cookie')?.split(';').map(item => item.trim()).find(item => item.startsWith(`quote_${new URL(request.url).pathname.split('/').at(-1)}=`))?.split('=').slice(1).join('=');
  return token ? secureEqual(await hash(token), accessHash) : false;
}

export function meta() { return [{ title: `Báo giá in 3D | ${shopConfig.shop.name}` }, { name: 'robots', content: 'noindex,nofollow' }]; }

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const found = await quoteByCode(getEnv(context).DB, params.code || '');
  if (!found) throw new Response('Không tìm thấy báo giá.', { status: 404 });
  const open = await allowed(request, found.quote.access_hash);
  if (!open) return { locked: true as const, code: found.quote.code };
  const totals = found.quote.quoted_amount ? calcOrderTotals([{ unitPrice: found.quote.quoted_amount, quantity: 1 }]) : null;
  return { locked: false as const, quote: found.quote, totals };
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  assertSameOrigin(request);
  const env = getEnv(context);
  await rateLimit(request, env, 'quote-reply', 10);
  const found = await quoteByCode(env.DB, params.code || '');
  if (!found) throw new Response('Không tìm thấy báo giá.', { status: 404 });
  const form = await request.formData();
  if (form.get('intent') === 'unlock') {
    const phone = normalizePhone(String(form.get('phone') || ''));
    if (phone !== found.quote.phone) return { error: 'Số điện thoại không khớp yêu cầu.' };
    const token = crypto.randomUUID().replaceAll('-', '');
    await env.DB.prepare('UPDATE quotes SET access_hash=? WHERE id=?').bind(await hash(token), found.quote.id).run();
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
    return redirect(`/bao-gia/${found.quote.code}`, { headers: { 'Set-Cookie': `quote_${found.quote.code}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure}` } });
  }
  if (!(await allowed(request, found.quote.access_hash))) return { error: 'Phiên xem báo giá đã hết. Hãy mở lại bằng số điện thoại.' };
  try {
    const accepted = await respondQuote(env, found.quote, form.get('intent') === 'accept');
    if (!accepted) return redirect(`/bao-gia/${found.quote.code}`);
    return redirect(`/thanh-toan/${accepted.code}`, { headers: { 'Set-Cookie': orderCookie(accepted.code, accepted.token, request) } });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Chưa xác nhận được báo giá.' };
  }
}

export default function QuotePage() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  if (data.locked) return <StoreLayout><Breadcrumb items={[{ label: 'Báo giá' }]}/><Form method="post" className="tracking-form panel"><h1>Xem báo giá #{data.code}</h1><p>Nhập số điện thoại đã gửi yêu cầu.</p><label className="field">Số điện thoại<input name="phone" required/></label><input type="hidden" name="intent" value="unlock"/>{result?.error && <p className="error-message" role="alert">{result.error}</p>}<Button type="submit">Xem báo giá</Button></Form></StoreLayout>;
  const { quote, totals } = data;
  return <StoreLayout><Breadcrumb items={[{ label: `Báo giá #${quote.code}` }]}/><div className="order-heading"><h1>Báo giá #{quote.code}</h1><span className="status-badge">{quoteStatusLabels[quote.status] || quote.status}</span></div>{result?.error && <p className="error-message" role="alert">{result.error}</p>}<div className="two-column"><section className="panel form-section"><h2>Yêu cầu của bạn</h2><p>{quote.customer_name} · {quote.phone}</p><p className="help-text">{quote.note || 'Không có ghi chú.'}</p><p>Trạng thái: {quoteStatusLabels[quote.status] || quote.status}</p>{quote.status === 'da_gui' && totals && <Form method="post" className="admin-footer-actions"><Button type="submit" name="intent" value="accept" disabled={navigation.state === 'submitting'}>{navigation.state === 'submitting' && <LoaderCircle className="spin" size={16}/>} Chấp nhận và đặt cọc</Button><Button type="submit" name="intent" value="reject" variant="outline">Từ chối</Button></Form>}{quote.status !== 'da_gui' && <p className="notice">Cửa hàng sẽ gửi giá chốt tại trang này. Ước tính ban đầu {quote.computed_amount ? money(quote.computed_amount) : 'đang tính'}.</p>}</section>{totals && <aside className="summary-panel panel"><h2>Thanh toán khi chấp nhận</h2><PriceSummary totals={totals}/><p className="help-text">Giá chốt {money(quote.quoted_amount || 0)}. Cọc đi qua QR như đơn hàng thường.</p></aside>}</div></StoreLayout>;
}
