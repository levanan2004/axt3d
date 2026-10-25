import {hash} from '../security.server';
// Fixed-window counters in D1 (no KV is configured). Keys are hashed so raw emails/IPs are never stored.
export const LOGIN_LIMITS={email:{max:5,windowMs:15*60000,lockMs:15*60000},ip:{max:20,windowMs:15*60000,lockMs:15*60000},turnstileAfter:3};
export const SEND_LIMITS={ipPerHour:10,emailPerHour:3,emailMinGapMs:60000};
export const limitKey=(scope:string,value:string)=>hash(`auth:${scope}:${value.toLowerCase()}`);
export const clientIp=(request:Request)=>request.headers.get('cf-connecting-ip')||'local';
type Row={count:number;window_ends:number;locked_until:number};
async function bump(db:D1Database,key:string,windowMs:number,now:number){
 return (await db.prepare('INSERT INTO auth_limits(key,count,window_ends,locked_until) VALUES(?1,1,?2+?3,0) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_ends<=?2 THEN 1 ELSE count+1 END,window_ends=CASE WHEN window_ends<=?2 THEN ?2+?3 ELSE window_ends END RETURNING count,window_ends,locked_until').bind(key,now,windowMs).first<Row>())!;
}
/** Counts one request. allowed=false once more than max happened inside the window. */
export async function consumeLimit(db:D1Database,key:string,max:number,windowMs:number,now=Date.now()){
 const row=await bump(db,key,windowMs,now);return {allowed:row.count<=max,retryAfterMs:row.window_ends-now,count:row.count};
}
export async function peekLimit(db:D1Database,key:string,now=Date.now()){
 const row=await db.prepare('SELECT count,window_ends,locked_until FROM auth_limits WHERE key=?').bind(key).first<Row>();
 return {count:row&&row.window_ends>now?row.count:0,lockedMs:row&&row.locked_until>now?row.locked_until-now:0};
}
export async function recordFailure(db:D1Database,key:string,rule:{max:number;windowMs:number;lockMs:number},now=Date.now()){
 const row=await bump(db,key,rule.windowMs,now);
 if(row.count>=rule.max){await db.prepare('UPDATE auth_limits SET locked_until=?,count=0,window_ends=? WHERE key=?').bind(now+rule.lockMs,now,key).run();return {lockedMs:rule.lockMs,count:row.count};}
 return {lockedMs:0,count:row.count};
}
export const clearLimit=(db:D1Database,key:string)=>db.prepare('DELETE FROM auth_limits WHERE key=?').bind(key).run();
export const minutesLeft=(ms:number)=>Math.max(1,Math.ceil(ms/60000));
/** Login lockout: either the email or the IP being locked blocks the attempt. */
export async function loginLock(db:D1Database,email:string,ip:string,now=Date.now()){
 const [e,i]=await Promise.all([peekLimit(db,await limitKey('login-email',email),now),peekLimit(db,await limitKey('login-ip',ip),now)]);
 return {lockedMs:Math.max(e.lockedMs,i.lockedMs),ipFailures:i.count,emailFailures:e.count};
}
export async function loginFailed(db:D1Database,email:string,ip:string,now=Date.now()){
 const [e,i]=await Promise.all([recordFailure(db,await limitKey('login-email',email),LOGIN_LIMITS.email,now),recordFailure(db,await limitKey('login-ip',ip),LOGIN_LIMITS.ip,now)]);
 return {lockedMs:Math.max(e.lockedMs,i.lockedMs)};
}
export async function loginSucceeded(db:D1Database,email:string){await clearLimit(db,await limitKey('login-email',email));}
/** Forgot-password / resend limits. ipOk=false → show "too fast"; emailOk=false → silently skip sending (no enumeration). */
export async function sendLimits(db:D1Database,scope:string,email:string,ip:string,now=Date.now()){
 const ipRes=await consumeLimit(db,await limitKey(`${scope}-ip`,ip),SEND_LIMITS.ipPerHour,3600000,now);
 if(!ipRes.allowed)return {ipOk:false,emailOk:false};
 const gap=await consumeLimit(db,await limitKey(`${scope}-gap`,email),1,SEND_LIMITS.emailMinGapMs,now);
 const hour=await consumeLimit(db,await limitKey(`${scope}-email`,email),SEND_LIMITS.emailPerHour,3600000,now);
 return {ipOk:true,emailOk:gap.allowed&&hour.allowed};
}
