// Fixed breakeven price calculation with proper short position handling

import { calculateCharges } from './ChargesUtils';

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
  
  /**
   * Calculates the breakeven exit price for a trade such that net profit is zero or slightly positive.
   * For long: the minimum sell price to avoid loss.
   * For short: the maximum buy-back price to avoid loss.
   */
  export const calculateBreakevenPrice = (
    quantity: number,
    entryPrice: number,
    exchange: string,
    broker: 'Dhan' | 'Groww',
    tradeType: 'equity-delivery' | 'equity-intraday',
    positionType: 'long' | 'short' = 'long'
  ): number => {
    if (quantity <= 0 || entryPrice <= 0) return 0;
  
    // Set search range based on position type
    let low: number, high: number;
    const tolerance = 0.01; // 1 paisa tolerance for breakeven
    
    if (positionType === 'long') {
      // For long positions, exit price should be >= entry price typically
      low = entryPrice * 0.5; // Allow for some flexibility
      high = entryPrice * 5; // Reasonable upper bound
    } else {
      // For short positions, exit price should be <= entry price typically
      low = 0.05; // Minimum possible stock price
      high = entryPrice * 1.5; // Allow some flexibility above entry
    }
  
    let breakevenPrice = entryPrice;
    let iterations = 0;
    const maxIterations = 100;
  
    // Binary search to find exact breakeven price
    while (iterations < maxIterations && (high - low) > 0.01) {
      const testPrice = roundHalfEven((low + high) / 2, 2);
      
      // Calculate charges based on position type
      let buyValue: number, sellValue: number;
      
      if (positionType === 'long') {
        // Long: Buy at entry, sell at test price
        buyValue = quantity * entryPrice;
        sellValue = quantity * testPrice;
      } else {
        // Short: Sell at entry, buy back at test price
        sellValue = quantity * entryPrice;  // Initial sell (short)
        buyValue = quantity * testPrice;    // Buy back (cover)
      }
      
      const charges = calculateCharges(buyValue, sellValue, exchange, broker, tradeType);
      
      // Calculate gross and net profit
      let grossProfit: number;
      if (positionType === 'long') {
        grossProfit = sellValue - buyValue; // Sell high, bought low
      } else {
        grossProfit = sellValue - buyValue; // Sold high, buy back low
      }
      
      const netProfit = grossProfit - charges.totalCharges;
      
      // Check if we've found breakeven (small profit or loss within tolerance)
      if (Math.abs(netProfit) <= tolerance) {
        breakevenPrice = testPrice;
        break;
      }
      
      // Adjust search range based on position type and profit/loss
      if (positionType === 'long') {
        if (netProfit < 0) {
          // Still making loss, need higher exit price
          low = testPrice;
        } else {
          // Making profit, can try lower exit price
          high = testPrice;
        }
      } else {
        if (netProfit < 0) {
          // Still making loss, need lower buyback price
          high = testPrice;
        } else {
          // Making profit, can try higher buyback price
          low = testPrice;
        }
      }
      
      breakevenPrice = testPrice;
      iterations++;
    }
  
    // Final verification and adjustment
    let finalBuyValue: number, finalSellValue: number;
    
    if (positionType === 'long') {
      finalBuyValue = quantity * entryPrice;
      finalSellValue = quantity * breakevenPrice;
    } else {
      finalSellValue = quantity * entryPrice;
      finalBuyValue = quantity * breakevenPrice;
    }
    
    const finalCharges = calculateCharges(finalBuyValue, finalSellValue, exchange, broker, tradeType);
    const finalGrossProfit = finalSellValue - finalBuyValue;
    const finalNetProfit = finalGrossProfit - finalCharges.totalCharges;
  
    // If there's still a loss, adjust by 1 paisa in the right direction
    if (finalNetProfit < -tolerance) {
      if (positionType === 'long') {
        breakevenPrice += 0.01; // Increase sell price
      } else {
        breakevenPrice -= 0.01; // Decrease buyback price
        if (breakevenPrice <= 0) breakevenPrice = 0.05; // Ensure positive price
      }
    }
  
    return parseFloat(breakevenPrice.toFixed(2));
  };