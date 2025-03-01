from decimal import Decimal, ROUND_HALF_UP
from .base import BaseBroker


class GrowwCalculator(BaseBroker):
    def calculate_brokerage(self, buy_value: Decimal, sell_value: Decimal) -> Decimal:
        """Implements Groww's equity-delivery specific brokerage"""
        total_brokerage = Decimal('0')

        if self.trade_type == 'equity-delivery':
            # Buy side
            if buy_value > Decimal('0'):
                buy_brokerage = buy_value * Decimal('0.001')
                buy_brokerage = buy_brokerage.quantize(Decimal('0.01'), ROUND_HALF_UP)
                buy_brokerage = max(min(buy_brokerage, Decimal('20')), Decimal('2'))
                total_brokerage += buy_brokerage

            # Sell side
            if sell_value > Decimal('0'):
                sell_brokerage = sell_value * Decimal('0.001')
                sell_brokerage = sell_brokerage.quantize(Decimal('0.01'), ROUND_HALF_UP)
                sell_brokerage = max(min(sell_brokerage, Decimal('20')), Decimal('2'))
                total_brokerage += sell_brokerage

        return total_brokerage