import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const config = JSON.parse(readFileSync(new URL('../config/shop-config.json', import.meta.url), 'utf8'));
const copy = readFileSync(new URL('../docs/content/mo_ta_san_pham_mau.md', import.meta.url), 'utf8');
const q = value => `'${String(value).replaceAll("'", "''")}'`;
function descriptionFor(id) {
 const section = copy.split(/^##\s+/m).slice(1).find(item => item.includes(`(slug: \`${id}\`)`));
 if (!section) return '';
 const body = section.split(/\r?\n/).slice(1).join('\n');
 const short = body.match(/\*\*Ngắn:\*\*\s*(.+)/)?.[1]?.trim() || '';
 const longBlock = body.match(/\*\*Dài:\*\*\s*([\s\S]*?)(?:\n\*\*Thông số:\*\*|$)/)?.[1]?.trim() || '';
 const long = longBlock.split(/\n{2,}/).map(paragraph => paragraph.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n\n');
 return [short, long].filter(Boolean).join('\n\n');
}
const previous = existsSync('seed/local.sql') ? readFileSync('seed/local.sql', 'utf8') : '';
const stamped = Number(previous.match(/,(\d{13}),\1\)/)?.[1] || Date.now());
const sql = ['-- Generated from config/shop-config.json and docs/content/mo_ta_san_pham_mau.md. Inserts skip existing rows. Names and descriptions are refreshed.'];
for (const p of config.catalog.seedProducts) {
 const image = `/images/${p.image}.webp`;
 const description = descriptionFor(p.id);
 if (!description) throw new Error(`Missing product copy for ${p.id}`);
 sql.push(`INSERT OR IGNORE INTO products(id,slug,name,category,description,image,images,badge,created_at,updated_at) VALUES(${[p.id,p.slug,p.name,p.category,description,image,JSON.stringify([image,`/images/${p.image}-detail.webp`]),p.badge].map(q).join(',')},${stamped},${stamped});`);
 sql.push(`UPDATE products SET name=${q(p.name)}, description=${q(description)} WHERE id=${q(p.id)};`);
 for (const [i,color,hex] of [[1,p.color,p.hex],[2,'Kem','#e5d6bc']]) {
  sql.push(`INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES(${[`${p.id}-${i}`,p.id,`${p.id.toUpperCase()}-${i}`,color,hex,p.material].map(q).join(',')},${p.price},${p.stock});`);
 }
}
mkdirSync('seed', { recursive: true });
writeFileSync('seed/local.sql', sql.join('\n')+'\n');
if (!process.argv.includes('--generate-only')) {
 const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--file=seed/local.sql'], {stdio:'inherit'});
 process.exit(result.status ?? 1);
}
