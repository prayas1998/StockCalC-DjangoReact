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
    stt = Math.round(totalTurnover * 0.001);
    exchangeCharges = exchange === "NSE"
      ? parseFloat((totalTurnover * 0.0000297).toFixed(2))
      : parseFloat((totalTurnover * 0.0000375).toFixed(2));
    stampDuty = Math.round(buyValue * 0.00015);
    sebiCharges = parseFloat((totalTurnover * 0.000001).toFixed(2));
    ipft = exchange === "NSE"
      ? parseFloat((totalTurnover * 0.000001).toFixed(2))
      : 0;
    const taxableAmount = brokerage + exchangeCharges + sebiCharges + ipft;
    gst = parseFloat((taxableAmount * 0.18).toFixed(2));
    // DP charge only if sellValue > 0
    dpCharges = sellValue > 0 ? getDpCharge(broker) : 0;
    totalCharges = brokerage + stt + exchangeCharges + stampDuty + sebiCharges + ipft + gst + dpCharges;
  } else if (tradeType === 'equity-intraday') {
    if (broker === 'Dhan') {
      // Dhan intraday logic
      // Brokerage: min(₹20, 0.03% of turnover per leg) for buy and sell
      const buyBrokerage = buyValue > 0 ? Math.min(20, parseFloat((buyValue * 0.0003).toFixed(2))) : 0;
      const sellBrokerage = sellValue > 0 ? Math.min(20, parseFloat((sellValue * 0.0003).toFixed(2))) : 0;
      brokerage = buyBrokerage + sellBrokerage;
      stt = Math.round(sellValue * 0.00025); // STT only on sell
      exchangeCharges = exchange === "NSE"
        ? parseFloat((totalTurnover * 0.0000297).toFixed(2))
        : parseFloat((totalTurnover * 0.0000375).toFixed(2));
      stampDuty = buyValue > 0 ? Math.round(buyValue * 0.00003) : 0; // Only on buy
      sebiCharges = parseFloat((totalTurnover * 0.000001).toFixed(2));
      ipft = exchange === "NSE"
        ? parseFloat((totalTurnover * 0.000001).toFixed(2))
        : 0;
      const taxableAmount = brokerage + exchangeCharges + sebiCharges + ipft;
      gst = parseFloat((taxableAmount * 0.18).toFixed(2));
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

// New function to calculate breakeven price independently
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

  const buyValue = quantity * entryPrice;

  // Set search range based on position type
  let low: number, high: number;
  if (positionType === 'long') {
    low = entryPrice;
    high = entryPrice * 3;
  } else {
    low = 0.01;
    high = entryPrice;
  }

  let breakevenPrice = entryPrice;
  let bestPrice = entryPrice;
  let bestNetProfit = -Infinity;

  // Binary search to find exact breakeven price
  for (let i = 0; i < 200; i++) {
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

    // Track the best price that gives us net profit >= 0
    if (netProfit >= 0 && (bestNetProfit < 0 || netProfit < bestNetProfit)) {
      bestPrice = testPrice;
      bestNetProfit = netProfit;
    }

    // If we're very close to zero or slightly positive, we found our answer
    if (netProfit >= 0 && netProfit < 0.5) {
      breakevenPrice = testPrice;
      break;
    }

    if (positionType === 'long') {
      if (netProfit < 0) {
        low = testPrice;
      } else {
        high = testPrice;
      }
    } else {
      if (netProfit < 0) {
        high = testPrice;
      } else {
        low = testPrice;
      }
    }
    breakevenPrice = testPrice;
  }

  // If we found a better price during search, use that
  if (bestNetProfit >= 0) {
    breakevenPrice = bestPrice;
  }

  // Final verification - round up to nearest paisa if needed to ensure no loss
  const finalSellValue = quantity * breakevenPrice;
  const finalCharges = calculateCharges(buyValue, finalSellValue, exchange, broker, tradeType);
  const finalGrossProfit = positionType === 'long' ? finalSellValue - buyValue : buyValue - finalSellValue;
  const finalNetProfit = finalGrossProfit - finalCharges.totalCharges;

  // If there's still a small loss, add 1 paisa and check again
  if (finalNetProfit < 0) {
    if (positionType === 'long') {
      breakevenPrice += 0.01;
    } else {
      breakevenPrice -= 0.01;
      if (breakevenPrice < 0) breakevenPrice = 0.01;
    }
  }

  return parseFloat(breakevenPrice.toFixed(2));
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