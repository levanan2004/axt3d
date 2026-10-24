import { useLoaderData, type LoaderFunctionArgs } from 'react-router';
import { StoreLayout, Breadcrumb } from '../components/store';
import { shopConfig } from '../lib/config';
import { getEnv } from '../lib/db.server';
import { pageCopy, pageMeta, renderMarkdown, renderTokens } from '../lib/copy';

export async function loader({ context }: LoaderFunctionArgs) {
  return { base: getEnv(context).SITE_URL, doc: pageCopy('lien-he') };
}

export function meta({ loaderData: data }: { loaderData?: Awaited<ReturnType<typeof loader>> }) {
  return pageMeta('lien-he', 'Liên hệ', `Liên hệ ${shopConfig.shop.name} để được hỗ trợ về sản phẩm và đơn hàng.`, '/lien-he', data?.base || 'http://localhost:5173');
}

export default function Contact() {
  const { doc } = useLoaderData<typeof loader>();
  const title = doc?.title ? renderTokens(doc.title) : 'Liên hệ cửa hàng';
  return <StoreLayout><Breadcrumb items={[{ label: 'Liên hệ' }]}/><article className="panel prose"><span className="eyebrow">LUÔN SẴN SÀNG LẮNG NGHE</span><h1>{title}</h1>{doc?.body ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.body) }}/> : <p>Bạn cần tư vấn sản phẩm hoặc hỗ trợ đơn hàng? Hãy gửi kèm mã đơn để cửa hàng hỗ trợ nhanh hơn.</p>}{shopConfig.shop.supportEmail && <p>Email: <a href={`mailto:${shopConfig.shop.supportEmail}`}>{shopConfig.shop.supportEmail}</a></p>}{shopConfig.shop.supportPhone && <p>Điện thoại: <a href={`tel:${shopConfig.shop.supportPhone}`}>{shopConfig.shop.supportPhone}</a></p>}{!shopConfig.shop.supportEmail && !shopConfig.shop.supportPhone && <p className="notice">Thông tin liên hệ đang được cửa hàng cập nhật.</p>}</article></StoreLayout>;
}
