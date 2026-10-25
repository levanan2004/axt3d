import {Form,Link,data,redirect,useActionData,useLoaderData,useNavigation,useSearchParams,type ActionFunctionArgs,type LoaderFunctionArgs} from 'react-router';
import {AuthCard,Field,PasswordField,SubmitButton,GoogleButton,Turnstile,LockoutBox,FormError} from '../components/auth';
import {getEnv} from '../lib/db.server';
import {shopConfig} from '../lib/config';
import {authCopy} from '../lib/auth/copy';
import {readForm,str,authUi} from '../lib/auth/http.server';
import {login,loginSchema} from '../lib/auth/accounts.server';
import {clientIp} from '../lib/auth/limits.server';
import {verifyTurnstile} from '../lib/auth/turnstile.server';
import {rotateSession,sessionCookie,sessionAccount,safeNext} from '../lib/auth/sessions.server';
export function meta(){return [{title:`${authCopy.login.title} | ${shopConfig.shop.name}`},{name:'robots',content:'noindex,nofollow'}];}
const googleErrors:Record<string,string>={link:authCopy.login.googleLinkBlocked,google:authCopy.login.googleFailed};
export async function loader({request,context}:LoaderFunctionArgs){const env=getEnv(context);const url=new URL(request.url);
 if(await sessionAccount(env.DB,request))throw redirect(safeNext(url.searchParams.get('next')));
 return {...authUi(env),notice:googleErrors[url.searchParams.get('loi')||'']||'',reset:url.searchParams.get('ok')==='doi-mat-khau',verified:url.searchParams.get('ok')==='xac-nhan'};}
export async function action({request,context}:ActionFunctionArgs){const env=getEnv(context);const form=await readForm(request);
 const parsed=loginSchema.safeParse({email:str(form,'email'),password:str(form,'password')});
 if(!parsed.success)return data({error:authCopy.login.wrong,lockedMinutes:0,needsTurnstile:false,unverified:false},{status:400});
 const result=await login(env,parsed.data,clientIp(request),{turnstileOk:()=>verifyTurnstile(env,request,form.get('cf-turnstile-response'))});
 if(!result.ok)return data({error:result.error,lockedMinutes:result.lockedMinutes||0,needsTurnstile:!!result.needsTurnstile,unverified:!!result.unverified},{status:result.lockedMinutes?429:400});
 const token=await rotateSession(env.DB,request,result.account.id);
 return redirect(safeNext(str(form,'next')),{headers:{'Set-Cookie':sessionCookie(request,token)}});}
export default function Login(){const ui=useLoaderData<typeof loader>(),result=useActionData<typeof action>(),nav=useNavigation(),[params]=useSearchParams();const busy=nav.state!=='idle'&&nav.formMethod==='POST';const next=params.get('next')||'';const c=authCopy.login;
 return <AuthCard title={c.title}>
  {ui.reset&&<p className="auth-success" role="status">{authCopy.reset.success}</p>}
  {ui.verified&&<p className="auth-success" role="status">{authCopy.verify.ok}</p>}
  {ui.notice&&<FormError>{ui.notice}</FormError>}
  {ui.google&&<GoogleButton next={next}/>}
  <Form method="post" className="auth-form" noValidate>
   <input type="hidden" name="next" value={next}/>
   <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254}/>
   <PasswordField label="Mật khẩu" name="password" autoComplete="current-password" required/>
   <div className="auth-row-right"><Link className="auth-link" to="/quen-mat-khau">{c.forgot}</Link></div>
   {result?.lockedMinutes?<LockoutBox>{result.error}</LockoutBox>:<FormError>{result?.error}</FormError>}
   {result?.unverified&&<p className="auth-hint"><Link className="auth-link" to="/dang-ky?gui-lai=1">{authCopy.signup.resend}</Link></p>}
   {result?.needsTurnstile&&ui.turnstileSiteKey&&<Turnstile siteKey={ui.turnstileSiteKey}/>}
   <SubmitButton busy={busy}>{c.button}</SubmitButton>
  </Form>
  <p className="auth-foot">{c.noAccount} <Link className="auth-link" to={`/dang-ky${next?`?next=${encodeURIComponent(next)}`:''}`}>{c.create}</Link></p>
 </AuthCard>;}
