import { shopConfig } from './config';

export const productionStatuses = ['cho_in', 'dang_in', 'cho_kiem_tra', 'in_loi', 'hoan_tat'] as const;
export const productionLabels: Record<string, string> = {
  cho_in: 'Chờ in', dang_in: 'Đang in', cho_kiem_tra: 'Chờ kiểm tra', in_loi: 'In lỗi', hoan_tat: 'Hoàn tất',
};
export const codStates = ['chua_doi_soat', 'cho_chuyen', 'da_nhan'] as const;
export const codStateLabels: Record<string, string> = {
  chua_doi_soat: 'Chưa đối soát', cho_chuyen: 'Chờ chuyển tiền', da_nhan: 'Đã nhận COD',
};

export function codSettlement(codAmount: number, shippingFee: number) {
  const rate = shopConfig.codReconciliation.carrierCodFeeRate;
  if (rate === null || typeof rate !== 'number') {
    return { feeStatus: shopConfig.codReconciliation.missingFeeStatus, carrierFee: null as number | null, expected: null as number | null };
  }
  const carrierFee = Math.round(codAmount * rate);
  const expected = codAmount - carrierFee - shippingFee;
  return { feeStatus: 'ok', carrierFee, expected };
}

export function profitFromFigures(input: { revenue: number; materialCost: number; machineCost: number; electricityCost: number; postProcessCost: number; carrierCodFee: number | null; shippingCostPaid: number; refunds: number }) {
  if (input.carrierCodFee === null) {
    return { feeStatus: shopConfig.codReconciliation.missingFeeStatus, profit: null as number | null };
  }
  const profit = input.revenue - input.materialCost - input.machineCost - input.electricityCost - input.postProcessCost - input.carrierCodFee - input.shippingCostPaid - input.refunds;
  return { feeStatus: 'ok', profit };
}
