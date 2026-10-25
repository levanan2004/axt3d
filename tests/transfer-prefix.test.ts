import {describe,expect,it} from 'vitest';
import {docChunks} from '../app/lib/chat.server';
import {renderTokens,transferPrefix} from '../app/lib/copy';
import {homeFaq} from '../app/lib/copy';
import {shopConfig} from '../app/lib/config';

describe('transfer content prefix comes from shop-config',()=>{
 it('prefix is read from payment.transferContentPattern',()=>{expect(shopConfig.payment.transferContentPattern).toBe('AXT3D{orderCode}');expect(transferPrefix()).toBe('AXT3D');expect(renderTokens('X {TIEN_TO_CK} Y')).toBe('X AXT3D Y');});
 it('chatbot knowledge never says IN3D and states AXT3D',()=>{const all=docChunks().map(c=>c.title+'\n'+c.body).join('\n');expect(all).not.toMatch(/IN3D|TIEN_TO_CK/);expect(all).toMatch(/AXT3D k\u00e8m m\u00e3 \u0111\u01a1n/);});
 it('homepage FAQ renders the configured prefix',()=>{const all=homeFaq().map(i=>i.q+i.a).join(' ');expect(all).not.toMatch(/IN3D|TIEN_TO_CK/);expect(all).toContain('AXT3D');});
});
