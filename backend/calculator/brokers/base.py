from abc import ABC, abstractmethod
from decimal import Decimal


class BaseBroker(ABC):
    def __init__(self, exchange, trade_type):
        self.exchange = exchange
        self.trade_type = trade_type

    @abstractmethod
    def calculate_brokerage(self, buy_value: Decimal, sell_value: Decimal) -> Decimal:
        pass