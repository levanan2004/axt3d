import {Form,Link,data,useActionData,useLoaderData,useNavigation,type ActionFunctionArgs,type LoaderFunctionArgs} from 'react-router';
import {AuthCard,Field,SubmitButton,Turnstile,FormError} from '../components/auth';
import {getEnv} from '../lib/db.server';
import {shopConfig} from '../lib/config';
import {authCopy} from '../lib/auth/copy';
import {readForm,str,authUi} from '../lib/auth/http.server';
import {forgotPassword,emailField} from '../lib/auth/accounts.server';
import {clientIp} from '../lib/auth/limits.server';
import {verifyTurnstile} from '../lib/auth/turnstile.server';
export function meta(){return [{title:`${authCopy.forgot.title} | ${shopConfig.shop.name}`},{name:'robots',content:'noindex,nofollow'}];}
export function loader({context}:LoaderFunctionArgs){return authUi(getEnv(context));}
export async function action({request,context}:ActionFunctionArgs){const env=getEnv(context);const form=await readForm(request);
 const email=emailField.safeParse(str(form,'email'));if(!email.success)return data({done:false,error:email.error.issues[0].message},{status:400});
 if(!await verifyTurnstile(env,request,form.get('cf-turnstile-response')))return data({done:false,error:authCopy.turnstile},{status:400});
 const r=await forgotPassword(env,email.data,clientIp(request));
 return r.ok?data({done:true,error:''}):data({done:false,error:r.error},{status:429});}
export default function Forgot(){const ui=useLoaderData<typeof loader>(),result=useActionData<typeof action>(),nav=useNavigation();const c=authCopy.forgot;
 if(result?.done)return <AuthCard title={c.title}><p className="auth-success" role="status">{c.after}</p><p className="auth-foot"><Link className="auth-link" to="/dang-nhap">{authCopy.login.title}</Link></p></AuthCard>;
 return <AuthCard title={c.title} sub={c.sub}><Form method="post" className="auth-form" noValidate>
  <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} error={result?.error&&result.error!==authCopy.tooFast&&result.error!==authCopy.turnstile?result.error:undefined}/>
  {(result?.error===authCopy.tooFast||result?.error===authCopy.turnstile)&&<FormError>{result.error}</FormError>}
  {ui.turnstileSiteKey&&<Turnstile siteKey={ui.turnstileSiteKey}/>}
  <SubmitButton busy={nav.state!=='idle'}>{c.button}</SubmitButton></Form>
  <p className="auth-foot"><Link className="auth-link" to="/dang-nhap">{authCopy.login.title}</Link></p></AuthCard>;}
