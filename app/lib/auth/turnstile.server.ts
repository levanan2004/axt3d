import type {Env} from '../types';
const DEV_ENVS=['local','staging'];
/** 'on' = verify, 'off' = skip (dev without keys), 'broken' = production without keys → fail closed. */
export function turnstileMode(env:Env):'on'|'off'|'broken'{
 if(env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET)return 'on';
 return DEV_ENVS.includes(env.APP_ENV)?'off':'broken';
}
export async function verifyTurnstile(env:Env,request:Request,token:unknown,fetcher:typeof fetch=fetch){
 const mode=turnstileMode(env);if(mode==='off')return true;if(mode==='broken')return false;
 if(typeof token!=='string'||!token||token.length>2048)return false;
 const body=new FormData();body.set('secret',env.TURNSTILE_SECRET!);body.set('response',token);
 const ip=request.headers.get('cf-connecting-ip');if(ip)body.set('remoteip',ip);
 try{const r=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body});const j=await r.json() as {success?:boolean};return j.success===true;}catch{return false;}
}
