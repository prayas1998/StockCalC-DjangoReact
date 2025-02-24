from decimal import Decimal, ROUND_HALF_UP, ROUND_DOWN

class TradeCalculator:
    def __init__(self, platform, exchange, trade_type):
        self.platform = platform
        self.exchange = exchange
        self.trade_type = trade_type
        self.exchange_rate = Decimal('0.0000297') if exchange == 'NSE' else Decimal('0.0000375')

    def calculate_brokerage(self, buy_value, sell_value):
        """Calculate total brokerage for buy and sell transactions"""
        total_brokerage = Decimal('0')
        
        # Groww-specific equity-delivery calculation
        if self.platform == 'groww' and self.trade_type == 'equity-delivery':
            if buy_value > 0:
                buy_brokerage = buy_value * Decimal('0.001')
                buy_brokerage = buy_brokerage.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                buy_brokerage = max(min(buy_brokerage, Decimal('20')), Decimal('2'))
                total_brokerage += buy_brokerage
                
            if sell_value > 0:
                sell_brokerage = sell_value * Decimal('0.001')
                sell_brokerage = sell_brokerage.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                sell_brokerage = max(min(sell_brokerage, Decimal('20')), Decimal('2'))
                total_brokerage += sell_brokerage
        
        # For other platforms/trade types, keep existing logic
        else:
            if buy_value > 0:
                buy_brokerage = buy_value * Decimal('0.001')
                buy_brokerage = buy_brokerage.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                buy_brokerage = max(min(buy_brokerage, Decimal('20')), Decimal('2'))
                total_brokerage += buy_brokerage
                
            if sell_value > 0:
                sell_brokerage = sell_value * Decimal('0.001')
                sell_brokerage = sell_brokerage.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                sell_brokerage = max(min(sell_brokerage, Decimal('20')), Decimal('2'))
                total_brokerage += sell_brokerage
        
        return total_brokerage

    def calculate_stt(self, total_turnover):
        """0.1% on SELL value only for equity delivery, rounded to nearest integer"""
        return (total_turnover * Decimal('0.001')).quantize(Decimal('1'), rounding=ROUND_HALF_UP)

    def calculate_exchange_charges(self, total_turnover):
        """NSE: 0.00297%, BSE: 0.00375%, rounded to 2 decimal places"""
        return (total_turnover * self.exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def calculate_stamp_duty(self, buy_value):
        """0.015% on buy value, rounded to nearest integer"""
        if buy_value > 0:
            return (buy_value * Decimal('0.00015')).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        return Decimal('0')

    def calculate_sebi_fee(self, total_turnover):
        """0.0001% on turnover, rounded to 2 decimal places"""
        return (total_turnover * Decimal('0.000001')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def calculate_ipft(self, total_turnover):
        """0.0001% only for NSE, rounded to 2 decimal places"""
        if self.exchange == 'NSE':
            return (total_turnover * Decimal('0.000001')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return Decimal('0')

    def calculate_gst(self, taxable_components):
        """18% on (Brokerage + Exchange Charges + SEBI Fee + IPFT), rounded to 2 decimal places"""
        return (taxable_components * Decimal('0.18')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)