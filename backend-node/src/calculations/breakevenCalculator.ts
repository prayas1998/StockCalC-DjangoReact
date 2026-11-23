import Decimal from 'decimal.js';
import { DecimalUtils } from './index.js';

const TICK = new Decimal('0.01');
const MAX_TICK = new Decimal(Number.MAX_SAFE_INTEGER);

/** Find the first non-loss long tick or the last non-loss short tick. */
export function calculateBreakeven(
  quantity: Decimal,
  entryLessPreviousExits: Decimal,
  short: boolean,
  feesAt: (price: Decimal) => Decimal
): Decimal | null {
  const grossAt = (tick: Decimal) => tick.mul(TICK).mul(quantity).sub(entryLessPreviousExits);
  const nonLoss = (tick: Decimal) => {
    const gross = grossAt(tick);
    return (short ? gross.negated() : gross).gte(feesAt(tick.mul(TICK)));
  };

  let low = DecimalUtils.one();
  if (!short) {
    // Fees only increase as the exit price rises. At a loss tick every tick
    // below the gross needed for its current fees also loses, even when
    // rounded taxes or the DP threshold cause downward jumps in net P&L.
    while (low.lte(MAX_TICK)) {
      const fees = feesAt(low.mul(TICK));
      if (grossAt(low).gte(fees)) return low.mul(TICK);
      const next = Decimal.max(low.add(1), entryLessPreviousExits.add(fees).div(quantity.mul(TICK)).ceil());
      if (!next.isFinite() || next.lte(low)) return null;
      low = next;
    }
    return null;
  }

  if (!nonLoss(low)) return null;
  // Short net P&L decreases as the cover price and its fees rise.
  const grossLimit = entryLessPreviousExits.div(quantity.mul(TICK)).floor();
  let high = Decimal.min(grossLimit, MAX_TICK);
  if (grossLimit.gt(MAX_TICK) && nonLoss(high)) return null;
  while (low.lt(high)) {
    const middle = low.add(high).div(2).ceil();
    if (nonLoss(middle)) low = middle;
    else high = middle.sub(1);
  }
  return low.mul(TICK);
}
