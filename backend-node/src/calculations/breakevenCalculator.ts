import { BaseTradeCalculator, DecimalUtils } from './index';
import Decimal from 'decimal.js';

export class BreakevenCalculator {
  static calculate_breakeven_price(
    quantity: Decimal,
    entry_price: Decimal,
    broker: any,
    exchange: string,
    trade_type: string,
    position_type: string = 'long'
  ): Decimal {
    if (quantity.lessThanOrEqualTo(DecimalUtils.zero())) {
      return DecimalUtils.zero();
    }

    // Binary search for breakeven price
    let low = DecimalUtils.zero();
    let high = entry_price.mul(DecimalUtils.two()); // 2x entry price as upper bound
    let best_price = entry_price;
    let iterations = 0;
    const max_iterations = 100;
    const tolerance = DecimalUtils.parse('0.01');

    while (iterations < max_iterations && high.sub(low).greaterThan(tolerance)) {
      const mid = low.add(high).div(DecimalUtils.two());
      
      // Calculate charges at mid price
      const charges_at_mid = this.calculate_charges_at_price(
        quantity, entry_price, mid, broker, exchange, trade_type, position_type
      );
      
      // Check if mid price breaks even
      if (position_type === 'long') {
        // For long: profit if sell_price - entry_price > charges
        const profit = mid.sub(entry_price).mul(quantity).sub(charges_at_mid);
        if (profit.greaterThan(DecimalUtils.zero())) {
          high = mid;
        } else {
          low = mid;
          best_price = mid;
        }
      } else {
        // For short: profit if entry_price - buy_price > charges
        const profit = entry_price.sub(mid).mul(quantity).sub(charges_at_mid);
        if (profit.greaterThan(DecimalUtils.zero())) {
          high = mid;
        } else {
          low = mid;
          best_price = mid;
        }
      }
      
      iterations++;
    }

    return best_price;
  }

  private static calculate_charges_at_price(
    quantity: Decimal,
    entry_price: Decimal,
    exit_price: Decimal,
    broker: any,
    exchange: string,
    trade_type: string,
    position_type: string
  ): Decimal {
    // Simplified charge calculation for breakeven search
    // This mirrors the broker calculation logic
    const buy_value = position_type === 'long' ? entry_price.mul(quantity) : exit_price.mul(quantity);
    const sell_value = position_type === 'long' ? exit_price.mul(quantity) : entry_price.mul(quantity);
    const turnover = buy_value.add(sell_value);
    
    // Calculate brokerage
    const brokerage = broker.calculate_brokerage(buy_value, sell_value);
    
    // Calculate government charges (simplified)
    const stt_rate = trade_type === 'equity-delivery' ? 0.001 : 0.00025;
    const stt = trade_type === 'equity-intraday' 
      ? sell_value.mul(DecimalUtils.parse('0.00025'))  // STT only on sell for intraday
      : turnover.mul(DecimalUtils.parse('0.001'));             // STT on turnover for delivery
    
    const exchange_rate = DecimalUtils.parse('0.000000345'); // ₹0.0345 per crore
    const exchange_charges = turnover.mul(exchange_rate);
    
    const stamp_rate = trade_type === 'equity-delivery' ? 0.00015 : 0.00001;
    const stamp_duty = buy_value.mul(DecimalUtils.parse(stamp_rate));
    
    const sebi_rate = DecimalUtils.parse('0.0000001'); // ₹10 per crore
    const sebi_fee = turnover.mul(sebi_rate);
    
    const ipft_rate = DecimalUtils.parse('0.0000001'); // ₹10 per crore
    const ipft = turnover.mul(ipft_rate);
    
    const gst_taxable = brokerage.add(exchange_charges).add(sebi_fee).add(ipft);
    const gst = gst_taxable.mul(DecimalUtils.parse('0.18'));
    
    return brokerage.add(stt).add(exchange_charges).add(stamp_duty).add(sebi_fee).add(ipft).add(gst);
  }
}