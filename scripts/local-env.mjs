import {existsSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(!existsSync('.dev.vars')) {
 writeFileSync('.dev.vars',`# Local only. Never commit this file.\nLOCAL_ADMIN_TOKEN=${randomBytes(32).toString('hex')}\nSEPAY_WEBHOOK_KEY=${randomBytes(32).toString('hex')}\n`);
 console.log('Created ignored .dev.vars with random local credentials. Admin: /admin/local-auth');
} else console.log('.dev.vars already exists; preserved.');
