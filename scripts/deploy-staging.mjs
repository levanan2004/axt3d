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
const result = spawnSync('npx', ['wrangler', 'deploy'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
