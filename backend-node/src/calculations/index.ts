import Decimal from 'decimal.js';

/**
 * This module is the TypeScript port of the Django calculators in `backend/`.
 * It is the source of truth for server-side calculation parity.
 */

// Django parity: Python Decimal default context is precision=28 and rounding=ROUND_HALF_EVEN.
// Apply the same globally for decimal.js so divisions/intermediate ops behave the same.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

// ----------------------------
// Decimal / formatting helpers
// ----------------------------
export abstract class BaseTradeCalculator {
  protected platform: string;
  protected exchange: string;
  protected tradeType: string;
  protected broker: BaseBroker;
  protected govtCharges: EquityDeliveryCharges | EquityIntradayCharges;

  constructor(platform: string, exchange: string, tradeType: string) {
    this.platform = platform;
    this.exchange = exchange;
    this.tradeType = tradeType;
    this.broker = this._get_broker();
    this.govtCharges = get_government_charges(tradeType, exchange);
  }

  abstract calculate_transaction_charges(transactions: any[], positionType?: string): any;

  protected _get_broker(): BaseBroker {
    const brokers: Record<string, any> = {
      'groww': GrowwCalculator,
      'dhan': DhanCalculator,
    };

    if (!brokers[this.platform]) {
      throw new Error(`Unsupported platform: ${this.platform}`);
    }
    
    return new brokers[this.platform](this.exchange, this.tradeType);
  }
}

// Decimal utility functions (preserving Django precision)
export const DecimalUtils = {
  // Django parity:
  // - When Django calls `Decimal.quantize(...)` WITHOUT an explicit rounding mode, it uses the
  //   current Decimal context default which is ROUND_HALF_EVEN by default.
  // - When Django passes ROUND_HALF_UP explicitly (e.g. levies/brokerage), we must match that too.
  quantizeHalfEven: (value: Decimal, places: number = 2): Decimal =>
    value.toDecimalPlaces(places, Decimal.ROUND_HALF_EVEN),
  quantizeHalfUp: (value: Decimal, places: number = 2): Decimal =>
    value.toDecimalPlaces(places, Decimal.ROUND_HALF_UP),

  quantizeToStringHalfEven: (value: Decimal, places: number = 2): string =>
    value.toDecimalPlaces(places, Decimal.ROUND_HALF_EVEN).toFixed(places),
  quantizeToStringHalfUp: (value: Decimal, places: number = 2): string =>
    value.toDecimalPlaces(places, Decimal.ROUND_HALF_UP).toFixed(places),

  // Back-compat helpers: default to Django's implicit quantize behavior (half-even).
  quantize: (value: Decimal, places: number = 2): Decimal =>
    value.toDecimalPlaces(places, Decimal.ROUND_HALF_EVEN),
  quantizeToString: (value: Decimal, places: number = 2): string =>
    value.toDecimalPlaces(places, Decimal.ROUND_HALF_EVEN).toFixed(places),
  
  zero: () => new Decimal('0'),
  one: () => new Decimal('1'),
  two: () => new Decimal('2'),
  
  // Parse string to Decimal safely
  parse: (value: string | number): Decimal => {
    return new Decimal(String(value));
  },

  // Mimic Python Decimal string output for values derived from `Decimal(str(a)) * Decimal(str(b))`.
  // Python Decimal preserves the combined scale (decimal places) of the operands.
  decimalPlacesFromInput: (value: string | number): number => {
    const asString = String(value);
    const dot = asString.indexOf('.');
    if (dot === -1) return 0;
    return asString.length - dot - 1;
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

// ----------------------------
// Broker implementations (Django parity)
// ----------------------------

export class BaseBroker {
  protected exchange: string;
  protected tradeType: string;

  constructor(exchange: string, tradeType: string) {
    this.exchange = exchange;
    this.tradeType = tradeType;
  }

  calculate_brokerage(_buyValue: Decimal, _sellValue: Decimal): Decimal {
    return DecimalUtils.zero();
  }

  get_dp_charge(): Decimal {
    if (this.tradeType === 'equity-delivery') {
      return this._get_delivery_dp_charge();
    }
    return DecimalUtils.zero();
  }

  protected _get_delivery_dp_charge(): Decimal {
    return DecimalUtils.zero();
  }
}

export class GrowwCalculator extends BaseBroker {
  calculate_brokerage(buyValue: Decimal, sellValue: Decimal): Decimal {
    // Django: Groww brokerage only for delivery, 0.1% per leg, min ₹5 max ₹20.
    if (this.tradeType !== 'equity-delivery') {
      return DecimalUtils.zero();
    }

    let total = DecimalUtils.zero();
    const minFee = DecimalUtils.parse('5');
    const maxFee = DecimalUtils.parse('20');

    if (buyValue.greaterThan(DecimalUtils.zero())) {
      const raw = buyValue.mul(DecimalUtils.parse('0.001'));
      const rounded = DecimalUtils.quantizeHalfUp(raw, 2);
      total = total.add(Decimal.max(Decimal.min(rounded, maxFee), minFee));
    }

    if (sellValue.greaterThan(DecimalUtils.zero())) {
      const raw = sellValue.mul(DecimalUtils.parse('0.001'));
      const rounded = DecimalUtils.quantizeHalfUp(raw, 2);
      total = total.add(Decimal.max(Decimal.min(rounded, maxFee), minFee));
    }

    return total;
  }

  protected _get_delivery_dp_charge(): Decimal {
    return DecimalUtils.parse('21.54');
  }
}

export class DhanCalculator extends BaseBroker {
  calculate_brokerage(buyValue: Decimal, sellValue: Decimal): Decimal {
    // Django: Delivery brokerage is 0; Intraday is 0.03% per leg capped at ₹20.
    if (this.tradeType === 'equity-delivery') {
      return DecimalUtils.zero();
    }
    if (this.tradeType !== 'equity-intraday') {
      return DecimalUtils.zero();
    }

    const cap = DecimalUtils.parse('20');

    const buyBrokerage = buyValue.greaterThan(DecimalUtils.zero())
      ? DecimalUtils.quantizeHalfUp(Decimal.min(cap, buyValue.mul(DecimalUtils.parse('0.0003'))), 2)
      : DecimalUtils.zero();
    const sellBrokerage = sellValue.greaterThan(DecimalUtils.zero())
      ? DecimalUtils.quantizeHalfUp(Decimal.min(cap, sellValue.mul(DecimalUtils.parse('0.0003'))), 2)
      : DecimalUtils.zero();

    return buyBrokerage.add(sellBrokerage);
  }

  protected _get_delivery_dp_charge(): Decimal {
    return DecimalUtils.parse('14.75');
  }
}

// ----------------------------
// Govt levies (Django parity)
// ----------------------------

export class EquityDeliveryCharges {
  private exchange: string;
  private exchangeRate: Decimal;

  constructor(exchange: string) {
    this.exchange = exchange;
    this.exchangeRate = exchange === 'NSE'
      ? DecimalUtils.parse('0.0000297')
      : DecimalUtils.parse('0.0000375');
  }

  calculate_stt(totalTurnover: Decimal): Decimal {
    // Rounded to nearest rupee (0 dp), then later represented as 2dp in response.
    return totalTurnover.mul(DecimalUtils.parse('0.001')).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  }

  calculate_exchange_charges(totalTurnover: Decimal): Decimal {
    return totalTurnover.mul(this.exchangeRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  calculate_stamp_duty(buyValue: Decimal): Decimal {
    if (buyValue.lessThanOrEqualTo(DecimalUtils.zero())) return DecimalUtils.zero();
    return buyValue.mul(DecimalUtils.parse('0.00015')).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  }

  calculate_sebi_fee(totalTurnover: Decimal): Decimal {
    return totalTurnover.mul(DecimalUtils.parse('0.000001')).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  calculate_ipft(totalTurnover: Decimal): Decimal {
    if (this.exchange !== 'NSE') return DecimalUtils.zero();
    return totalTurnover.mul(DecimalUtils.parse('0.000001')).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  calculate_gst(taxableComponents: Decimal): Decimal {
    return taxableComponents.mul(DecimalUtils.parse('0.18')).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }
}

export class EquityIntradayCharges {
  private exchange: string;
  private exchangeRate: Decimal;

  constructor(exchange: string) {
    this.exchange = exchange;
    this.exchangeRate = exchange === 'NSE'
      ? DecimalUtils.parse('0.0000297')
      : DecimalUtils.parse('0.0000375');
  }

  calculate_stt(sellValue: Decimal): Decimal {
    return sellValue.mul(DecimalUtils.parse('0.00025')).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  }

  calculate_exchange_charges(totalTurnover: Decimal): Decimal {
    return totalTurnover.mul(this.exchangeRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  calculate_stamp_duty(buyValue: Decimal): Decimal {
    if (buyValue.lessThanOrEqualTo(DecimalUtils.zero())) return DecimalUtils.zero();
    // Django: intraday stamp duty is 0.003% (0.00003) on buy side only, rounded to rupee.
    return buyValue.mul(DecimalUtils.parse('0.00003')).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  }

  calculate_sebi_fee(totalTurnover: Decimal): Decimal {
    return totalTurnover.mul(DecimalUtils.parse('0.000001')).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  calculate_ipft(totalTurnover: Decimal): Decimal {
    if (this.exchange !== 'NSE') return DecimalUtils.zero();
    return totalTurnover.mul(DecimalUtils.parse('0.000001')).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  calculate_gst(taxableComponents: Decimal): Decimal {
    return taxableComponents.mul(DecimalUtils.parse('0.18')).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }
}

export const get_government_charges = (tradeType: string, exchange: string) => {
  if (tradeType === 'equity-delivery') return new EquityDeliveryCharges(exchange);
  if (tradeType === 'equity-intraday') return new EquityIntradayCharges(exchange);
  throw new Error(`Unsupported trade type: ${tradeType}`);
};

// Note: Specific calculator classes are exported separately to avoid circular imports.
