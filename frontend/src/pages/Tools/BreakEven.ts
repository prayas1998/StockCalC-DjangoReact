// Fixed breakeven price calculation with proper short position handling

export type Charges = {
    brokerage: number;
    stt: number;
    exchangeCharges: number;
    gst: number;
    stampDuty: number;
    sebiCharges: number;
    ipft: number;
    totalCharges: number;
    dpCharges: number;
  };
  
  export const getDpCharge = (broker: string) => {
    if (broker === 'Dhan') return 14.75;
    if (broker === 'Groww') return 21.54;
    return 0;
  };
  
  /**
   * Round Half Up implementation to match backend Decimal precision
   * This ensures consistency with regulatory calculations
   */
  const roundHalfUp = (value: number, decimals: number): number => {
    const factor = Math.pow(10, decimals);
    return Math.floor(value * factor + 0.5) / factor;
  };

  /**
   * Round to nearest rupee using Round Half Up
   */
  const roundToRupee = (value: number): number => {
    return Math.floor(value + 0.5);
  };

  export const calculateCharges = (
    buyValue: number,
    sellValue: number,
    exchange: string,
    broker: 'Dhan' | 'Groww',
    tradeType: 'equity-delivery' | 'equity-intraday'
  ): Charges => {
    const totalTurnover = buyValue + sellValue;
    let brokerage = 0;
    let stt = 0;
    let exchangeCharges = 0;
    let stampDuty = 0;
    let sebiCharges = 0;
    let ipft = 0;
    let gst = 0;
    let dpCharges = 0;
    let totalCharges = 0;
  
    if (tradeType === 'equity-delivery') {
      if (broker === 'Groww') {
        // Groww equity delivery logic
        const buyBrokerage = Math.min(Math.max(buyValue * 0.001, 2), 20);
        const sellBrokerage = Math.min(Math.max(sellValue * 0.001, 2), 20);
        brokerage = buyBrokerage + sellBrokerage;
      } else if (broker === 'Dhan') {
        brokerage = 0;
      }
      
      // Use Round Half Up for all calculations to match backend
      stt = roundToRupee(totalTurnover * 0.001);
      exchangeCharges = exchange === "NSE"
        ? roundHalfUp(totalTurnover * 0.0000297, 2)
        : roundHalfUp(totalTurnover * 0.0000375, 2);
      stampDuty = roundToRupee(buyValue * 0.00015);
      sebiCharges = roundHalfUp(totalTurnover * 0.000001, 2);
      ipft = exchange === "NSE"
        ? roundHalfUp(totalTurnover * 0.000001, 2)
        : 0;
      const taxableAmount = brokerage + exchangeCharges + sebiCharges + ipft;
      gst = roundHalfUp(taxableAmount * 0.18, 2);
      // DP charge only if sellValue > 0
      dpCharges = sellValue > 0 ? getDpCharge(broker) : 0;
      totalCharges = brokerage + stt + exchangeCharges + stampDuty + sebiCharges + ipft + gst + dpCharges;
    } else if (tradeType === 'equity-intraday') {
      if (broker === 'Dhan') {
        // Dhan intraday logic
        // Brokerage: min(20, 0.03% of turnover per leg) for buy and sell
        const buyBrokerage = buyValue > 0 ? Math.min(20, roundHalfUp(buyValue * 0.0003, 2)) : 0;
        const sellBrokerage = sellValue > 0 ? Math.min(20, roundHalfUp(sellValue * 0.0003, 2)) : 0;
        brokerage = buyBrokerage + sellBrokerage;
        stt = roundToRupee(sellValue * 0.00025); // STT only on sell
        exchangeCharges = exchange === "NSE"
          ? roundHalfUp(totalTurnover * 0.0000297, 2)
          : roundHalfUp(totalTurnover * 0.0000375, 2);
        stampDuty = buyValue > 0 ? roundToRupee(buyValue * 0.00003) : 0; // Only on buy
        sebiCharges = roundHalfUp(totalTurnover * 0.000001, 2);
        ipft = exchange === "NSE"
          ? roundHalfUp(totalTurnover * 0.000001, 2)
          : 0;
        const taxableAmount = brokerage + exchangeCharges + sebiCharges + ipft;
        gst = roundHalfUp(taxableAmount * 0.18, 2);
        dpCharges = 0; // No DP charges for intraday
        totalCharges = brokerage + stt + exchangeCharges + stampDuty + sebiCharges + ipft + gst;
      } else {
        // Groww intraday not supported
        brokerage = 0;
        stt = 0;
        exchangeCharges = 0;
        stampDuty = 0;
        sebiCharges = 0;
        ipft = 0;
        gst = 0;
        dpCharges = 0;
        totalCharges = 0;
      }
    }
    return {
      brokerage,
      stt,
      exchangeCharges,
      gst,
      stampDuty,
      sebiCharges,
      ipft,
      totalCharges,
      dpCharges,
    };
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
      const testPrice = parseFloat(((low + high) / 2).toFixed(2));
      
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