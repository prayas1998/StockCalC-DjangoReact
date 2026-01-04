import { BaseTradeCalculator, DecimalUtils } from './index.js';
import Decimal from 'decimal.js';

export class EquityDeliveryCalculator extends BaseTradeCalculator {
  calculate_transaction_charges(transactions: any[], positionType: string = 'long') {
    let cumulative_quantity = DecimalUtils.zero();
    let cumulative_buy_value = DecimalUtils.zero();
    let total_buy_value = DecimalUtils.zero();
    let total_sell_value = DecimalUtils.zero();
    let total_brokerage = DecimalUtils.zero();
    let transactions_data: any[] = [];

    let has_sell_transaction = false;

    for (const transaction of transactions) {
      const quantity = DecimalUtils.parse(transaction.quantity);
      const buy_price = DecimalUtils.parse(transaction.buyPrice);
      const sell_price = DecimalUtils.parse(transaction.sellPrice);

      const buy_value = quantity.mul(buy_price);
      const sell_value = quantity.mul(sell_price);

      // Only include transactions with buy price > 0 in cumulative calculations for average
      if (buy_price.greaterThan(DecimalUtils.zero())) {
        cumulative_quantity = cumulative_quantity.add(quantity);
        cumulative_buy_value = cumulative_buy_value.add(buy_value);
      }

      // Calculate brokerage per transaction
      const transaction_brokerage = this.broker.calculate_brokerage(buy_value, sell_value);
      total_brokerage = total_brokerage.add(transaction_brokerage);

      // Track if this transaction has a sell component for DP charges
      if (sell_price.greaterThan(DecimalUtils.zero())) {
        has_sell_transaction = true;
      }

      total_buy_value = total_buy_value.add(buy_value);
      total_sell_value = total_sell_value.add(sell_value);

      transactions_data.push({
        quantity: quantity.toString(),
        buyValue: buy_value.toString(),
        sellValue: sell_value.toString(),
        averageBuyPrice: cumulative_quantity.greaterThan(DecimalUtils.zero()) && cumulative_buy_value.greaterThan(DecimalUtils.zero()) 
          ? DecimalUtils.quantize(cumulative_buy_value.div(cumulative_quantity), 2).toString() 
          : '0.00',
        charges: transaction_brokerage.toDecimalPlaces(2).toString()
      });
    }

    // DP charges: Only once per stock if any sell transaction exists
    const total_dp_charges = has_sell_transaction ? this.broker.get_dp_charge() : DecimalUtils.zero();

    // Calculate government charges on TOTAL/NET position
    const total_turnover = total_buy_value.add(total_sell_value);
    const stt = this.govtCharges.calculate_stt(total_turnover);
    const exchange_charges = this.govtCharges.calculate_exchange_charges(total_turnover);
    const stamp_duty = this.govtCharges.calculate_stamp_duty(total_buy_value);
    const sebi_fee = this.govtCharges.calculate_sebi_fee(total_turnover);
    const ipft = this.govtCharges.calculate_ipft(total_turnover);

    // Calculate GST on total taxable components
    const taxable_components = total_brokerage.add(exchange_charges).add(sebi_fee).add(ipft);
    const gst = this.govtCharges.calculate_gst(taxable_components);
    
    const total_charges = total_brokerage
      .add(stt)
      .add(exchange_charges)
      .add(stamp_duty)
      .add(sebi_fee)
      .add(ipft)
      .add(gst)
      .add(total_dp_charges);

    const gross_pnl = total_sell_value.sub(total_buy_value);
    const net_pnl = gross_pnl.sub(total_charges);
    
    // Calculate breakeven price (only for long positions in delivery)
    const breakeven_price = this.calculate_breakeven_price(cumulative_quantity, cumulative_buy_value, total_charges);

    return {
      summary: {
        totalQuantity: DecimalUtils.quantize(cumulative_quantity, 0).toString(),
        totalBuyValue: DecimalUtils.quantize(total_buy_value, 2).toString(),
        totalSellValue: DecimalUtils.quantize(total_sell_value, 2).toString(),
        averageBuyPrice: cumulative_quantity.greaterThan(DecimalUtils.zero()) && cumulative_buy_value.greaterThan(DecimalUtils.zero())
          ? DecimalUtils.quantize(cumulative_buy_value.div(cumulative_quantity), 2).toString()
          : '0.00',
        turnover: DecimalUtils.quantize(total_turnover, 2).toString(),
        grossPnL: DecimalUtils.quantize(gross_pnl, 2).toString(),
        netPnL: DecimalUtils.quantize(net_pnl, 2).toString(),
        breakevenPrice: DecimalUtils.quantize(breakeven_price, 2).toString()
      },
      charges: {
        brokerage: DecimalUtils.quantize(total_brokerage, 2).toString(),
        stt: DecimalUtils.quantize(stt, 2).toString(),
        exchangeCharges: DecimalUtils.quantize(exchange_charges, 2).toString(),
        stampDuty: DecimalUtils.quantize(stamp_duty, 2).toString(),
        sebiFee: DecimalUtils.quantize(sebi_fee, 2).toString(),
        ipft: DecimalUtils.quantize(ipft, 2).toString(),
        gst: DecimalUtils.quantize(gst, 2).toString(),
        dpCharges: DecimalUtils.quantize(total_dp_charges, 2).toString(),
        totalCharges: DecimalUtils.quantize(total_charges, 2).toString()
      },
      transactions: transactions_data
    };
  }

  private calculate_breakeven_price(quantity: Decimal, buy_value: Decimal, total_charges: Decimal): Decimal {
    if (quantity.lessThanOrEqualTo(DecimalUtils.zero()) || buy_value.lessThanOrEqualTo(DecimalUtils.zero())) {
      return DecimalUtils.zero();
    }

    // Calculate entry price per share
    const entry_price = buy_value.div(quantity);
    
    // Simple breakeven for delivery: entry_price + (total_charges / quantity)
    return entry_price.add(total_charges.div(quantity));
  }
}