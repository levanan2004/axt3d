import {z} from 'zod';
import {hashPassword,verifyPassword,needsRehash} from './password.server';
import {issueToken,consumeToken} from './tokens.server';
import {createSession,revokeAllSessions,type Account} from './sessions.server';
import {emailSender,renderEmail,accountLink} from './email.server';
import {loginLock,loginFailed,loginSucceeded,sendLimits,minutesLeft,needsTurnstileFor,LOGIN_LIMITS} from './limits.server';
import {authCopy,emailCopy,PASSWORD_MIN,RESET_MINUTES,VERIFY_HOURS} from './copy';
import {addressFields,normalizePhone} from '../orders.server';
import type {Env} from '../types';
export const RESET_TTL_MS=RESET_MINUTES*60000, VERIFY_TTL_MS=VERIFY_HOURS*3600000;
export const emailField=z.string().trim().toLowerCase().max(254).email('Email chưa đúng định dạng.');
const password=z.string().min(PASSWORD_MIN,authCopy.signup.hint).max(128,'Mật khẩu tối đa 128 ký tự.');
const confirmed=<T extends z.ZodRawShape>(shape:T)=>z.object({...shape,password,confirm:z.string()}).refine(v=>(v as {password:string}).password===(v as {confirm:string}).confirm,{message:authCopy.signup.mismatch,path:['confirm']});
export const signupSchema=confirmed({name:z.string().trim().min(2,'Vui lòng nhập họ tên.').max(100),email:emailField});
export const loginSchema=z.object({email:emailField,password:z.string().min(1,authCopy.login.wrong).max(128)});
export const resetSchema=confirmed({});
export const changeSchema=confirmed({current:z.string().min(1).max(128)});
export const savedAddressSchema=z.object({name:z.string().trim().min(2,'Vui lòng nhập họ tên.').max(100),phone:z.string().transform(normalizePhone).pipe(z.string().regex(/^0[35789]\d{8}$/,'Số điện thoại Việt Nam chưa đúng.')),...addressFields()});
const findByEmail=(db:D1Database,email:string)=>db.prepare('SELECT * FROM accounts WHERE email=?').bind(email).first<Account>();
async function sendReset(env:Env,account:Account,kind:'reset'|'existing'|'create',now:number){
 const token=await issueToken(env.DB,account.id,kind==='create'?'create_password':'reset_password',RESET_TTL_MS,now);
 const c=emailCopy[kind];
 await emailSender(env).send(renderEmail(env,{to:account.email,subject:c.subject,body:c.body(account.name),button:c.button,after:c.after,link:accountLink(env,'/dat-lai-mat-khau',token)}));
}
async function sendVerify(env:Env,account:Account,now:number){
 const token=await issueToken(env.DB,account.id,'verify_email',VERIFY_TTL_MS,now);
 await emailSender(env).send(renderEmail(env,{to:account.email,subject:emailCopy.verify.subject,body:emailCopy.verify.body(account.name),button:emailCopy.verify.button,after:emailCopy.verify.after,link:accountLink(env,'/xac-nhan-email',token)}));
}
/**
 * Signup never reveals whether the email exists: both paths do the same hashing work and return the same result.
 * New email → unverified account + verification email. Existing email → "you already have an account" email with a reset link.
 */
export async function signup(env:Env,input:z.infer<typeof signupSchema>,ip:string,now=Date.now()){
 const limits=await sendLimits(env.DB,'signup',input.email,ip,now);
 if(!limits.ipOk)return {ok:false as const,error:authCopy.tooFast};
 const passwordHash=await hashPassword(input.password);
 const existing=await findByEmail(env.DB,input.email);
 if(existing){if(limits.emailOk)await sendReset(env,existing,'existing',now);return {ok:true as const,email:input.email};}
 const id=crypto.randomUUID();
 const inserted=await env.DB.prepare('INSERT INTO accounts(id,email,name,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,?,0,?,?) ON CONFLICT(email) DO NOTHING').bind(id,input.email,input.name,passwordHash,now,now).run();
 const account=inserted.meta.changes?(await env.DB.prepare('SELECT * FROM accounts WHERE id=?').bind(id).first<Account>())!:(await findByEmail(env.DB,input.email))!;
 if(limits.emailOk){if(inserted.meta.changes)await sendVerify(env,account,now);else await sendReset(env,account,'existing',now);}
 return {ok:true as const,email:input.email};
}
export async function resendVerification(env:Env,email:string,ip:string,now=Date.now()){
 const limits=await sendLimits(env.DB,'resend',email,ip,now);
 if(!limits.ipOk)return {ok:false as const,error:authCopy.tooFast};
 const account=await findByEmail(env.DB,email);
 if(limits.emailOk&&account&&!account.email_verified)await sendVerify(env,account,now);
 return {ok:true as const};
}
export async function verifyEmail(env:Env,token:unknown,now=Date.now()){
 const t=await consumeToken(env.DB,token,['verify_email'],now);if(!t)return false;
 await env.DB.prepare('UPDATE accounts SET email_verified=1,updated_at=? WHERE id=?').bind(now,t.account_id).run();return true;
}
export type LoginResult={ok:true;account:Account}|{ok:false;error:string;lockedMinutes?:number;needsTurnstile?:boolean;unverified?:boolean};
export async function login(env:Env,input:z.infer<typeof loginSchema>,ip:string,opts:{turnstileOk:()=>Promise<boolean>},now=Date.now()):Promise<LoginResult>{
 const lock=await loginLock(env.DB,input.email,ip,now);
 if(lock.lockedMs)return {ok:false,error:authCopy.login.locked(minutesLeft(lock.lockedMs)),lockedMinutes:minutesLeft(lock.lockedMs)};
 const needsTurnstile=needsTurnstileFor(lock);
 if(needsTurnstile&&!await opts.turnstileOk())return {ok:false,error:authCopy.turnstile,needsTurnstile};
 const account=await findByEmail(env.DB,input.email);
 const ok=await verifyPassword(input.password,account?.password_hash);
 if(!ok||!account){
  const r=await loginFailed(env.DB,input.email,ip,now);
  if(r.lockedMs)return {ok:false,error:authCopy.login.locked(minutesLeft(r.lockedMs)),lockedMinutes:minutesLeft(r.lockedMs)};
  return {ok:false,error:authCopy.login.wrong,needsTurnstile:needsTurnstile||needsTurnstileFor(r)};
 }
 await loginSucceeded(env.DB,input.email);
 if(!account.email_verified)return {ok:false,error:authCopy.login.unverified,unverified:true};
 if(needsRehash(account.password_hash!))await env.DB.prepare('UPDATE accounts SET password_hash=?,updated_at=? WHERE id=?').bind(await hashPassword(input.password),now,account.id).run();
 return {ok:true,account};
}
export async function forgotPassword(env:Env,email:string,ip:string,now=Date.now()){
 const limits=await sendLimits(env.DB,'forgot',email,ip,now);
 if(!limits.ipOk)return {ok:false as const,error:authCopy.tooFast};
 const account=await findByEmail(env.DB,email);
 if(limits.emailOk&&account)await sendReset(env,account,'reset',now);
 return {ok:true as const};
}
/** Reset / create password from an emailed link. Single use; proves mailbox ownership, so it also verifies the email. Revokes all sessions. */
export async function resetPassword(env:Env,token:unknown,newPassword:string,now=Date.now()){
 const t=await consumeToken(env.DB,token,['reset_password','create_password'],now);if(!t)return false;
 await env.DB.batch([
  env.DB.prepare('UPDATE accounts SET password_hash=?,email_verified=1,updated_at=? WHERE id=?').bind(await hashPassword(newPassword),now,t.account_id),
  env.DB.prepare("DELETE FROM account_tokens WHERE account_id=? AND purpose IN('reset_password','create_password') AND used_at IS NULL").bind(t.account_id),
  env.DB.prepare('DELETE FROM account_sessions WHERE account_id=?').bind(t.account_id),
 ]);
 return true;
}
/** Change password: needs the current one. Revokes every session and returns a fresh one for this device (rotation). */
export async function changePassword(env:Env,account:Account,current:string,next:string,ip='local',now=Date.now()){
 // Current-password guesses share the login failure counters (same email + IP keys).
 const lock=await loginLock(env.DB,account.email,ip,now);
 if(lock.lockedMs||lock.emailFailures>=LOGIN_LIMITS.email.max)return {ok:false as const,rateLimited:true as const};
 if(!account.password_hash||!await verifyPassword(current,account.password_hash)){await loginFailed(env.DB,account.email,ip,now);return {ok:false as const};}
 await loginSucceeded(env.DB,account.email);
 await env.DB.batch([
  env.DB.prepare('UPDATE accounts SET password_hash=?,updated_at=? WHERE id=?').bind(await hashPassword(next),now,account.id),
  env.DB.prepare("DELETE FROM account_tokens WHERE account_id=? AND purpose IN('reset_password','create_password') AND used_at IS NULL").bind(account.id),
 ]);
 await revokeAllSessions(env.DB,account.id);
 return {ok:true as const,token:await createSession(env.DB,account.id,now)};
}
/** Google-only accounts create a password through an emailed link (30 min, single use). */
export async function requestCreatePassword(env:Env,account:Account,ip:string,now=Date.now()){
 if(account.password_hash)return {ok:false as const,error:'Tài khoản đã có mật khẩu.'};
 const limits=await sendLimits(env.DB,'create-pw',account.email,ip,now);
 if(!limits.ipOk||!limits.emailOk)return {ok:false as const,error:authCopy.tooFast};
 await sendReset(env,account,'create',now);return {ok:true as const};
}
/** Deletes the account, its addresses, sessions and tokens; orders are kept but unlinked. */
export async function deleteAccount(db:D1Database,accountId:string){
 await db.batch([
  db.prepare('UPDATE orders SET account_id=NULL WHERE account_id=?').bind(accountId),
  db.prepare('DELETE FROM account_addresses WHERE account_id=?').bind(accountId),
  db.prepare('DELETE FROM account_sessions WHERE account_id=?').bind(accountId),
  db.prepare('DELETE FROM account_tokens WHERE account_id=?').bind(accountId),
  db.prepare('DELETE FROM accounts WHERE id=?').bind(accountId),
 ]);
}
export type SavedAddress={id:string;name:string;phone:string;street:string;province_id:number;province_name:string;ward_id:number;ward_name:string;is_default:number};
export const MAX_ADDRESSES=10;
export async function listAddresses(db:D1Database,accountId:string){return (await db.prepare('SELECT id,name,phone,street,province_id,province_name,ward_id,ward_name,is_default FROM account_addresses WHERE account_id=? ORDER BY is_default DESC,created_at DESC').bind(accountId).all<SavedAddress>()).results;}
export async function saveAddress(db:D1Database,accountId:string,id:string|null,a:z.infer<typeof savedAddressSchema>,makeDefault:boolean,now=Date.now()){
 const count=(await db.prepare('SELECT count(*) AS n FROM account_addresses WHERE account_id=?').bind(accountId).first<{n:number}>())!.n;
 if(!id&&count>=MAX_ADDRESSES)throw new Error(`Tối đa ${MAX_ADDRESSES} địa chỉ.`);
 const isDefault=makeDefault||count===0;const addrId=id||crypto.randomUUID();
 const stmts=[];
 if(isDefault)stmts.push(db.prepare('UPDATE account_addresses SET is_default=0 WHERE account_id=?').bind(accountId));
 if(id)stmts.push(db.prepare(`UPDATE account_addresses SET name=?,phone=?,street=?,province_id=?,province_name=?,ward_id=?,ward_name=?,${isDefault?'is_default=1,':''}updated_at=? WHERE id=? AND account_id=?`).bind(a.name,a.phone,a.street,a.provinceId,a.provinceName,a.wardId,a.wardName,now,id,accountId));
 else stmts.push(db.prepare('INSERT INTO account_addresses(id,account_id,name,phone,street,province_id,province_name,ward_id,ward_name,is_default,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(addrId,accountId,a.name,a.phone,a.street,a.provinceId,a.provinceName,a.wardId,a.wardName,isDefault?1:0,now,now));
 await db.batch(stmts);return addrId;
}
export async function setDefaultAddress(db:D1Database,accountId:string,id:string){
 const exists=await db.prepare('SELECT 1 FROM account_addresses WHERE id=? AND account_id=?').bind(id,accountId).first();if(!exists)return;
 await db.batch([db.prepare('UPDATE account_addresses SET is_default=0 WHERE account_id=?').bind(accountId),db.prepare('UPDATE account_addresses SET is_default=1 WHERE id=? AND account_id=?').bind(id,accountId)]);
}
export async function deleteAddress(db:D1Database,accountId:string,id:string){
 await db.prepare('DELETE FROM account_addresses WHERE id=? AND account_id=?').bind(id,accountId).run();
 await db.prepare('UPDATE account_addresses SET is_default=1 WHERE id=(SELECT id FROM account_addresses WHERE account_id=? ORDER BY created_at DESC LIMIT 1) AND NOT EXISTS(SELECT 1 FROM account_addresses WHERE account_id=? AND is_default=1)').bind(accountId,accountId).run();
}
export async function defaultAddress(db:D1Database,accountId:string){return db.prepare('SELECT id,name,phone,street,province_id,province_name,ward_id,ward_name,is_default FROM account_addresses WHERE account_id=? ORDER BY is_default DESC,created_at DESC LIMIT 1').bind(accountId).first<SavedAddress>();}
export async function accountOrders(db:D1Database,accountId:string){
 return (await db.prepare('SELECT o.code,o.status,o.created_at,o.items_subtotal,o.shipping_fee,(SELECT count(*) FROM order_items i WHERE i.order_id=o.id) AS item_count,(SELECT image FROM order_items i WHERE i.order_id=o.id LIMIT 1) AS image,(SELECT product_name FROM order_items i WHERE i.order_id=o.id LIMIT 1) AS first_name FROM orders o WHERE o.account_id=? ORDER BY o.created_at DESC LIMIT 50').bind(accountId).all<{code:string;status:string;created_at:number;items_subtotal:number;shipping_fee:number;item_count:number;image:string|null;first_name:string|null}>()).results;
}
