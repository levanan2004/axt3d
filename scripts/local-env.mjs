import {existsSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
// .dev.vars is gitignored. Its values override wrangler.jsonc "vars" for `npm run dev` and `npm run preview`,
// so APP_ENV=local here turns on the loopback-only admin (/admin/local-auth) without touching staging.
if(!existsSync('.dev.vars')) {
 writeFileSync('.dev.vars',`# Local only. Never commit this file.\nAPP_ENV=local\nLOCAL_ADMIN_TOKEN=${randomBytes(32).toString('hex')}\nSEPAY_WEBHOOK_KEY=${randomBytes(32).toString('hex')}\n`);
 console.log('Created ignored .dev.vars with random local credentials. Admin: /admin/local-auth');
} else {
 const text=readFileSync('.dev.vars','utf8');
 const has=key=>new RegExp(`^${key}=.+`,'m').test(text);
 const add=[];
 if(!has('APP_ENV')) add.push('APP_ENV=local');
 if(!has('LOCAL_ADMIN_TOKEN')) add.push(`LOCAL_ADMIN_TOKEN=${randomBytes(32).toString('hex')}`);
 if(!has('SEPAY_WEBHOOK_KEY')) add.push(`SEPAY_WEBHOOK_KEY=${randomBytes(32).toString('hex')}`);
 if(add.length){appendFileSync('.dev.vars',(text.endsWith('\n')?'':'\n')+add.join('\n')+'\n');console.log(`.dev.vars kept; added ${add.map(l=>l.split('=')[0]).join(', ')}.`);}
 else console.log('.dev.vars already complete; preserved.');
 if(/^APP_ENV=(?!local\s*$).*/m.test(text)) console.log('Warning: .dev.vars sets APP_ENV to something other than local; local admin stays off.');
}
