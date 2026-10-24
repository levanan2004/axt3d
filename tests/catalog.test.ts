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
  });
});
