import {hash} from '../security.server';
import {b64url} from './password.server';
export type TokenPurpose='verify_email'|'reset_password'|'create_password';
export const randomToken=()=>b64url(crypto.getRandomValues(new Uint8Array(32)));
/** Issues a single-use token; only its SHA-256 is stored. Older unused tokens of the same purpose are revoked. */
export async function issueToken(db:D1Database,accountId:string,purpose:TokenPurpose,ttlMs:number,now=Date.now()){
 const raw=randomToken();
 await db.batch([
  db.prepare('DELETE FROM account_tokens WHERE account_id=? AND purpose=? AND used_at IS NULL').bind(accountId,purpose),
  db.prepare('INSERT INTO account_tokens(token_hash,account_id,purpose,expires_at,created_at) VALUES(?,?,?,?,?)').bind(await hash(raw),accountId,purpose,now+ttlMs,now),
 ]);
 return raw;
}
const valid=(raw:unknown):raw is string=>typeof raw==='string'&&/^[A-Za-z0-9_-]{43}$/.test(raw);
/** Read-only check for rendering the page (does not consume). */
export async function peekToken(db:D1Database,raw:unknown,purposes:TokenPurpose[],now=Date.now()){
 if(!valid(raw))return null;
 return db.prepare(`SELECT account_id,purpose FROM account_tokens WHERE token_hash=? AND purpose IN(${purposes.map(()=>'?').join(',')}) AND used_at IS NULL AND expires_at>?`).bind(await hash(raw),...purposes,now).first<{account_id:string;purpose:TokenPurpose}>();
}
/** Atomically marks the token used. Returns null when unknown, expired, already used, or the wrong purpose. */
export async function consumeToken(db:D1Database,raw:unknown,purposes:TokenPurpose[],now=Date.now()){
 if(!valid(raw))return null;
 return db.prepare(`UPDATE account_tokens SET used_at=? WHERE token_hash=? AND purpose IN(${purposes.map(()=>'?').join(',')}) AND used_at IS NULL AND expires_at>? RETURNING account_id,purpose`).bind(now,await hash(raw),...purposes,now).first<{account_id:string;purpose:TokenPurpose}>();
}
