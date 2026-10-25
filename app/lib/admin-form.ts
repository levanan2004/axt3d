// Pure helpers for the admin product editor (tested in tests/admin-form.test.ts).
export const MAX_PRODUCT_IMAGES=8;
/** Digits only, leading zeros stripped. '' stays '' (empty field), '0' stays 0. */
export function parseIntInput(raw:string):number|null{const digits=raw.replace(/\D/g,'');if(!digits)return null;return Number(digits.replace(/^0+(?=\d)/,''));}
/** 15000 -> '15.000'; null -> '' */
export function formatThousands(value:number|null|undefined):string{if(value===null||value===undefined)return '';return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
/** Accepts '#152B40', '152b40', '#FFF', 'fff'. Returns stored format '#rrggbb' (lowercase, as the native picker emits) or null. */
export function normalizeHex(raw:string):string|null{const s=raw.trim().replace(/^#/,'');if(/^[0-9a-f]{3}$/i.test(s))return '#'+s.split('').map(c=>c+c).join('').toLowerCase();if(/^[0-9a-f]{6}$/i.test(s))return '#'+s.toLowerCase();return null;}
/** Split selected files into those that fit the remaining slots (selection order kept) and the skipped count. */
export function planUploads<T>(files:readonly T[],current:number,max=MAX_PRODUCT_IMAGES):{accepted:T[];skipped:number}{const room=Math.max(0,max-current);return {accepted:files.slice(0,room),skipped:Math.max(0,files.length-room)};}
export const skippedMessage=(n:number)=>`Tối đa ${MAX_PRODUCT_IMAGES} ảnh, đã bỏ bớt ${n} ảnh`;
/** Move item at `from` to index `to`. */
export function moveItem<T>(list:readonly T[],from:number,to:number):T[]{const next=[...list];if(from<0||from>=next.length||to<0||to>=next.length)return next;const [item]=next.splice(from,1);next.splice(to,0,item);return next;}
