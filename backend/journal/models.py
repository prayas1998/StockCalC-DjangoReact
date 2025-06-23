from django.db import models
from django.contrib.auth.models import User

class TradeTags(models.Model):
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default="#3B82F6")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.color})"

class TradeJournal(models.Model):
    TRADE_TYPE_CHOICES = [
        ("EQUITY_DELIVERY", "Equity Delivery"),
        ("EQUITY_INTRADAY", "Equity Intraday"),
        ("ETF", "ETF"),
        ("FUTURES", "Futures"),
        ("OPTIONS", "Options"),
    ]

    STATUS_CHOICES = [
        ("OPEN", "Open"),
        ("CLOSED_TARGET", "Closed - Target"),
        ("CLOSED_STOPLOSS", "Closed - Stoploss"),
        ("CLOSED_MANUAL", "Closed - Manual"),
        ("CANCELLED", "Cancelled"),
    ]

    BROKER_CHOICES = [
        ("Dhan", "Dhan"),
        ("Groww", "Groww"),
        ("Rise", "Rise"),
        ("Others", "Others"),
    ]

    EXCHANGE_CHOICES = [
        ("NSE", "NSE"),
        ("BSE", "BSE"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    company_name = models.CharField(max_length=255)
    trade_type = models.CharField(max_length=20, choices=TRADE_TYPE_CHOICES)
    quantity = models.PositiveIntegerField()
    buy_price = models.DecimalField(max_digits=10, decimal_places=2)
    sell_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stop_loss = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    target_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    entry_date = models.DateField()
    exit_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    personal_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    tags = models.ManyToManyField(TradeTags, through='TradeJournalTags', related_name='journals')
    direction_choices = [
        ("LONG", "Long"),
        ("SHORT", "Short"),
    ]
    direction = models.CharField(max_length=10, choices=direction_choices, default="LONG")
    broker = models.CharField(max_length=20, choices=BROKER_CHOICES, default="Dhan")
    exchange = models.CharField(max_length=10, choices=EXCHANGE_CHOICES, default="NSE")

    def calculate_pnl(self):
        """Calculate Net P&L using broker-specific charges"""
        if not (self.status in ['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL'] and self.sell_price is not None):
            return None
        
        try:
            # Import here to avoid circular imports
            from ..calculator.calculations.equity_delivery import EquityDeliveryCalculator
            from ..calculator.calculations.equity_intraday import EquityIntradayCalculator
            
            # Map trade type to calculator format
            trade_type_map = {
                'EQUITY_DELIVERY': 'equity-delivery',
                'EQUITY_INTRADAY': 'equity-intraday'
            }
            
            calculator_trade_type = trade_type_map.get(self.trade_type)
            if not calculator_trade_type:
                # Fallback to old calculation for unsupported trade types
                return self._calculate_pnl_fallback()
            
            # Prepare transaction data for calculator
            transaction_data = [{
                'quantity': str(self.quantity),
                'buyPrice': str(self.buy_price),
                'sellPrice': str(self.sell_price)
            }]
            
            # Select appropriate calculator
            if calculator_trade_type == 'equity-delivery':
                calculator = EquityDeliveryCalculator(
                    platform=self.broker.lower(),
                    exchange=self.exchange,
                    trade_type=calculator_trade_type
                )
            elif calculator_trade_type == 'equity-intraday':
                calculator = EquityIntradayCalculator(
                    platform=self.broker.lower(),
                    exchange=self.exchange,
                    trade_type=calculator_trade_type
                )
            else:
                return self._calculate_pnl_fallback()
            
            # Calculate charges using the sophisticated calculator
            position_type = 'short' if self.direction == 'SHORT' else 'long'
            result = calculator.calculate_transaction_charges(transaction_data, position_type)
            
            # Check for errors (e.g., unsupported broker for intraday)
            if isinstance(result, dict) and 'error' in result:
                return self._calculate_pnl_fallback()
            
            # Extract net P&L from result
            net_pnl = float(result['summary']['netPnL'])
            return net_pnl
            
        except Exception as e:
            # Fallback to old calculation if anything goes wrong
            return self._calculate_pnl_fallback()
    
    def _calculate_pnl_fallback(self):
        """Fallback P&L calculation with approximate charges"""
        if not (self.status in ['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL'] and self.sell_price is not None):
            return None
            
        # Calculate gross P&L based on direction
        if hasattr(self, 'direction') and self.direction == "SHORT":
            gross_pnl = float(self.quantity) * (float(self.buy_price) - float(self.sell_price))
        else:
            gross_pnl = float(self.quantity) * (float(self.sell_price) - float(self.buy_price))
        
        # Calculate approximate charges for net P&L
        buy_value = float(self.quantity) * float(self.buy_price)
        sell_value = float(self.quantity) * float(self.sell_price)
        
        # Approximate brokerage
        if self.trade_type == 'EQUITY_DELIVERY':
            brokerage_rate = 0.0003
            max_brokerage_per_order = 20
        else:
            brokerage_rate = 0.0005
            max_brokerage_per_order = 20
            
        buy_brokerage = min(buy_value * brokerage_rate, max_brokerage_per_order)
        sell_brokerage = min(sell_value * brokerage_rate, max_brokerage_per_order)
        total_brokerage = buy_brokerage + sell_brokerage
        
        # STT (Securities Transaction Tax)
        if self.trade_type == 'EQUITY_DELIVERY':
            stt = sell_value * 0.001  # 0.1% on sell side for delivery
        else:
            stt = sell_value * 0.00025  # 0.025% on sell side for intraday
        
        # Exchange charges
        turnover = buy_value + sell_value
        exchange_charges = turnover * 0.0000345
        
        # SEBI charges
        sebi_charges = turnover * 0.000001
        
        # Stamp duty
        stamp_duty = min(buy_value * 0.00003, 300)
        
        # GST on brokerage and other charges (18%)
        gst_applicable_amount = total_brokerage + exchange_charges + sebi_charges
        gst = gst_applicable_amount * 0.18
        
        # Total charges
        total_charges = total_brokerage + stt + exchange_charges + sebi_charges + stamp_duty + gst
        
        # Net P&L = Gross P&L - Total Charges
        net_pnl = gross_pnl - total_charges
        
        return net_pnl

    def calculate_unrealized_pnl(self, current_price):
        if self.status == "OPEN":
            if hasattr(self, 'direction') and self.direction == "SHORT":
                return float(self.quantity) * (float(self.buy_price) - float(current_price))
            return float(self.quantity) * (float(current_price) - float(self.buy_price))
        return None

    @property
    def risk_reward_ratio(self):
        if self.stop_loss and self.target_price and self.buy_price:
            risk = abs(float(self.buy_price) - float(self.stop_loss))
            reward = abs(float(self.target_price) - float(self.buy_price))
            if risk > 0:
                return round(reward / risk, 2)
        return None

    @property
    def is_profitable(self):
        pnl = self.calculate_pnl()
        return pnl is not None and pnl > 0

    def __str__(self):
        return f"{self.company_name} - {self.trade_type} ({self.entry_date})"

class TradeJournalTags(models.Model):
    trade = models.ForeignKey(TradeJournal, on_delete=models.CASCADE)
    tag = models.ForeignKey(TradeTags, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.trade} <-> {self.tag}"
