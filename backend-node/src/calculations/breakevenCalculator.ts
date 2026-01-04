import Decimal from 'decimal.js';
import { BaseTradeCalculator, DecimalUtils } from './index.js';

export class BreakevenCalculator {
  /**
   * Calculate breakeven price using binary search algorithm (exact match to Django)
   * For long positions: The minimum exit (sell) price to avoid loss
   * For short positions: The maximum exit (buy) price to avoid loss
   */
  static calculate_breakeven_price(
    quantity: Decimal,
    entry_price: Decimal,
    broker: any,
    exchange: string,
    trade_type: string,
    position_type: string = 'long'
  ): Decimal {
    if (quantity.lessThanOrEqualTo(DecimalUtils.zero()) || entry_price.lessThanOrEqualTo(DecimalUtils.zero())) {
      return DecimalUtils.parse("0");
    }
    
    // Set search range based on position type (exact match to Django)
    const tolerance = DecimalUtils.parse("0.01"); // 1 paisa tolerance for breakeven
    
    let low: Decimal;
    let high: Decimal;
    
    if (position_type === 'long') {
      // For long positions, exit price should be >= entry price typically
      low = entry_price.mul(DecimalUtils.parse("0.5")); // Allow for some flexibility
      high = entry_price.mul(DecimalUtils.parse("5"));   // Reasonable upper bound
    } else {
      // For short positions, exit price should be <= entry price typically
      low = DecimalUtils.parse("0.05"); // Minimum possible stock price
      high = entry_price.mul(DecimalUtils.parse("1.5")); // Allow some flexibility above entry
    }
    
    let breakeven_price = entry_price;
    let iterations = 0;
    const max_iterations = 100;
    
    // Binary search to find exact breakeven price (exact match to Django)
    while (iterations < max_iterations && high.sub(low).greaterThan(DecimalUtils.parse("0.01"))) {
      const test_price = low.add(high).div(DecimalUtils.parse("2")).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      
      // Calculate charges based on position type (exact match to Django)
      let buy_value: Decimal;
      let sell_value: Decimal;
      
      if (position_type === 'long') {
        // Long: Buy at entry, sell at test price
        buy_value = quantity.mul(entry_price);
        sell_value = quantity.mul(test_price);
      } else {
        // Short: Sell at entry, buy back at test price
        sell_value = quantity.mul(entry_price);  // Initial sell (short)
        buy_value = quantity.mul(test_price);    // Buy back (cover)
      }
      
      // Calculate brokerage
      const brokerage = broker.calculate_brokerage(buy_value, sell_value);
      
      // Calculate government charges (using exact same logic as Django)
      const govtCharges = new GovernmentCharges(trade_type, exchange);
      const turnover = buy_value.add(sell_value);
      const stt = govtCharges.calculate_stt(
        trade_type === 'equity-intraday' ? sell_value : turnover,
        trade_type === 'equity-intraday' ? sell_value : undefined
      );
      const exchange_charges = govtCharges.calculate_exchange_charges(turnover);
      const stamp_duty = govtCharges.calculate_stamp_duty(buy_value);
      const sebi_fee = govtCharges.calculate_sebi_fee(turnover);
      const ipft = govtCharges.calculate_ipft(turnover);
      
      const taxable_components = brokerage.add(exchange_charges).add(sebi_fee).add(ipft);
      const gst = govtCharges.calculate_gst(taxable_components);
      
      // Add DP charges for delivery trades with sell value (exact match to Django)
      let dp_charges = DecimalUtils.zero();
      if (trade_type === 'equity-delivery' && sell_value.greaterThan(DecimalUtils.zero())) {
        dp_charges = broker.get_dp_charge();
      }
      
      const total_charges = brokerage.add(stt).add(exchange_charges).add(stamp_duty).add(sebi_fee).add(ipft).add(gst).add(dp_charges);
      
      // Calculate gross and net profit (exact match to Django)
      let gross_profit: Decimal;
      if (position_type === 'long') {
        gross_profit = sell_value.sub(buy_value); // Sell high, bought low
      } else {
        gross_profit = sell_value.sub(buy_value); // Sold high, buy back low
      }
      
      const net_profit = gross_profit.sub(total_charges);
      
      // Check if we've found breakeven (small profit or loss within tolerance)
      if (net_profit.abs().lessThanOrEqualTo(tolerance)) {
        breakeven_price = test_price;
        break;
      }
      
      // Adjust search range based on position type and profit/loss (exact match to Django)
      if (position_type === 'long') {
        if (net_profit.lessThan(DecimalUtils.zero())) {
          // Still making loss, need higher exit price
          low = test_price;
        } else {
          // Making profit, can try lower exit price
          high = test_price;
        }
      } else {
        if (net_profit.lessThan(DecimalUtils.zero())) {
          // Still making loss, need lower buyback price
          high = test_price;
        } else {
          // Making profit, can try higher buyback price
          low = test_price;
        }
      }
      
      breakeven_price = test_price;
      iterations++;
    }
    
    // Final verification and adjustment (exact match to Django)
    let final_buy_value: Decimal;
    let final_sell_value: Decimal;
    
    if (position_type === 'long') {
      final_buy_value = quantity.mul(entry_price);
      final_sell_value = quantity.mul(breakeven_price);
    } else {
      final_sell_value = quantity.mul(entry_price);
      final_buy_value = quantity.mul(breakeven_price);
    }
    
    // Calculate final charges
    const final_brokerage = broker.calculate_brokerage(final_buy_value, final_sell_value);
    const final_turnover = final_buy_value.add(final_sell_value);
    
    const govtCharges = new GovernmentCharges(trade_type, exchange);
    const final_stt = govtCharges.calculate_stt(
      trade_type === 'equity-intraday' ? final_sell_value : final_turnover,
      trade_type === 'equity-intraday' ? final_sell_value : undefined
    );
    const final_exchange_charges = govtCharges.calculate_exchange_charges(final_turnover);
    const final_stamp_duty = govtCharges.calculate_stamp_duty(final_buy_value);
    const final_sebi_fee = govtCharges.calculate_sebi_fee(final_turnover);
    const final_ipft = govtCharges.calculate_ipft(final_turnover);
    
    const final_taxable_components = final_brokerage.add(final_exchange_charges).add(final_sebi_fee).add(final_ipft);
    const final_gst = govtCharges.calculate_gst(final_taxable_components);
    
    let final_dp_charges = DecimalUtils.zero();
    if (trade_type === 'equity-delivery' && final_sell_value.greaterThan(DecimalUtils.zero())) {
      final_dp_charges = broker.get_dp_charge();
    }
    
    const final_total_charges = final_brokerage.add(final_stt).add(final_exchange_charges).add(final_stamp_duty).add(final_sebi_fee).add(final_ipft).add(final_gst).add(final_dp_charges);
    
    const final_gross_profit = final_sell_value.sub(final_buy_value);
    const final_net_profit = final_gross_profit.sub(final_total_charges);
    
    // If there's still a loss, adjust by 1 paisa in right direction (exact match to Django)
    if (final_net_profit.lessThan(tolerance.negated())) {
      if (position_type === 'long') {
        breakeven_price = breakeven_price.add(DecimalUtils.parse("0.01")); // Increase sell price
      } else {
        breakeven_price = breakeven_price.sub(DecimalUtils.parse("0.01")); // Decrease buyback price
        if (breakeven_price.lessThanOrEqualTo(DecimalUtils.zero())) {
          breakeven_price = DecimalUtils.parse("0.05"); // Ensure positive price
        }
      }
    }
    
    return breakeven_price.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }
}

// Helper class for government charges (mirroring Django implementation)
class GovernmentCharges {
  private tradeType: string;
  private exchange: string;

  constructor(tradeType: string, exchange: string) {
    this.tradeType = tradeType;
    this.exchange = exchange;
  }

  calculate_stt(totalTurnover: Decimal, totalSellValue?: Decimal): Decimal {
    // STT rates (exact match to Django)
    const sttRates: Record<string, Decimal> = {
      'equity-delivery': DecimalUtils.parse('0.001'),  // 0.1% on sell side
      'equity-intraday': DecimalUtils.parse('0.00025') // 0.025% on sell side
    };

    if (this.tradeType === 'equity-intraday' && totalSellValue) {
      return totalSellValue.mul(sttRates[this.tradeType]);
    }
    
    return totalTurnover.mul(sttRates[this.tradeType]);
  }

  calculate_exchange_charges(totalTurnover: Decimal): Decimal {
    // Exchange charges: ₹0.0345 per crore turnover
    const exchangeRate = DecimalUtils.parse('0.000000345'); // ₹0.0345 per crore
    return totalTurnover.mul(exchangeRate);
  }

  calculate_stamp_duty(totalBuyValue: Decimal): Decimal {
    // Stamp duty rates (exact match to Django)
    const stampRates: Record<string, Decimal> = {
      'equity-delivery': DecimalUtils.parse('0.00015'),  // 0.015% on buy side
      'equity-intraday': DecimalUtils.parse('0.00001')  // 0.001% on buy side
    };

    return totalBuyValue.mul(stampRates[this.tradeType]);
  }

  calculate_sebi_fee(totalTurnover: Decimal): Decimal {
    // SEBI fees: ₹10 per crore
    const sebiRate = DecimalUtils.parse('0.0000001'); // ₹10 per crore
    return totalTurnover.mul(sebiRate);
  }

  calculate_ipft(totalTurnover: Decimal): Decimal {
    // IPFT: ₹10 per crore
    const ipftRate = DecimalUtils.parse('0.0000001'); // ₹10 per crore
    return totalTurnover.mul(ipftRate);
  }

  calculate_gst(taxableComponents: Decimal): Decimal {
    // GST: 18% on total taxable components
    return taxableComponents.mul(DecimalUtils.parse('0.18'));
  }
}