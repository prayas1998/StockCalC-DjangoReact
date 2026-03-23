// Utility functions for charges and currency formatting

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
  
  export const formatCurrency = (value: number) => {
    return value.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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
        const buyBrokerage =
          buyValue > 0 ? Math.min(Math.max(roundHalfUp(buyValue * 0.001, 2), 5), 20) : 0;
        const sellBrokerage =
          sellValue > 0 ? Math.min(Math.max(roundHalfUp(sellValue * 0.001, 2), 5), 20) : 0;
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
      } else if (broker === 'Groww') {
        // Groww intraday logic
        // Brokerage: 0.1% of turnover per leg with min ₹5 and max ₹20.
        const buyBrokerage =
          buyValue > 0 ? Math.min(Math.max(roundHalfUp(buyValue * 0.001, 2), 5), 20) : 0;
        const sellBrokerage =
          sellValue > 0 ? Math.min(Math.max(roundHalfUp(sellValue * 0.001, 2), 5), 20) : 0;
        brokerage = buyBrokerage + sellBrokerage;
      }

      if (broker === 'Dhan' || broker === 'Groww') {
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
  
  // Enhanced function for profit target calculation
  export const calculateProfitTarget = (
    quantity: number,
    entryPrice: number,
    targetProfitPercentage: number,
    exchange: string,
    broker: 'Dhan' | 'Groww',
    tradeType: 'equity-delivery' | 'equity-intraday',
    positionType: 'long' | 'short' = 'long'
  ): number => {
    if (quantity <= 0 || entryPrice <= 0 || targetProfitPercentage <= 0) return 0;
  
    const buyValue = quantity * entryPrice;
    const targetNetProfit = buyValue * (targetProfitPercentage / 100);
    
    // Binary search to find the required exit price
    let low = 0;
    let high = entryPrice * 10;
    let targetPrice = entryPrice;
    
    for (let i = 0; i < 100; i++) {
      const testPrice = (low + high) / 2;
      const sellValue = quantity * testPrice;
      
      const charges = calculateCharges(buyValue, sellValue, exchange, broker, tradeType);
      
      let grossProfit: number;
      if (positionType === 'long') {
        grossProfit = sellValue - buyValue;
      } else {
        grossProfit = buyValue - sellValue;
      }
      
      const netProfit = grossProfit - charges.totalCharges;
      
      if (Math.abs(netProfit - targetNetProfit) < 0.01) {
        targetPrice = testPrice;
        break;
      }
      
      if (netProfit < targetNetProfit) {
        low = testPrice;
      } else {
        high = testPrice;
      }
      
      targetPrice = testPrice;
    }
    
    return parseFloat(targetPrice.toFixed(2));
  };
