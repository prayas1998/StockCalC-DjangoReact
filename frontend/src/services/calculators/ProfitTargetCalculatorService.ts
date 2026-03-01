import { calculateCharges, Charges } from '@/pages/Tools/ChargesUtils';
import { calculateBreakevenPrice } from '@/pages/Tools/BreakEven';

// Django parity: midpoint quantize uses Decimal's default ROUND_HALF_EVEN.
const roundHalfEven = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;

  // Epsilon guard for floating point representation.
  const eps = 1e-12;

  if (diff > 0.5 + eps) return (floor + 1) / factor;
  if (diff < 0.5 - eps) return floor / factor;

  // Tie (.5): round to even.
  return (floor % 2 === 0 ? floor : floor + 1) / factor;
};

const PRICE_TOLERANCE = 0.01; // 1 paisa
const MAX_ITERATIONS = 100;
const MAX_BOUND_EXPANSIONS = 50;
const MIN_STOCK_PRICE = 0.05;

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
   * Calculate the required exit price to achieve target profit percentage.
   * Profit percentage is interpreted as net profit percentage (after all charges),
   * consistent with Net P&L calculator.
   */
  static calculateTargetPrice(params: ProfitTargetParams): ProfitTargetResult | null {
    const { entryPrice, quantity, profitPercentage, exchange, broker, tradeType, positionType } = params;

    if (entryPrice <= 0 || quantity <= 0) {
      return null;
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

    const isIntradayShort = tradeType === 'equity-intraday' && positionType === 'short';
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

    if (profitPercentage === undefined) {
      throw new Error('Profit percentage is required');
    }

    // Short position is supported for intraday flows.
    const isIntradayShort = tradeType === 'equity-intraday' && positionType === 'short';
    const isLong = !isIntradayShort;

    // Cap short profit percentage to 100% (max theoretical gross profit is 100%).
    const cappedProfitPercentage = isIntradayShort ? Math.min(profitPercentage, 100) : profitPercentage;

    const entryValue = entryPrice * quantity;
    const targetNetProfit = entryValue * (cappedProfitPercentage / 100);

    const exitPrice = this.findOptimalExitPrice({
      entryPrice,
      quantity,
      entryValue,
      targetNetProfit,
      exchange,
      broker,
      tradeType,
      isLong,
      breakevenPrice
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
   * Binary search algorithm to find exit price meeting the net profit target.
   *
   * For long positions, the target is always reachable by increasing price.
   * For short positions, net profit is maximized at the minimum stock price;
   * if the target exceeds the max achievable, we return the minimum price.
   */
  private static findOptimalExitPrice(params: {
    entryPrice: number;
    quantity: number;
    entryValue: number;
    targetNetProfit: number;
    exchange: string;
    broker: 'Dhan' | 'Groww';
    tradeType: 'equity-delivery' | 'equity-intraday';
    isLong: boolean;
    breakevenPrice: number;
  }): number {
    const { entryPrice, quantity, entryValue, targetNetProfit, exchange, broker, tradeType, isLong, breakevenPrice } = params;

    const netProfitAt = (exitPrice: number): number => {
      const exitValue = exitPrice * quantity;
      const charges = calculateCharges(
        isLong ? entryValue : exitValue,
        isLong ? exitValue : entryValue,
        exchange,
        broker,
        tradeType
      );

      const grossProfit = isLong ? exitValue - entryValue : entryValue - exitValue;
      return grossProfit - charges.totalCharges;
    };

    let low: number;
    let high: number;

    if (isLong) {
      // Price must be >= breakeven for positive net profit.
      low = Math.max(breakevenPrice, entryPrice);

      // Start with a bound that is always >= low.
      high = Math.max(low * 2, entryPrice * 2);

      // Expand until netProfit(high) >= targetNetProfit.
      let expansions = 0;
      while (expansions < MAX_BOUND_EXPANSIONS && netProfitAt(high) < targetNetProfit) {
        const nextHigh = high * 2;
        if (!Number.isFinite(nextHigh)) break;
        high = nextHigh;
        expansions += 1;
      }
    } else {
      low = MIN_STOCK_PRICE;
      high = Math.max(low, Math.min(breakevenPrice, entryPrice));

      if (high <= low) {
        return parseFloat(roundHalfEven(low, 2).toFixed(2));
      }

      const maxNetProfit = netProfitAt(low);
      if (targetNetProfit > maxNetProfit) {
        return parseFloat(roundHalfEven(low, 2).toFixed(2));
      }
    }

    let iterations = 0;

    while (iterations < MAX_ITERATIONS && (high - low) > PRICE_TOLERANCE) {
      const mid = parseFloat(roundHalfEven((low + high) / 2, 2).toFixed(2));

      // Prevent stagnation when rounding collapses the midpoint.
      if (mid === low || mid === high) {
        break;
      }

      const netProfit = netProfitAt(mid);
      const withinTolerance = Math.abs(netProfit - targetNetProfit) <= PRICE_TOLERANCE;

      if (isLong) {
        if (netProfit < targetNetProfit) {
          low = mid;
        } else {
          high = mid;
        }
      } else {
        // Short: lower buy-back price => higher profit
        if (netProfit < targetNetProfit) {
          high = mid;
        } else {
          low = mid;
        }
      }

      if (withinTolerance) {
        break;
      }

      iterations += 1;
    }

    const resultPrice = isLong ? high : low;
    return parseFloat(resultPrice.toFixed(2));
  }
}
