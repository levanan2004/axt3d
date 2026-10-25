import {describe,it,expect} from 'vitest';
import {formatThousands,moveItem,normalizeHex,parseIntInput,planUploads,skippedMessage} from '../app/lib/admin-form';
import {isWebp,validateImageUpload,newImageKey,MAX_IMAGE_BYTES} from '../app/lib/admin-images';
import {productSchema} from '../app/lib/admin-product-schema';
const webp=(payload=8,chunk='VP8 ')=>{const b=new Uint8Array(12+4+payload);const enc=(s:string,o:number)=>[...s].forEach((c,i)=>b[o+i]=c.charCodeAt(0));enc('RIFF',0);const size=b.length-8;b[4]=size&255;b[5]=(size>>8)&255;b[6]=(size>>16)&255;b[7]=size>>>24;enc('WEBP',8);enc(chunk,12);return b;};
describe('numeric inputs',()=>{
 it('strips leading zeros and non-digits',()=>{expect(parseIntInput('015')).toBe(15);expect(parseIntInput('15.000')).toBe(15000);expect(parseIntInput('0')).toBe(0);expect(parseIntInput('000')).toBe(0);});
 it('empty stays empty',()=>{expect(parseIntInput('')).toBeNull();expect(parseIntInput('abc')).toBeNull();});
 it('formats thousands with dots',()=>{expect(formatThousands(15000)).toBe('15.000');expect(formatThousands(1234567)).toBe('1.234.567');expect(formatThousands(0)).toBe('0');expect(formatThousands(null)).toBe('');});
 it('round-trips typed price',()=>expect(parseIntInput(formatThousands(parseIntInput('0150000')))).toBe(150000));
});
describe('hex color',()=>{
 it('accepts 6/3 digit with or without #',()=>{expect(normalizeHex('#152B40')).toBe('#152b40');expect(normalizeHex('152B40')).toBe('#152b40');expect(normalizeHex('#FFF')).toBe('#ffffff');expect(normalizeHex(' abc ')).toBe('#aabbcc');});
 it('rejects invalid',()=>{for(const v of ['','#12','#12345','#GGGGGG','#1234567','red'])expect(normalizeHex(v)).toBeNull();});
 it('output passes server color_hex rule',()=>expect(/^#[0-9a-f]{6}$/i.test(normalizeHex('#FFF')!)).toBe(true));
});
describe('image uploads',()=>{
 it('caps at 8 keeping selection order',()=>{expect(planUploads(['a','b','c','d'],6)).toEqual({accepted:['a','b'],skipped:2});expect(planUploads(['a'],8)).toEqual({accepted:[],skipped:1});expect(planUploads(['a','b'],0)).toEqual({accepted:['a','b'],skipped:0});});
 it('skip message',()=>expect(skippedMessage(3)).toBe('Tối đa 8 ảnh, đã bỏ bớt 3 ảnh'));
 it('reorders',()=>{expect(moveItem(['a','b','c'],2,0)).toEqual(['c','a','b']);expect(moveItem(['a','b'],5,0)).toEqual(['a','b']);});
});
describe('server image validation',()=>{
 it('accepts real WebP by magic bytes',()=>{expect(isWebp(webp())).toBe(true);expect(isWebp(webp(8,'VP8L'))).toBe(true);expect(validateImageUpload(webp())).toEqual({ok:true});});
 it('rejects PNG/JPEG/garbage regardless of content type',()=>{const png=new Uint8Array([0x89,0x50,0x4e,0x47,13,10,26,10,0,0,0,0,0,0,0,0,0,0]);expect(validateImageUpload(png)).toMatchObject({ok:false,status:400});expect(isWebp(new Uint8Array([0xff,0xd8,0xff,0xe0,...new Array(20).fill(0)]))).toBe(false);expect(isWebp(webp(8,'XXXX'))).toBe(false);});
 it('rejects truncated RIFF',()=>{const b=webp();expect(isWebp(b.slice(0,b.length-2))).toBe(false);});
 it('rejects oversize',()=>{const big=new Uint8Array(MAX_IMAGE_BYTES+1);big.set(webp());expect(validateImageUpload(big)).toMatchObject({ok:false,status:413});});
 it('generates server keys only',()=>expect(newImageKey()).toMatch(/^products\/[a-f0-9-]+\.webp$/));
});
describe('product schema',()=>{
 const base={name:'Rồng',slug:'rong',category:productSchemaCategory(),description:'Mô tả đủ dài',image:'/images/a.webp',active:1,packedWeightGram:null,variants:[{id:'v1',sku:'S1',color:'Đỏ',color_hex:'#ff0000',material:'PLA',size:'M',price:15000,stock:0,active:1}]};
 function productSchemaCategory(){return (productSchema.shape.category as unknown as {options:string[]}).options[0];}
 const imgs=(n:number)=>Array.from({length:n},(_,i)=>`/images/a${i}.webp`);
 it('allows 8 images, rejects 9 and duplicates',()=>{expect(productSchema.safeParse({...base,images:imgs(8)}).success).toBe(true);expect(productSchema.safeParse({...base,images:imgs(9)}).success).toBe(false);expect(productSchema.safeParse({...base,images:['/images/a.webp','/images/a.webp']}).success).toBe(false);});
 it('rejects empty (null) price/stock and price < 1000',()=>{for(const p of [{price:null},{stock:null},{price:0}])expect(productSchema.safeParse({...base,images:imgs(1),variants:[{...base.variants[0],...p}]}).success).toBe(false);});
});
