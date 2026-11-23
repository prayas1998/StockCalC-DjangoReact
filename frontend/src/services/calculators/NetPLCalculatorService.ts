import { calculatePositionCharges, type Charges } from '@/pages/Tools/ChargesUtils';
import { calculateBreakevenPrice } from '@/pages/Tools/BreakEven';

export interface NetPLParams {
  entryPrice: number;
  quantity: number;
  exitPrice?: number;
  exchange: string;
  broker: 'Dhan' | 'Groww';
  tradeType: 'equity-delivery' | 'equity-intraday';
  positionType: 'long' | 'short';
}

export interface NetPLResult {
  exitPrice: number;
  grossProfit: number;
  netProfit: number;
  profitPercentage: number;
  isProfit: boolean;
  charges: Charges;
  breakevenPrice: number;
}

export type NetPLCalculation = NetPLResult | {
  exitPrice: null;
  reason: 'invalid-exit' | 'breakeven-unavailable';
};

export class NetPLCalculatorService {
  /**
   * Calculate net profit/loss based on entry and exit prices
   */
  static calculateNetPL(params: NetPLParams): NetPLCalculation | null {
    const { entryPrice, quantity, exitPrice, exchange, broker, tradeType, positionType } = params;

    if (!Number.isFinite(entryPrice) || entryPrice <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0) {
      return null;
    }

    if (exitPrice !== undefined && (!Number.isFinite(exitPrice) || exitPrice <= 0)) {
      return { exitPrice: null, reason: 'invalid-exit' };
    }

    // Delivery trades are treated as long only (Django parity).
    const effectivePositionType = tradeType === 'equity-delivery' ? 'long' : positionType;

    // Always calculate breakeven price independently
    const breakevenPrice = calculateBreakevenPrice(
      quantity,
      entryPrice,
      exchange,
      broker,
      tradeType,
      effectivePositionType
    );

    const resolvedExitPrice = exitPrice ?? breakevenPrice;
    if (resolvedExitPrice <= 0) {
      return { exitPrice: null, reason: 'breakeven-unavailable' };
    }

    return this.calculateActualPL(params, breakevenPrice, resolvedExitPrice);
  }

  /**
   * Calculate actual P&L with provided exit price
   */
  private static calculateActualPL(params: NetPLParams, breakevenPrice: number, exitPrice: number): NetPLResult {
    const { entryPrice, quantity, exchange, broker, tradeType, positionType } = params;

    // Determine position type
    const isIntradayShort = tradeType === 'equity-intraday' && positionType === 'short';
    const isLong = !isIntradayShort;

    // Calculate the total entry and exit values
    const entryValue = entryPrice * quantity;
    const exitValue = exitPrice * quantity;

    const charges = calculatePositionCharges(quantity, entryPrice, exitPrice, exchange, broker, tradeType, positionType);

    // Calculate profits
    const grossProfit = Number((isLong ? exitValue - entryValue : entryValue - exitValue).toFixed(2));
    const netProfit = Number((grossProfit - charges.totalCharges).toFixed(2));

    // Calculate percentage
    const profitPercentage = (netProfit / entryValue) * 100;
    const isProfit = netProfit >= 0;

    return {
      exitPrice,
      grossProfit,
      netProfit,
      profitPercentage,
      isProfit,
      charges,
      breakevenPrice
    };
  }
}
