import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const config = JSON.parse(readFileSync(new URL('../config/shop-config.json', import.meta.url), 'utf8'));
const q = value => `'${String(value).replaceAll("'", "''")}'`;
const sql = ['-- Generated from config/shop-config.json. Only seeds missing rows. Existing products/orders are preserved.'];
for (const p of config.catalog.seedProducts) {
 const image = `/images/${p.image}.webp`;
 sql.push(`INSERT OR IGNORE INTO products(id,slug,name,category,description,image,images,badge,created_at,updated_at) VALUES(${[p.id,p.slug,p.name,p.category,`${p.name} được in từng lớp, hoàn thiện thủ công với những đường vân đặc trưng. Nhẹ, bền và mang một chút sáng tạo vào mỗi ngày. Hình ảnh minh họa mẫu; màu sắc thực tế có thể khác nhẹ.`,image,JSON.stringify([image,`/images/${p.image}-detail.webp`]),p.badge].map(q).join(',')},${Date.now()},${Date.now()});`);
 for (const [i,color,hex] of [[1,p.color,p.hex],[2,'Kem','#e5d6bc']]) {
  // Robot's config stock is the total. Xám and Kem each get half.
  const stock = p.id === 'robot' ? p.stock / 2 : p.stock;
  sql.push(`INSERT OR IGNORE INTO variants(id,product_id,sku,color,color_hex,material,price,stock) VALUES(${[`${p.id}-${i}`,p.id,`${p.id.toUpperCase()}-${i}`,color,hex,p.material].map(q).join(',')},${p.price},${stock});`);
 }
}
mkdirSync('seed', { recursive: true });
writeFileSync('seed/local.sql', sql.join('\n')+'\n');
if (!process.argv.includes('--generate-only')) {
 const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--file=seed/local.sql'], {stdio:'inherit'});
 process.exit(result.status ?? 1);
}
