import Decimal from 'decimal.js';
import { DecimalUtils, get_government_charges } from './index.js';
import type { BaseBroker } from './index.js';

export class BreakevenCalculator {
  /**
   * Django-parity breakeven: binary search for the exit price such that net profit ~= 0.
   * - long: minimum sell price to avoid loss
   * - short: maximum buy-back price to avoid loss
   */
  static calculate_breakeven_price(
    quantity: Decimal,
    entry_price: Decimal,
    broker: BaseBroker,
    exchange: string,
    trade_type: string,
    position_type: string = 'long'
  ): Decimal {
    if (quantity.lessThanOrEqualTo(DecimalUtils.zero()) || entry_price.lessThanOrEqualTo(DecimalUtils.zero())) {
      return DecimalUtils.zero();
    }

    const tolerance = DecimalUtils.parse('0.01');
    const govt_charges = get_government_charges(trade_type, exchange);

    let low: Decimal;
    let high: Decimal;

    if (position_type === 'long') {
      low = entry_price.mul(DecimalUtils.parse('0.5'));
      high = entry_price.mul(DecimalUtils.parse('5'));
    } else {
      low = DecimalUtils.parse('0.05');
      high = entry_price.mul(DecimalUtils.parse('1.5'));
    }

    let breakeven_price = entry_price;
    let iterations = 0;
    const max_iterations = 100;

    while (iterations < max_iterations && high.sub(low).greaterThan(DecimalUtils.parse('0.01'))) {
      // Django uses `Decimal.quantize(Decimal("0.01"))` without explicit rounding -> HALF_EVEN by default.
      const test_price = low.add(high).div(DecimalUtils.parse('2')).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);

      let buy_value: Decimal;
      let sell_value: Decimal;

      if (position_type === 'long') {
        buy_value = quantity.mul(entry_price);
        sell_value = quantity.mul(test_price);
      } else {
        sell_value = quantity.mul(entry_price);
        buy_value = quantity.mul(test_price);
      }

      const brokerage = broker.calculate_brokerage(buy_value, sell_value);
      const turnover = buy_value.add(sell_value);

      const stt = trade_type === 'equity-intraday'
        ? govt_charges.calculate_stt(sell_value)
        : govt_charges.calculate_stt(turnover);
      const exchange_charges = govt_charges.calculate_exchange_charges(turnover);
      const stamp_duty = govt_charges.calculate_stamp_duty(buy_value);
      const sebi_fee = govt_charges.calculate_sebi_fee(turnover);
      const ipft = govt_charges.calculate_ipft(turnover);

      const taxable_components = brokerage.add(exchange_charges).add(sebi_fee).add(ipft);
      const gst = govt_charges.calculate_gst(taxable_components);

      let dp_charges = DecimalUtils.zero();
      if (trade_type === 'equity-delivery' && sell_value.greaterThan(DecimalUtils.zero())) {
        dp_charges = broker.get_dp_charge();
      }

      const total_charges = brokerage
        .add(stt)
        .add(exchange_charges)
        .add(stamp_duty)
        .add(sebi_fee)
        .add(ipft)
        .add(gst)
        .add(dp_charges);

      const gross_profit = sell_value.sub(buy_value);
      const net_profit = gross_profit.sub(total_charges);

      if (net_profit.abs().lessThanOrEqualTo(tolerance)) {
        breakeven_price = test_price;
        break;
      }

      if (position_type === 'long') {
        if (net_profit.lessThan(DecimalUtils.zero())) {
          low = test_price;
        } else {
          high = test_price;
        }
      } else {
        if (net_profit.lessThan(DecimalUtils.zero())) {
          high = test_price;
        } else {
          low = test_price;
        }
      }

      breakeven_price = test_price;
      iterations += 1;
    }

    // Final verification + 1 paisa adjustment (Django behavior)
    const final_buy_value = position_type === 'long'
      ? quantity.mul(entry_price)
      : quantity.mul(breakeven_price);
    const final_sell_value = position_type === 'long'
      ? quantity.mul(breakeven_price)
      : quantity.mul(entry_price);

    const final_brokerage = broker.calculate_brokerage(final_buy_value, final_sell_value);
    const final_turnover = final_buy_value.add(final_sell_value);

    const final_stt = trade_type === 'equity-intraday'
      ? govt_charges.calculate_stt(final_sell_value)
      : govt_charges.calculate_stt(final_turnover);
    const final_exchange_charges = govt_charges.calculate_exchange_charges(final_turnover);
    const final_stamp_duty = govt_charges.calculate_stamp_duty(final_buy_value);
    const final_sebi_fee = govt_charges.calculate_sebi_fee(final_turnover);
    const final_ipft = govt_charges.calculate_ipft(final_turnover);

    const final_taxable_components = final_brokerage.add(final_exchange_charges).add(final_sebi_fee).add(final_ipft);
    const final_gst = govt_charges.calculate_gst(final_taxable_components);

    let final_dp_charges = DecimalUtils.zero();
    if (trade_type === 'equity-delivery' && final_sell_value.greaterThan(DecimalUtils.zero())) {
      final_dp_charges = broker.get_dp_charge();
    }

    const final_total_charges = final_brokerage
      .add(final_stt)
      .add(final_exchange_charges)
      .add(final_stamp_duty)
      .add(final_sebi_fee)
      .add(final_ipft)
      .add(final_gst)
      .add(final_dp_charges);

    const final_gross_profit = final_sell_value.sub(final_buy_value);
    const final_net_profit = final_gross_profit.sub(final_total_charges);

    if (final_net_profit.lessThan(tolerance.negated())) {
      if (position_type === 'long') {
        breakeven_price = breakeven_price.add(DecimalUtils.parse('0.01'));
      } else {
        breakeven_price = breakeven_price.sub(DecimalUtils.parse('0.01'));
        if (breakeven_price.lessThanOrEqualTo(DecimalUtils.zero())) {
          breakeven_price = DecimalUtils.parse('0.05');
        }
      }
    }

    // Django uses `quantize(Decimal("0.01"))` without explicit rounding -> HALF_EVEN by default.
    return breakeven_price.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  }
}
