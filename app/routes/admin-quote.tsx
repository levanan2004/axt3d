import { Form, Link, data, useActionData, useLoaderData, useNavigation, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { AdminLayout } from '../components/admin';
import { Button } from '../components/ui/button';
import { shopConfig } from '../lib/config';
import { getEnv } from '../lib/db.server';
import { money } from '../lib/money';
import { calcQuote, materialIds, postProcessLabels, quoteLimits, quoteStatusLabels } from '../lib/quote';
import { quoteByCode, saveQuotePrice, selectionOf } from '../lib/quotes.server';
import { assertSameOrigin, requireAdmin } from '../lib/security.server';

export function meta() { return [{ title: `Chi tiết báo giá | ${shopConfig.shop.name}` }, { name: 'robots', content: 'noindex,nofollow' }]; }

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const actor = await requireAdmin(request, env);
  const found = await quoteByCode(env.DB, params.code || '');
  if (!found) throw new Response('Không tìm thấy báo giá.', { status: 404 });
  let priced = null;
  if (found.quote.grams && found.quote.hours) {
    try { priced = calcQuote(selectionOf(found.quote)); } catch { priced = null; }
  }
  return { actor, ...found, priced };
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  assertSameOrigin(request);
  const env = getEnv(context);
  const actor = await requireAdmin(request, env);
  const form = await request.formData();
  const overrideRaw = String(form.get('override') || '').trim();
  try {
    await saveQuotePrice(env, params.code || '', actor, {
      grams: Number(form.get('grams')),
      hours: Number(form.get('hours')),
      materialId: String(form.get('materialId') || ''),
      postProcess: String(form.get('postProcess') || ''),
      quantity: Number(form.get('quantity')),
      colorName: String(form.get('colorName') || ''),
      override: overrideRaw ? Number(overrideRaw) : null,
      reason: String(form.get('reason') || ''),
      leadNote: String(form.get('leadNote') || ''),
      reject: form.get('intent') === 'reject',
    });
    return { error: null, success: form.get('intent') === 'reject' ? 'Đã từ chối yêu cầu.' : 'Đã gửi báo giá.' };
  } catch (error) {
    return data({ error: error instanceof Error ? error.message : 'Chưa lưu được.', success: null }, { status: 400 });
  }
}

export default function AdminQuote() {
  const { actor, quote, files, events, priced } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const colors = quoteLimits().colors;
  return <AdminLayout actor={actor}>
    <Link className="text-link" to="/admin/bao-gia">← Danh sách báo giá</Link>
    <div className="order-heading"><h1>Báo giá #{quote.code}</h1><span className="status-badge">{quoteStatusLabels[quote.status] || quote.status}</span></div>
    {result?.error && <p className="error-message" role="alert">{result.error}</p>}
    {result?.success && <p className="success-message" role="status">{result.success}</p>}
    <div className="two-column">
      <Form method="post" className="panel form-section">
        <h2>Đo file và chốt giá</h2>
        <p>{quote.project_name} · {quote.customer_name} · {quote.phone}</p>
        <p className="help-text">{quote.note || 'Không có mô tả.'}</p>
        <div className="form-grid">
          <label className="field">Khối lượng (gram)<input name="grams" required inputMode="decimal" defaultValue={quote.grams ?? ''}/></label>
          <label className="field">Thời gian in (giờ)<input name="hours" required inputMode="decimal" defaultValue={quote.hours ?? ''}/></label>
          <label className="field">Vật liệu<select name="materialId" defaultValue={quote.material_id}>{materialIds().map(id => <option key={id} value={id}>{id}</option>)}</select></label>
          <label className="field">Hậu kỳ<select name="postProcess" defaultValue={quote.post_process}>{Object.keys(shopConfig.customPrint.postProcessFee).map(id => <option key={id} value={id}>{postProcessLabels[id] || id}</option>)}</select></label>
          <label className="field">Màu<select name="colorName" defaultValue={quote.color_name}>{colors.map(color => <option key={color.name}>{color.name}</option>)}</select></label>
          <label className="field">Số lượng<input name="quantity" required inputMode="numeric" defaultValue={quote.quantity}/></label>
          <label className="field field-wide">Thời gian hoàn thành dự kiến<input name="leadNote" defaultValue={quote.lead_note}/></label>
        </div>
        {priced && <div className="price-summary">
          <div><span>Nhựa</span><strong>{money(Math.round(priced.parts.resin))}</strong></div>
          <div><span>Máy và điện</span><strong>{money(Math.round(priced.parts.machine))}</strong></div>
          <div><span>Hậu kỳ</span><strong>{money(priced.parts.postProcessFee)}</strong></div>
          <div><span>× hệ số</span><strong>{money(Math.round(priced.parts.marked))}</strong></div>
          <div><span>Sau đơn tối thiểu × SL</span><strong>{money(Math.round(priced.parts.extended))}</strong></div>
          <div className="summary-total"><span>Công thức</span><strong>{money(priced.amount)}</strong></div>
        </div>}
        <p className="help-text">Đã lưu: công thức {quote.computed_amount ? money(quote.computed_amount) : '—'}, chốt {quote.quoted_amount ? money(quote.quoted_amount) : '—'}.</p>
        <label className="field">Giá cuối (bỏ trống để dùng công thức)<input name="override" inputMode="numeric" placeholder={priced ? String(priced.amount) : ''}/></label>
        <label className="field">Lý do nếu giá khác công thức, hoặc lý do từ chối<textarea name="reason" maxLength={500} defaultValue={quote.override_reason}/></label>
        <div className="admin-footer-actions">
          <Button type="submit" name="intent" value="send" disabled={navigation.state === 'submitting'}>Gửi báo giá</Button>
          <Button type="submit" name="intent" value="reject" variant="outline">Từ chối yêu cầu</Button>
        </div>
        <h2 style={{ marginTop: 24 }}>File</h2>
        <ul>{files.map(file => <li key={file.id}><a href={`/api/admin/quote-files/${quote.code}/${file.id}`}>{file.filename}</a> <small>{file.bytes} byte</small></li>)}</ul>
      </Form>
      <section className="panel form-section">
        <h2>Nhật ký</h2>
        {events.map(event => <p key={event.id}><strong>{event.action}</strong> · {event.actor}<br/><small>{event.detail}</small></p>)}
        {!events.length && <p className="muted">Chưa có log.</p>}
      </section>
    </div>
  </AdminLayout>;
}
