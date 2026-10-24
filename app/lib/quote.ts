import { shopConfig } from './config';
import { evalFormula } from './formula';

type Shop = typeof shopConfig;
type Materials = Shop['customPrint']['materials'];

const swatchHex: Record<string, string> = {
  'Trắng': '#F4F4F5', 'Đen': '#1C1917', 'Xám': '#9CA3AF', 'Đỏ': '#DC2626', 'Cam': '#F06D19',
  'Vàng': '#EAB308', 'Xanh lá': '#71826A', 'Xanh dương': '#2563EB', 'Tím': '#7C3AED', 'Hồng': '#EC4899',
};

export const postProcessLabels: Record<string, string> = { none: 'Không', basic: 'Cơ bản', paint: 'Sơn màu' };

export const quoteStatusLabels: Record<string, string> = {
  cho_bao_gia: 'Chờ báo giá',
  da_bao_gia: 'Đã báo giá',
  da_chap_nhan: 'Khách đồng ý',
  tu_choi: 'Khách từ chối',
  het_han: 'Hết hạn',
  admin_huy: 'Shop từ chối',
};

export function quoteLimits(config: Shop = shopConfig) {
  const upload = config.customPrint.upload;
  const maxFileMB = upload.maxFileMB;
  const maxFiles = upload.maxFiles;
  const maxQty = config.customPrint.maxQty;
  const names = config.customPrint.colors;
  if (typeof maxFileMB !== 'number' || !(maxFileMB > 0)) throw new Error('customPrint.upload.maxFileMB chưa có trong cấu hình.');
  if (typeof maxFiles !== 'number' || !Number.isInteger(maxFiles) || maxFiles < 1) throw new Error('customPrint.upload.maxFiles chưa có trong cấu hình.');
  if (!Array.isArray(upload.allowedExt) || upload.allowedExt.length === 0) throw new Error('customPrint.upload.allowedExt chưa có trong cấu hình.');
  if (typeof maxQty !== 'number' || !Number.isInteger(maxQty) || maxQty < 1) throw new Error('customPrint.maxQty chưa có trong cấu hình.');
  if (!Array.isArray(names) || names.length === 0) throw new Error('customPrint.colors chưa có trong cấu hình.');
  const allowedExt = upload.allowedExt.map(item => String(item).toLowerCase().replace(/^\./, ''));
  const colors = names.map(name => ({ id: name, name, hex: swatchHex[name] || '#9CA3AF' }));
  return { maxFileMB, maxFiles, allowedExt, maxQty, colors, maxBytes: Math.floor(maxFileMB * 1024 * 1024) };
}

export function extensionList(config: Shop = shopConfig) {
  return quoteLimits(config).allowedExt.map(ext => ext.toUpperCase());
}

/** Join extensions the way a sentence reads: "STL, 3MF hoặc OBJ". */
export function extensionPhrase(config: Shop = shopConfig) {
  const items = extensionList(config);
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} hoặc ${items.at(-1)}`;
}

export function dottedExtensionPhrase(config: Shop = shopConfig) {
  const items = quoteLimits(config).allowedExt.map(ext => `.${ext}`);
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} hoặc ${items.at(-1)}`;
}

export function uploadHint(config: Shop = shopConfig) {
  const limits = quoteLimits(config);
  return `Tối đa ${limits.maxFiles} file, mỗi file ${limits.maxFileMB} MB. Định dạng: ${extensionPhrase(config)}.`;
}

export function materialIds(config: Shop = shopConfig) {
  return Object.keys(config.customPrint.materials) as (keyof Materials)[];
}

export type QuoteSelection = { materialId: string; colorName: string; postProcess: string; quantity: number; grams: number; hours: number };

export function calcQuote(input: QuoteSelection, config: Shop = shopConfig) {
  const limits = quoteLimits(config);
  const materials = config.customPrint.materials as Record<string, { pricePerGram: number }>;
  const fees = config.customPrint.postProcessFee as Record<string, number>;
  const material = materials[input.materialId];
  const postProcessFee = fees[input.postProcess];
  const color = limits.colors.find(item => item.name === input.colorName);
  if (!material || postProcessFee === undefined || !color) throw new Error('Lựa chọn không có trong cấu hình cửa hàng.');
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > limits.maxQty) throw new Error('Số lượng vượt mức cho phép.');
  if (!Number.isFinite(input.grams) || input.grams <= 0 || !Number.isFinite(input.hours) || input.hours < 0) throw new Error('Khối lượng hoặc thời gian in chưa hợp lệ.');
  const variables = {
    grams: input.grams,
    pricePerGram: material.pricePerGram,
    wasteRate: config.customPrint.wasteRate,
    hours: input.hours,
    machinePerHour: config.customPrint.machinePerHour,
    electricityPerHour: config.customPrint.electricityPerHour,
    postProcessFee,
    markup: config.customPrint.markup,
    minOrder: config.customPrint.minOrder,
    qty: input.quantity,
  };
  const resin = variables.grams * variables.pricePerGram * (1 + variables.wasteRate);
  const machine = variables.hours * (variables.machinePerHour + variables.electricityPerHour);
  const marked = (resin + machine + variables.postProcessFee) * variables.markup;
  const unit = Math.max(variables.minOrder, marked);
  const extended = unit * variables.qty;
  const amount = evalFormula(config.customPrint.formula, variables);
  if (!Number.isSafeInteger(amount) || amount < config.customPrint.minOrder) throw new Error('Giá báo không hợp lệ.');
  return {
    amount,
    variables,
    parts: { resin, machine, postProcessFee, marked, unit, extended },
    materialId: input.materialId,
    color,
    postProcess: input.postProcess,
    formula: config.customPrint.formula,
  };
}
