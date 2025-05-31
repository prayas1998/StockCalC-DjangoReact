// types/api.ts

export interface CalculationResponse {
  summary: {
    totalQuantity: string;
    totalBuyValue: string;
    totalSellValue: string;
    averageBuyPrice: string;
    turnover: string;
    grossPnL: string;
    netPnL: string;
  };
  charges: {
    brokerage: string;
    stt: string;
    exchangeCharges: string;
    stampDuty: string;
    sebiFee: string;
    ipft: string;
    gst: string;
    totalCharges: string;
    dpCharges: string;
  };
  transactions: Array<{
    quantity: string;
    buyValue: string;
    sellValue: string;
    averageBuyPrice: string;
  }>;
}

export interface CalculationError {
  error: string;
  detail?: string;
}