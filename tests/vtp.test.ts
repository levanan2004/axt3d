import {readFileSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {beforeAll,beforeEach,afterAll,describe,it,expect,vi} from 'vitest';
import {shopConfig} from '../app/lib/config';
import {createOrderBody,parseCreateOrderReply,shippingCard,vtpAllowsInspection,vtpCodAmount,vtpOrderPayment,vtpOrderService,vtpWebhookAction,vtpWeightGram} from '../app/lib/vtp-order';
import {createVtpShipment,vtpPreview,vtpWebhook} from '../app/lib/vtp-order.server';
import {createOrder,recordPayment,transferContent} from '../app/lib/orders.server';
import type {Env,Order} from '../app/lib/types';

const cfg=shopConfig.shipping;
const rules=shopConfig.vtpOrder;
const base={code:'ABCDEF123456',customer_name:'Nguyễn Văn An',phone:'0912345678',address:'12 Đường Mẫu, Phường Bến Thành, Thành phố Hồ Chí Minh',province_id:2,ward_id:49236,shipping_service:'VCN',items_subtotal:149000,shipping_fee:20000,deposit_amount:85000,credited_amount:85000};

describe('COD and weight',()=>{
 it('COD = stored goods + stored ship - deposit',()=>{expect(vtpCodAmount(base)).toBe(84000);expect(vtpCodAmount({...base,shipping_fee:35000})).toBe(99000);});
 it('deposit covering everything gives COD 0',()=>{expect(vtpCodAmount({...base,deposit_amount:169000})).toBe(0);expect(vtpCodAmount({...base,deposit_amount:200000})).toBe(0);});
 it('shop pays freight and COD fee -> ORDER_PAYMENT 3',()=>{expect(rules.shippingFeePaidBy).toBe('shop');expect(rules.codFeePaidBy).toBe('shop');expect(vtpOrderPayment()).toBe(3);expect(vtpOrderPayment({...rules,shippingFeePaidBy:'customer',codFeePaidBy:'customer'})).toBe(2);});
 it('unknown or mixed rules fail loudly instead of guessing money',()=>{expect(()=>vtpCodAmount(base,{...rules,codAmount:'x'})).toThrow();expect(()=>vtpOrderPayment({...rules,codFeePaidBy:'customer'})).toThrow();expect(()=>vtpOrderService(base,{...rules,serviceCode:'x'})).toThrow();});
 it('service = the one saved at quote time, no silent default',()=>{expect(vtpOrderService({shipping_service:'LCOD'})).toBe('LCOD');expect(()=>vtpOrderService({shipping_service:null})).toThrow();});
 it('inspection on, no try-on',()=>{expect(vtpAllowsInspection()).toBe(true);expect(vtpAllowsInspection({...rules,allowInspection:'không cho xem hàng'})).toBe(false);});
 it('weight: product grams with 300g default, custom print plastic + 150g once',()=>{expect(vtpWeightGram([{weightGram:120,quantity:2},{weightGram:null,quantity:1}])).toBe(540);expect(vtpWeightGram([],[{gramsPerUnit:80,quantity:2}])).toBe(160+150);expect(vtpWeightGram([{weightGram:100,quantity:1}],[{gramsPerUnit:50,quantity:1}])).toBe(100+50+150);});
});

describe('createOrder payload',()=>{
 it('maps sender warehouse (old ids) and receiver (new 2-level ids)',()=>{const b=createOrderBody(base,[{name:'Rồng khớp động',quantity:1,unitPrice:149000}],420,Date.UTC(2026,9,25,3,4,5));
  expect(b).toMatchObject({ORDER_NUMBER:'ABCDEF123456',GROUPADDRESS_ID:29689517,SENDER_FULLNAME:'Lê Vân An',SENDER_PROVINCE:2,SENDER_DISTRICT:36,SENDER_WARD:689,RECEIVER_FULLNAME:'Nguyễn Văn An',RECEIVER_PHONE:'0912345678',RECEIVER_PROVINCE:2,RECEIVER_DISTRICT:0,RECEIVER_WARD:49236,PRODUCT_WEIGHT:420,PRODUCT_PRICE:149000,MONEY_COLLECTION:84000,ORDER_PAYMENT:3,ORDER_SERVICE:'VCN',PRODUCT_TYPE:'HH',DELIVERY_DATE:'25/10/2026 10:04:05'});
  expect(b.SENDER_ADDRESS).toBe('41 Đường số 29, Tân Thông Hội, Củ Chi');expect(b.PRODUCT_NAME).toBe('Rồng khớp động x1');expect(b.ORDER_NOTE).toBe('Cho xem hàng, không cho thử');});
 it('uses the saved quote service',()=>{expect(createOrderBody({...base,shipping_service:'LCOD'},[],300).ORDER_SERVICE).toBe('LCOD');expect(()=>createOrderBody({...base,shipping_service:null},[],300)).toThrow();});
 it('needs VTP province/ward ids',()=>{expect(()=>createOrderBody({...base,ward_id:null},[],300)).toThrow();});
 it('parses success and error replies',()=>{expect(parseCreateOrderReply(200,{status:200,error:false,message:'OK',data:{ORDER_NUMBER:'1868123456789'}})).toEqual({ok:true,orderNumber:'1868123456789'});expect(parseCreateOrderReply(200,{error:true,message:'Incorrect data: RECEIVER_WARD'})).toEqual({ok:false,message:'Incorrect data: RECEIVER_WARD'});expect(parseCreateOrderReply(500,null).ok).toBe(false);});
});

describe('webhook mapping and customer card',()=>{
 it('only 501 completes the order',()=>{expect(vtpWebhookAction(501)).toBe('hoan_thanh');for(const s of [100,105,200,503,504,-15,107])expect(vtpWebhookAction(s)).toBeNull();});
 it('card copy for shipping and delivered',()=>{const c=shippingCard({...base,status:'da_giao_van_chuyen',tracking_code:'1868123456789'})!;expect(c.title).toBe('Đơn hàng đang trên đường đến bạn');expect(c.description).toBe(`${shopConfig.shop.name} đã gửi đơn qua Viettel Post. Khi nhận hàng, bạn thanh toán phần còn lại cho nhân viên giao hàng.`);expect(c.codAmount).toBe(84000);expect(c.step).toBe(2);expect(c.inspectionNote).toContain('kiểm tra hàng');
  const d=shippingCard({...base,status:'hoan_thanh',tracking_code:'1868123456789'})!;expect(d.title).toBe('Bạn đã nhận hàng');expect(d.description).toBe(`Cảm ơn bạn đã mua hàng tại ${shopConfig.shop.name}. Nếu cần hỗ trợ, bạn nhắn Zalo cho shop nhé.`);expect(d.step).toBe(3);
  expect(shippingCard({...base,status:'da_coc',tracking_code:null})).toBeNull();});
});

let mf:Miniflare,db:D1Database,env:Env;
const now=Date.UTC(2026,9,25,3),token='a'.repeat(64);
beforeAll(async()=>{mf=new Miniflare({modules:true,script:'export default { fetch() { return new Response("ok"); } }',d1Databases:['DB'],compatibilityDate:'2026-07-30'});db=await mf.getD1Database('DB') as unknown as D1Database;env={DB:db,VTP_API_TOKEN:'test-token',VTP_WEBHOOK_SECRET:'hook-secret'} as Env;for(const file of ['0001_store','0002_quotes','0003_ops','0004_shipping','0005_vtp_order']){const sql=readFileSync(`migrations/${file}.sql`,'utf8');await db.prepare(sql).run().catch(async()=>{await db.exec(sql);});}});
beforeEach(async()=>{for(const table of ['vtp_webhook_events','audit_logs','payments','order_events','order_items','orders','customers','variants','products','rate_limits'])await db.prepare(`DELETE FROM ${table}`).run();await db.prepare("INSERT INTO products(id,slug,name,category,image,created_at,updated_at,packed_weight_gram) VALUES('p','product','Rồng khớp động','mo-hinh-3d','/images/dragon.webp',?,?,250)").bind(now,now).run();await db.prepare("INSERT INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES('v','p','SKU','Cam','#d86b38','PLA',149000,5)").run();});
afterAll(async()=>{await mf?.dispose();});
async function depositedOrder(service:string|null='VCN'){const o=await createOrder({...env,VTP_API_TOKEN:undefined},{name:'Nguyễn Văn An',phone:'0912345678',street:'12 Đường Mẫu',provinceId:2,wardId:49236,provinceName:'Thành phố Hồ Chí Minh',wardName:'Phường Bến Thành',note:'',checkoutKey:crypto.randomUUID(),items:[{variantId:'v',quantity:2}]},token,now);await recordPayment(db,{id:Math.floor(Math.random()*1e9),transferType:'in',transferAmount:o.deposit_amount,content:transferContent(o.code),accountNumber:'1'},now+1000);await db.prepare('UPDATE orders SET shipping_service=? WHERE id=?').bind(service,o.id).run();const fresh=(await db.prepare('SELECT * FROM orders WHERE id=?').bind(o.id).first<Order>())!;expect(fresh.status).toBe('da_coc');return fresh;}
const vtpOk=(n='1868123456789')=>vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({status:200,error:false,message:'OK',data:{ORDER_NUMBER:n}}),{status:200}));
const reload=async(id:string)=>(await db.prepare('SELECT * FROM orders WHERE id=?').bind(id).first<Order>())!;

describe('createVtpShipment (mocked VTP)',()=>{
 it('refuses an order quoted with the fallback fee (no saved service) without calling VTP',async()=>{const o=await depositedOrder(null);const fetcher=vtpOk();const r=await createVtpShipment(env,o.code,'tester',{fetcher,now:now+5000});expect(r.ok).toBe(false);expect(fetcher).not.toHaveBeenCalled();expect((await reload(o.id)).status).toBe('da_coc');});
 it('sends the mapped payload with the Token header and saves the result',async()=>{const o=await depositedOrder();const fetcher=vtpOk();const r=await createVtpShipment(env,o.code,'tester',{fetcher,now:now+5000});expect(r).toEqual({ok:true,trackingNumber:'1868123456789',already:false});
  const [url,init]=fetcher.mock.calls[0];expect(url).toBe('https://partner.viettelpost.vn/v2/order/createOrder');expect((init!.headers as Record<string,string>).Token).toBe('test-token');const body=JSON.parse(String(init!.body));expect(body.PRODUCT_WEIGHT).toBe(500);expect(body.MONEY_COLLECTION).toBe(o.items_subtotal+o.shipping_fee-o.deposit_amount);expect(body.RECEIVER_WARD).toBe(49236);expect(body.ORDER_SERVICE).toBe('VCN');expect(body.ORDER_PAYMENT).toBe(3);expect(body.ORDER_NOTE).toBe('Cho xem hàng, không cho thử');
  const after=await reload(o.id);expect(after.status).toBe('da_giao_van_chuyen');expect(after.vtp_order_number).toBe('1868123456789');expect(after.tracking_code).toBe('1868123456789');
  const events=await db.prepare('SELECT status FROM order_events WHERE order_id=? ORDER BY id').bind(o.id).all<{status:string}>();expect(events.results.map(e=>e.status)).toContain('da_giao_van_chuyen');});
 it('is idempotent: a second click and parallel clicks send only once',async()=>{const o=await depositedOrder();const fetcher=vtpOk();const results=await Promise.all([createVtpShipment(env,o.code,'a',{fetcher,now}),createVtpShipment(env,o.code,'b',{fetcher,now})]);expect(fetcher).toHaveBeenCalledTimes(1);expect(results.filter(r=>r.ok&&!r.already)).toHaveLength(1);const again=await createVtpShipment(env,o.code,'a',{fetcher,now});expect(again).toEqual({ok:true,trackingNumber:'1868123456789',already:true});expect(fetcher).toHaveBeenCalledTimes(1);});
 it('keeps da_coc and stores the VTP error so the admin can retry',async()=>{const o=await depositedOrder();const bad=vi.fn(async()=>new Response(JSON.stringify({error:true,message:'Price does not apply to this itinerary!'}),{status:200}));const r=await createVtpShipment(env,o.code,'a',{fetcher:bad,now});expect(r).toMatchObject({ok:false,error:'Price does not apply to this itinerary!'});const after=await reload(o.id);expect(after.status).toBe('da_coc');expect(after.vtp_state).toBe('error');const retry=await createVtpShipment(env,o.code,'a',{fetcher:vtpOk(),now:now+1});expect(retry.ok).toBe(true);});
 it('a timeout needs explicit confirmation before retrying',async()=>{const o=await depositedOrder();const boom=vi.fn(async()=>{throw new Error('network');});const r=await createVtpShipment(env,o.code,'a',{fetcher:boom,now});expect(r).toMatchObject({ok:false,unknown:true});const fetcher=vtpOk();expect(await createVtpShipment(env,o.code,'a',{fetcher,now})).toMatchObject({ok:false,unknown:true});expect(fetcher).not.toHaveBeenCalled();expect((await createVtpShipment(env,o.code,'a',{fetcher,now,confirmUnknown:true})).ok).toBe(true);});
 it('refuses orders that are not da_coc and never calls VTP',async()=>{const o=await depositedOrder();await db.prepare("UPDATE orders SET status='dang_chuan_bi' WHERE id=?").bind(o.id).run();const fetcher=vtpOk();expect((await createVtpShipment(env,o.code,'a',{fetcher,now})).ok).toBe(false);expect(fetcher).not.toHaveBeenCalled();});
 it('preview shows warehouse, COD and weight',async()=>{const o=await depositedOrder();expect(await vtpPreview(db,o)).toEqual({weightGram:500,codAmount:o.items_subtotal+o.shipping_fee-o.deposit_amount,warehouse:'Lê Vân An · 41 Đường số 29, Tân Thông Hội, Củ Chi'});});
});

describe('VTP webhook',()=>{
 const hook=(body:unknown,headers:Record<string,string>={})=>new Request('https://x/api/webhooks/viettelpost',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 it('rejects a missing or wrong secret and 503s when not configured',async()=>{expect((await vtpWebhook(hook({DATA:{ORDER_NUMBER:'1868123456789',ORDER_STATUS:501},TOKEN:'nope'}),env)).status).toBe(401);expect((await vtpWebhook(hook({DATA:{ORDER_NUMBER:'1868123456789',ORDER_STATUS:501}}),{...env,VTP_WEBHOOK_SECRET:undefined})).status).toBe(503);});
 it('501 completes the order once; duplicates and other statuses are harmless',async()=>{const o=await depositedOrder();await createVtpShipment(env,o.code,'a',{fetcher:vtpOk(),now});
  const r105=await vtpWebhook(hook({DATA:{ORDER_NUMBER:'1868123456789',ORDER_STATUS:105}},{Authorization:'hook-secret'}),env,now+1);expect(r105.status).toBe(200);expect((await reload(o.id)).status).toBe('da_giao_van_chuyen');
  const r1=await vtpWebhook(hook({DATA:{ORDER_NUMBER:'1868123456789',ORDER_STATUS:501,STATUS_NAME:'Phát thành công'},TOKEN:'hook-secret'}),env,now+2);expect(await r1.json()).toMatchObject({success:true,duplicate:false,updated:true});expect((await reload(o.id)).status).toBe('hoan_thanh');
  const r2=await vtpWebhook(hook({DATA:{ORDER_NUMBER:'1868123456789',ORDER_STATUS:501},TOKEN:'hook-secret'}),env,now+3);expect(await r2.json()).toMatchObject({success:true,duplicate:true,updated:false});
  const done=await db.prepare("SELECT COUNT(*) AS n FROM order_events WHERE order_id=? AND status='hoan_thanh'").bind(o.id).first<{n:number}>();expect(done!.n).toBe(1);});
 it('unknown VTP numbers get 200 so VTP stops retrying',async()=>{const r=await vtpWebhook(hook({DATA:{ORDER_NUMBER:'999999999',ORDER_STATUS:501},TOKEN:'hook-secret'}),env,now);expect(r.status).toBe(200);});
});
