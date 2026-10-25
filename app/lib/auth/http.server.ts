import {assertSameOrigin} from '../security.server';
import {turnstileMode} from './turnstile.server';
import {googleEnabled} from './google.server';
import type {Env} from '../types';
import {z} from 'zod';
export async function readForm(request:Request){assertSameOrigin(request);const len=Number(request.headers.get('content-length')||0);if(len>16384)throw new Response('Yêu cầu quá lớn.',{status:413});return request.formData();}
export const str=(form:FormData,key:string)=>{const v=form.get(key);return typeof v==='string'?v:'';};
export function fieldErrors(error:z.ZodError){const out:Record<string,string>={};for(const i of error.issues){const k=String(i.path[0]??'form');out[k]??=i.message;}return out;}
/** What the auth pages need to render: Turnstile site key (only when enforced) and whether Google is on. */
export function authUi(env:Env){return {turnstileSiteKey:turnstileMode(env)==='on'?env.TURNSTILE_SITE_KEY!:'',turnstileBroken:turnstileMode(env)==='broken',google:googleEnabled(env)};}
