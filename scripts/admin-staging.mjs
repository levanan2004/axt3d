import { readFileSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
// npm run admin:staging — local admin (127.0.0.1 only, APP_ENV=local + LOCAL_ADMIN_TOKEN) writing to REAL staging D1/R2.
execSync('node scripts/local-env.mjs', { stdio: 'inherit' });
const vars = readFileSync('.dev.vars', 'utf8');
if (!/^APP_ENV=local\s*$/m.test(vars)) { console.error('.dev.vars must have APP_ENV=local. Stopped.'); process.exit(1); }
if (/^TELEGRAM_/m.test(vars)) console.warn('Warning: .dev.vars has TELEGRAM_* — remove them so staging Telegram is not double-fired.');
const line = '='.repeat(60);
console.log(`\n${line}\n  ADMIN → STAGING D1/R2 (dữ liệu thật)\n  Sản phẩm/ảnh nhập ở đây hiện ngay trên https://axt3d-staging.anxaitech.workers.dev\n  Mở <địa chỉ Local bên dưới>/admin/local-auth (thường http://127.0.0.1:5173, chỉ localhost)\n${line}\n`);
const child = spawn('npx', ['react-router', 'dev', '--host', '127.0.0.1'], { stdio: 'inherit', shell: true, env: { ...process.env, AXT3D_ADMIN_STAGING: '1' } });
child.on('exit', (code) => process.exit(code ?? 0));