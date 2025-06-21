from .base_calculator import BaseTradeCalculator
from .breakeven_calculator import BreakevenCalculator
from decimal import Decimal

class EquityDeliveryCalculator(BaseTradeCalculator):
    def calculate_transaction_charges(self, transactions, position_type='long'):
        cumulative_quantity = Decimal("0")
        cumulative_buy_value = Decimal("0")
        total_buy_value = Decimal("0")
        total_sell_value = Decimal("0")
        total_brokerage = Decimal("0")
        total_dp_charges = Decimal('0')
        transactions_data = []

        for transaction in transactions:
            quantity = Decimal(str(transaction["quantity"]))
            buy_price = Decimal(str(transaction["buyPrice"]))
            sell_price = Decimal(str(transaction["sellPrice"]))

            buy_value = quantity * buy_price
            sell_value = quantity * sell_price

            cumulative_quantity += quantity
            cumulative_buy_value += buy_value

            transaction_brokerage = self.broker.calculate_brokerage(buy_value, sell_value)
            transaction_dp_charge = self.broker.get_dp_charge() if sell_price > 0 else Decimal('0')
            total_dp_charges += transaction_dp_charge

            total_buy_value += buy_value
            total_sell_value += sell_value
            total_brokerage += transaction_brokerage

            transactions_data.append(
                {
                    "quantity": str(quantity),
                    "buyValue": str(buy_value),
                    "sellValue": str(sell_value),
                    "averageBuyPrice": str(
                        (cumulative_buy_value / cumulative_quantity).quantize(Decimal("0.01"))
                        if cumulative_quantity > 0 and cumulative_buy_value > 0
                        else "0.00"
                    ),
                    "charges": str(transaction_brokerage.quantize(Decimal("0.01"))),
                }
            )

        total_turnover = total_buy_value + total_sell_value
        stt = self.govt_charges.calculate_stt(total_turnover)
        exchange_charges = self.govt_charges.calculate_exchange_charges(total_turnover)
        stamp_duty = self.govt_charges.calculate_stamp_duty(total_buy_value)
        sebi_fee = self.govt_charges.calculate_sebi_fee(total_turnover)
        ipft = self.govt_charges.calculate_ipft(total_turnover)
        taxable_components = sum([total_brokerage, exchange_charges, sebi_fee, ipft])
        gst = self.govt_charges.calculate_gst(taxable_components)
        total_charges = sum([
            total_brokerage, stt, exchange_charges, stamp_duty, sebi_fee, ipft, gst, total_dp_charges
        ])
        gross_pnl = total_sell_value - total_buy_value
        net_pnl = gross_pnl - total_charges
        
        # Calculate breakeven price (only for long positions in delivery)
        breakeven_price = self.calculate_breakeven_price(cumulative_quantity, total_buy_value, total_charges)

        response_data = {
            "summary": {
                "totalQuantity": str(cumulative_quantity.quantize(Decimal("1"))),
                "totalBuyValue": str(total_buy_value.quantize(Decimal("0.01"))),
                "totalSellValue": str(total_sell_value.quantize(Decimal("0.01"))),
                "averageBuyPrice": str(
                    (total_buy_value / cumulative_quantity).quantize(Decimal("0.01"))
                    if cumulative_quantity > 0 and total_buy_value > 0
                    else "0.00"
                ),
                "turnover": str(total_turnover.quantize(Decimal("0.01"))),
                "grossPnL": str(gross_pnl.quantize(Decimal("0.01"))),
                "netPnL": str(net_pnl.quantize(Decimal("0.01"))),
                "breakevenPrice": str(breakeven_price.quantize(Decimal("0.01"))),
            },
            "charges": {
                "brokerage": str(total_brokerage.quantize(Decimal("0.01"))),
                "stt": str(stt.quantize(Decimal("0.01"))),
                "exchangeCharges": str(exchange_charges.quantize(Decimal("0.01"))),
                "stampDuty": str(stamp_duty.quantize(Decimal("0.01"))),
                "sebiFee": str(sebi_fee.quantize(Decimal("0.01"))),
                "ipft": str(ipft.quantize(Decimal("0.01"))),
                "gst": str(gst.quantize(Decimal("0.01"))),
                "dpCharges": str(total_dp_charges.quantize(Decimal("0.01"))),
                "totalCharges": str(total_charges.quantize(Decimal("0.01"))),
            },
            "transactions": transactions_data,
        }
        return response_data 
        
    def calculate_breakeven_price(self, quantity, buy_value, total_charges):
        """
        Calculate the breakeven price for a delivery position.
        For delivery trades, this is always the minimum sell price to avoid loss.
        """
        # For delivery trades, we can use the simpler formula since charges are more straightforward
        return BreakevenCalculator.calculate_delivery_breakeven(quantity, buy_value, total_charges)