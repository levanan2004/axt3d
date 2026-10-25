// Server-side validation for admin image uploads (POST /api/admin/images).
export const MAX_IMAGE_BYTES=5*1024*1024;
/** Real WebP by magic bytes: 'RIFF' <size> 'WEBP', RIFF size consistent with buffer. Ignores Content-Type/filename. */
export function isWebp(bytes:Uint8Array):boolean{if(bytes.byteLength<16)return false;const a=(s:number,e:number)=>String.fromCharCode(...bytes.slice(s,e));if(a(0,4)!=='RIFF'||a(8,12)!=='WEBP')return false;const riffSize=bytes[4]|(bytes[5]<<8)|(bytes[6]<<16)|(bytes[7]<<24);if(riffSize+8>bytes.byteLength)return false;return ['VP8 ','VP8L','VP8X'].includes(a(12,16));}
export function validateImageUpload(bytes:Uint8Array):{ok:true}|{ok:false;status:400|413;error:string}{if(bytes.byteLength>MAX_IMAGE_BYTES)return {ok:false,status:413,error:'Ảnh tối đa 5 MB.'};if(!isWebp(bytes))return {ok:false,status:400,error:'Chỉ nhận ảnh WebP hợp lệ, tối đa 5 MB.'};return {ok:true};}
/** R2 key is always server generated, never derived from client input. */
export const newImageKey=()=>`products/${crypto.randomUUID()}.webp`;
