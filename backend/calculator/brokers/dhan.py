from decimal import Decimal, ROUND_HALF_UP
from .base import BaseBroker


class DhanCalculator(BaseBroker):
    def calculate_brokerage(self, buy_value: Decimal, sell_value: Decimal) -> Decimal:
        """Implements Dhan's brokerage logic for both delivery and intraday"""
        if self.trade_type == 'equity-delivery':
            return Decimal('0')
        elif self.trade_type == 'equity-intraday':
            # Flat ₹20 per executed order (applies if either buy or sell is present)
            if buy_value > 0 or sell_value > 0:
                return Decimal('20')
            return Decimal('0')
        # If other trade types are added in the future, handle them here
        return Decimal('0')

    def _get_delivery_dp_charge(self) -> Decimal:
        """Returns the fixed DP charge for Dhan (applied per sell transaction, only for delivery)"""
        return Decimal('14.75')

    def get_dp_charge(self) -> Decimal:
        """Returns the fixed DP charge for Dhan (applied per sell transaction, only for delivery)"""
        if self.trade_type == 'equity-delivery':
            return Decimal('14.75')
        return Decimal('0') 