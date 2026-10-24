import { useLoaderData, type LoaderFunctionArgs } from 'react-router';
import { StoreLayout, Breadcrumb } from '../components/store';
import { shopConfig } from '../lib/config';
import { getEnv } from '../lib/db.server';
import { legalRoutes } from '../lib/http';
import { pageCopy, pageMeta, renderMarkdown, renderTokens } from '../lib/copy';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const path = new URL(request.url).pathname.replace(/\/$/, '') || '/';
  const page = legalRoutes.find(item => item.path === path);
  if (!page) throw new Response('Không tìm thấy trang.', { status: 404 });
  const doc = pageCopy(page.id);
  const configured = shopConfig.policies[page.policy];
  const body = doc?.body || configured || '';
  return {
    path: page.path,
    title: doc?.title ? renderTokens(doc.title) : page.title,
    description: doc?.description ? renderTokens(doc.description) : `${page.title} của cửa hàng.`,
    html: body ? renderMarkdown(body) : '',
    base: getEnv(context).SITE_URL,
  };
}

export function meta({ loaderData: data }: { loaderData?: Awaited<ReturnType<typeof loader>> }) {
  if (!data) return [];
  return pageMeta(legalRoutes.find(item => item.path === data.path)?.id || '', data.title, data.description, data.path, data.base);
}

export default function Legal() {
  const { title, html } = useLoaderData<typeof loader>();
  return <StoreLayout><Breadcrumb items={[{ label: title }]}/><article className="panel prose"><h1>{title}</h1>{html ? <div dangerouslySetInnerHTML={{ __html: html }}/> : <p>Nội dung đang được cửa hàng cập nhật. Vui lòng liên hệ cửa hàng để biết thông tin trước khi mua hàng.</p>}</article></StoreLayout>;
}
