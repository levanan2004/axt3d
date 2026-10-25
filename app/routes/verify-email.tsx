import {redirect,useLoaderData,type LoaderFunctionArgs} from 'react-router';
import {Link} from 'react-router';
import {AuthCard,Mascot} from '../components/auth';
import {getEnv} from '../lib/db.server';
import {shopConfig} from '../lib/config';
import {authCopy} from '../lib/auth/copy';
import {verifyEmail} from '../lib/auth/accounts.server';
export function meta(){return [{title:`Xác nhận email | ${shopConfig.shop.name}`},{name:'robots',content:'noindex,nofollow'},{name:'referrer',content:'no-referrer'}];}
// Verification is idempotent-safe: the token is single-use, so a GET is acceptable (mail scanners consuming it only verify the address).
export async function loader({request,context}:LoaderFunctionArgs){const ok=await verifyEmail(getEnv(context),new URL(request.url).searchParams.get('token'));if(ok)throw redirect('/dang-nhap?ok=xac-nhan');return {ok:false};}
export default function VerifyEmail(){useLoaderData<typeof loader>();return <AuthCard><div className="auth-expired"><Mascot size={160}/><p>{authCopy.verify.expired}</p><Link className="auth-primary" to="/dang-ky?gui-lai=1">{authCopy.reset.newLink}</Link></div></AuthCard>;}
