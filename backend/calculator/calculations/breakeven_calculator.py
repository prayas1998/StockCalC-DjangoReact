from decimal import Decimal

class BreakevenCalculator:
    """
    A utility class for calculating breakeven prices for different trade types and positions.
    Uses binary search to find the exact breakeven price where net profit is zero.
    """
    
    @staticmethod
    def calculate_breakeven_price(quantity, entry_price, broker, exchange, trade_type, position_type='long'):
        """
        Calculate the breakeven price for any position type using binary search.
        For long positions: The minimum exit (sell) price to avoid loss.
        For short positions: The maximum exit (buy) price to avoid loss.
        
        Args:
            quantity (Decimal): The quantity of shares
            entry_price (Decimal): The entry price per share
            broker: The broker calculator instance
            exchange (str): The exchange (NSE/BSE)
            trade_type (str): The trade type (equity-delivery/equity-intraday)
            position_type (str): The position type ('long' or 'short')
            
        Returns:
            Decimal: The breakeven price
        """
        if quantity <= 0 or entry_price <= 0:
            return Decimal("0")
        
        # Set search range based on position type
        tolerance = Decimal("0.01")  # 1 paisa tolerance for breakeven
        
        if position_type == 'long':
            # For long positions, exit price should be >= entry price typically
            low = entry_price * Decimal("0.5")  # Allow for some flexibility
            high = entry_price * Decimal("5")   # Reasonable upper bound
        else:
            # For short positions, exit price should be <= entry price typically
            low = Decimal("0.05")  # Minimum possible stock price
            high = entry_price * Decimal("1.5")  # Allow some flexibility above entry
        
        breakeven_price = entry_price
        iterations = 0
        max_iterations = 100
        
        # Binary search to find exact breakeven price
        while iterations < max_iterations and (high - low) > Decimal("0.01"):
            test_price = ((low + high) / Decimal("2")).quantize(Decimal("0.01"))
            
            # Calculate charges based on position type
            if position_type == 'long':
                # Long: Buy at entry, sell at test price
                buy_value = quantity * entry_price
                sell_value = quantity * test_price
            else:
                # Short: Sell at entry, buy back at test price
                sell_value = quantity * entry_price  # Initial sell (short)
                buy_value = quantity * test_price    # Buy back (cover)
            
            # Calculate brokerage
            brokerage = broker.calculate_brokerage(buy_value, sell_value)
            
            # Calculate government charges
            from ..levies import get_government_charges
            govt_charges = get_government_charges(trade_type, exchange)
            
            # Calculate all charges
            turnover = buy_value + sell_value
            stt = govt_charges.calculate_stt(sell_value if trade_type == 'equity-intraday' else turnover)
            exchange_charges = govt_charges.calculate_exchange_charges(turnover)
            stamp_duty = govt_charges.calculate_stamp_duty(buy_value)
            sebi_fee = govt_charges.calculate_sebi_fee(turnover)
            ipft = govt_charges.calculate_ipft(turnover)
            
            taxable_components = sum([brokerage, exchange_charges, sebi_fee, ipft])
            gst = govt_charges.calculate_gst(taxable_components)
            
            # Add DP charges for delivery trades with sell value
            dp_charges = Decimal("0")
            if trade_type == 'equity-delivery' and sell_value > 0:
                dp_charges = broker.get_dp_charge()
            
            total_charges = sum([
                brokerage, stt, exchange_charges, stamp_duty, sebi_fee, ipft, gst, dp_charges
            ])
            
            # Calculate gross and net profit
            if position_type == 'long':
                gross_profit = sell_value - buy_value  # Sell high, bought low
            else:
                gross_profit = sell_value - buy_value  # Sold high, buy back low
            
            net_profit = gross_profit - total_charges
            
            # Check if we've found breakeven (small profit or loss within tolerance)
            if abs(net_profit) <= tolerance:
                breakeven_price = test_price
                break
            
            # Adjust search range based on position type and profit/loss
            if position_type == 'long':
                if net_profit < 0:
                    # Still making loss, need higher exit price
                    low = test_price
                else:
                    # Making profit, can try lower exit price
                    high = test_price
            else:
                if net_profit < 0:
                    # Still making loss, need lower buyback price
                    high = test_price
                else:
                    # Making profit, can try higher buyback price
                    low = test_price
            
            breakeven_price = test_price
            iterations += 1
        
        # Final verification and adjustment
        if position_type == 'long':
            final_buy_value = quantity * entry_price
            final_sell_value = quantity * breakeven_price
        else:
            final_sell_value = quantity * entry_price
            final_buy_value = quantity * breakeven_price
        
        # Calculate final charges
        final_brokerage = broker.calculate_brokerage(final_buy_value, final_sell_value)
        final_turnover = final_buy_value + final_sell_value
        
        final_stt = govt_charges.calculate_stt(final_sell_value if trade_type == 'equity-intraday' else final_turnover)
        final_exchange_charges = govt_charges.calculate_exchange_charges(final_turnover)
        final_stamp_duty = govt_charges.calculate_stamp_duty(final_buy_value)
        final_sebi_fee = govt_charges.calculate_sebi_fee(final_turnover)
        final_ipft = govt_charges.calculate_ipft(final_turnover)
        
        final_taxable_components = sum([final_brokerage, final_exchange_charges, final_sebi_fee, final_ipft])
        final_gst = govt_charges.calculate_gst(final_taxable_components)
        
        final_dp_charges = Decimal("0")
        if trade_type == 'equity-delivery' and final_sell_value > 0:
            final_dp_charges = broker.get_dp_charge()
        
        final_total_charges = sum([
            final_brokerage, final_stt, final_exchange_charges, final_stamp_duty, 
            final_sebi_fee, final_ipft, final_gst, final_dp_charges
        ])
        
        final_gross_profit = final_sell_value - final_buy_value
        final_net_profit = final_gross_profit - final_total_charges
        
        # If there's still a loss, adjust by 1 paisa in the right direction
        if final_net_profit < -tolerance:
            if position_type == 'long':
                breakeven_price += Decimal("0.01")  # Increase sell price
            else:
                breakeven_price -= Decimal("0.01")  # Decrease buyback price
                if breakeven_price <= 0:
                    breakeven_price = Decimal("0.05")  # Ensure positive price
        
        return breakeven_price.quantize(Decimal("0.01"))
    
    @staticmethod
    def calculate_delivery_breakeven(quantity, buy_value, total_charges):
        """
        Legacy method - use calculate_breakeven_price instead.
        """
        if quantity <= 0 or buy_value <= 0:
            return Decimal("0")
            
        breakeven_price = (buy_value + total_charges) / quantity
        return breakeven_price.quantize(Decimal("0.01"))
    
    @staticmethod
    def calculate_intraday_breakeven(quantity, buy_value, sell_value, total_charges, position_type='long', 
                                    broker=None, exchange=None):
        """
        Legacy method - use calculate_breakeven_price instead.
        """
        if quantity <= 0:
            return Decimal("0")
            
        if position_type == 'long':
            entry_value = buy_value
            breakeven_price = (entry_value + total_charges) / quantity
        else:  # short position
            entry_value = sell_value
            breakeven_price = (entry_value - total_charges) / quantity
            
            if breakeven_price <= Decimal("0"):
                breakeven_price = Decimal("0.01")
                
        return breakeven_price.quantize(Decimal("0.01"))