import { useLoaderData, type LoaderFunctionArgs } from 'react-router';
import { AdminLayout } from '../components/admin';
import { shopConfig } from '../lib/config';
import { getEnv } from '../lib/db.server';
import { money } from '../lib/money';
import { profitFromFigures } from '../lib/ops';
import { requireAdmin } from '../lib/security.server';

export function meta() { return [{ title: 'Báo cáo' }, { name: 'robots', content: 'noindex,nofollow' }]; }

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const actor = await requireAdmin(request, env);
  const revenueRow = await env.DB.prepare(`SELECT COALESCE(SUM(items_subtotal + shipping_fee),0) AS revenue FROM orders WHERE status=?`).bind(shopConfig.reports.revenueRecognizedAt).first<{ revenue: number }>();
  const refundRow = await env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS refunds FROM payments WHERE disposition='refund_required'`).first<{ refunds: number }>();
  const revenue = Number(revenueRow?.revenue || 0);
  const refunds = shopConfig.reports.refundsSubtract ? Number(refundRow?.refunds || 0) : 0;
  const settlement = shopConfig.codReconciliation.carrierCodFeeRate === null ? null : 0;
  const profit = profitFromFigures({ revenue, materialCost: 0, machineCost: 0, electricityCost: 0, postProcessCost: 0, carrierCodFee: settlement, shippingCostPaid: 0, refunds });
  return { actor, revenue, refunds, profit };
}

export default function Reports() {
  const { actor, revenue, refunds, profit } = useLoaderData<typeof loader>();
  return <AdminLayout actor={actor}><h1>Báo cáo</h1>
    <p className="help-text">Doanh thu ghi khi đơn {shopConfig.reports.revenueRecognizedAt}, múi giờ {shopConfig.reports.timezone}. Không cộng cọc và COD hai lần: doanh thu là tiền hàng cộng phí ship của đơn đã hoàn thành.</p>
    <div className="price-summary"><div><span>Doanh thu</span><strong>{money(revenue)}</strong></div><div><span>Hoàn tiền</span><strong>{money(refunds)}</strong></div><div className="summary-total"><span>Lợi nhuận</span><strong>{profit.profit === null ? profit.feeStatus : money(profit.profit)}</strong></div></div>
    <p className="help-text">{shopConfig.reports.profit.formula}</p>
  </AdminLayout>;
}
