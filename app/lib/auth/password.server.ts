// PBKDF2-SHA256 via WebCrypto. Cloudflare Workers caps PBKDF2 at 100000 iterations (higher throws NotSupportedError),
// so 100000 is the highest usable value. The stored string is versioned so the count can be raised later (needsRehash).
export const PBKDF2_ITERATIONS=100000;
const SCHEME='pbkdf2_sha256';
const enc=new TextEncoder();
export const b64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export const fromB64url=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4)),c=>c.charCodeAt(0));
async function derive(password:string,salt:Uint8Array,iterations:number){
 const key=await crypto.subtle.importKey('raw',enc.encode(password.normalize('NFC')),'PBKDF2',false,['deriveBits']);
 return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:salt as Uint8Array<ArrayBuffer>,iterations},key,256));
}
export async function hashPassword(password:string,iterations=PBKDF2_ITERATIONS){
 const salt=crypto.getRandomValues(new Uint8Array(16));
 return `${SCHEME}$${iterations}$${b64url(salt)}$${b64url(await derive(password,salt,iterations))}`;
}
function parse(stored:string){const [scheme,it,salt,hash]=stored.split('$');const iterations=Number(it);
 if(scheme!==SCHEME||!Number.isSafeInteger(iterations)||iterations<1||iterations>PBKDF2_ITERATIONS||!salt||!hash)return null;return {iterations,salt:fromB64url(salt),hash:fromB64url(hash)};}
export async function verifyPassword(password:string,stored:string|null|undefined){
 const p=stored?parse(stored):null;
 // Unknown account / Google-only account: still spend the same work so timing does not reveal it.
 const actual=await derive(password,p?.salt||new Uint8Array(16),p?.iterations||PBKDF2_ITERATIONS);
 if(!p||actual.length!==p.hash.length)return false;let diff=0;for(let i=0;i<actual.length;i++)diff|=actual[i]^p.hash[i];return diff===0;
}
export function needsRehash(stored:string){const p=parse(stored);return !p||p.iterations<PBKDF2_ITERATIONS;}
