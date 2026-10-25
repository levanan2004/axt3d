import {useState} from 'react';
import {Form,Link,data,useActionData,useLoaderData,useNavigate,useNavigation,type ActionFunctionArgs,type LoaderFunctionArgs} from 'react-router';
import {AuthCard,PasswordField,SubmitButton,StrengthMeter,FormError,Mascot,Toast} from '../components/auth';
import {getEnv} from '../lib/db.server';
import {shopConfig} from '../lib/config';
import {authCopy} from '../lib/auth/copy';
import {readForm,str,fieldErrors} from '../lib/auth/http.server';
import {resetPassword,resetSchema} from '../lib/auth/accounts.server';
import {peekToken} from '../lib/auth/tokens.server';
import {clearSessionCookie} from '../lib/auth/sessions.server';
export function meta(){return [{title:`${authCopy.reset.title} | ${shopConfig.shop.name}`},{name:'robots',content:'noindex,nofollow'},{name:'referrer',content:'no-referrer'}];}
export async function loader({request,context}:LoaderFunctionArgs){const token=new URL(request.url).searchParams.get('token');return {valid:!!await peekToken(getEnv(context).DB,token,['reset_password','create_password']),token:token||''};}
export async function action({request,context}:ActionFunctionArgs){const env=getEnv(context);const form=await readForm(request);
 const parsed=resetSchema.safeParse({password:str(form,'password'),confirm:str(form,'confirm')});
 if(!parsed.success)return data({ok:false,expired:false,errors:fieldErrors(parsed.error)},{status:400});
 const ok=await resetPassword(env,str(form,'token'),parsed.data.password);
 if(!ok)return data({ok:false,expired:true,errors:{} as Record<string,string>},{status:410});
 return data({ok:true,expired:false,errors:{} as Record<string,string>},{headers:{'Set-Cookie':clearSessionCookie(request)}});}
function Expired(){const c=authCopy.reset;return <AuthCard><div className="auth-expired"><Mascot size={160}/><p>{c.expired}</p><Link className="auth-primary" to="/quen-mat-khau">{c.newLink}</Link></div></AuthCard>;}
export default function Reset(){const {valid,token}=useLoaderData<typeof loader>(),result=useActionData<typeof action>(),nav=useNavigation(),navigate=useNavigate();const c=authCopy.reset;const [password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
 if(result?.ok)return <AuthCard title={c.title}><Toast message={c.success} onDone={()=>navigate('/dang-nhap?ok=doi-mat-khau',{replace:true})}/></AuthCard>;
 if(!valid||result?.expired)return <Expired/>;
 const e=result?.errors||{};const mismatch=confirm.length>0&&password!==confirm;
 return <AuthCard title={c.title}><Form method="post" className="auth-form" noValidate><input type="hidden" name="token" value={token}/>
  <PasswordField label={c.password} name="password" autoComplete="new-password" required hint={authCopy.signup.hint} error={e.password} value={password} onChange={ev=>setPassword(ev.target.value)}/>
  <StrengthMeter value={password}/>
  <PasswordField label={c.confirm} name="confirm" autoComplete="new-password" required error={mismatch?authCopy.signup.mismatch:e.confirm} value={confirm} onChange={ev=>setConfirm(ev.target.value)}/>
  <FormError>{e.form}</FormError>
  <SubmitButton busy={nav.state!=='idle'}>{c.button}</SubmitButton></Form></AuthCard>;}
