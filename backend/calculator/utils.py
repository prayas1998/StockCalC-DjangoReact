from decimal import Decimal, ROUND_HALF_UP

class TradeCalculator:
    def __init__(self, platform, exchange):
        self.platform = platform
        self.exchange = exchange
        self.exchange_rate = Decimal('0.0000297') if exchange == 'NSE' else Decimal('0.0000375')

    def calculate_brokerage(self, buy_value, sell_value):
        """
        Calculate total brokerage for buy and sell transactions
        Buy brokerage: 0.1% of buy value (min ₹2, max ₹20) if buy_value > 0
        Sell brokerage: 0.1% of sell value (min ₹2, max ₹20) if sell_value > 0
        """
        total_brokerage = Decimal('0')
        
        # Calculate buy brokerage only if there's a buy transaction
        if buy_value > 0:
            buy_brokerage = buy_value * Decimal('0.001')
            buy_brokerage = buy_brokerage.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            buy_brokerage = max(min(buy_brokerage, Decimal('20')), Decimal('2'))
            total_brokerage += buy_brokerage
            
        # Calculate sell brokerage only if there's a sell transaction
        if sell_value > 0:
            sell_brokerage = sell_value * Decimal('0.001')
            sell_brokerage = sell_brokerage.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            sell_brokerage = max(min(sell_brokerage, Decimal('20')), Decimal('2'))
            total_brokerage += sell_brokerage
            
        return total_brokerage

    def calculate_stt(self, total_turnover):
        """0.1% on SELL value only for equity delivery"""
        return (total_turnover * Decimal('0.001')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def calculate_exchange_charges(self, total_turnover):
        """NSE: 0.00297%, BSE: 0.00375%"""
        return (total_turnover * self.exchange_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def calculate_stamp_duty(self, buy_value):
        """0.015% on buy value"""
        return (buy_value * Decimal('0.00015')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def calculate_sebi_fee(self, total_turnover):
        """0.0001% on turnover, truncated to 2 decimal places"""
        # Calculate without rounding and truncate to 2 decimal places
        sebi_fee = (total_turnover * Decimal('0.000001')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        # Convert to string, take first 4 characters (including decimal point), convert back to Decimal
        return Decimal(str(sebi_fee)[:4])

    def calculate_ipft(self, total_turnover):
        """0.0001% only for NSE"""
        if self.exchange == 'NSE':
            return (total_turnover * Decimal('0.000001')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return Decimal('0')

    def calculate_gst(self, taxable_components):
        """18% on (Brokerage + Exchange Charges + SEBI Fee + IPFT)"""
        return (taxable_components * Decimal('0.18')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)