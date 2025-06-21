from decimal import Decimal

class BreakevenCalculator:
    """
    A utility class for calculating breakeven prices for different trade types and positions.
    """
    
    @staticmethod
    def calculate_delivery_breakeven(quantity, buy_value, total_charges):
        """
        Calculate the breakeven price for a delivery position.
        For delivery trades, this is always the minimum sell price to avoid loss.
        
        Args:
            quantity (Decimal): The quantity of shares
            buy_value (Decimal): The total buy value
            total_charges (Decimal): The total charges
            
        Returns:
            Decimal: The breakeven price
        """
        if quantity <= 0 or buy_value <= 0:
            return Decimal("0")
            
        # For delivery positions, the breakeven price is simply:
        # (buy_value + total_charges) / quantity
        # This is the price at which selling would result in zero net profit
        breakeven_price = (buy_value + total_charges) / quantity
        return breakeven_price.quantize(Decimal("0.01"))
    
    @staticmethod
    def calculate_intraday_breakeven(quantity, buy_value, sell_value, total_charges, position_type='long', 
                                    broker=None, exchange=None):
        """
        Calculate the breakeven price for an intraday position.
        For long positions: The minimum exit (sell) price to avoid loss.
        For short positions: The maximum exit (buy) price to avoid loss.
        
        Args:
            quantity (Decimal): The quantity of shares
            buy_value (Decimal): The total buy value
            sell_value (Decimal): The total sell value
            total_charges (Decimal): The total charges
            position_type (str): The position type ('long' or 'short')
            
        Returns:
            Decimal: The breakeven price
        """
        if quantity <= 0:
            return Decimal("0")
            
        # For intraday positions, we only need quantity and entry price
        if position_type == 'long':
            # For long positions, entry is buy_value
            entry_value = buy_value
            entry_price = entry_value / quantity if quantity > 0 else Decimal("0")
            
            # Breakeven price = (entry_value + charges) / quantity
            breakeven_price = (entry_value + total_charges) / quantity
        else:  # short position
            # For short positions, entry is sell_value
            entry_value = sell_value
            entry_price = entry_value / quantity if quantity > 0 else Decimal("0")
            
            # Breakeven price = (entry_value - charges) / quantity
            # This is the maximum price at which buying back would result in zero net profit
            breakeven_price = (entry_value - total_charges) / quantity
            
            # Ensure the price is not negative for short positions
            if breakeven_price <= Decimal("0"):
                breakeven_price = Decimal("0.01")
                
            # Debug print to verify calculation
            print(f"Short position breakeven: sell_value (entry)={sell_value}, buy_value (exit)={buy_value}, charges={total_charges}, quantity={quantity}, breakeven={breakeven_price}")
                
        return breakeven_price.quantize(Decimal("0.01"))