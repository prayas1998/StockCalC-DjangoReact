// import { calculateCharges, calculateBreakevenPrice, Charges } from '@/pages/Tools/ChargesUtils';

import { calculateCharges, Charges } from '@/pages/Tools/ChargesUtils';
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
  grossProfit: number;
  netProfit: number;
  profitPercentage: number;
  isProfit: boolean;
  charges: Charges;
  breakevenPrice: number;
}

export class NetPLCalculatorService {
  /**
   * Calculate net profit/loss based on entry and exit prices
   */
  static calculateNetPL(params: NetPLParams): NetPLResult | null {
    const { entryPrice, quantity, exitPrice, exchange, broker, tradeType, positionType } = params;

    if (entryPrice <= 0 || quantity <= 0) {
      return null;
    }

    // Always calculate breakeven price independently
    const breakevenPrice = calculateBreakevenPrice(
      quantity,
      entryPrice,
      exchange,
      broker,
      tradeType,
      positionType
    );

    // If exit price is not provided, show breakeven calculation only
    if (!exitPrice || exitPrice <= 0) {
      return this.calculateBreakevenResult(params, breakevenPrice);
    }

    // Calculate actual P&L with provided exit price
    return this.calculateActualPL(params, breakevenPrice, exitPrice);
  }

  /**
   * Calculate breakeven result when no exit price is specified
   */
  private static calculateBreakevenResult(params: NetPLParams, breakevenPrice: number): NetPLResult {
    const { entryPrice, quantity, exchange, broker, tradeType, positionType } = params;
    
    const isIntradayShort = tradeType === 'equity-intraday' && broker === 'Dhan' && positionType === 'short';
    const isLong = !isIntradayShort;
    const entryValue = entryPrice * quantity;
    const exitValue = breakevenPrice * quantity;
    
    const charges = calculateCharges(
      isLong ? entryValue : exitValue,
      isLong ? exitValue : entryValue,
      exchange,
      broker,
      tradeType
    );

    return {
      grossProfit: 0,
      netProfit: 0,
      profitPercentage: 0,
      isProfit: true,
      charges,
      breakevenPrice
    };
  }

  /**
   * Calculate actual P&L with provided exit price
   */
  private static calculateActualPL(params: NetPLParams, breakevenPrice: number, exitPrice: number): NetPLResult {
    const { entryPrice, quantity, exchange, broker, tradeType, positionType } = params;

    // Determine position type
    const isIntradayShort = tradeType === 'equity-intraday' && broker === 'Dhan' && positionType === 'short';
    const isLong = !isIntradayShort;

    // Calculate the total entry and exit values
    const entryValue = entryPrice * quantity;
    const exitValue = exitPrice * quantity;

    // Calculate charges using the utility function
    const charges = calculateCharges(
      isLong ? entryValue : exitValue,
      isLong ? exitValue : entryValue,
      exchange,
      broker,
      tradeType
    );

    // Calculate profits
    const grossProfit = isLong ? exitValue - entryValue : entryValue - exitValue;
    const netProfit = grossProfit - charges.totalCharges;

    // Calculate percentage
    const profitPercentage = (netProfit / entryValue) * 100;
    const isProfit = netProfit >= 0;

    return {
      grossProfit,
      netProfit,
      profitPercentage,
      isProfit,
      charges,
      breakevenPrice
    };
  }
}