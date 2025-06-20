// import { calculateCharges, calculateBreakevenPrice, Charges } from '@/pages/Tools/ChargesUtils';
import { calculateCharges, Charges } from '@/pages/Tools/ChargesUtils';
import { calculateBreakevenPrice } from '@/pages/Tools/BreakEven';

export interface ProfitTargetParams {
  entryPrice: number;
  quantity: number;
  profitPercentage?: number;
  exchange: string;
  broker: 'Dhan' | 'Groww';
  tradeType: 'equity-delivery' | 'equity-intraday';
  positionType: 'long' | 'short';
}

export interface ProfitTargetResult {
  sellingPrice: number;
  grossProfit: number;
  netProfit: number;
  charges: Charges;
  breakevenPrice: number;
}

export class ProfitTargetCalculatorService {
  /**
   * Calculate the required exit price to achieve target profit percentage
   */
  static calculateTargetPrice(params: ProfitTargetParams): ProfitTargetResult | null {
    const { entryPrice, quantity, profitPercentage, exchange, broker, tradeType, positionType } = params;

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

    // If profit percentage is not provided, show breakeven calculation only
    if (!profitPercentage || profitPercentage <= 0) {
      return this.calculateBreakevenResult(params, breakevenPrice);
    }

    // Calculate target exit price with profit percentage
    return this.calculateWithProfitTarget(params, breakevenPrice);
  }

  /**
   * Calculate breakeven result when no profit target is specified
   */
  private static calculateBreakevenResult(params: ProfitTargetParams, breakevenPrice: number): ProfitTargetResult {
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
      sellingPrice: breakevenPrice,
      grossProfit: 0,
      netProfit: 0,
      charges,
      breakevenPrice
    };
  }

  /**
   * Calculate exit price for specific profit target using binary search
   */
  private static calculateWithProfitTarget(params: ProfitTargetParams, breakevenPrice: number): ProfitTargetResult {
    const { entryPrice, quantity, profitPercentage, exchange, broker, tradeType, positionType } = params;
    
    if (!profitPercentage) {
      throw new Error('Profit percentage is required');
    }

    // Determine position type
    const isIntradayShort = tradeType === 'equity-intraday' && broker === 'Dhan' && positionType === 'short';
    const isLong = !isIntradayShort;

    // Calculate the total entry value
    const entryValue = entryPrice * quantity;
    // Target gross profit amount
    const desiredGrossProfit = entryValue * (profitPercentage / 100);

    // Find optimal exit price using binary search
    const exitPrice = this.findOptimalExitPrice({
      entryPrice,
      quantity,
      entryValue,
      desiredGrossProfit,
      exchange,
      broker,
      tradeType,
      isLong
    });

    // Final calculation with the found exit price
    const exitValue = exitPrice * quantity;
    const charges = calculateCharges(
      isLong ? entryValue : exitValue,
      isLong ? exitValue : entryValue,
      exchange,
      broker,
      tradeType
    );
    
    const grossProfit = isLong ? exitValue - entryValue : entryValue - exitValue;
    const netProfit = grossProfit - charges.totalCharges;

    return {
      sellingPrice: exitPrice,
      grossProfit,
      netProfit,
      charges,
      breakevenPrice
    };
  }

  /**
   * Binary search algorithm to find optimal exit price
   */
  private static findOptimalExitPrice(params: {
    entryPrice: number;
    quantity: number;
    entryValue: number;
    desiredGrossProfit: number;
    exchange: string;
    broker: 'Dhan' | 'Groww';
    tradeType: 'equity-delivery' | 'equity-intraday';
    isLong: boolean;
  }): number {
    const { entryPrice, quantity, entryValue, desiredGrossProfit, exchange, broker, tradeType, isLong } = params;
    
    // Initial guess for exit price
    let exitPrice = entryPrice * (isLong ? (1 + (desiredGrossProfit / entryValue)) : (1 - (desiredGrossProfit / entryValue)));
    
    // Binary search bounds
    let low = isLong ? entryPrice : 0.01;
    let high = isLong ? entryPrice * 2 : entryPrice;
    
    const MAX_ITERATIONS = 20;
    let iterations = 0;
    const targetNetProfit = desiredGrossProfit;

    while (iterations < MAX_ITERATIONS) {
      const exitValue = exitPrice * quantity;
      const charges = calculateCharges(
        isLong ? entryValue : exitValue,
        isLong ? exitValue : entryValue,
        exchange,
        broker,
        tradeType
      );
      
      const netProfit = isLong
        ? exitValue - entryValue - charges.totalCharges
        : entryValue - exitValue - charges.totalCharges;

      // Check if we're close enough to the target
      if (Math.abs(netProfit - targetNetProfit) <= 0.01) {
        break;
      }

      // Adjust search bounds
      if (netProfit < targetNetProfit) {
        if (isLong) {
          low = exitPrice;
          exitPrice = (exitPrice + high) / 2;
        } else {
          high = exitPrice;
          exitPrice = (low + exitPrice) / 2;
        }
      } else {
        if (isLong) {
          high = exitPrice;
          exitPrice = (low + exitPrice) / 2;
        } else {
          low = exitPrice;
          exitPrice = (exitPrice + low) / 2;
        }
      }

      iterations++;
    }

    return exitPrice;
  }
}