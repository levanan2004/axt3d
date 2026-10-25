import {createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey} from 'jose';
import {b64url,fromB64url} from './password.server';
import {randomToken} from './tokens.server';
import {cookie,readCookie} from './sessions.server';
import type {Account} from './sessions.server';
import type {Env} from '../types';
export const GOOGLE_ISSUERS=['https://accounts.google.com','accounts.google.com'];
export const OAUTH_COOKIE='axt_g_oauth';
const OAUTH_TTL_MS=10*60000;
let googleKeys:JWTVerifyGetKey|null=null;
const jwks=()=>googleKeys||=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export const googleEnabled=(env:Env)=>!!env.GOOGLE_CLIENT_ID;
export const redirectUri=(env:Env)=>new URL('/auth/google/callback',env.SITE_URL).href;
async function hmac(secret:string,data:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(`oauth-state:${secret}`),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return b64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(data))));
}
export type OAuthState={state:string;nonce:string;exp:number;next:string};
export async function signState(secret:string,s:OAuthState){const payload=b64url(new TextEncoder().encode(JSON.stringify(s)));return `${payload}.${await hmac(secret,payload)}`;}
export async function readState(secret:string,value:string|null,now=Date.now()):Promise<OAuthState|null>{
 if(!value)return null;const [payload,sig]=value.split('.');if(!payload||!sig)return null;
 const expected=await hmac(secret,payload);if(expected.length!==sig.length)return null;let d=0;for(let i=0;i<sig.length;i++)d|=sig.charCodeAt(i)^expected.charCodeAt(i);if(d)return null;
 try{const s=JSON.parse(new TextDecoder().decode(fromB64url(payload))) as OAuthState;return s.exp>now?s:null;}catch{return null;}
}
export async function startGoogle(env:Env,request:Request,next:string,now=Date.now()){
 const s:OAuthState={state:randomToken(),nonce:randomToken(),exp:now+OAUTH_TTL_MS,next};
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 url.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID!,redirect_uri:redirectUri(env),response_type:'code',scope:'openid email profile',state:s.state,nonce:s.nonce,prompt:'select_account'}).toString();
 return new Response(null,{status:302,headers:{Location:url.href,'Set-Cookie':cookie(request,OAUTH_COOKIE,await signState(env.GOOGLE_CLIENT_SECRET!,s),OAUTH_TTL_MS/1000,'/auth/google')}});
}
export type GoogleClaims={sub:string;email:string;email_verified:boolean;name:string;picture:string|null};
/** Verifies signature (Google JWKS), iss, aud, exp and nonce. */
export async function verifyIdToken(idToken:string,{clientId,nonce,keys=jwks(),now}:{clientId:string;nonce:string;keys?:JWTVerifyGetKey;now?:number}):Promise<GoogleClaims>{
 const {payload}=await jwtVerify(idToken,keys,{issuer:GOOGLE_ISSUERS,audience:clientId,algorithms:['RS256'],requiredClaims:['exp','iat','sub'],...(now?{currentDate:new Date(now)}:{})});
 if(payload.nonce!==nonce)throw new Error('nonce mismatch');
 if(typeof payload.sub!=='string'||typeof payload.email!=='string')throw new Error('missing claims');
 return {sub:payload.sub,email:payload.email.trim().toLowerCase(),email_verified:payload.email_verified===true||payload.email_verified==='true',name:typeof payload.name==='string'&&payload.name.trim()?payload.name.trim().slice(0,100):payload.email.split('@')[0],picture:typeof payload.picture==='string'&&/^https:\/\//.test(payload.picture)?payload.picture.slice(0,500):null};
}
export async function exchangeCode(env:Env,code:string,fetcher:typeof fetch=fetch){
 const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:env.GOOGLE_CLIENT_ID!,client_secret:env.GOOGLE_CLIENT_SECRET!,redirect_uri:redirectUri(env),grant_type:'authorization_code'})});
 if(!r.ok)throw new Error(`token exchange ${r.status}`);
 const j=await r.json() as {id_token?:string};if(!j.id_token)throw new Error('no id_token');return j.id_token;
}
export class GoogleLinkError extends Error{constructor(public reason:'unverified_google'|'unverified_local'){super(reason);}}
/**
 * Linking rules: match by Google sub first. Otherwise, an existing email account is linked ONLY when that account's
 * email is verified AND Google says email_verified. A new account requires Google email_verified.
 */
export async function resolveGoogleAccount(db:D1Database,c:GoogleClaims,now=Date.now()):Promise<Account>{
 const bySub=await db.prepare('SELECT * FROM accounts WHERE google_sub=?').bind(c.sub).first<Account>();
 if(bySub){await db.prepare('UPDATE accounts SET name=?,avatar_url=?,updated_at=? WHERE id=?').bind(c.name,c.picture,now,bySub.id).run();return {...bySub,name:c.name,avatar_url:c.picture};}
 if(!c.email_verified)throw new GoogleLinkError('unverified_google');
 const byEmail=await db.prepare('SELECT * FROM accounts WHERE email=?').bind(c.email).first<Account>();
 if(byEmail){
  if(!byEmail.email_verified||byEmail.google_sub)throw new GoogleLinkError('unverified_local');
  await db.prepare('UPDATE accounts SET google_sub=?,avatar_url=COALESCE(avatar_url,?),updated_at=? WHERE id=? AND google_sub IS NULL').bind(c.sub,c.picture,now,byEmail.id).run();
  return {...byEmail,google_sub:c.sub,avatar_url:byEmail.avatar_url||c.picture};
 }
 const id=crypto.randomUUID();
 await db.prepare('INSERT INTO accounts(id,email,name,avatar_url,password_hash,email_verified,google_sub,created_at,updated_at) VALUES(?,?,?,?,NULL,1,?,?,?)').bind(id,c.email,c.name,c.picture,c.sub,now,now).run();
 return (await db.prepare('SELECT * FROM accounts WHERE id=?').bind(id).first<Account>())!;
}
export const clearOAuthCookie=(request:Request)=>cookie(request,OAUTH_COOKIE,'',0,'/auth/google');
export const oauthCookieValue=(request:Request)=>readCookie(request,OAUTH_COOKIE);
