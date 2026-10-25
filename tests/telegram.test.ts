import {readFileSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {afterAll,afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {escapeHtml,formatOrderMessage,formatVnd,sendTelegram,shortName,type NotifyOrder} from '../app/lib/telegram';
import {expireOrdersAndNotify,notifyOrder} from '../app/lib/notify.server';
import {createOrder,recordPayment,transferContent} from '../app/lib/orders.server';
import {createVtpShipment,vtpWebhook} from '../app/lib/vtp-order.server';
import type {Env,Order} from '../app/lib/types';

const TOKEN='123456:SECRET-TOKEN-xyz',CHAT='-1001234567890',SITE='https://shop.example.vn';
const PHONE='0912345678',STREET='12 Đường Mẫu',WARD='Phường Bến Thành',PROVINCE='Thành phố Hồ Chí Minh';
const sample:NotifyOrder={code:'ABCDEF123456',customer_name:'Nguyễn Văn An',province:PROVINCE,status:'cho_coc',items_subtotal:450000,shipping_fee:30000,deposit_amount:240000,cod_amount:240000};
const ok=()=>vi.fn(async(_u:RequestInfo|URL,_i?:RequestInit)=>new Response('{"ok":true}',{status:200}));

describe('formatting',()=>{
 it('formats money like 450.000đ',()=>{expect(formatVnd(450000)).toBe('450.000đ');expect(formatVnd(0)).toBe('0đ');expect(formatVnd(1234567)).toBe('1.234.567đ');expect(formatVnd(999)).toBe('999đ');});
 it('short name and province only',()=>{expect(shortName(' Nguyễn Văn  An ')).toBe('An');expect(shortName('')).toBe('Khách');});
 it('escapes HTML',()=>{expect(escapeHtml('<b>A & "B"</b>')).toBe('&lt;b&gt;A &amp; &quot;B&quot;&lt;/b&gt;');const t=formatOrderMessage('created',{...sample,customer_name:'Hacker <script>'},[{product_name:'Mèo <i>x</i> & co',quantity:1}],SITE);expect(t).not.toContain('<script>');expect(t).toContain('Mèo &lt;i&gt;x&lt;/i&gt; &amp; co x1');expect(t).toContain('&lt;script&gt;');});
 const expected:Record<string,string>={created:'🆕 ĐƠN MỚI',deposited:'💰 ĐÃ NHẬN CỌC',cancelled:'❌ ĐƠN ĐÃ HUỶ',expired:'⌛ ĐƠN HẾT HẠN (quá 30 phút chưa cọc)',waybill:'🚚 ĐÃ TẠO VẬN ĐƠN VIETTEL POST',completed:'✅ KHÁCH ĐÃ NHẬN HÀNG'};
 for(const [kind,head] of Object.entries(expected))it(`message for ${kind}`,()=>{
  const t=formatOrderMessage(kind as never,{...sample,tracking_code:'1868123456789'},[{product_name:'Móc khoá mèo',quantity:2},{product_name:'Rồng khớp động',quantity:1}],SITE);
  expect(t).toContain(`<b>${head}</b>`);expect(t).toContain('#ABCDEF123456');expect(t).toContain('• Móc khoá mèo x2');expect(t).toContain('• Rồng khớp động x1');
  expect(t).toContain('Tiền hàng: 450.000đ');expect(t).toContain('Phí ship: 30.000đ');expect(t).toContain('Tiền cọc: 240.000đ');expect(t).toContain('COD còn thu: <b>240.000đ</b>');
  expect(t).toContain(`Khách: An · ${PROVINCE}`);expect(t).toContain('Trạng thái: Chờ cọc');expect(t).toContain(`Quản trị: ${SITE}/admin/don-hang/ABCDEF123456`);
  expect(t.includes('Mã vận đơn: 1868123456789')).toBe(kind==='waybill');
 });
 it('uses stored amounts as-is, never recomputed',()=>{const t=formatOrderMessage('deposited',{...sample,items_subtotal:100000,shipping_fee:7000,deposit_amount:51000,cod_amount:12345},[],SITE);expect(t).toContain('COD còn thu: <b>12.345đ</b>');expect(t).toContain('Tiền cọc: 51.000đ');expect(t).toContain('Phí ship: 7.000đ');});
 it('trailing slash in SITE_URL',()=>{expect(formatOrderMessage('created',sample,[],SITE+'/')).toContain(`${SITE}/admin/don-hang/ABCDEF123456`);});
});

describe('sendTelegram',()=>{
 afterEach(()=>vi.restoreAllMocks());
 it('no-op without token or chat id',async()=>{const f=ok();expect(await sendTelegram({},'x',f)).toBe(false);expect(await sendTelegram({TELEGRAM_BOT_TOKEN:TOKEN},'x',f)).toBe(false);expect(await sendTelegram({TELEGRAM_CHAT_ID:CHAT},'x',f)).toBe(false);expect(await sendTelegram({TELEGRAM_BOT_TOKEN:' ',TELEGRAM_CHAT_ID:CHAT},'x',f)).toBe(false);expect(f).not.toHaveBeenCalled();});
 it('posts sendMessage with HTML parse mode',async()=>{const f=ok();expect(await sendTelegram({TELEGRAM_BOT_TOKEN:TOKEN,TELEGRAM_CHAT_ID:CHAT},'xin chào',f)).toBe(true);const [url,init]=f.mock.calls[0];expect(url).toBe(`https://api.telegram.org/bot${TOKEN}/sendMessage`);expect(init!.method).toBe('POST');expect(JSON.parse(String(init!.body))).toMatchObject({chat_id:CHAT,text:'xin chào',parse_mode:'HTML'});});
 it('network error or HTTP error never throws and never logs the token',async()=>{const logs:unknown[]=[];vi.spyOn(console,'warn').mockImplementation((...a)=>{logs.push(...a);});vi.spyOn(console,'error').mockImplementation((...a)=>{logs.push(...a);});vi.spyOn(console,'log').mockImplementation((...a)=>{logs.push(...a);});
  const boom=vi.fn(async()=>{throw new Error(`fetch failed https://api.telegram.org/bot${TOKEN}/sendMessage`);});
  await expect(sendTelegram({TELEGRAM_BOT_TOKEN:TOKEN,TELEGRAM_CHAT_ID:CHAT},'x',boom as never)).resolves.toBe(false);
  await expect(sendTelegram({TELEGRAM_BOT_TOKEN:TOKEN,TELEGRAM_CHAT_ID:CHAT},'x',vi.fn(async()=>new Response('{"ok":false}',{status:401})) as never)).resolves.toBe(false);
  expect(logs.length).toBeGreaterThan(0);const joined=logs.map(String).join(' ');expect(joined).not.toContain(TOKEN);expect(joined).not.toContain('SECRET');expect(joined).not.toContain('api.telegram.org');});
});

let mf:Miniflare,db:D1Database,env:Env;
const now=Date.UTC(2026,9,25,3),access='a'.repeat(64);
const tgCalls:{url:string;body:{chat_id:string;text:string}}[]=[];
beforeAll(async()=>{mf=new Miniflare({modules:true,script:'export default { fetch() { return new Response("ok"); } }',d1Databases:['DB'],compatibilityDate:'2026-07-30'});db=await mf.getD1Database('DB') as unknown as D1Database;
 env={DB:db,SITE_URL:SITE,VTP_WEBHOOK_SECRET:'hook-secret',TELEGRAM_BOT_TOKEN:TOKEN,TELEGRAM_CHAT_ID:CHAT} as Env;
 for(const file of ['0001_store','0002_quotes','0003_ops','0004_shipping','0005_vtp_order','0006_chat','0007_accounts','0008_order_province']){const sql=readFileSync(`migrations/${file}.sql`,'utf8');await db.prepare(sql).run().catch(async()=>{await db.exec(sql);});}});
beforeEach(async()=>{tgCalls.length=0;
 vi.stubGlobal('fetch',vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{const u=String(url);if(u.startsWith('https://api.telegram.org/')){tgCalls.push({url:u,body:JSON.parse(String(init!.body))});return new Response('{"ok":true}');}return new Response('blocked in test',{status:500});}));
 for(const table of ['vtp_webhook_events','audit_logs','payments','order_events','order_items','orders','customers','variants','products','rate_limits'])await db.prepare(`DELETE FROM ${table}`).run();
 await db.prepare("INSERT INTO products(id,slug,name,category,image,created_at,updated_at,packed_weight_gram) VALUES('p','moc-khoa-meo','Móc khoá mèo','mo-hinh-3d','/images/dragon.webp',?,?,50)").bind(now,now).run();
 await db.prepare("INSERT INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('v','p','SKU','Cam','#d86b38','PLA',149000,5)").run();});
afterEach(()=>{vi.unstubAllGlobals();});
afterAll(async()=>{await mf?.dispose();});
function ctx(){const tasks:Promise<unknown>[]=[];return {tasks,waitUntil:(p:Promise<unknown>)=>{tasks.push(p);},flush:()=>Promise.all(tasks)};}
const input=()=>({name:'Nguyễn Văn An',phone:PHONE,street:STREET,provinceId:2,wardId:49236,provinceName:PROVINCE,wardName:WARD,note:'',checkoutKey:crypto.randomUUID(),items:[{variantId:'v',quantity:2}]});
const pay=(o:Order,id:number,amount=o.deposit_amount)=>({id,transferType:'in' as const,transferAmount:amount,content:transferContent(o.code),accountNumber:'1'});
function noLeak(text:string){expect(text).not.toContain(PHONE);expect(text).not.toContain(STREET);expect(text).not.toContain(WARD);expect(text).not.toContain('Nguyễn');expect(text).not.toMatch(/@/);}

describe('order hooks (D1 + mocked Telegram)',()=>{
 it('created -> deposited -> waybill -> completed, all from stored amounts, no PII',async()=>{
  const c=ctx();const o=await createOrder(env,input(),access,now,null,c);await c.flush();
  expect(tgCalls).toHaveLength(1);expect(tgCalls[0].body.chat_id).toBe(CHAT);const created=tgCalls[0].body.text;
  expect(created).toContain('🆕 ĐƠN MỚI');expect(created).toContain('• Móc khoá mèo x2');expect(created).toContain(`COD còn thu: <b>${formatVnd(o.cod_amount)}</b>`);expect(created).toContain(`Tiền cọc: ${formatVnd(o.deposit_amount)}`);expect(created).toContain(`Phí ship: ${formatVnd(o.shipping_fee)}`);expect(created).toContain(`Tiền hàng: ${formatVnd(o.items_subtotal)}`);expect(created).toContain(`Khách: An · ${PROVINCE}`);
  const r=await recordPayment(db,pay(o,1),now+1000);expect(r).toMatchObject({duplicate:false,event:'deposited',code:o.code});
  expect((await recordPayment(db,pay(o,1),now+2000)).event).toBeNull();
  const c2=ctx();notifyOrder(env,c2,r.event!,r.code!);await c2.flush();expect(tgCalls[1].body.text).toContain('💰 ĐÃ NHẬN CỌC');expect(tgCalls[1].body.text).toContain('Trạng thái: Đã cọc');
  await db.prepare("UPDATE orders SET shipping_service='VCN' WHERE id=?").bind(o.id).run();
  const c3=ctx();const vtpFetch=vi.fn(async()=>new Response(JSON.stringify({status:200,error:false,message:'OK',data:{ORDER_NUMBER:'1868123456789'}})));
  const w=await createVtpShipment({...env,VTP_API_TOKEN:'vtp'},o.code,'tester',{fetcher:vtpFetch as never,now:now+3000,ctx:c3});expect(w.ok).toBe(true);await c3.flush();
  expect(tgCalls[2].body.text).toContain('🚚 ĐÃ TẠO VẬN ĐƠN VIETTEL POST');expect(tgCalls[2].body.text).toContain('Mã vận đơn: 1868123456789');
  const again=ctx();await createVtpShipment({...env,VTP_API_TOKEN:'vtp'},o.code,'tester',{fetcher:vtpFetch as never,now:now+4000,ctx:again});await again.flush();expect(tgCalls).toHaveLength(3);
  const hook=(status:number)=>new Request('https://x/api/webhooks/viettelpost',{method:'POST',body:JSON.stringify({DATA:{ORDER_NUMBER:'1868123456789',ORDER_STATUS:status},TOKEN:'hook-secret'})});
  const c4=ctx();await vtpWebhook(hook(200),env,now+5000,c4);await vtpWebhook(hook(501),env,now+6000,c4);await vtpWebhook(hook(501),env,now+7000,c4);await c4.flush();
  expect(tgCalls).toHaveLength(4);expect(tgCalls[3].body.text).toContain('✅ KHÁCH ĐÃ NHẬN HÀNG');expect(tgCalls[3].body.text).toContain('Trạng thái: Hoàn thành');
  for(const call of tgCalls){noLeak(call.body.text);expect(call.body.text).toContain(`${SITE}/admin/don-hang/${o.code}`);}
 });
 it('expired after 30 minutes without deposit, once',async()=>{const c0=ctx();const o=await createOrder(env,input(),access,now,null,c0);await c0.flush();tgCalls.length=0;
  const c=ctx();await expireOrdersAndNotify(env,c,o.expires_at-1);await expireOrdersAndNotify(env,c,o.expires_at);await expireOrdersAndNotify(env,c,o.expires_at+60000);await c.flush();
  expect(tgCalls).toHaveLength(1);expect(tgCalls[0].body.text).toContain('⌛ ĐƠN HẾT HẠN (quá 30 phút chưa cọc)');expect(tgCalls[0].body.text).toContain('Trạng thái: Đã hủy');noLeak(tgCalls[0].body.text);});
 it('province comes from the stored province_name, never parsed from the free-text address',async()=>{const c=ctx();const o=await createOrder(env,input(),access,now,null,c);await c.flush();
  expect((await db.prepare('SELECT province_name FROM orders WHERE id=?').bind(o.id).first<{province_name:string}>())!.province_name).toBe(PROVINCE);expect(tgCalls[0].body.text).toContain(`\u00b7 ${PROVINCE}`);
  await db.prepare("UPDATE orders SET province_name=NULL,address='Fake St, Evil Ward, Hacker City' WHERE id=?").bind(o.id).run();tgCalls.length=0;
  const c2=ctx();notifyOrder(env,c2,'cancelled',o.code);await c2.flush();expect(tgCalls[0].body.text).not.toContain('Hacker City');expect(tgCalls[0].body.text).not.toContain('\u00b7');});
 it('late payment after expiry reports cancelled',async()=>{const o=await createOrder(env,input(),access,now);expect(await recordPayment(db,pay(o,7),o.expires_at+1)).toMatchObject({event:'cancelled',code:o.code});});
 it('silent no-op when env is missing: no fetch, no DB read',async()=>{const c=ctx();for(const e of [{...env,TELEGRAM_BOT_TOKEN:undefined},{...env,TELEGRAM_CHAT_ID:''}] as Env[]){await createOrder(e,input(),access,now,null,c);expect(await notifyOrder(e,c,'created','ABCDEF123456')).toBe(false);}await c.flush();expect(tgCalls).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();});
 it('Telegram failure never breaks the order flow',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('network down');}));const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
  const c=ctx();const o=await createOrder(env,input(),access,now,null,c);await expect(c.flush()).resolves.toEqual([false]);expect(o.status).toBe('cho_coc');
  const broken={...env,DB:{prepare:()=>{throw new Error('db down');}}} as unknown as Env;await expect(notifyOrder(broken,undefined,'created','X')).resolves.toBe(false);
  expect(warn.mock.calls.flat().map(String).join(' ')).not.toContain(TOKEN);warn.mockRestore();});
});
