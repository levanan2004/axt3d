import {describe,it,expect} from 'vitest';
import {calcOrderTotals} from '../app/lib/money';
import {shopConfig} from '../app/lib/config';
describe('deposit and COD',()=>{
 it('fixes the mockup total and keeps shipping outside the deposit',()=>{expect(calcOrderTotals([{unitPrice:89000,quantity:1},{unitPrice:59000,quantity:1}])).toEqual({itemsSubtotal:148000,depositAmount:74000,shippingFee:20000,codAmount:94000,total:168000});});
 it('rounds up to the next thousand',()=>expect(calcOrderTotals([{unitPrice:149000,quantity:1}]).depositAmount).toBe(75000));
 it('reads changed shipping from config',()=>expect(calcOrderTotals([{unitPrice:148000,quantity:1}],{...shopConfig,shipping:{...shopConfig.shipping,flatFee:30000}}).codAmount).toBe(104000));
 it('empty carts do not have shipping/deposit',()=>expect(calcOrderTotals([]).total).toBe(0));
 it('rejects negative prices, fractional quantities and overflow',()=>{for(const line of [{unitPrice:-1,quantity:1},{unitPrice:1000,quantity:1.5},{unitPrice:Number.MAX_SAFE_INTEGER,quantity:2}])expect(()=>calcOrderTotals([line])).toThrow();});
 it('keeps money conserved after rounding',()=>{for(let n=1000;n<200000;n+=137){const t=calcOrderTotals([{unitPrice:n,quantity:1}]);expect(t.depositAmount+t.codAmount).toBe(n+t.shippingFee);}});
});
