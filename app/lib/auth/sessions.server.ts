import {hash} from '../security.server';
import {randomToken} from './tokens.server';
import {SESSION_DAYS} from './copy';
import type {Env} from '../types';
export const SESSION_COOKIE='axt_session';
export const SESSION_MS=SESSION_DAYS*86400000;
export type Account={id:string;email:string;name:string;avatar_url:string|null;password_hash:string|null;email_verified:number;google_sub:string|null;created_at:number;updated_at:number};
const LOOPBACK=['localhost','127.0.0.1','[::1]'];
export function readCookie(request:Request,name:string){
 for(const part of (request.headers.get('cookie')||'').split(';')){const i=part.indexOf('=');if(i>0&&part.slice(0,i).trim()===name)return part.slice(i+1).trim();}
 return null;
}
export function cookie(request:Request,name:string,value:string,maxAgeSec:number,path='/'){
 const secure=LOOPBACK.includes(new URL(request.url).hostname)?'':'; Secure';
 return `${name}=${value}; HttpOnly; SameSite=Lax; Path=${path}; Max-Age=${maxAgeSec}${secure}`;
}
export const sessionCookie=(request:Request,token:string)=>cookie(request,SESSION_COOKIE,token,Math.floor(SESSION_MS/1000));
export const clearSessionCookie=(request:Request)=>cookie(request,SESSION_COOKIE,'',0);
export async function createSession(db:D1Database,accountId:string,now=Date.now()){
 const token=randomToken();
 await db.prepare('INSERT INTO account_sessions(token_hash,account_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hash(token),accountId,now,now+SESSION_MS).run();
 return token;
}
/** Login: drop whatever session the browser carried (fixation) and issue a fresh token. */
export async function rotateSession(db:D1Database,request:Request,accountId:string,now=Date.now()){
 const old=readCookie(request,SESSION_COOKIE);
 if(old)await db.prepare('DELETE FROM account_sessions WHERE token_hash=?').bind(await hash(old)).run();
 return createSession(db,accountId,now);
}
/** Password change/reset: revoke every session of the account, optionally issuing one new session for the current device. */
export async function revokeAllSessions(db:D1Database,accountId:string){await db.prepare('DELETE FROM account_sessions WHERE account_id=?').bind(accountId).run();}
export async function sessionAccount(db:D1Database,request:Request,now=Date.now()){
 const token=readCookie(request,SESSION_COOKIE);if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 return db.prepare('SELECT a.* FROM account_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(token),now).first<Account>();
}
export async function logout(db:D1Database,request:Request){
 const token=readCookie(request,SESSION_COOKIE);if(token)await db.prepare('DELETE FROM account_sessions WHERE token_hash=?').bind(await hash(token)).run();
}
export async function requireAccount(env:Env,request:Request){
 const account=await sessionAccount(env.DB,request);
 if(!account){const url=new URL(request.url);throw new Response(null,{status:302,headers:{Location:`/dang-nhap?next=${encodeURIComponent(url.pathname+url.search)}`,'Set-Cookie':clearSessionCookie(request)}});}
 return account;
}
export function safeNext(next:unknown){const s=typeof next==='string'?next:'';return /^\/(?![/\\])[^\s]*$/.test(s)&&!s.startsWith('/auth/')?s:'/tai-khoan';}
