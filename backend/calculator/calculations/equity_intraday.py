from .base_calculator import BaseTradeCalculator
from .breakeven_calculator import BreakevenCalculator
from decimal import Decimal

class EquityIntradayCalculator(BaseTradeCalculator):
    def calculate_transaction_charges(self, transactions, position_type='long'):
        if self.platform != 'dhan':
            return {"error": "Intraday calculations are only implemented for Dhan broker at this time."}

        cumulative_quantity = Decimal("0")
        cumulative_buy_value = Decimal("0")
        total_buy_value = Decimal("0")
        total_sell_value = Decimal("0")
        total_brokerage = Decimal("0")
        transactions_data = []

        for transaction in transactions:
            quantity = Decimal(str(transaction["quantity"]))
            buy_price = Decimal(str(transaction["buyPrice"]))
            sell_price = Decimal(str(transaction["sellPrice"]))

            # For short positions, we need to interpret the inputs correctly
            if position_type == 'short':
                # In short positions, we sell first (at entry price) and buy later (at exit price)
                # For short positions, sellPrice is the entry price and buyPrice is the exit price
                
                # Calculate values directly from the input prices
                sell_value = quantity * sell_price  # Entry value (sell high)
                buy_value = quantity * buy_price    # Exit value (buy low)
                
                # Store these for reference
                entry_price = sell_price
                exit_price = buy_price
                entry_value = sell_value
                exit_value = buy_value
                
                # Debug print to verify the values
                print(f"SHORT POSITION - quantity: {quantity}, entry price (sell): {entry_price}, exit price (buy): {exit_price}")
                print(f"SHORT POSITION - entry value (sell): {entry_value}, exit value (buy): {exit_value}")
            else:
                # Long position - traditional buy then sell
                entry_price = buy_price
                exit_price = sell_price
                entry_value = quantity * entry_price
                exit_value = quantity * exit_price
                
                buy_value = entry_value
                sell_value = exit_value

            cumulative_quantity += quantity
            cumulative_buy_value += buy_value

            transaction_brokerage = self.broker.calculate_brokerage(buy_value, sell_value)
            total_brokerage += transaction_brokerage

            total_buy_value += buy_value
            total_sell_value += sell_value

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
        # Government Levies (same for all brokers)
        stt = self.govt_charges.calculate_stt(total_sell_value)
        exchange_charges = self.govt_charges.calculate_exchange_charges(total_turnover)
        stamp_duty = self.govt_charges.calculate_stamp_duty(total_buy_value)
        sebi_fee = self.govt_charges.calculate_sebi_fee(total_turnover)
        ipft = self.govt_charges.calculate_ipft(total_turnover)
        taxable_components = sum([total_brokerage, exchange_charges, sebi_fee, ipft])
        gst = self.govt_charges.calculate_gst(taxable_components)
        total_charges = sum([
            total_brokerage, stt, exchange_charges, stamp_duty, sebi_fee, ipft, gst
        ])
        # Calculate gross P&L based on position type
        if position_type == 'short':
            # For short positions: entry (sell) - exit (buy)
            # For short: profit = sell_value (entry) - buy_value (exit)
            gross_pnl = total_sell_value - total_buy_value
            
            # Debug print to verify calculation
            print(f"Short position: sell_value (entry)={total_sell_value}, buy_value (exit)={total_buy_value}, gross_pnl={gross_pnl}")
        else:
            # For long positions: exit (sell) - entry (buy)
            gross_pnl = total_sell_value - total_buy_value
            
        net_pnl = gross_pnl - total_charges
        
        # Calculate breakeven price
        breakeven_price = self.calculate_breakeven_price(cumulative_quantity, total_buy_value, total_sell_value, total_charges, position_type)

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
                "dpCharges": str(Decimal('0.00')),
                "totalCharges": str(total_charges.quantize(Decimal("0.01"))),
            },
            "transactions": transactions_data,
        }
        return response_data 
        
    def calculate_breakeven_price(self, quantity, buy_value, sell_value, total_charges, position_type='long'):
        """
        Calculate the breakeven price for a position.
        For long positions: The minimum exit (sell) price to avoid loss.
        For short positions: The maximum exit (buy) price to avoid loss.
        """
        return BreakevenCalculator.calculate_intraday_breakeven(
            quantity, 
            buy_value, 
            sell_value, 
            total_charges, 
            position_type
        )