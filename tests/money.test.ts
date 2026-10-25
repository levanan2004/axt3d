import {describe,it,expect} from 'vitest';
import {calcOrderTotals} from '../app/lib/money';
import {shopConfig} from '../app/lib/config';
describe('deposit and COD',()=>{
 it('deposit is 50% of goods + ship, rounded up to 1.000đ (89k + 30k ship -> 60k deposit, 59k COD)',()=>{expect(calcOrderTotals([{unitPrice:89000,quantity:1}],30000)).toEqual({itemsSubtotal:89000,shippingFee:30000,depositAmount:60000,codAmount:59000,total:119000,shippingPending:false});});
 it('uses the real VTP fee as-is, including odd amounts',()=>{const t=calcOrderTotals([{unitPrice:89000,quantity:1}],40141);expect(t.depositAmount).toBe(65000);expect(t.codAmount).toBe(64141);});
 it('rounds up to the next thousand',()=>expect(calcOrderTotals([{unitPrice:149000,quantity:1}],20000).depositAmount).toBe(85000));
 it('marks shipping pending until an address is chosen',()=>{const t=calcOrderTotals([{unitPrice:148000,quantity:1}]);expect(t.shippingPending).toBe(true);expect(t.depositAmount).toBe(74000);});
 it('has no free-ship threshold or subsidy with the current config',()=>expect(calcOrderTotals([{unitPrice:5_000_000,quantity:1}],30000).shippingFee).toBe(30000));
 it('applies a threshold/subsidy only when config sets one',()=>{expect(calcOrderTotals([{unitPrice:500000,quantity:1}],30000,{...shopConfig,shipping:{...shopConfig.shipping,freeShippingThreshold:400000 as unknown as null}}).shippingFee).toBe(0);expect(calcOrderTotals([{unitPrice:100000,quantity:1}],30000,{...shopConfig,shipping:{...shopConfig.shipping,shopSubsidy:10000}}).shippingFee).toBe(20000);});
 it('empty carts do not have shipping/deposit',()=>expect(calcOrderTotals([],30000).total).toBe(0));
 it('rejects negative prices, fractional quantities, bad fees and overflow',()=>{for(const line of [{unitPrice:-1,quantity:1},{unitPrice:1000,quantity:1.5},{unitPrice:Number.MAX_SAFE_INTEGER,quantity:2}])expect(()=>calcOrderTotals([line],0)).toThrow();expect(()=>calcOrderTotals([{unitPrice:1000,quantity:1}],-5)).toThrow();expect(()=>calcOrderTotals([{unitPrice:1000,quantity:1}],1.5)).toThrow();});
 it('keeps money conserved after rounding',()=>{for(let n=1000;n<200000;n+=137){const t=calcOrderTotals([{unitPrice:n,quantity:1}],n%40000);expect(t.depositAmount+t.codAmount).toBe(n+t.shippingFee);expect(t.depositAmount%1000===0||t.depositAmount===t.total).toBe(true);}});
});