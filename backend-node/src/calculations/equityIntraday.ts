import { BaseTradeCalculator, DecimalUtils } from './index.js';
import Decimal from 'decimal.js';
import { BreakevenCalculator } from './breakevenCalculator.js';

export class EquityIntradayCalculator extends BaseTradeCalculator {
  calculate_transaction_charges(transactions: any[], positionType: string = 'long') {
    if (this.platform !== 'dhan') {
      return { error: "Intraday calculations are only implemented for Dhan broker at this time." };
    }

    let cumulative_quantity = DecimalUtils.zero();
    let cumulative_buy_value = DecimalUtils.zero();
    let total_buy_value = DecimalUtils.zero();
    let total_sell_value = DecimalUtils.zero();
    let total_brokerage = DecimalUtils.zero();
    let transactions_data: any[] = [];

    for (const transaction of transactions) {
      const quantity = DecimalUtils.parse(transaction.quantity);
      const buy_price = DecimalUtils.parse(transaction.buyPrice);
      const sell_price = DecimalUtils.parse(transaction.sellPrice);

      // For short positions, we need to interpret inputs correctly
      let buy_value: Decimal;
      let sell_value: Decimal;
      
      if (positionType === 'short') {
        // In short positions: entry price (sell) -> buyPrice, exit price (buy) -> sellPrice
        const entry_price = buy_price;     // Entry price (sell action)
        const exit_price = sell_price;     // Exit price (buy action)
        
        buy_value = quantity.mul(exit_price);  // Buy to close
        sell_value = quantity.mul(entry_price); // Sold to open
      } else {
        // Long position - traditional buy then sell
        buy_value = quantity.mul(buy_price);
        sell_value = quantity.mul(sell_price);
      }

      // Only include transactions with buy price > 0 in cumulative calculations for average
      if (buy_price.greaterThan(DecimalUtils.zero())) {
        cumulative_quantity = cumulative_quantity.add(quantity);
        cumulative_buy_value = cumulative_buy_value.add(buy_value);
      }

      // Calculate brokerage per transaction
      const transaction_brokerage = this.broker.calculate_brokerage(buy_value, sell_value);
      total_brokerage = total_brokerage.add(transaction_brokerage);

      total_buy_value = total_buy_value.add(buy_value);
      total_sell_value = total_sell_value.add(sell_value);

      const buyValueString = positionType === 'short'
        ? DecimalUtils.multiplyToPythonString(transaction.quantity, transaction.sellPrice, buy_value)
        : DecimalUtils.multiplyToPythonString(transaction.quantity, transaction.buyPrice, buy_value);

      const sellValueString = positionType === 'short'
        ? DecimalUtils.multiplyToPythonString(transaction.quantity, transaction.buyPrice, sell_value)
        : DecimalUtils.multiplyToPythonString(transaction.quantity, transaction.sellPrice, sell_value);

      transactions_data.push({
        quantity: DecimalUtils.toPythonStringFromInput(transaction.quantity, quantity),
        buyValue: buyValueString,
        sellValue: sellValueString,
        averageBuyPrice: cumulative_quantity.greaterThan(DecimalUtils.zero()) && cumulative_buy_value.greaterThan(DecimalUtils.zero())
          ? DecimalUtils.quantizeToString(cumulative_buy_value.div(cumulative_quantity), 2)
          : '0.00',
        charges: DecimalUtils.quantizeToString(transaction_brokerage, 2)
      });
    }

    // Calculate government charges on TOTAL/NET position
    const total_turnover = total_buy_value.add(total_sell_value);
    const stt = this.govtCharges.calculate_stt(total_sell_value); // STT only on sell for intraday
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
      .add(gst);

    // Calculate gross P&L based on position type
    const gross_pnl = total_sell_value.sub(total_buy_value);
    const net_pnl = gross_pnl.sub(total_charges);
    
    // Django-parity breakeven
    const breakeven_price = this.calculate_breakeven_price(positionType, transactions, cumulative_quantity, cumulative_buy_value, total_sell_value);

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
        dpCharges: '0.00', // No DP charges for intraday
        totalCharges: DecimalUtils.quantizeToString(total_charges, 2)
      },
      transactions: transactions_data
    };
  }

  private calculate_breakeven_price(
    position_type: string,
    transactions: any[],
    quantity: Decimal,
    cumulative_buy_value: Decimal,
    total_sell_value: Decimal
  ): Decimal {
    if (quantity.lessThanOrEqualTo(DecimalUtils.zero())) {
      return DecimalUtils.zero();
    }

    let entry_price: Decimal;
    if (position_type === 'long') {
      entry_price = cumulative_buy_value.greaterThan(DecimalUtils.zero())
        ? cumulative_buy_value.div(quantity)
        : DecimalUtils.zero();
    } else {
      // Django: for short, entry is the `buyPrice` field from the frontend payload.
      if (transactions && transactions.length > 0) {
        entry_price = DecimalUtils.parse(transactions[0].buyPrice);
      } else {
        entry_price = total_sell_value.greaterThan(DecimalUtils.zero())
          ? total_sell_value.div(quantity)
          : DecimalUtils.zero();
      }
    }

    return BreakevenCalculator.calculate_breakeven_price(
      quantity,
      entry_price,
      this.broker,
      this.exchange,
      this.tradeType,
      position_type
    );
  }
}
