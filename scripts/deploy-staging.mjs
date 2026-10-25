import { spawnSync } from 'node:child_process';
const steps = [
  'wrangler secret put SEPAY_WEBHOOK_KEY',
  'wrangler d1 migrations apply DB --remote',
  'wrangler deploy',
];
console.log('Staging deploy is manual. Commands, in order:');
for (const step of steps) console.log('  npx ' + step);
console.log('Do not put tokens in the repo or on the command line of a shared log.');
if (!process.argv.includes('--confirm-deploy')) {
  console.log('Stopped. Re-run with --confirm-deploy only when An has reviewed the build.');
  process.exit(0);
}
// wrangler deploy ships build/server/wrangler.json. A stale build keeps old vars (robots.txt once
// served Sitemap: http://localhost:5173 that way), so always rebuild and check SITE_URL first.
const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
if (build.status) process.exit(build.status);
const { readFileSync } = await import('node:fs');
const built = JSON.parse(readFileSync('build/server/wrangler.json', 'utf8'));
if (!built.vars?.SITE_URL?.startsWith('https://')) { console.error(`Built SITE_URL is ${built.vars?.SITE_URL}; refusing to deploy.`); process.exit(1); }
const result = spawnSync('npx', ['wrangler', 'deploy'], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
