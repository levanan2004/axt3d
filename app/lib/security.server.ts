import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env, Order } from './types';
export async function hash(value: string) {
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b=>b.toString(16).padStart(2,'0')).join('');
}
export async function secureEqual(a: string, b: string) {
 const [ha,hb] = await Promise.all([hash(a),hash(b)]); let diff=0;
 for (let i=0;i<ha.length;i++) diff |= ha.charCodeAt(i)^hb.charCodeAt(i);
 return diff===0;
}
export function assertSameOrigin(request: Request) {
 if (request.headers.get('origin') !== new URL(request.url).origin) throw new Response('Yêu cầu không hợp lệ.',{status:403});
}
export function orderCookie(code: string, token: string, request: Request) {
 return `order_${code}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
export async function canReadOrder(request: Request, order: Order) {
 const token = request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`order_${order.code}=`))?.split('=')[1];
 return token ? secureEqual(await hash(token),order.access_hash) : false;
}
export async function requireOrder(request: Request, order: Order | null) {
 if (!order || !(await canReadOrder(request,order))) throw new Response('Vui lòng tra cứu bằng mã đơn và số điện thoại.',{status:404});
}
export async function rateLimit(request: Request, env: Env, scope: string, limit=15) {
 const now=Date.now(), bucket=Math.floor(now/600000), ip=request.headers.get('cf-connecting-ip') || 'local';
 const key=await hash(`${scope}:${ip}:${bucket}`);
 const result=await env.DB.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+600000).first<{count:number}>();
 if ((result?.count || 0)>limit) throw new Response('Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',{status:429,headers:{'Retry-After':'600'}});
}
const keySets = new Map<string,ReturnType<typeof createRemoteJWKSet>>();
export async function requireAdmin(request: Request, env: Env) {
 const url=new URL(request.url);
 // Local bypass requires both loopback AND a secret injected locally, and is never enabled in staging.
 if (env.APP_ENV==='local' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname) && env.LOCAL_ADMIN_TOKEN) {
  const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('local_admin='))?.slice(12);
  if (token && await secureEqual(token,env.LOCAL_ADMIN_TOKEN)) return 'local-developer';
 }
 if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new Response('Cloudflare Access chưa được cấu hình. Xem README để mở Admin local.',{status:503});
 const assertion=request.headers.get('cf-access-jwt-assertion');
 if (!assertion) throw new Response('Cần đăng nhập Cloudflare Access.',{status:401});
 try {
  const issuer=`https://${env.ACCESS_TEAM_DOMAIN}`;
  let keys=keySets.get(issuer); if (!keys) { keys=createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)); keySets.set(issuer,keys); }
  const {payload}=await jwtVerify(assertion,keys,{issuer,audience:env.ACCESS_AUD,algorithms:['RS256']});
  if (typeof payload.email!=='string') throw new Error('Missing identity');
  return payload.email;
 } catch { throw new Response('Phiên đăng nhập không hợp lệ.',{status:403}); }
}
