export interface CalculationInputsSnapshot {
  platform: string;
  exchange: string;
  tradeType: string;
  transactions: unknown;
  positionType: string;
}

export const isLatestCalculation = (
  requestId: number,
  latestRequestId: number,
  requestInputs: CalculationInputsSnapshot,
  currentInputs: CalculationInputsSnapshot,
): boolean => requestId === latestRequestId &&
  requestInputs.platform === currentInputs.platform &&
  requestInputs.exchange === currentInputs.exchange &&
  requestInputs.tradeType === currentInputs.tradeType &&
  requestInputs.transactions === currentInputs.transactions &&
  requestInputs.positionType === currentInputs.positionType;
