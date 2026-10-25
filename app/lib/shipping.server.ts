import { shopConfig } from './config';
import { fetchShippingQuote, type FeeRequest, type ShippingQuote } from './shipping';
import type { Env } from './types';

export type Province = { id: number; name: string };
export type Ward = { id: number; name: string; provinceId: number };
const vtp = shopConfig.shipping.viettelPost;

function edgeCache(): Cache | null {
  return typeof caches !== 'undefined' && 'default' in caches ? (caches as unknown as { default: Cache }).default : null;
}

/** GET a VTP categories endpoint, cached at the edge. The token never goes into the cache key. */
async function vtpCategories<T>(env: Env, path: string, map: (row: Record<string, unknown>) => T | null): Promise<T[]> {
  const url = `${vtp.baseUrl}/categories/${path}`;
  const cache = edgeCache();
  const key = new Request(`https://vtp-cache.internal/${path}`);
  const hit = await cache?.match(key);
  if (hit) return hit.json() as Promise<T[]>;
  if (!env.VTP_API_TOKEN) throw new Error('VTP_NOT_CONFIGURED');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), shopConfig.shipping.apiTimeoutMs * 2);
  try {
    const response = await fetch(url, { headers: { Token: env.VTP_API_TOKEN }, signal: controller.signal });
    if (!response.ok) throw new Error(`VTP_HTTP_${response.status}`);
    const payload = await response.json() as { error?: boolean; data?: Record<string, unknown>[] };
    if (payload.error || !Array.isArray(payload.data)) throw new Error('VTP_BAD_PAYLOAD');
    const rows = payload.data.map(map).filter((x): x is T => x !== null);
    if (!rows.length) throw new Error('VTP_EMPTY');
    await cache?.put(key, new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${vtp.locationCacheSeconds}` } }));
    return rows;
  } finally { clearTimeout(timer); }
}

export function listProvinces(env: Env) {
  return vtpCategories<Province>(env, 'listProvinceNew', r => typeof r.PROVINCE_ID === 'number' && typeof r.PROVINCE_NAME === 'string' ? { id: r.PROVINCE_ID, name: r.PROVINCE_NAME } : null)
    .then(rows => rows.sort((a, b) => a.name.localeCompare(b.name, 'vi')));
}

export function listWards(env: Env, provinceId: number) {
  return vtpCategories<Ward>(env, `listWardsNew?provinceId=${provinceId}`, r => typeof r.WARDS_ID === 'number' && typeof r.WARDS_NAME === 'string' && r.PROVINCE_ID === provinceId ? { id: r.WARDS_ID, name: r.WARDS_NAME, provinceId } : null)
    .then(rows => rows.sort((a, b) => a.name.localeCompare(b.name, 'vi')));
}

/**
 * Turn the checkout ids into a printable address. Names come from VTP when it answers so a tampered
 * name cannot reach the label; if the list is unavailable the submitted names are kept.
 */
export async function resolveAddress(env: Env, input: { street: string; provinceId: number; wardId: number; provinceName: string; wardName: string }) {
  let provinceName = input.provinceName, wardName = input.wardName;
  try {
    const [provinces, wards] = await Promise.all([listProvinces(env), listWards(env, input.provinceId)]);
    const province = provinces.find(p => p.id === input.provinceId), ward = wards.find(w => w.id === input.wardId);
    if (!province || !ward) throw new Error('Phường/xã không thuộc tỉnh/thành đã chọn. Vui lòng chọn lại địa chỉ.');
    provinceName = province.name; wardName = ward.name;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Phường/xã')) throw error;
  }
  return { provinceName, wardName, address: `${input.street.trim()}, ${wardName}, ${provinceName}` };
}

/** Server-side fee: cached per destination/weight/value for a few minutes, fallback on error or timeout. */
export async function quoteShipping(env: Env, req: FeeRequest, fetcher: typeof fetch = fetch): Promise<ShippingQuote> {
  const cache = edgeCache();
  const key = new Request(`https://vtp-cache.internal/fee/${req.provinceId}/${req.wardId}/${req.weightGram}/${req.goodsValue}/${req.cod}`);
  const hit = await cache?.match(key);
  if (hit) return hit.json() as Promise<ShippingQuote>;
  const quote = await fetchShippingQuote(req, env.VTP_API_TOKEN, fetcher);
  if (!quote.fallback) await cache?.put(key, new Response(JSON.stringify(quote), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${vtp.feeCacheSeconds}` } }));
  else console.warn('VTP fee fallback used');
  return quote;
}