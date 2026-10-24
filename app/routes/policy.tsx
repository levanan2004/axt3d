import { redirect, type LoaderFunctionArgs } from 'react-router';
import { legalRoutes } from '../lib/http';

export function loader({ params }: LoaderFunctionArgs) {
  const found = legalRoutes.find(item => item.legacy === `/chinh-sach/${params.slug}`);
  if (!found) throw new Response('Không tìm thấy chính sách.', { status: 404 });
  return redirect(found.path, 301);
}

export default function PolicyRedirect() { return null; }
