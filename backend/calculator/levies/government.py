from decimal import Decimal, ROUND_HALF_UP

class GovernmentCharges:
    def __init__(self, exchange, trade_type):
        self.exchange = exchange
        self.trade_type = trade_type
        self.exchange_rate = Decimal('0.0000297') if exchange == 'NSE' else Decimal('0.0000375')

    def calculate_stt(self, total_turnover: Decimal) -> Decimal:
        if self.trade_type == 'equity-delivery':
            return (total_turnover * Decimal('0.001')).quantize(Decimal('1'), ROUND_HALF_UP)
        return Decimal('0')

    def calculate_exchange_charges(self, total_turnover: Decimal) -> Decimal:
        return (total_turnover * self.exchange_rate).quantize(Decimal('0.01'), ROUND_HALF_UP)

    def calculate_stamp_duty(self, buy_value: Decimal) -> Decimal:
        return (buy_value * Decimal('0.00015')).quantize(Decimal('1'), ROUND_HALF_UP) if buy_value > 0 else Decimal('0')

    def calculate_sebi_fee(self, total_turnover: Decimal) -> Decimal:
        return (total_turnover * Decimal('0.000001')).quantize(Decimal('0.01'), ROUND_HALF_UP)

    def calculate_ipft(self, total_turnover: Decimal) -> Decimal:
        if self.exchange == 'NSE':
            return (total_turnover * Decimal('0.000001')).quantize(Decimal('0.01'), ROUND_HALF_UP)
        return Decimal('0')

    def calculate_gst(self, taxable_components: Decimal) -> Decimal:
        return (taxable_components * Decimal('0.18')).quantize(Decimal('0.01'), ROUND_HALF_UP)