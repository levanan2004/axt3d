import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { shopConfig } from '../app/lib/config';

describe('catalog seed', () => {
  it('includes the robot at the placeholder price from the money owner', () => {
    const robot = shopConfig.catalog.seedProducts.find(product => product.id === 'robot');
    expect(robot).toMatchObject({
      slug: 'robot',
      name: 'Mô hình robot',
      category: 'mo-hinh-3d',
      price: 189000,
      stock: 10,
      material: 'PLA',
      image: 'robot',
    });
    const sql = readFileSync(new URL('../seed/local.sql', import.meta.url), 'utf8');
    const variants = [...sql.matchAll(/VALUES\('(robot-[12])','robot','ROBOT-[12]','(Xám|Kem)','#[0-9a-f]+','PLA',189000,(\d+)\)/g)];
    expect(variants.map(match => [match[1], match[2], Number(match[3])])).toEqual([
      ['robot-1', 'Xám', 5],
      ['robot-2', 'Kem', 5],
    ]);
  });
});
