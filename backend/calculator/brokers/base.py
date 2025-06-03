from abc import ABC, abstractmethod
from decimal import Decimal


class BaseBroker(ABC):
    def __init__(self, exchange, trade_type):
        self.exchange = exchange
        self.trade_type = trade_type

    @abstractmethod
    def calculate_brokerage(self, buy_value: Decimal, sell_value: Decimal) -> Decimal:
        pass

    def get_dp_charge(self) -> Decimal:
        # Only applicable for delivery trades
        if self.trade_type == 'equity-delivery':
            return self._get_delivery_dp_charge()
        return Decimal('0')

    def _get_delivery_dp_charge(self) -> Decimal:
        # To be implemented by subclasses if needed
        return Decimal('0')