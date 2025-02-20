from decimal import Decimal, ROUND_HALF_UP

class TradeCalculator:
    def __init__(self, platform, exchange):
        self.platform = platform
        self.exchange = exchange
        self.exchange_rate = Decimal('0.0000297') if exchange == 'NSE' else Decimal('0.0000375')

    def calculate_brokerage(self, value):
        """0.1% per order, min ₹2, max ₹20"""
        brokerage = value * Decimal('0.001')
        calculated = brokerage.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return max(min(calculated, Decimal('20')), Decimal('2'))

    def calculate_stt(self, sell_value):
        """0.1% on SELL value only for equity delivery"""
        return (sell_value * Decimal('0.001')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def calculate_exchange_charges(self, total_turnover):
        """NSE: 0.00297%, BSE: 0.00375%"""
        return (total_turnover * self.exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def calculate_stamp_duty(self, buy_value):
        """0.015% on buy value"""
        return (buy_value * Decimal('0.00015')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def calculate_sebi_fee(self, total_turnover):
        """0.0001% on turnover"""
        return (total_turnover * Decimal('0.000001')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def calculate_ipft(self, total_turnover):
        """0.0001% only for NSE"""
        if self.exchange == 'NSE':
            return (total_turnover * Decimal('0.000001')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return Decimal('0')

    def calculate_gst(self, taxable_components):
        """18% on (Brokerage + Exchange Charges + SEBI Fee + IPFT)"""
        return (taxable_components * Decimal('0.18')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)