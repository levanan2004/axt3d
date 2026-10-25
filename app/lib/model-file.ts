import { dottedExtensionPhrase, quoteLimits } from './quote';
import { shopConfig } from './config';

export function validateModelFile(filename: string, bytes: Uint8Array, limits = quoteLimits(shopConfig)) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (!limits.allowedExt.includes(ext)) throw new Error(`Chỉ nhận file ${dottedExtensionPhrase()}.`);
  if (bytes.byteLength < 15 || bytes.byteLength > limits.maxBytes) throw new Error(`File lớn hơn ${limits.maxFileMB} MB.`);
  if (ext === '3mf') {
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('File 3MF không đúng định dạng nén.');
    return ext;
  }
  if (ext === 'obj') {
    const text = new TextDecoder().decode(bytes);
    if (!/(^|\n)\s*v\s+[-+]?\d/.test(text) || !/(^|\n)\s*f\s+\d/.test(text)) throw new Error('OBJ không có đỉnh và mặt.');
    return ext;
  }
  const head = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.byteLength, 80))).trimStart().toLowerCase();
  if (head.startsWith('solid')) {
    const text = new TextDecoder().decode(bytes);
    if (!/\bfacet\b/i.test(text) || !/\bendsolid\b/i.test(text)) throw new Error('STL chữ không hợp lệ.');
    return ext;
  }
  if (bytes.byteLength < 84) throw new Error('STL nhị phân không hợp lệ.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangles = view.getUint32(80, true);
  if (triangles < 1 || triangles > 5_000_000 || 84 + triangles * 50 !== bytes.byteLength) throw new Error('STL nhị phân không khớp kích thước.');
  return ext;
}
