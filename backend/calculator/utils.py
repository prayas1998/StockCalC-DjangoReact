import logging
from decimal import Decimal, InvalidOperation

from .brokers.groww import GrowwCalculator
from .levies.government import GovernmentCharges


class TradeCalculator:
    def __init__(self, platform, exchange, trade_type):
        self.platform = platform.lower()
        self.exchange = exchange.upper()
        self.trade_type = trade_type.lower()

        # Initialize components
        self.broker = self._initialize_broker()
        self.govt_charges = GovernmentCharges(self.exchange, self.trade_type)

    def _initialize_broker(self):
        """Factory method to create the appropriate broker calculator"""
        brokers = {
            'groww': GrowwCalculator,
            # 'rise': RiseCalculator,  # To be implemented later
            # 'others': OthersCalculator  # To be implemented later
        }

        if self.platform not in brokers:
            raise ValueError(f"Unsupported platform: {self.platform}")

        return brokers[self.platform](self.exchange, self.trade_type)

    # Maintain these helper methods if needed elsewhere
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