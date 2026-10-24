import type { Env } from './types';
import { shopConfig } from './config';

export function robotsTxt(env: Pick<Env, 'APP_ENV' | 'SITE_URL'>) {
  const rules = env.APP_ENV === 'production'
    ? 'Allow: /\nDisallow: /admin\nDisallow: /pos\nDisallow: /api/\nDisallow: /thanh-toan\nDisallow: /gio-hang\nDisallow: /theo-doi-don'
    : 'Disallow: /';
  return `User-agent: *\n${rules}\nSitemap: ${env.SITE_URL}/sitemap.xml\n`;
}

/** Local runs without a bank account accept the sentinel LOCAL. Real accounts stay in config. */
export function expectedBankAccount(env: Pick<Env, 'APP_ENV'>) {
  if (shopConfig.bank.accountNumber) return shopConfig.bank.accountNumber;
  return env.APP_ENV === 'local' ? 'LOCAL' : '';
}

export const legalRoutes = [
  { id: 'dieu-khoan', path: '/dieu-khoan', legacy: '/chinh-sach/dieu-khoan', title: 'Điều khoản sử dụng', policy: 'terms' },
  { id: 'chinh-sach-bao-mat', path: '/chinh-sach-bao-mat', legacy: '/chinh-sach/bao-mat', title: 'Chính sách bảo mật', policy: 'privacy' },
  { id: 'doi-tra-hoan-tien', path: '/doi-tra-hoan-tien', legacy: '/chinh-sach/doi-tra', title: 'Đổi trả và hoàn tiền', policy: 'returns' },
  { id: 'van-chuyen', path: '/van-chuyen', legacy: '/chinh-sach/van-chuyen', title: 'Vận chuyển', policy: 'shipping' },
] as const;

export type LegalId = typeof legalRoutes[number]['id'];
