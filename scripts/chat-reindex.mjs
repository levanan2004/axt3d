// Rebuilds the chatbot's D1 index (policy docs, Q&A, FAQ, products) through POST /api/admin/chat/reindex.
// Local: start `npm run preview` with APP_ENV=local, then `npm run chat:reindex` (uses LOCAL_ADMIN_TOKEN from .dev.vars).
// Staging: use the "reindex" call from a browser signed in through Cloudflare Access, or pass CHAT_REINDEX_COOKIE.
// The index also rebuilds itself on the first question if it is empty.
import { readFileSync } from 'node:fs';
const base = process.argv[2] || process.env.CHAT_REINDEX_URL || 'http://localhost:4173';
let cookie = process.env.CHAT_REINDEX_COOKIE || '';
if (!cookie) {
  try { const token = readFileSync('.dev.vars', 'utf8').match(/^LOCAL_ADMIN_TOKEN=(.*)$/m)?.[1]?.trim().replace(/^"|"$/g, ''); if (token) cookie = `local_admin=${token}`; } catch { /* no .dev.vars */ }
}
const res = await fetch(new URL('/api/admin/chat/reindex', base), { method: 'POST', headers: { Origin: new URL(base).origin, Cookie: cookie } });
console.log(res.status, await res.text());
if (!res.ok) process.exit(1);
