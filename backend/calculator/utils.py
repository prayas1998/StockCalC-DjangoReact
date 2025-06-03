import logging
from decimal import Decimal, InvalidOperation

# DEPRECATED: Use calculator/calculations/*Calculator instead
# from .brokers.groww import GrowwCalculator
# from .brokers.dhan import DhanCalculator
# from .levies import get_government_charges

# class TradeCalculator:
#     ... (old code remains for now, but will be removed after migration)

# Maintain these helper methods if needed elsewhere
class Utils:
    @staticmethod
    def safe_decimal(value) -> Decimal:
        """Convert value to Decimal safely"""
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError) as e:
            logging.warning(f"Decimal conversion error for value {value}: {str(e)}")
            return Decimal('0')

    @staticmethod
    def format_currency(value: Decimal) -> str:
        """Format Decimal value to currency string (retained if needed elsewhere)"""
        return value.quantize(Decimal('0.01')).to_eng_string()