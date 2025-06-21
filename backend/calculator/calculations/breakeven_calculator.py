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
        if quantity <= 0:
            return Decimal("0")
            
        # For delivery positions, we need to find the minimum sell price
        # Exit value (sell_value) - Entry value (buy_value) - charges = 0
        # Solve for sell_value: sell_value = buy_value + charges
        # Then breakeven price = sell_value / quantity
        breakeven_price = (buy_value + total_charges) / quantity
        return breakeven_price
    
    @staticmethod
    def calculate_intraday_breakeven(quantity, buy_value, sell_value, total_charges, position_type='long'):
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
            
        if position_type == 'short':
            # For short positions, we need to find the maximum buy-back price
            # Entry value (sell_value) - Exit value (buy_value) - charges = 0
            # Solve for buy_value: buy_value = sell_value - charges
            # Then breakeven price = buy_value / quantity
            breakeven_price = (sell_value - total_charges) / quantity
            # Ensure the price is not negative
            return max(breakeven_price, Decimal("0.01"))
        else:
            # For long positions, we need to find the minimum sell price
            # Exit value (sell_value) - Entry value (buy_value) - charges = 0
            # Solve for sell_value: sell_value = buy_value + charges
            # Then breakeven price = sell_value / quantity
            breakeven_price = (buy_value + total_charges) / quantity
            return breakeven_price