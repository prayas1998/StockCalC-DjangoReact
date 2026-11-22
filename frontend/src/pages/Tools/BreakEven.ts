import type { BrokerType, PositionType, TradeType } from '@/context/CalculatorContext';
import { calculatePositionCharges } from './ChargesUtils';

export const MIN_PRICE = 0.01;

/** Find the first eligible paise quote for a long, or the last for a short. */
export const calculateBreakevenPrice = (
  quantity: number,
  entryPrice: number,
  exchange: string,
  broker: BrokerType,
  tradeType: TradeType,
  positionType: PositionType = 'long',
  targetNetProfit = 0
): number => {
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isFinite(entryPrice) || entryPrice <= 0) return 0;

  const short = tradeType === 'equity-intraday' && positionType === 'short';
  const feesAt = (tick: number) =>
    calculatePositionCharges(quantity, entryPrice, tick / 100, exchange, broker, tradeType, positionType).totalCharges;
  const targetAt = (tick: number) => {
    const priceDifference = short ? entryPrice - tick / 100 : tick / 100 - entryPrice;
    return Number((quantity * priceDifference - feesAt(tick) - targetNetProfit).toPrecision(15)) >= -1e-9;
  };

  const toTicks = (price: number) => Number((price * 100).toPrecision(15));
  let low = 1;
  if (!short) {
    while (Number.isSafeInteger(low)) {
      if (targetAt(low)) return low / 100;
      // At a losing tick, any higher tick whose gross profit is smaller than
      // today's fees plus target also loses. Rounded fees can jump at a tick.
      const next = Math.ceil(toTicks(entryPrice + (feesAt(low) + targetNetProfit) / quantity));
      low = Math.max(low + 1, next);
    }
    return 0;
  }

  if (!targetAt(low)) return 0;
  const grossLimit = Math.floor(toTicks(entryPrice - targetNetProfit / quantity));
  let high = Math.min(grossLimit, Number.MAX_SAFE_INTEGER);
  if (!Number.isSafeInteger(high) || (grossLimit > high && targetAt(high))) return 0;
  while (low < high) {
    const middle = low + Math.ceil((high - low) / 2);
    if (targetAt(middle)) low = middle;
    else high = middle - 1;
  }
  return low / 100;
};
