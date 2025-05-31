from decimal import Decimal, ROUND_HALF_UP
from .base import BaseBroker


class DhanCalculator(BaseBroker):
    def calculate_brokerage(self, buy_value: Decimal, sell_value: Decimal) -> Decimal:
        """Implements Dhan's equity-delivery specific brokerage: always zero"""
        if self.trade_type == 'equity-delivery':
            return Decimal('0')
        # If other trade types are added in the future, handle them here
        return Decimal('0') 