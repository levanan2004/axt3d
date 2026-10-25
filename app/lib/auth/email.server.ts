import {emailCopy} from './copy';
import {shopConfig} from '../config';
import type {Env} from '../types';
export type EmailMessage={to:string;subject:string;html:string;text:string;link:string};
export interface EmailSender{send(message:EmailMessage):Promise<void>}
/** Links may be logged only on a developer machine, or on staging when DEV_EMAIL_LOG=1. Never in production. */
export function emailLogAllowed(env:Pick<Env,'APP_ENV'|'DEV_EMAIL_LOG'>){
 if(env.APP_ENV==='production')return false;
 return env.APP_ENV==='local'||(env.APP_ENV==='staging'&&env.DEV_EMAIL_LOG==='1');
}
export class LogSender implements EmailSender{
 constructor(private allowLinks:boolean,private log:(...a:unknown[])=>void=console.log){}
 async send(m:EmailMessage){
  if(this.allowLinks)this.log(`[email:log] ${m.subject}\n  link: ${m.link}`);
  else this.log('[email:log] email not sent: EMAIL_MODE is "log" and link logging is off (set EMAIL_MODE=cloudflare).');
 }
}
export class CloudflareSender implements EmailSender{
 constructor(private binding:NonNullable<Env['EMAIL']>,private from:string){}
 async send(m:EmailMessage){await this.binding.send({to:m.to,from:{email:this.from,name:shopConfig.shop.name},subject:m.subject,html:m.html,text:m.text});}
}
let override:EmailSender|null=null;
/** Tests can plug in a fake sender. */
export function setEmailSender(sender:EmailSender|null){override=sender;}
export function emailSender(env:Env):EmailSender{
 if(override)return override;
 if(env.EMAIL_MODE==='cloudflare'){
  if(env.EMAIL&&env.EMAIL_FROM)return new CloudflareSender(env.EMAIL,env.EMAIL_FROM);
  console.error('EMAIL_MODE=cloudflare but the EMAIL send_email binding or EMAIL_FROM is missing; email not sent.');
 }
 return new LogSender(emailLogAllowed(env));
}
const esc=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]!));
/** One template for every account email: 560px, logo, 44px orange button, grey footer. */
export function renderEmail(env:Env,{to,subject,body,button,link,after}:{to:string;subject:string;body:string;button:string;link:string;after:string}):EmailMessage{
 const logo=shopConfig.shop.logoUrl?`<img src="${esc(new URL(shopConfig.shop.logoUrl,env.SITE_URL).href)}" width="40" height="40" alt="${esc(shopConfig.shop.name)}" style="display:block;border:0">`:`<span style="font:700 22px Arial,sans-serif;color:#152B40">${esc(shopConfig.shop.name)}<span style="color:#F4511E">.</span></span>`;
 const html=`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head><body style="margin:0;background:#F2F4F7;padding:24px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#ffffff;border-radius:16px;font:15px/1.6 Arial,sans-serif;color:#152B40">
<tr><td style="padding:28px 32px 8px">${logo}</td></tr>
<tr><td style="padding:8px 32px">${esc(body)}</td></tr>
<tr><td style="padding:16px 32px"><a href="${esc(link)}" style="display:inline-block;background:#F4511E;color:#ffffff;text-decoration:none;font-weight:700;line-height:44px;height:44px;padding:0 24px;border-radius:10px">${esc(button)}</a></td></tr>
<tr><td style="padding:8px 32px 24px;color:#475467">${esc(after)}</td></tr>
<tr><td style="padding:16px 32px;background:#F2F4F7;border-radius:0 0 16px 16px;color:#6b7280;font-size:13px">${esc(emailCopy.footer)}</td></tr>
</table></td></tr></table></body></html>`;
 return {to,subject,html,text:`${body}\n\n${button}: ${link}\n\n${after}\n\n${emailCopy.footer}`,link};
}
export const accountLink=(env:Env,path:string,token:string)=>`${new URL(path,env.SITE_URL).href}?token=${token}`;
