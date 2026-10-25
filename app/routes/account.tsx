import {useEffect,useRef,useState} from 'react';
import {Form,Link,data,redirect,useActionData,useFetcher,useLoaderData,useNavigation,useSearchParams,type ActionFunctionArgs,type LoaderFunctionArgs} from 'react-router';
import {MapPin,Pencil,Trash2,ChevronRight} from 'lucide-react';
import {StoreLayout} from '../components/store';
import {StatusBadge} from '../components/order';
import {AddressPicker,emptyAddress,type AddressValue} from '../components/address-picker';
import {Avatar,PasswordField,SubmitButton,StrengthMeter,FormError,Mascot} from '../components/auth';
import {getEnv} from '../lib/db.server';
import {shopConfig,type OrderStatus} from '../lib/config';
import {money} from '../lib/money';
import {authCopy} from '../lib/auth/copy';
import {readForm,str,fieldErrors} from '../lib/auth/http.server';
import {requireAccount,clearSessionCookie,sessionCookie,logout} from '../lib/auth/sessions.server';
import {accountOrders,listAddresses,saveAddress,deleteAddress,setDefaultAddress,savedAddressSchema,changeSchema,changePassword,requestCreatePassword,deleteAccount,type SavedAddress} from '../lib/auth/accounts.server';
import {clientIp,consumeLimit,limitKey} from '../lib/auth/limits.server';
export function meta(){return [{title:`Tài khoản | ${shopConfig.shop.name}`},{name:'robots',content:'noindex,nofollow'}];}
export async function loader({request,context}:LoaderFunctionArgs){const env=getEnv(context);const a=await requireAccount(env,request);
 const [orders,addresses]=await Promise.all([accountOrders(env.DB,a.id),listAddresses(env.DB,a.id)]);
 return {account:{name:a.name,email:a.email,avatar:a.avatar_url,hasPassword:!!a.password_hash},orders,addresses};}
type Result={intent:string;ok?:boolean;error?:string;errors?:Record<string,string>;message?:string};
export async function action({request,context}:ActionFunctionArgs){const env=getEnv(context);const form=await readForm(request);const intent=str(form,'intent');
 if(intent==='logout'){await logout(env.DB,request);return redirect('/',{headers:{'Set-Cookie':clearSessionCookie(request)}});}
 const a=await requireAccount(env,request);
 if(intent==='delete'){await deleteAccount(env.DB,a.id);return redirect('/',{headers:{'Set-Cookie':clearSessionCookie(request)}});}
 if(intent==='change-password'){
  const parsed=changeSchema.safeParse({current:str(form,'current'),password:str(form,'password'),confirm:str(form,'confirm')});
  if(!parsed.success)return data<Result>({intent,errors:fieldErrors(parsed.error)},{status:400});
  const limit=await consumeLimit(env.DB,await limitKey('change-pw',a.id),5,15*60000);
  if(!limit.allowed)return data<Result>({intent,error:authCopy.tooFast},{status:429});
  const r=await changePassword(env,a,parsed.data.current,parsed.data.password,clientIp(request));if(!r.ok&&'rateLimited' in r)return data<Result>({intent,error:authCopy.tooFast},{status:429});
  if(!r.ok)return data<Result>({intent,errors:{current:authCopy.change.wrongCurrent}},{status:400});
  return data<Result>({intent,ok:true,message:authCopy.change.success},{headers:{'Set-Cookie':sessionCookie(request,r.token)}});}
 if(intent==='create-password'){const r=await requestCreatePassword(env,a,clientIp(request));return r.ok?data<Result>({intent,ok:true,message:authCopy.create.sent(a.email)}):data<Result>({intent,error:r.error},{status:429});}
 if(intent==='address-save'){
  const parsed=savedAddressSchema.safeParse({name:str(form,'name'),phone:str(form,'phone'),street:str(form,'street'),provinceId:str(form,'provinceId'),wardId:str(form,'wardId'),provinceName:str(form,'provinceName'),wardName:str(form,'wardName')});
  if(!parsed.success)return data<Result>({intent,errors:fieldErrors(parsed.error),error:parsed.error.issues[0]?.message},{status:400});
  try{await saveAddress(env.DB,a.id,str(form,'id')||null,parsed.data,form.get('isDefault')==='1');}catch(e){return data<Result>({intent,error:e instanceof Error?e.message:'Chưa lưu được địa chỉ.'},{status:400});}
  return data<Result>({intent,ok:true});}
 if(intent==='address-delete'){await deleteAddress(env.DB,a.id,str(form,'id'));return data<Result>({intent,ok:true});}
 if(intent==='address-default'){await setDefaultAddress(env.DB,a.id,str(form,'id'));return data<Result>({intent,ok:true});}
 return data<Result>({intent,error:'Yêu cầu không hợp lệ.'},{status:400});}
const TABS=[['don-hang',authCopy.account.tabs.orders],['dia-chi',authCopy.account.tabs.addresses],['bao-mat',authCopy.account.tabs.security]] as const;
const dateFmt=new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeZone:'Asia/Ho_Chi_Minh'});
function Orders({orders}:{orders:Awaited<ReturnType<typeof loader>>['orders']}){
 if(!orders.length)return <div className="account-empty"><Mascot size={80}/><p>{authCopy.account.empty}</p><Link className="auth-primary account-empty-cta" to="/danh-muc">{authCopy.account.browse}</Link></div>;
 return <div className="account-orders">{orders.map(o=><Link key={o.code} className="account-order" to={`/theo-doi-don?ma=${o.code}`}>{o.image&&<img src={o.image} width="56" height="56" alt=""/>}<div><div className="account-order-top"><strong>#{o.code}</strong><StatusBadge status={o.status as OrderStatus}/></div><p>{o.first_name}{o.item_count>1?` và ${o.item_count-1} sản phẩm khác`:''}</p><small>{dateFmt.format(o.created_at)} · {money(o.items_subtotal+o.shipping_fee)}</small></div><ChevronRight size={18}/></Link>)}</div>;}
function AddressForm({initial,onDone}:{initial:SavedAddress|null;onDone:()=>void}){const fetcher=useFetcher<Result>();const [addr,setAddr]=useState<AddressValue>(initial?{provinceId:initial.province_id,provinceName:initial.province_name,wardId:initial.ward_id,wardName:initial.ward_name,street:initial.street}:emptyAddress);
 useEffect(()=>{if(fetcher.state==='idle'&&fetcher.data?.ok)onDone();},[fetcher.state,fetcher.data,onDone]);
 return <fetcher.Form method="post" className="panel account-address-form"><input type="hidden" name="intent" value="address-save"/>{initial&&<input type="hidden" name="id" value={initial.id}/>}
  <div className="form-grid"><label className="field">Họ và tên<input name="name" autoComplete="name" required minLength={2} maxLength={100} defaultValue={initial?.name}/></label><label className="field">Số điện thoại<input name="phone" type="tel" autoComplete="tel" required maxLength={20} defaultValue={initial?.phone}/></label><AddressPicker value={addr} onChange={setAddr}/></div>
  <label className="account-check"><input type="checkbox" name="isDefault" value="1" defaultChecked={!!initial?.is_default}/> Đặt làm địa chỉ mặc định</label>
  <FormError>{fetcher.data?.error}</FormError>
  <div className="account-form-actions"><button type="button" className="account-outline" onClick={onDone}>Huỷ</button><SubmitButton busy={fetcher.state!=='idle'}>Lưu địa chỉ</SubmitButton></div></fetcher.Form>;}
function Addresses({addresses}:{addresses:SavedAddress[]}){const [editing,setEditing]=useState<string|null>(null);const fetcher=useFetcher();
 return <div className="account-addresses">{addresses.map(a=>editing===a.id?<AddressForm key={a.id} initial={a} onDone={()=>setEditing(null)}/>:<div key={a.id} className="account-address"><MapPin size={20}/><div><p><strong>{a.name}</strong> · {a.phone} {a.is_default?<span className="account-default">{authCopy.account.defaultBadge}</span>:null}</p><p>{a.street}, {a.ward_name}, {a.province_name}</p>
  <div className="account-address-actions"><button type="button" className="auth-link auth-link-button" onClick={()=>setEditing(a.id)}><Pencil size={14}/> Sửa</button>{!a.is_default&&<fetcher.Form method="post"><input type="hidden" name="intent" value="address-default"/><input type="hidden" name="id" value={a.id}/><button className="auth-link auth-link-button">Đặt mặc định</button></fetcher.Form>}<fetcher.Form method="post" onSubmit={e=>{if(!confirm('Xoá địa chỉ này?'))e.preventDefault();}}><input type="hidden" name="intent" value="address-delete"/><input type="hidden" name="id" value={a.id}/><button className="auth-link auth-link-button account-danger-link"><Trash2 size={14}/> Xoá</button></fetcher.Form></div></div></div>)}
  {editing==='new'?<AddressForm initial={null} onDone={()=>setEditing(null)}/>:<button type="button" className="account-add" onClick={()=>setEditing('new')}>{authCopy.account.addAddress}</button>}</div>;}
function Security({account}:{account:Awaited<ReturnType<typeof loader>>['account']}){const result=useActionData<typeof action>(),nav=useNavigation();const [password,setPassword]=useState(''),[confirmPw,setConfirmPw]=useState(''),[askCreate,setAskCreate]=useState(false);const dialog=useRef<HTMLDialogElement>(null);
 const busy=(i:string)=>nav.state!=='idle'&&nav.formData?.get('intent')===i;const r=result&&result.intent==='change-password'?result:null;const cr=result&&result.intent==='create-password'?result:null;const e=r?.errors||{};const c=authCopy.change;
 useEffect(()=>{if(r?.ok){setPassword('');setConfirmPw('');}},[r]);
 return <div className="account-security">
  {account.hasPassword?<Form method="post" className="auth-form account-narrow" noValidate key={r?.ok?'done':'form'}><input type="hidden" name="intent" value="change-password"/>
   <PasswordField label={c.current} name="current" autoComplete="current-password" required error={e.current}/>
   <PasswordField label={c.password} name="password" autoComplete="new-password" required hint={authCopy.signup.hint} error={e.password} value={password} onChange={ev=>setPassword(ev.target.value)}/>
   <StrengthMeter value={password}/>
   <PasswordField label={c.confirm} name="confirm" autoComplete="new-password" required error={confirmPw&&password!==confirmPw?authCopy.signup.mismatch:e.confirm} value={confirmPw} onChange={ev=>setConfirmPw(ev.target.value)}/>
   {r?.ok&&<p className="auth-success" role="status">{r.message}</p>}<FormError>{r?.error}</FormError>
   <SubmitButton busy={busy('change-password')}>{c.button}</SubmitButton></Form>
  :<div className="account-narrow">{cr?.ok?<p className="auth-success" role="status">{cr.message}</p>:askCreate?<Form method="post" className="auth-form"><input type="hidden" name="intent" value="create-password"/><p>{authCopy.create.explain(account.email)}</p><FormError>{cr?.error}</FormError><SubmitButton busy={busy('create-password')}>{authCopy.create.send}</SubmitButton></Form>:<button type="button" className="auth-primary" onClick={()=>setAskCreate(true)}>{authCopy.create.button}</button>}</div>}
  <Form method="post" className="account-narrow"><input type="hidden" name="intent" value="logout"/><button className="account-outline account-wide">{authCopy.account.logout}</button></Form>
  <div className="account-delete-zone"><button type="button" className="account-delete" onClick={()=>dialog.current?.showModal()}>{authCopy.del.open}</button></div>
  <dialog ref={dialog} className="account-dialog" aria-labelledby="del-title"><h2 id="del-title">{authCopy.del.title}</h2><p>{authCopy.del.body}</p><Form method="post" className="account-dialog-actions"><input type="hidden" name="intent" value="delete"/><button type="button" className="account-outline" onClick={()=>dialog.current?.close()}>{authCopy.del.cancel}</button><button className="account-delete-confirm" disabled={busy('delete')}>{authCopy.del.confirm}</button></Form></dialog>
 </div>;}
export default function Account(){const {account,orders,addresses}=useLoaderData<typeof loader>();const [params]=useSearchParams();const tab=TABS.some(t=>t[0]===params.get('tab'))?params.get('tab')!:'don-hang';
 return <StoreLayout><div className="account-page">
  <header className="account-head"><Avatar name={account.name} url={account.avatar} size={64}/><div className="account-id"><h1>{account.name}</h1><p>{account.email}</p></div><Form method="post"><input type="hidden" name="intent" value="logout"/><button className="account-outline">{authCopy.account.logout}</button></Form></header>
  <nav className="account-tabs" role="tablist">{TABS.map(([id,label])=><Link key={id} role="tab" aria-selected={tab===id} className={tab===id?'active':''} to={`?tab=${id}`} replace preventScrollReset>{label}</Link>)}</nav>
  <section role="tabpanel">{tab==='don-hang'?<Orders orders={orders}/>:tab==='dia-chi'?<Addresses addresses={addresses}/>:<Security account={account}/>}</section>
 </div></StoreLayout>;}
