import {createRequestHandler,RouterContextProvider} from 'react-router';
import {cloudflareContext} from '../app/lib/context';
import {z} from 'zod';
import {shopConfig} from '../app/lib/config';
import {expireOrders,recordPayment,sepaySchema} from '../app/lib/orders.server';
import {expireQuotes} from '../app/lib/quotes.server';
import {expectedBankAccount,legalRoutes,robotsTxt} from '../app/lib/http';
import {orderDetails,publicOrder} from '../app/lib/db.server';
import {assertSameOrigin,requireAdmin,requireOrder,secureEqual,rateLimit} from '../app/lib/security.server';
import type {Env,Variant} from '../app/lib/types';
const handler=createRequestHandler(()=>import('virtual:react-router/server-build'),import.meta.env.MODE);
function json(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store'}});}
const xml=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export async function webhook(request:Request,env:Env){
 if(!env.SEPAY_WEBHOOK_KEY)return json({success:false,error:'Integration not configured'},503);
 if(!await secureEqual(request.headers.get('authorization')||'',`Apikey ${env.SEPAY_WEBHOOK_KEY}`))return json({success:false},401);
 if(Number(request.headers.get('content-length')||0)>16384)return json({success:false},413);
 const raw=await request.text();if(raw.length>16384)return json({success:false},413);
 let payload:z.infer<typeof sepaySchema>;try{payload=sepaySchema.parse(JSON.parse(raw));}catch{return json({success:false,error:'Invalid payload'},400);}
 const expectedAccount=expectedBankAccount(env);
 if(!expectedAccount)return json({success:false,error:'Receiving account not configured'},503);
 if(payload.accountNumber!==expectedAccount)return json({success:false,error:'Wrong receiving account'},400);
 const result=await recordPayment(env.DB,payload);
 return json({success:true,...result});
}
async function api(request:Request,env:Env):Promise<Response|null>{const url=new URL(request.url),path=url.pathname;
 if(path==='/api/webhooks/sepay'){if(request.method!=='POST')return json({success:false},405);return webhook(request,env);}
 if(path==='/api/cart/quote'){
  if(request.method!=='POST')return json({error:'Method not allowed'},405);assertSameOrigin(request);
  const raw=await request.text();if(raw.length>16384)return json({error:'Giỏ hàng quá lớn.'},413);
  let items:{variantId:string;quantity:number}[];try{items=z.object({items:z.array(z.object({variantId:z.string().max(100),quantity:z.number().int().min(1).max(99)})).min(1).max(30)}).parse(JSON.parse(raw)).items;}catch{return json({error:'Giỏ hàng không hợp lệ.'},400);}
  const {results}=await env.DB.prepare(`SELECT v.*,p.name,p.slug,p.image FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id IN(${items.map(()=>'?').join(',')}) AND v.active=1 AND p.active=1`).bind(...items.map(i=>i.variantId)).all<Variant&{name:string;slug:string;image:string}>();
  const grouped=new Map<string,number>();for(const i of items)grouped.set(i.variantId,(grouped.get(i.variantId)||0)+i.quantity);
  if(results.length!==grouped.size||results.some(v=>v.stock<grouped.get(v.id)!))return json({error:'Có sản phẩm không còn đủ tồn kho. Vui lòng cập nhật giỏ hàng.'},409);
  return json({items:results.map(v=>({variantId:v.id,productSlug:v.slug,name:v.name,variantName:`${v.color} · ${v.material} · ${v.size}`,image:v.image,unitPrice:v.price,quantity:grouped.get(v.id),stock:v.stock,selected:true}))});
 }
 if(/^\/api\/orders\/[A-F0-9]{12}$/.test(path)){
  if(request.method!=='GET')return json({error:'Method not allowed'},405);
  const code=path.split('/').at(-1)!;const initial=await orderDetails(env.DB,code);await requireOrder(request,initial?.order||null);
  await expireOrders(env.DB);const details=(await orderDetails(env.DB,code))!;
  return json({order:publicOrder(details.order),items:details.items,events:details.events});
 }
 if(path==='/api/admin/images'){
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  assertSameOrigin(request);const actor=await requireAdmin(request,env);
  if(Number(request.headers.get('content-length')||0)>5*1024*1024)return json({error:'Ảnh tối đa 5 MB.'},413);
  const buffer=await request.arrayBuffer();const bytes=new Uint8Array(buffer);const ascii=(a:number,b:number)=>String.fromCharCode(...bytes.slice(a,b));
  if(buffer.byteLength>5*1024*1024||buffer.byteLength<16||ascii(0,4)!=='RIFF'||ascii(8,12)!=='WEBP')return json({error:'Chỉ nhận ảnh WebP hợp lệ, tối đa 5 MB.'},400);
  const key=`products/${crypto.randomUUID()}.webp`;
  await env.IMAGES.put(key,buffer,{httpMetadata:{contentType:'image/webp',cacheControl:'public,max-age=31536000,immutable'}});
  await env.DB.prepare('INSERT INTO audit_logs(actor,action,entity_id,detail,created_at) VALUES(?,?,?,?,?)').bind(actor,'upload_image',key,'WebP',Date.now()).run();
  return json({url:`/media/${key}`});
 }
 if(path.startsWith('/media/')){
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});
  const key=path.slice(7);if(!/^products\/[a-f0-9-]+\.webp$/.test(key))return new Response(null,{status:404});
  const object=await env.IMAGES.get(key);if(!object)return new Response(null,{status:404});
  const headers=new Headers();object.writeHttpMetadata(headers);headers.set('ETag',object.httpEtag);headers.set('X-Content-Type-Options','nosniff');
  return new Response(request.method==='HEAD'?null:object.body,{headers});
 }
 if(path==='/sitemap.xml'){
  const products=await env.DB.prepare('SELECT slug,updated_at FROM products WHERE active=1').all<{slug:string;updated_at:number}>();
  const entries=[...['/','/danh-muc','/lien-he','/dat-in',...legalRoutes.map(page=>page.path)].map(path=>({path,date:null as number|null})),...products.results.map(p=>({path:`/san-pham/${p.slug}`,date:p.updated_at}))];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(e=>`<url><loc>${xml(new URL(e.path,env.SITE_URL).href)}</loc>${e.date?`<lastmod>${new Date(e.date).toISOString()}</lastmod>`:''}</url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public,max-age=300'}});
 }
 if(path==='/robots.txt')return new Response(robotsTxt(env),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
 const quoteFile=path.match(/^\/api\/admin\/quote-files\/([A-F0-9]{12})\/([0-9a-f-]{36})$/);
 if(quoteFile){if(request.method!=='GET')return new Response(null,{status:405});const actor=await requireAdmin(request,env);const row=await env.DB.prepare('SELECT f.r2_key,f.filename FROM quote_files f JOIN quotes q ON q.id=f.quote_id WHERE q.code=? AND f.id=?').bind(quoteFile[1],quoteFile[2]).first<{r2_key:string;filename:string}>();if(!row)return new Response(null,{status:404});const object=await env.IMAGES.get(row.r2_key);if(!object)return new Response(null,{status:404});await env.DB.prepare('INSERT INTO audit_logs(actor,action,entity_id,detail,created_at) VALUES(?,?,?,?,?)').bind(actor,'download_quote_file',row.r2_key,row.filename,Date.now()).run();const headers=new Headers();object.writeHttpMetadata(headers);headers.set('Content-Disposition',`attachment; filename="${row.filename.replace(/["\r\n]/g,'')}"`);return new Response(object.body,{headers});}
 if(path==='/admin/local-auth'){
  if(env.APP_ENV!=='local'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!env.LOCAL_ADMIN_TOKEN)return new Response('Not found',{status:404});
  if(request.method==='POST'){assertSameOrigin(request);return new Response(null,{status:303,headers:{Location:'/admin','Set-Cookie':`local_admin=${env.LOCAL_ADMIN_TOKEN}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`}});}
  return new Response('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Admin local</title><body style="font:16px system-ui;max-width:480px;margin:80px auto;padding:24px"><h1>Mở Admin local</h1><p>Chỉ truy cập dữ liệu thử nghiệm trên máy này.</p><form method="post"><button style="padding:14px 24px;background:#c2410c;color:white;border:0;border-radius:8px">Vào trang quản trị</button></form><p><a href="/">Về cửa hàng</a></p></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
 }
 if(path.startsWith('/api/'))return json({error:'Not found'},404);
 return null;
}
export default {
 async fetch(request:Request,env:Env,ctx:ExecutionContext){
  let response:Response;
  try{const context=new RouterContextProvider();context.set(cloudflareContext,{env,ctx});response=await api(request,env)||await handler(request,context);}catch(error){if(error instanceof Response)response=error;else{console.error('Request failed',error instanceof Error?error.message:'unknown');response=json({error:'Không thể xử lý yêu cầu. Vui lòng thử lại.'},500);}}
  const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('X-Frame-Options','DENY');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  const path=new URL(request.url).pathname;
  if(/^\/(admin|api|thanh-toan|theo-doi-don|gio-hang|tai-khoan)/.test(path)){headers.set('Cache-Control','no-store');headers.set('X-Robots-Tag','noindex, nofollow');}
  if(env.APP_ENV!=='production')headers.set('X-Robots-Tag','noindex, nofollow');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 },
 async scheduled(_event:ScheduledController,env:Env,ctx:ExecutionContext){ctx.waitUntil(Promise.all([expireOrders(env.DB),expireQuotes(env.DB)]));}
} satisfies ExportedHandler<Env>;
