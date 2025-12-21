import { BaseTradeCalculator, DecimalUtils } from './index';
import Decimal from 'decimal.js';

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

    // Calculate government charges on TOTAL/NET position
    const total_turnover = total_buy_value.add(total_sell_value);
    const stt = this.govtCharges.calculate_stt(total_turnover, total_sell_value); // STT only on sell for intraday
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
    
    // Calculate breakeven price
    const breakeven_price = this.calculate_breakeven_price(
      cumulative_quantity, 
      cumulative_buy_value, 
      total_sell_value, 
      total_charges, 
      positionType, 
      transactions
    );

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
        dpCharges: '0.00', // No DP charges for intraday
        totalCharges: DecimalUtils.quantize(total_charges, 2).toString()
      },
      transactions: transactions_data
    };
  }

  private calculate_breakeven_price(
    quantity: Decimal, 
    buy_value: Decimal, 
    sell_value: Decimal, 
    total_charges: Decimal, 
    position_type: string,
    transactions: any[]
  ): Decimal {
    if (quantity.lessThanOrEqualTo(DecimalUtils.zero())) {
      return DecimalUtils.zero();
    }

    // Calculate entry price per share based on position type
    let entry_price: Decimal;
    
    if (position_type === 'long') {
      // For long positions, entry is buy
      entry_price = buy_value.greaterThan(DecimalUtils.zero()) ? buy_value.div(quantity) : DecimalUtils.zero();
    } else {
      // For short positions, entry is buyPrice from frontend (sell action)
      if (transactions && transactions.length > 0) {
        entry_price = DecimalUtils.parse(transactions[0].buyPrice);
      } else {
        entry_price = sell_value.greaterThan(DecimalUtils.zero()) ? sell_value.div(quantity) : DecimalUtils.zero();
      }
    }

    return entry_price.add(total_charges.div(quantity));
  }
}