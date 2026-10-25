import {useEffect,useState} from 'react';
import {Form,Link,data,redirect,useActionData,useFetcher,useLoaderData,useNavigation,useSearchParams,type ActionFunctionArgs,type LoaderFunctionArgs} from 'react-router';
import {Mail} from 'lucide-react';
import {AuthCard,Field,PasswordField,SubmitButton,GoogleButton,Turnstile,FormError,StrengthMeter} from '../components/auth';
import {getEnv} from '../lib/db.server';
import {shopConfig} from '../lib/config';
import {authCopy,RESEND_SECONDS} from '../lib/auth/copy';
import {readForm,str,authUi,fieldErrors} from '../lib/auth/http.server';
import {signup,signupSchema,resendVerification,emailField} from '../lib/auth/accounts.server';
import {clientIp} from '../lib/auth/limits.server';
import {verifyTurnstile} from '../lib/auth/turnstile.server';
import {sessionAccount,safeNext} from '../lib/auth/sessions.server';
export function meta(){return [{title:`${authCopy.signup.title} | ${shopConfig.shop.name}`},{name:'robots',content:'noindex,nofollow'}];}
export async function loader({request,context}:LoaderFunctionArgs){const env=getEnv(context);if(await sessionAccount(env.DB,request))throw redirect(safeNext(new URL(request.url).searchParams.get('next')));return authUi(env);}
type Result={sent?:string;resent?:boolean;error?:string;errors?:Record<string,string>};
export async function action({request,context}:ActionFunctionArgs){const env=getEnv(context);const form=await readForm(request);const ip=clientIp(request);
 if(str(form,'intent')==='resend'){const email=emailField.safeParse(str(form,'email'));if(!email.success)return data<Result>({error:email.error.issues[0].message},{status:400});
  const r=await resendVerification(env,email.data,ip);return r.ok?data<Result>({sent:email.data,resent:true}):data<Result>({sent:email.data,error:r.error},{status:429});}
 const parsed=signupSchema.safeParse({name:str(form,'name'),email:str(form,'email'),password:str(form,'password'),confirm:str(form,'confirm')});
 if(!parsed.success)return data<Result>({errors:fieldErrors(parsed.error)},{status:400});
 if(!await verifyTurnstile(env,request,form.get('cf-turnstile-response')))return data<Result>({error:authCopy.turnstile},{status:400});
 const r=await signup(env,parsed.data,ip);
 return r.ok?data<Result>({sent:r.email}):data<Result>({error:r.error},{status:429});}
function CheckEmail({email,onChange}:{email:string;onChange:()=>void}){const fetcher=useFetcher<Result>();const [left,setLeft]=useState(RESEND_SECONDS);const c=authCopy.signup;
 useEffect(()=>{if(left<=0)return;const t=setTimeout(()=>setLeft(s=>s-1),1000);return()=>clearTimeout(t);},[left]);
 useEffect(()=>{if(fetcher.state==='idle'&&fetcher.data?.resent)setLeft(RESEND_SECONDS);},[fetcher.state,fetcher.data]);
 return <div className="auth-check"><div className="auth-envelope"><Mail size={56} strokeWidth={1.5}/></div><p className="auth-check-text">{c.checkEmail(email)}</p>
  <fetcher.Form method="post"><input type="hidden" name="intent" value="resend"/><input type="hidden" name="email" value={email}/><SubmitButton busy={fetcher.state!=='idle'} disabled={left>0}>{left>0?c.resendIn(left):c.resend}</SubmitButton></fetcher.Form>
  <FormError>{fetcher.data?.error}</FormError>
  <p className="auth-foot"><button type="button" className="auth-link auth-link-button" onClick={onChange}>{c.changeEmail}</button></p></div>;}
export default function Signup(){const ui=useLoaderData<typeof loader>(),result=useActionData<typeof action>(),nav=useNavigation(),[params]=useSearchParams();const busy=nav.state!=='idle'&&nav.formMethod==='POST';const c=authCopy.signup;const next=params.get('next')||'';
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[email,setEmail]=useState(''),[changing,setChanging]=useState(false);
 useEffect(()=>{if(result?.sent)setChanging(false);},[result]);
 const resendOnly=params.get('gui-lai')==='1';
 if(result?.sent&&!changing)return <AuthCard><CheckEmail email={result.sent} onChange={()=>{setEmail(result.sent!);setChanging(true);}}/></AuthCard>;
 if(resendOnly)return <AuthCard title={c.resend}><Form method="post" className="auth-form" noValidate><input type="hidden" name="intent" value="resend"/><Field label={c.email} name="email" type="email" autoComplete="email" required error={result?.error}/><SubmitButton busy={busy}>{c.resend}</SubmitButton></Form></AuthCard>;
 const e=result?.errors||{};const mismatch=confirm.length>0&&password!==confirm;
 return <AuthCard title={c.title}>
  {ui.google&&<GoogleButton next={next}/>}
  <Form method="post" className="auth-form" noValidate>
   <Field label={c.name} name="name" autoComplete="name" required maxLength={100} error={e.name}/>
   <Field label={c.email} name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} error={e.email} value={email} onChange={ev=>setEmail(ev.target.value)}/>
   <PasswordField label={c.password} name="password" autoComplete="new-password" required hint={c.hint} error={e.password} value={password} onChange={ev=>setPassword(ev.target.value)}/>
   <StrengthMeter value={password}/>
   <PasswordField label={c.confirm} name="confirm" autoComplete="new-password" required error={mismatch?c.mismatch:e.confirm} value={confirm} onChange={ev=>setConfirm(ev.target.value)}/>
   <FormError>{result?.error}</FormError>
   {ui.turnstileSiteKey&&<Turnstile siteKey={ui.turnstileSiteKey}/>}
   <SubmitButton busy={busy}>{c.button}</SubmitButton>
   <p className="auth-legal">{c.terms.before}<Link to="/dieu-khoan">{c.terms.terms}</Link>{c.terms.and}<Link to="/chinh-sach-bao-mat">{c.terms.privacy}</Link>{c.terms.after}</p>
  </Form>
  <p className="auth-foot">{c.haveAccount} <Link className="auth-link" to="/dang-nhap">{authCopy.login.title}</Link></p>
 </AuthCard>;}
