import Decimal from 'decimal.js';
import type { CalculationResponse, Transaction } from '../types/index.js';
import { calculateBreakeven } from './breakevenCalculator.js';
import {
  calculateBrokerage,
  calculateDeliveryDebit,
  calculateFees,
  DecimalUtils,
  type FeeOptions,
  type SideTotals
} from './index.js';

interface Order {
  value: Decimal;
  firstRow: number;
}

const emptySide = (): SideTotals => ({
  quantity: DecimalUtils.zero(),
  value: DecimalUtils.zero(),
  brokerage: DecimalUtils.zero()
});

export class EquityCalculator {
  private readonly delivery: boolean;

  constructor(
    private readonly platform: string,
    private readonly exchange: string,
    tradeType: string,
    private readonly options: FeeOptions = {}
  ) {
    if (platform !== 'groww' && platform !== 'dhan') throw new Error(`Unsupported platform: ${platform}`);
    if (exchange !== 'NSE' && exchange !== 'BSE') throw new Error(`Unsupported exchange: ${exchange}`);
    if (tradeType !== 'equity-delivery' && tradeType !== 'equity-intraday') {
      throw new Error(`Unsupported trade type: ${tradeType}`);
    }
    this.delivery = tradeType === 'equity-delivery';
  }

  calculate_transaction_charges(transactions: Transaction[], positionType: 'long' | 'short' = 'long'): CalculationResponse {
    const short = positionType === 'short';
    if (short && this.delivery) throw new Error('Delivery calculations only support long positions');

    const buy = emptySide();
    const sell = emptySide();
    const buyOrders = new Map<string | number, Order>();
    const sellOrders = new Map<string | number, Order>();
    const debits = new Map<string | number, Decimal>();
    const rowBrokerage = transactions.map(() => DecimalUtils.zero());

    const rows = transactions.map((transaction, index) => {
      const quantity = DecimalUtils.parse(transaction.quantity);
      // The wire fields have always represented entry and exit, in that order.
      const buyPrice = short ? transaction.sellPrice : transaction.buyPrice;
      const sellPrice = short ? transaction.buyPrice : transaction.sellPrice;
      const buyValue = quantity.mul(buyPrice);
      const sellValue = quantity.mul(sellPrice);
      const buyOrderKey = transaction.buyOrderId ?? index;
      const sellOrderKey = transaction.sellOrderId ?? index;

      this.addFill(buy, buyOrders, buyOrderKey, index, quantity, buyValue);
      this.addFill(sell, sellOrders, sellOrderKey, index, quantity, sellValue);
      if (this.delivery && sellValue.gt(0)) {
        const debitKey = this.platform === 'dhan' ? transaction.debitInstructionId ?? sellOrderKey : sellOrderKey;
        debits.set(debitKey, (debits.get(debitKey) ?? DecimalUtils.zero()).add(sellValue));
      }

      const entry = short ? sell : buy;
      return {
        quantity: DecimalUtils.toPythonStringFromInput(transaction.quantity, quantity),
        buyValue: DecimalUtils.multiplyToPythonString(transaction.quantity, buyPrice, buyValue),
        sellValue: DecimalUtils.multiplyToPythonString(transaction.quantity, sellPrice, sellValue),
        averageBuyPrice: DecimalUtils.quantizeToString(entry.quantity.gt(0) ? entry.value.div(entry.quantity) : entry.value)
      };
    });

    for (const [side, orders] of [[buy, buyOrders], [sell, sellOrders]] as const) {
      for (const order of orders.values()) {
        const brokerage = calculateBrokerage(order.value, this.platform, this.delivery);
        side.brokerage = side.brokerage.add(brokerage);
        rowBrokerage[order.firstRow] = rowBrokerage[order.firstRow].add(brokerage);
      }
    }

    const dpCharges = [...debits.values()].reduce(
      (total, value) => total.add(calculateDeliveryDebit(value, this.platform, this.options.growwDpRate)),
      DecimalUtils.zero()
    );
    const fees = this.fees(buy, sell, dpCharges);

    // An order-independent weighted average on each side attributes cost and proceeds to the matched shares.
    const matchedQuantity = Decimal.min(buy.quantity, sell.quantity);
    const buyRatio = buy.quantity.gt(0) ? matchedQuantity.div(buy.quantity) : DecimalUtils.zero();
    const sellRatio = sell.quantity.gt(0) ? matchedQuantity.div(sell.quantity) : DecimalUtils.zero();
    const matchedBuyValue = buy.value.mul(buyRatio);
    const matchedSellValue = sell.value.mul(sellRatio);
    const grossPnL = matchedSellValue.sub(matchedBuyValue);
    const turnover = buy.value.add(sell.value);
    const turnoverRatio = turnover.gt(0) ? matchedBuyValue.add(matchedSellValue).div(turnover) : DecimalUtils.zero();
    const sttRatio = this.delivery ? turnoverRatio : DecimalUtils.one();
    const matchedTaxable = buy.brokerage.mul(buyRatio)
      .add(sell.brokerage.mul(sellRatio)).add(fees.turnoverFees.mul(turnoverRatio));
    const taxable = fees.brokerage.add(fees.turnoverFees);
    const matchedFees = DecimalUtils.quantizeHalfUp(matchedTaxable
      .add(taxable.gt(0) ? fees.gst.mul(matchedTaxable.div(taxable)) : 0)
      .add(fees.stt.mul(sttRatio))
      .add(fees.stampDuty.mul(buyRatio))
      .add(fees.dpCharges.mul(sellRatio)));
    const netPnL = grossPnL.sub(matchedFees);
    const buyTurnoverRatio = turnover.gt(0) ? buy.value.div(turnover) : DecimalUtils.zero();
    const buyTaxable = buy.brokerage.add(fees.turnoverFees.mul(buyTurnoverRatio));
    const buyFees = DecimalUtils.quantizeHalfUp(buyTaxable
      .add(taxable.gt(0) ? fees.gst.mul(buyTaxable.div(taxable)) : 0)
      .add(this.delivery ? fees.stt.mul(buyTurnoverRatio) : 0)
      .add(fees.stampDuty));
    const cashFlow = sell.value.sub(buy.value).sub(fees.totalCharges);
    const openCashFlow = cashFlow.sub(netPnL);

    const entry = short ? sell : buy;
    const exit = short ? buy : sell;
    const breakeven = this.breakeven(entry, exit, dpCharges, short);

    const format = DecimalUtils.quantizeToString;
    return {
      summary: {
        totalQuantity: format(entry.quantity, 0),
        totalBuyValue: format(buy.value),
        totalSellValue: format(sell.value),
        averageBuyPrice: format(entry.quantity.gt(0) ? entry.value.div(entry.quantity) : entry.value),
        turnover: format(turnover),
        grossPnL: format(grossPnL),
        netPnL: format(netPnL),
        matchedQuantity: format(matchedQuantity, 0),
        openQuantity: format(buy.quantity.sub(sell.quantity).abs(), 0),
        openSide: buy.quantity.eq(sell.quantity) ? '' : buy.quantity.gt(sell.quantity) ? 'buy' : 'sell',
        openCashFlow: format(openCashFlow),
        cashFlow: format(cashFlow),
        netPayable: format(buy.value.add(buyFees)),
        netReceivable: format(sell.value.sub(fees.totalCharges.sub(buyFees))),
        breakevenPrice: breakeven ? format(breakeven) : '0.00',
        breakevenMode: breakeven ? (entry.quantity.eq(exit.quantity) ? 'full' : 'remaining') : 'unavailable',
      },
      charges: {
        brokerage: format(fees.brokerage),
        stt: format(fees.stt),
        exchangeCharges: fees.exchangeCharges === null ? null : format(fees.exchangeCharges),
        stampDuty: format(fees.stampDuty),
        sebiFee: format(fees.sebiFee),
        ipft: fees.ipft === null ? null : format(fees.ipft),
        exchangeAndIpft: fees.exchangeAndIpft === null ? null : format(fees.exchangeAndIpft),
        gst: format(fees.gst),
        dpCharges: format(fees.dpCharges),
        totalCharges: format(fees.totalCharges)
      },
      transactions: rows.map((row, index) => ({ ...row, charges: format(rowBrokerage[index]) }))
    };
  }

  private addFill(
    side: SideTotals,
    orders: Map<string | number, Order>,
    key: string | number,
    index: number,
    quantity: Decimal,
    value: Decimal
  ) {
    if (value.isZero()) return;
    side.quantity = side.quantity.add(quantity);
    side.value = side.value.add(value);
    const order = orders.get(key);
    orders.set(key, { value: order ? order.value.add(value) : value, firstRow: order?.firstRow ?? index });
  }

  private fees(buy: SideTotals, sell: SideTotals, dpCharges: Decimal) {
    return calculateFees(buy, sell, dpCharges, this.platform, this.exchange, this.delivery, this.options.tradeDate);
  }

  private breakeven(entry: SideTotals, exit: SideTotals, dpCharges: Decimal, short: boolean) {
    if (entry.quantity.isZero() || exit.quantity.gt(entry.quantity)) return null;

    // For a completed trade, replace the exits with one hypothetical closing order.
    // For an open trade, keep actual exits and their fees and add one order for the remaining shares.
    const replaceExits = entry.quantity.eq(exit.quantity);
    const previous = replaceExits ? emptySide() : exit;
    const quantity = entry.quantity.sub(previous.quantity);
    const previousDp = replaceExits ? DecimalUtils.zero() : dpCharges;
    return calculateBreakeven(quantity, entry.value.sub(previous.value), short, (price) => {
      const value = quantity.mul(price);
      const closingSide = {
        quantity: entry.quantity,
        value: previous.value.add(value),
        brokerage: previous.brokerage.add(calculateBrokerage(value, this.platform, this.delivery))
      };
      const closingDp = this.delivery ? calculateDeliveryDebit(value, this.platform, this.options.growwDpRate) : 0;
      const totalDp = previousDp.add(closingDp);
      return (short ? this.fees(closingSide, entry, totalDp) : this.fees(entry, closingSide, totalDp)).totalCharges;
    });
  }
}
