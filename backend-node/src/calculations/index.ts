import Decimal from 'decimal.js';

// Broker classes (mirroring Django implementation)
export class BaseBroker {
  protected exchange: string;
  protected tradeType: string;

  constructor(exchange: string, tradeType: string) {
    this.exchange = exchange;
    this.tradeType = tradeType;
  }

  calculate_brokerage(buyValue: Decimal, sellValue: Decimal): Decimal {
    // Default implementation - to be overridden by specific brokers
    return new Decimal('0');
  }

  get_dp_charge(): Decimal {
    return new Decimal('13.5'); // Default DP charge
  }
}

export class GrowwCalculator extends BaseBroker {
  calculate_brokerage(buyValue: Decimal, sellValue: Decimal): Decimal {
    // Groww brokerage: 0.05% or ₹20 per order, whichever is lower
    const turnover = buyValue.add(sellValue);
    const brokeragePercentage = turnover.mul(new Decimal('0.0005')); // 0.05%
    const brokerageFlat = new Decimal('20');
    
    return Decimal.min(brokeragePercentage, brokerageFlat);
  }

  get_dp_charge(): Decimal {
    return new Decimal('13.5');
  }
}

export class DhanCalculator extends BaseBroker {
  calculate_brokerage(buyValue: Decimal, sellValue: Decimal): Decimal {
    // Dhan brokerage: ₹20 per order or 0.018% whichever is lower
    const turnover = buyValue.add(sellValue);
    const brokeragePercentage = turnover.mul(new Decimal('0.00018')); // 0.018%
    const brokerageFlat = new Decimal('20');
    
    return Decimal.min(brokeragePercentage, brokerageFlat);
  }

  get_dp_charge(): Decimal {
    return new Decimal('0'); // No DP charge for Dhan
  }
}

// Government charges (mirroring Django levies)
export class GovernmentCharges {
  private tradeType: string;
  private exchange: string;

  constructor(tradeType: string, exchange: string) {
    this.tradeType = tradeType;
    this.exchange = exchange;
  }

  calculate_stt(totalTurnover: Decimal, totalSellValue?: Decimal): Decimal {
    // STT rates
    const sttRates: Record<string, Decimal> = {
      'equity-delivery': new Decimal('0.001'),  // 0.1% on sell side
      'equity-intraday': new Decimal('0.00025') // 0.025% on sell side
    };

    if (this.tradeType === 'equity-intraday' && totalSellValue) {
      return totalSellValue.mul(sttRates[this.tradeType]);
    }
    
    return totalTurnover.mul(sttRates[this.tradeType]);
  }

  calculate_exchange_charges(totalTurnover: Decimal): Decimal {
    // Exchange charges: ₹0.0345 per crore turnover
    const exchangeRate = new Decimal('0.000000345'); // ₹0.0345 per crore
    return totalTurnover.mul(exchangeRate);
  }

  calculate_stamp_duty(totalBuyValue: Decimal): Decimal {
    // Stamp duty rates
    const stampRates: Record<string, Decimal> = {
      'equity-delivery': new Decimal('0.00015'),  // 0.015% on buy side
      'equity-intraday': new Decimal('0.00001')  // 0.001% on buy side
    };

    return totalBuyValue.mul(stampRates[this.tradeType]);
  }

  calculate_sebi_fee(totalTurnover: Decimal): Decimal {
    // SEBI fees: ₹10 per crore
    const sebiRate = new Decimal('0.0000001'); // ₹10 per crore
    return totalTurnover.mul(sebiRate);
  }

  calculate_ipft(totalTurnover: Decimal): Decimal {
    // IPFT: ₹10 per crore
    const ipftRate = new Decimal('0.0000001'); // ₹10 per crore
    return totalTurnover.mul(ipftRate);
  }

  calculate_gst(taxableComponents: Decimal): Decimal {
    // GST: 18% on total taxable components
    return taxableComponents.mul(new Decimal('0.18'));
  }
}

// Base calculator (mirroring Django BaseTradeCalculator)
export abstract class BaseTradeCalculator {
  protected platform: string;
  protected exchange: string;
  protected tradeType: string;
  protected broker: BaseBroker;
  protected govtCharges: GovernmentCharges;

  constructor(platform: string, exchange: string, tradeType: string) {
    this.platform = platform;
    this.exchange = exchange;
    this.tradeType = tradeType;
    this.broker = this._get_broker();
    this.govtCharges = new GovernmentCharges(tradeType, exchange);
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
  quantize: (value: Decimal, places: number = 2): Decimal => {
    return value.toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
  },
  
  zero: () => new Decimal('0'),
  one: () => new Decimal('1'),
  two: () => new Decimal('2'),
  
  // Parse string to Decimal safely
  parse: (value: string | number): Decimal => {
    return new Decimal(String(value));
  }
};