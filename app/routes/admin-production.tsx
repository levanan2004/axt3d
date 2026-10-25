import { Form, useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { AdminLayout } from '../components/admin';
import { Button } from '../components/ui/button';
import { getEnv } from '../lib/db.server';
import { productionLabels, productionStatuses } from '../lib/ops';
import { assertSameOrigin, requireAdmin } from '../lib/security.server';

export function meta() { return [{ title: 'Sản xuất' }, { name: 'robots', content: 'noindex,nofollow' }]; }

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const actor = await requireAdmin(request, env);
  const jobs = await env.DB.prepare('SELECT * FROM production_jobs ORDER BY created_at DESC LIMIT 100').all();
  return { actor, jobs: jobs.results as { id: string; order_code: string; title: string; material: string; status: string; printer: string }[] };
}

export async function action({ request, context }: ActionFunctionArgs) {
  assertSameOrigin(request);
  const env = getEnv(context);
  await requireAdmin(request, env);
  const form = await request.formData();
  const now = Date.now();
  if (form.get('intent') === 'create') {
    await env.DB.prepare('INSERT INTO production_jobs(id,order_code,title,material,estimate_hours,printer,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), String(form.get('orderCode') || ''), String(form.get('title') || ''), String(form.get('material') || ''), Number(form.get('hours') || 0), String(form.get('printer') || ''), 'cho_in', now, now).run();
  } else {
    const status = String(form.get('status') || '');
    if (!productionStatuses.includes(status as typeof productionStatuses[number])) throw new Response('Trạng thái không hợp lệ.', { status: 400 });
    await env.DB.prepare('UPDATE production_jobs SET status=?,updated_at=? WHERE id=?').bind(status, now, String(form.get('id') || '')).run();
  }
  return null;
}

export default function Production() {
  const { actor, jobs } = useLoaderData<typeof loader>();
  return <AdminLayout actor={actor}><h1>Hàng đợi in 3D</h1>
    <Form method="post" className="panel form-section"><input type="hidden" name="intent" value="create"/><div className="form-grid"><label className="field">Mã đơn<input name="orderCode" required/></label><label className="field">Sản phẩm<input name="title" required/></label><label className="field">Vật liệu<input name="material"/></label><label className="field">Giờ ước tính<input name="hours" inputMode="decimal"/></label><label className="field">Máy in<input name="printer"/></label></div><Button type="submit">Tạo phiếu sản xuất</Button></Form>
    <table className="data-table"><thead><tr><th>Mã</th><th>Sản phẩm</th><th>Vật liệu</th><th>Máy</th><th>Trạng thái</th></tr></thead><tbody>{jobs.map(job => <tr key={job.id}><td>{job.order_code}</td><td>{job.title}</td><td>{job.material}</td><td>{job.printer}</td><td><Form method="post"><input type="hidden" name="id" value={job.id}/><select name="status" defaultValue={job.status}>{productionStatuses.map(status => <option key={status} value={status}>{productionLabels[status]}</option>)}</select><Button type="submit">Lưu</Button></Form></td></tr>)}</tbody></table>
  </AdminLayout>;
}
