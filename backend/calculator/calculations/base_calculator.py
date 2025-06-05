from abc import ABC, abstractmethod
from ..brokers.groww import GrowwCalculator
from ..brokers.dhan import DhanCalculator
from ..levies import get_government_charges

class BaseTradeCalculator(ABC):
    def __init__(self, platform, exchange, trade_type):
        self.platform = platform
        self.exchange = exchange
        self.trade_type = trade_type
        self.broker = self._get_broker()
        self.govt_charges = self._get_government_charges()

    @abstractmethod
    def calculate_transaction_charges(self, transactions):
        pass

    def _get_broker(self):
        brokers = {
            'groww': GrowwCalculator,
            'dhan': DhanCalculator,
            # Add more brokers as needed
        }
        if self.platform not in brokers:
            raise ValueError(f"Unsupported platform: {self.platform}")
        return brokers[self.platform](self.exchange, self.trade_type)

    def _get_government_charges(self):
        return get_government_charges(self.trade_type, self.exchange)

    # Add any shared utility methods here 