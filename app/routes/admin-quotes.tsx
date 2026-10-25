import { Link, useLoaderData, type LoaderFunctionArgs } from 'react-router';
import { AdminLayout } from '../components/admin';
import { getEnv } from '../lib/db.server';
import { money } from '../lib/money';
import { quoteStatusLabels } from '../lib/quote';
import { label } from '../lib/copy';
import { requireAdmin } from '../lib/security.server';
import { shopConfig } from '../lib/config';
import type { Quote } from '../lib/quotes.server';

export function meta() { return [{ title: `Báo giá in theo file | ${shopConfig.shop.name}` }, { name: 'robots', content: 'noindex,nofollow' }]; }
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = getEnv(context);
  const actor = await requireAdmin(request, env);
  const quotes = await env.DB.prepare('SELECT * FROM quotes ORDER BY created_at DESC LIMIT 100').all<Quote>();
  return { actor, quotes: quotes.results };
}
export default function AdminQuotes() {
  const { actor, quotes } = useLoaderData<typeof loader>();
  return <AdminLayout actor={actor}><h1>{label('admin.quotes', 'Báo giá in theo file')}</h1><section className="panel table-scroll"><table><thead><tr><th>Mã</th><th>Khách</th><th>Công thức</th><th>Giá chốt</th><th>Trạng thái</th><th/></tr></thead><tbody>{quotes.map(quote => <tr key={quote.id}><td>{quote.code}</td><td>{quote.customer_name}<small>{quote.phone}</small></td><td>{quote.computed_amount ? money(quote.computed_amount) : '—'}</td><td>{quote.quoted_amount ? money(quote.quoted_amount) : '—'}</td><td>{quoteStatusLabels[quote.status] || quote.status}</td><td><Link to={`/admin/bao-gia/${quote.code}`}>Mở</Link></td></tr>)}</tbody></table>{!quotes.length && <p className="loading-state">Chưa có yêu cầu.</p>}</section></AdminLayout>;
}
