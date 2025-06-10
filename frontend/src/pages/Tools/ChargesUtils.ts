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