import { Form, Link, data, useActionData, useLoaderData, useNavigation, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { AdminLayout } from '../components/admin';
import { Button } from '../components/ui/button';
import { getEnv } from '../lib/db.server';
import { money } from '../lib/money';
import { calcQuote, quoteStatusLabels } from '../lib/quote';
import { quoteByCode, saveQuotePrice, selectionOf } from '../lib/quotes.server';
import { assertSameOrigin, requireAdmin } from '../lib/security.server';
import { shopConfig } from '../lib/config';

export function meta() { return [{ title: `Chi tiết báo giá | ${shopConfig.shop.name}` }, { name: 'robots', content: 'noindex,nofollow' }]; }
export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const actor = await requireAdmin(request, env);
  const found = await quoteByCode(env.DB, params.code || '');
  if (!found) throw new Response('Không tìm thấy báo giá.', { status: 404 });
  const priced = calcQuote(selectionOf(found.quote));
  return { actor, ...found, priced };
}
export async function action({ request, params, context }: ActionFunctionArgs) {
  assertSameOrigin(request);
  const env = getEnv(context);
  const actor = await requireAdmin(request, env);
  const form = await request.formData();
  const overrideRaw = String(form.get('override') || '').trim();
  try {
    await saveQuotePrice(env, params.code || '', actor, { status: String(form.get('status') || ''), override: overrideRaw ? Number(overrideRaw) : null, reason: String(form.get('reason') || '') });
    return { error: null, success: 'Đã lưu báo giá.' };
  } catch (error) {
    return data({ error: error instanceof Error ? error.message : 'Chưa lưu được.', success: null }, { status: 400 });
  }
}
export default function AdminQuote() {
  const { actor, quote, files, events, priced } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  return <AdminLayout actor={actor}><Link className="text-link" to="/admin/bao-gia">← Danh sách báo giá</Link><div className="order-heading"><h1>Báo giá #{quote.code}</h1><span className="status-badge">{quoteStatusLabels[quote.status]}</span></div>{result?.error && <p className="error-message" role="alert">{result.error}</p>}{result?.success && <p className="success-message" role="status">{result.success}</p>}<div className="two-column"><Form method="post" className="panel form-section"><h2>Giá theo công thức</h2><p className="help-text">{priced.formula}</p><p>Kết quả hiện tại: <strong className="price">{money(priced.amount)}</strong></p><p className="help-text">Đã lưu lần trước: ước tính {quote.computed_amount ? money(quote.computed_amount) : '—'}, chốt {quote.quoted_amount ? money(quote.quoted_amount) : '—'}.</p><label className="field">Trạng thái<select name="status" defaultValue={quote.status === 'moi_yeu_cau' ? 'dang_bao_gia' : quote.status}><option value="dang_bao_gia">Đang báo giá</option><option value="da_gui">Đã gửi khách</option></select></label><label className="field">Giá chốt (bỏ trống để dùng công thức)<input name="override" inputMode="numeric" placeholder={String(priced.amount)}/></label><label className="field">Lý do nếu khác công thức<textarea name="reason" maxLength={500} defaultValue={quote.override_reason}/></label><Button type="submit" disabled={navigation.state === 'submitting'}>Lưu báo giá</Button><h2 style={{ marginTop: 24 }}>File</h2><ul>{files.map(file => <li key={file.id}><a href={`/api/admin/quote-files/${quote.code}/${file.id}`}>{file.filename}</a> <small>{file.bytes} byte</small></li>)}</ul></Form><section className="panel form-section"><h2>Nhật ký</h2>{events.map(event => <p key={event.id}><strong>{event.action}</strong> · {event.actor}<br/><small>{event.detail}</small></p>)}{!events.length && <p className="muted">Chưa có log.</p>}</section></div></AdminLayout>;
}
