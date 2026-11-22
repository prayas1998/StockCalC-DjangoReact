import Decimal from 'decimal.js';

// Match Python Decimal precision and keep the calculator's existing rounding conventions.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

// Decimal utility functions (preserving Django precision)
export const DecimalUtils = {
  quantizeHalfUp: (value: Decimal, places = 2): Decimal =>
    value.toDecimalPlaces(places, Decimal.ROUND_HALF_UP),
  quantizeToString: (value: Decimal, places = 2): string =>
    value.toFixed(places, Decimal.ROUND_HALF_EVEN),
  zero: () => new Decimal(0),
  one: () => new Decimal(1),

  // Parse string to Decimal safely
  parse: (value: string | number): Decimal => {
    return new Decimal(String(value));
  },

  // Mimic Python Decimal's scale preservation.
  // Django uses `Decimal(str(x))`, and `str(Decimal(...))` preserves trailing zeros.
  // We approximate that by deriving an "effective" decimal places count from the original input.
  //
  // Supports:
  // - "10", "10.00", ".5", "10."
  // - scientific notation like "1e-2", "1.2300e2"
  decimalPlacesFromInput: (value: string | number): number => {
    const asString = String(value).trim();

    const match = asString.match(/^[+-]?(?<mantissa>(?:\d+(?:\.\d*)?|\.\d+))(?:[eE](?<exp>[+-]?\d+))?$/);
    if (!match || !match.groups) return 0;

    const mantissa = match.groups.mantissa;
    const expRaw = match.groups.exp;

    const dot = mantissa.indexOf('.');
    const mantissaDecimals = dot === -1 ? 0 : mantissa.length - dot - 1;

    if (expRaw === undefined) {
      return Math.min(28, mantissaDecimals);
    }

    const exp = Number(expRaw);
    if (!Number.isFinite(exp)) return Math.min(28, mantissaDecimals);

    // Shift decimal point by exponent.
    // - Positive exponent reduces decimal places (or eliminates them).
    // - Negative exponent increases decimal places.
    if (exp >= 0) {
      return Math.min(28, Math.max(0, mantissaDecimals - exp));
    }
    return Math.min(28, mantissaDecimals + Math.abs(exp));
  },
  toPythonStringFromInput: (input: string | number, value: Decimal): string => {
    const places = DecimalUtils.decimalPlacesFromInput(input);
    return value.toFixed(places);
  },
  multiplyToPythonString: (a: string | number, b: string | number, product: Decimal): string => {
    const places = DecimalUtils.decimalPlacesFromInput(a) + DecimalUtils.decimalPlacesFromInput(b);
    return product.toFixed(places);
  }
};

export type GrowwDpRate = 'standard' | 'female';

export interface FeeOptions {
  tradeDate?: string;
  growwDpRate?: GrowwDpRate;
}

export interface SideTotals {
  quantity: Decimal;
  value: Decimal;
  brokerage: Decimal;
}

export function calculateBrokerage(value: Decimal, platform: string, delivery: boolean): Decimal {
  if (platform === 'groww') {
    const minimum = Decimal.min(5, value.mul('0.025'));
    return DecimalUtils.quantizeHalfUp(Decimal.min(20, Decimal.max(minimum, value.mul('0.001'))));
  }
  return delivery ? DecimalUtils.zero() : DecimalUtils.quantizeHalfUp(Decimal.min(20, value.mul('0.0003')));
}

export function calculateDeliveryDebit(value: Decimal, platform: string, rate: GrowwDpRate = 'standard'): Decimal {
  if (platform === 'dhan') return DecimalUtils.parse('14.75');
  const depositoryCharge = DecimalUtils.parse(rate === 'female' ? '3.25' : '3.50');
  return DecimalUtils.quantizeHalfUp(depositoryCharge.add(value.lt(100) ? 0 : '16.50').mul('1.18'));
}

export function calculateFees(
  buy: SideTotals,
  sell: SideTotals,
  dpCharges: Decimal,
  platform: string,
  exchange: string,
  delivery: boolean,
  tradeDate?: string
) {
  const turnover = buy.value.add(sell.value);
  const brokerage = buy.brokerage.add(sell.brokerage);
  const nse = exchange === 'NSE';
  const totalQuantity = buy.quantity.add(sell.quantity);
  // STT Rule 3 uses the rounded VWAP of all executions for the same security and day.
  const matchedTurnover = !delivery && totalQuantity.gt(0)
    ? Decimal.min(buy.quantity, sell.quantity).mul(DecimalUtils.quantizeHalfUp(turnover.div(totalQuantity)))
    : DecimalUtils.zero();
  // Round the intraday STT component to paise before rounding this isolated estimate to rupees.
  const rawStt = delivery ? turnover.mul('0.001') : DecimalUtils.quantizeHalfUp(matchedTurnover.mul('0.00025'));
  const stt = DecimalUtils.quantizeHalfUp(rawStt, 0);
  const stampDuty = DecimalUtils.quantizeHalfUp(buy.value.mul(delivery ? '0.00015' : '0.00003'), 0);
  const sebiFee = DecimalUtils.quantizeHalfUp(turnover.mul('0.000001'));

  // NSE/FA/73061 moved ₹9.99 per crore from IPFT to exchange fees on 1 March 2026.
  const historical = tradeDate !== undefined && tradeDate < '2026-03-01';
  const combined = nse && !historical && platform === 'groww';
  const exchangeRate = !nse ? '0.0000375' : historical ? '0.0000297' : '0.000030699';
  const exchangeCharges = combined ? DecimalUtils.zero() : DecimalUtils.quantizeHalfUp(turnover.mul(exchangeRate));
  const ipft = combined || !nse
    ? DecimalUtils.zero()
    : DecimalUtils.quantizeHalfUp(turnover.mul(historical ? '0.000001' : '0.000000001'));
  // Groww publishes conflicting components. Use the NSE combined amount until reconciled.
  const exchangeAndIpft = combined ? DecimalUtils.quantizeHalfUp(turnover.mul('0.0000307')) : null;
  const turnoverFees = (exchangeAndIpft ?? exchangeCharges.add(ipft)).add(sebiFee);
  const gst = DecimalUtils.quantizeHalfUp(brokerage.add(turnoverFees).mul('0.18'));
  const totalCharges = brokerage.add(stt).add(stampDuty).add(turnoverFees).add(gst).add(dpCharges);
  return {
    brokerage, stt, stampDuty, sebiFee, exchangeAndIpft, gst, dpCharges, totalCharges, turnoverFees,
    exchangeCharges: combined ? null : exchangeCharges,
    ipft: combined ? null : ipft
  };
}
