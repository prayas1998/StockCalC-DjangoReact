import { BaseTradeCalculator, DecimalUtils } from './index.js';
import Decimal from 'decimal.js';
import { BreakevenCalculator } from './breakevenCalculator.js';

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
        quantity: DecimalUtils.toPythonStringFromInput(transaction.quantity, quantity),
        buyValue: DecimalUtils.multiplyToPythonString(transaction.quantity, transaction.buyPrice, buy_value),
        sellValue: DecimalUtils.multiplyToPythonString(transaction.quantity, transaction.sellPrice, sell_value),
        averageBuyPrice: cumulative_quantity.greaterThan(DecimalUtils.zero()) && cumulative_buy_value.greaterThan(DecimalUtils.zero()) 
          ? DecimalUtils.quantizeToString(cumulative_buy_value.div(cumulative_quantity), 2)
          : '0.00',
        charges: DecimalUtils.quantizeToString(transaction_brokerage, 2)
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
    
    // Django-parity breakeven (delivery is always long)
    const entry_price = cumulative_quantity.greaterThan(DecimalUtils.zero())
      ? cumulative_buy_value.div(cumulative_quantity)
      : DecimalUtils.zero();
    const breakeven_price = BreakevenCalculator.calculate_breakeven_price(
      cumulative_quantity,
      entry_price,
      this.broker,
      this.exchange,
      this.tradeType,
      'long'
    );

    return {
      summary: {
        totalQuantity: DecimalUtils.quantizeToString(cumulative_quantity, 0),
        totalBuyValue: DecimalUtils.quantizeToString(total_buy_value, 2),
        totalSellValue: DecimalUtils.quantizeToString(total_sell_value, 2),
        averageBuyPrice: cumulative_quantity.greaterThan(DecimalUtils.zero()) && cumulative_buy_value.greaterThan(DecimalUtils.zero())
          ? DecimalUtils.quantizeToString(cumulative_buy_value.div(cumulative_quantity), 2)
          : '0.00',
        turnover: DecimalUtils.quantizeToString(total_turnover, 2),
        grossPnL: DecimalUtils.quantizeToString(gross_pnl, 2),
        netPnL: DecimalUtils.quantizeToString(net_pnl, 2),
        breakevenPrice: DecimalUtils.quantizeToString(breakeven_price, 2)
      },
      charges: {
        brokerage: DecimalUtils.quantizeToString(total_brokerage, 2),
        stt: DecimalUtils.quantizeToString(stt, 2),
        exchangeCharges: DecimalUtils.quantizeToString(exchange_charges, 2),
        stampDuty: DecimalUtils.quantizeToString(stamp_duty, 2),
        sebiFee: DecimalUtils.quantizeToString(sebi_fee, 2),
        ipft: DecimalUtils.quantizeToString(ipft, 2),
        gst: DecimalUtils.quantizeToString(gst, 2),
        dpCharges: DecimalUtils.quantizeToString(total_dp_charges, 2),
        totalCharges: DecimalUtils.quantizeToString(total_charges, 2)
      },
      transactions: transactions_data
    };
  }
}
