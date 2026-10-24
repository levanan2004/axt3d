import { shopConfig } from './config';
import { evalFormula } from './formula';

type Shop = typeof shopConfig;

export function quoteLimits(config: Shop = shopConfig) {
  const upload = config.customPrint.upload;
  const maxFileMB = upload.maxFileMB;
  const maxFiles = upload.maxFiles;
  const maxQty = config.customPrint.maxQty;
  const colors = config.customPrint.colors;
  if (typeof maxFileMB !== 'number' || !(maxFileMB > 0)) throw new Error('customPrint.upload.maxFileMB chưa có trong cấu hình.');
  if (typeof maxFiles !== 'number' || !Number.isInteger(maxFiles) || maxFiles < 1) throw new Error('customPrint.upload.maxFiles chưa có trong cấu hình.');
  if (!Array.isArray(upload.allowedExt) || upload.allowedExt.length === 0) throw new Error('customPrint.upload.allowedExt chưa có trong cấu hình.');
  if (typeof maxQty !== 'number' || !Number.isInteger(maxQty) || maxQty < 1) throw new Error('customPrint.maxQty chưa có trong cấu hình.');
  if (!Array.isArray(colors) || colors.length === 0 || colors.some(color => !color.id || !color.name || !color.hex)) throw new Error('customPrint.colors chưa có trong cấu hình.');
  const allowedExt = upload.allowedExt.map(item => String(item).toLowerCase().replace(/^\./, ''));
  return { maxFileMB, maxFiles, allowedExt, maxQty, colors, maxBytes: Math.floor(maxFileMB * 1024 * 1024) };
}

export function roundQuote(amount: number, config: Shop = shopConfig) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Giá báo không hợp lệ.');
  const rounded = config.customPrint.quoteRounding === 'ceilTo1000' ? Math.ceil(amount / 1000) * 1000 : Math.round(amount);
  if (!Number.isSafeInteger(rounded)) throw new Error('Giá báo không hợp lệ.');
  return rounded;
}

export type QuoteSelection = { materialId: string; colorId: string; finishId: string; quantity: number; designHelp: boolean; rush: boolean };

export function calcQuote(input: QuoteSelection, config: Shop = shopConfig) {
  const limits = quoteLimits(config);
  const material = config.customPrint.materials.find(item => item.id === input.materialId);
  const finish = config.customPrint.finishes.find(item => item.id === input.finishId);
  const color = limits.colors.find(item => item.id === input.colorId);
  if (!material || !finish || !color) throw new Error('Lựa chọn không có trong cấu hình cửa hàng.');
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > limits.maxQty) throw new Error('Số lượng vượt mức cho phép.');
  const variables = {
    basePrice: material.basePrice,
    materialFee: material.materialFee,
    finishFee: finish.fee,
    designFee: config.customPrint.designFee,
    designHelp: input.designHelp ? 1 : 0,
    rush: input.rush ? 1 : 0,
    rushExtraRate: config.customPrint.rushExtraRate,
    quantity: input.quantity,
  };
  const raw = evalFormula(config.customPrint.formula, variables);
  return { amount: roundQuote(raw, config), raw, variables, material, finish, color, formula: config.customPrint.formula };
}

export const quoteStatusLabels: Record<string, string> = {
  moi_yeu_cau: 'Mới',
  dang_bao_gia: 'Đang báo giá',
  da_gui: 'Đã gửi khách',
  da_chap_nhan: 'Khách chấp nhận',
  tu_choi: 'Khách từ chối',
  het_han: 'Hết hạn',
};
