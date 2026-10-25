import {type LoaderFunctionArgs} from 'react-router';
import {getEnv} from '../lib/db.server';
import {googleEnabled,startGoogle,exchangeCode,verifyIdToken,resolveGoogleAccount,readState,oauthCookieValue,clearOAuthCookie,GoogleLinkError} from '../lib/auth/google.server';
import {rotateSession,sessionCookie,safeNext} from '../lib/auth/sessions.server';
function enabled(context:unknown){const env=getEnv(context);if(!googleEnabled(env))throw new Response('Not found',{status:404});if(!env.GOOGLE_CLIENT_SECRET)throw new Response('Google login chưa cấu hình xong.',{status:503});return env;}
export async function loader({request,context}:LoaderFunctionArgs){const env=enabled(context);const url=new URL(request.url);
 if(url.pathname==='/auth/google')return startGoogle(env,request,safeNext(url.searchParams.get('next')));
 const fail=(loi:string)=>{const h=new Headers({Location:`/dang-nhap?loi=${loi}`});h.append('Set-Cookie',clearOAuthCookie(request));return new Response(null,{status:302,headers:h});};
 const state=await readState(env.GOOGLE_CLIENT_SECRET!,oauthCookieValue(request));
 const code=url.searchParams.get('code');
 if(!state||!code||url.searchParams.get('state')!==state.state)return fail('google');
 try{
  const idToken=await exchangeCode(env,code);
  const claims=await verifyIdToken(idToken,{clientId:env.GOOGLE_CLIENT_ID!,nonce:state.nonce});
  const account=await resolveGoogleAccount(env.DB,claims);
  const token=await rotateSession(env.DB,request,account.id);
  const h=new Headers({Location:safeNext(state.next)});h.append('Set-Cookie',clearOAuthCookie(request));h.append('Set-Cookie',sessionCookie(request,token));
  return new Response(null,{status:302,headers:h});
 }catch(error){if(error instanceof GoogleLinkError)return fail('link');console.error('Google login failed',error instanceof Error?error.message:'unknown');return fail('google');}
}
