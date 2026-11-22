import type { BrokerType, PositionType, TradeType } from '@/context/CalculatorContext';

export type Charges = {
  brokerage: number;
  stt: number;
  exchangeCharges: number;
  exchangeIncludesIpft?: boolean;
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

const roundHalfUp = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(Number((value * factor).toPrecision(15))) / factor;
};

/** Estimate one order per nonzero leg using the current equity tariff. */
export const calculateCharges = (
  buyValue: number,
  sellValue: number,
  exchange: string,
  broker: BrokerType,
  tradeType: TradeType,
  quantity = 1
): Charges => {
  const delivery = tradeType === 'equity-delivery';
  const nse = exchange === 'NSE';
  const turnover = buyValue + sellValue;
  const orderBrokerage = (value: number) => {
    if (broker === 'Groww') {
      const minimum = Math.min(5, value * 0.025);
      return roundHalfUp(Math.min(20, Math.max(minimum, value * 0.001)));
    }
    return delivery ? 0 : roundHalfUp(Math.min(20, value * 0.0003));
  };
  const brokerage = orderBrokerage(buyValue) + orderBrokerage(sellValue);
  const sttTurnover = delivery ? turnover
    : buyValue > 0 && sellValue > 0 ? quantity * roundHalfUp(turnover / (2 * quantity)) : 0;
  const rawStt = delivery ? sttTurnover * 0.001 : roundHalfUp(sttTurnover * 0.00025);
  const stt = roundHalfUp(rawStt, 0);
  const stampDuty = roundHalfUp(buyValue * (delivery ? 0.00015 : 0.00003), 0);
  // NSE/FA/73061, effective 1 March 2026. Groww's published split remains unverified.
  const exchangeIncludesIpft = nse && broker === 'Groww';
  const exchangeCharges = roundHalfUp(turnover * (nse ? (exchangeIncludesIpft ? 0.0000307 : 0.000030699) : 0.0000375));
  const ipft = nse && !exchangeIncludesIpft ? roundHalfUp(turnover * 0.000000001) : 0;
  const sebiCharges = roundHalfUp(turnover * 0.000001);
  const gst = roundHalfUp((brokerage + exchangeCharges + sebiCharges + ipft) * 0.18);
  const dpCharges = delivery && sellValue > 0 ? (broker === 'Dhan' ? 14.75 : sellValue < 100 ? 4.13 : 23.60) : 0;
  const totalCharges = roundHalfUp(brokerage + stt + exchangeCharges + stampDuty + sebiCharges + ipft + gst + dpCharges);

  return {
    brokerage: roundHalfUp(brokerage),
    stt,
    exchangeCharges,
    exchangeIncludesIpft,
    gst,
    stampDuty,
    sebiCharges,
    ipft,
    totalCharges,
    dpCharges,
  };
};

export const calculatePositionCharges = (
  quantity: number,
  entryPrice: number,
  exitPrice: number,
  exchange: string,
  broker: BrokerType,
  tradeType: TradeType,
  positionType: PositionType
) => {
  const entry = quantity * entryPrice;
  const exit = quantity * exitPrice;
  const short = tradeType === 'equity-intraday' && positionType === 'short';
  return calculateCharges(short ? exit : entry, short ? entry : exit, exchange, broker, tradeType, quantity);
};
