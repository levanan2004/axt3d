import { Form, useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { AdminLayout } from '../components/admin';
import { Button } from '../components/ui/button';
import { shopConfig } from '../lib/config';
import { getEnv } from '../lib/db.server';
import { money } from '../lib/money';
import { codSettlement, codStateLabels, codStates } from '../lib/ops';
import { assertSameOrigin, requireAdmin } from '../lib/security.server';

export function meta() { return [{ title: 'Đối soát COD' }, { name: 'robots', content: 'noindex,nofollow' }]; }

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const actor = await requireAdmin(request, env);
  const rows = await env.DB.prepare(`SELECT o.id,o.code,o.cod_amount,o.shipping_fee,o.tracking_code,o.status,c.collected_amount,c.state FROM orders o LEFT JOIN cod_reconciliations c ON c.order_id=o.id WHERE o.channel!='pos' AND o.cod_amount>0 ORDER BY o.created_at DESC LIMIT 100`).all<{ id: string; code: string; cod_amount: number; shipping_fee: number; tracking_code: string | null; status: string; collected_amount: number | null; state: string | null }>();
  return { actor, rows: rows.results.map(row => ({ ...row, settlement: codSettlement(row.cod_amount, row.shipping_fee) })) };
}

export async function action({ request, context }: ActionFunctionArgs) {
  assertSameOrigin(request);
  const env = getEnv(context);
  await requireAdmin(request, env);
  const form = await request.formData();
  const state = String(form.get('state') || 'chua_doi_soat');
  if (!codStates.includes(state as typeof codStates[number])) throw new Response('Trạng thái đối soát không hợp lệ.', { status: 400 });
  const collected = String(form.get('collected') || '').trim();
  await env.DB.prepare(`INSERT INTO cod_reconciliations(order_id,collected_amount,state,note,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET collected_amount=excluded.collected_amount,state=excluded.state,note=excluded.note,updated_at=excluded.updated_at`).bind(String(form.get('orderId')), collected ? Number(collected) : null, state, String(form.get('note') || ''), Date.now()).run();
  return null;
}

export default function CodAdmin() {
  const { actor, rows } = useLoaderData<typeof loader>();
  return <AdminLayout actor={actor}><h1>Vận chuyển và đối soát COD</h1>
    <p className="help-text">Đơn vị {shopConfig.codReconciliation.carrier}. API Viettel Post không được gọi. Phí thu hộ: {shopConfig.codReconciliation.carrierCodFeeRate === null ? shopConfig.codReconciliation.missingFeeStatus : shopConfig.codReconciliation.carrierCodFeeRate}.</p>
    <table className="data-table"><thead><tr><th>Đơn</th><th>Mã VTP</th><th>COD cần thu</th><th>Phí</th><th>Đối soát</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.code}</td><td>{row.tracking_code || '—'}</td><td>{money(row.cod_amount)}</td><td>{row.settlement.feeStatus === 'ok' && row.settlement.carrierFee !== null ? money(row.settlement.carrierFee) : row.settlement.feeStatus}</td><td><Form method="post"><input type="hidden" name="orderId" value={row.id}/><input name="collected" inputMode="numeric" defaultValue={row.collected_amount ?? ''} placeholder="Đã thu"/><select name="state" defaultValue={row.state || 'chua_doi_soat'}>{codStates.map(state => <option key={state} value={state}>{codStateLabels[state]}</option>)}</select><Button type="submit">Lưu</Button></Form></td></tr>)}</tbody></table>
  </AdminLayout>;
}
