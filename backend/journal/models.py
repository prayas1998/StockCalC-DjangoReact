from django.db import models
import uuid

class TradeTags(models.Model):
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default="#3B82F6")
    user_id = models.UUIDField(help_text="Supabase user UUID", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.color})"

class TradeJournal(models.Model):
    TRADE_TYPE_CHOICES = [
        ("EQUITY_DELIVERY", "Equity Delivery"),
        ("EQUITY_INTRADAY", "Equity Intraday"),
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
    ]

    EXCHANGE_CHOICES = [
        ("NSE", "NSE"),
        ("BSE", "BSE"),
    ]

    user_id = models.UUIDField(help_text="Supabase user UUID", null=True, blank=True)
    company_name = models.CharField(max_length=255)
    trade_type = models.CharField(max_length=20, choices=TRADE_TYPE_CHOICES)
    quantity = models.PositiveIntegerField()
    buy_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
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

    def get_exit_price(self):
        """
        Determine the exit price based on trade status and direction:
        - CLOSED_TARGET: Use target_price
        - CLOSED_STOPLOSS: Use stop_loss
        - CLOSED_MANUAL: Use sell_price for LONG trades, buy_price for SHORT trades
        - CANCELLED/OPEN: Return None
        """
        if self.status == 'CLOSED_TARGET':
            return self.target_price
        elif self.status == 'CLOSED_STOPLOSS':
            return self.stop_loss
        elif self.status == 'CLOSED_MANUAL':
            # For CLOSED_MANUAL, the exit price depends on trade direction:
            # - LONG trades: Exit price is stored in sell_price (sell to close)
            # - SHORT trades: Exit price is stored in buy_price (buy to close)
            if self.direction == 'SHORT':
                return self.buy_price
            else:
                return self.sell_price
        else:
            return None

    def get_missing_fields_for_pnl(self):
        """
        Get list of missing fields required for P&L calculation based on trade status
        """
        missing_fields = []
        
        if self.status == 'CLOSED_TARGET':
            if not self.target_price:
                missing_fields.append('target_price')
        elif self.status == 'CLOSED_STOPLOSS':
            if not self.stop_loss:
                missing_fields.append('stop_loss')
        elif self.status == 'CLOSED_MANUAL':
            # For CLOSED_MANUAL, check the appropriate field based on direction
            if self.direction == 'SHORT':
                if not self.buy_price:
                    missing_fields.append('buy_price')
            else:
                if not self.sell_price:
                    missing_fields.append('sell_price')
        
        # Check exit date for all closed trades
        if self.status in ['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL']:
            if not self.exit_date:
                missing_fields.append('exit_date')
        
        return missing_fields

    def calculate_pnl(self):
        """Calculate Net P&L using backend calculator API"""
        # Only calculate P&L for closed trades (not CANCELLED or OPEN)
        if self.status not in ['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL']:
            return None
        
        # Determine exit price based on trade status
        exit_price = self.get_exit_price()
        if exit_price is None:
            return None
        
        try:
            # Import calculator classes directly (same logic as the view)
            from calculator.calculations.equity_delivery import EquityDeliveryCalculator
            from calculator.calculations.equity_intraday import EquityIntradayCalculator
            
            # Map journal trade type to calculator trade type
            trade_type_mapping = {
                'EQUITY_DELIVERY': 'equity-delivery',
                'EQUITY_INTRADAY': 'equity-intraday',
            }
            
            calculator_trade_type = trade_type_mapping.get(self.trade_type)
            if not calculator_trade_type:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Unsupported trade type '{self.trade_type}' for P&L calculation")
                return None
            
            # Prepare transaction data for calculator following the EXACT same logic as the main calculator
            # The calculator expects for SHORT positions:
            # - buyPrice: Entry price (what user enters as "Entry Price (Sell)")
            # - sellPrice: Exit price (what user enters as "Exit Price (Buy)")
            if self.direction == "SHORT":
                # For short trades: Entry price is stored in sell_price, Exit price is stored in buy_price
                entry_price = self.sell_price  # Entry price for short trades
                transaction_data = [{
                    'quantity': str(self.quantity),
                    'buyPrice': str(entry_price),   # Entry price (sell action) - same as main calculator
                    'sellPrice': str(exit_price)    # Exit price (buy action) - same as main calculator
                }]
            else:
                # Long trades: Entry = buy_price, Exit = exit_price
                entry_price = self.buy_price  # Entry price for long trades
                transaction_data = [{
                    'quantity': str(self.quantity),
                    'buyPrice': str(entry_price),   # Entry price (buy to open)
                    'sellPrice': str(exit_price)    # Exit price (sell to close)
                }]
            
            # Get the appropriate calculator (same logic as calculate_charges view)
            platform = self.broker.lower()
            exchange = self.exchange.upper()
            position_type = 'short' if self.direction == 'SHORT' else 'long'
            
            if calculator_trade_type == 'equity-delivery':
                calculator = EquityDeliveryCalculator(platform, exchange, calculator_trade_type)
            elif calculator_trade_type == 'equity-intraday':
                calculator = EquityIntradayCalculator(platform, exchange, calculator_trade_type)
            else:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Unsupported trade type: {calculator_trade_type}")
                return None
            
            # Calculate charges using the same logic as the view
            result = calculator.calculate_transaction_charges(transaction_data, position_type)
            
            # Check for errors (intraday calculator returns error dict for unsupported brokers)
            if isinstance(result, dict) and 'error' in result:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Calculator returned error for trade {self.id}: {result.get('error')}")
                return None
            
            # Extract net P&L from result
            if 'summary' in result and 'netPnL' in result['summary']:
                return float(result['summary']['netPnL'])
            
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Calculator result missing netPnL for trade {self.id}")
            return None
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"P&L calculation failed for trade {self.id}: {str(e)}")
            return None
    
    def get_detailed_calculation(self):
        """Get detailed calculation results including charges breakdown"""
        # Only calculate for closed trades (not CANCELLED or OPEN)
        if self.status not in ['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL']:
            return None
        
        # Determine exit price based on trade status
        exit_price = self.get_exit_price()
        if exit_price is None:
            return None
        
        try:
            # Import calculator classes directly (same logic as the view)
            from calculator.calculations.equity_delivery import EquityDeliveryCalculator
            from calculator.calculations.equity_intraday import EquityIntradayCalculator
            
            # Map journal trade type to calculator trade type
            trade_type_mapping = {
                'EQUITY_DELIVERY': 'equity-delivery',
                'EQUITY_INTRADAY': 'equity-intraday',
            }
            
            calculator_trade_type = trade_type_mapping.get(self.trade_type)
            if not calculator_trade_type:
                return None
            
            # Prepare transaction data for calculator following the EXACT same logic as the main calculator
            # The calculator expects for SHORT positions:
            # - buyPrice: Entry price (what user enters as "Entry Price (Sell)")
            # - sellPrice: Exit price (what user enters as "Exit Price (Buy)")
            if self.direction == "SHORT":
                # For short trades: Entry price is stored in sell_price, Exit price is stored in buy_price
                entry_price = self.sell_price  # Entry price for short trades
                transaction_data = [{
                    'quantity': str(self.quantity),
                    'buyPrice': str(entry_price),   # Entry price (sell action) - same as main calculator
                    'sellPrice': str(exit_price)    # Exit price (buy action) - same as main calculator
                }]
            else:
                # Long trades: Entry = buy_price, Exit = exit_price
                entry_price = self.buy_price  # Entry price for long trades
                transaction_data = [{
                    'quantity': str(self.quantity),
                    'buyPrice': str(entry_price),   # Entry price (buy to open)
                    'sellPrice': str(exit_price)    # Exit price (sell to close)
                }]
            
            # Get the appropriate calculator (same logic as calculate_charges view)
            platform = self.broker.lower()
            exchange = self.exchange.upper()
            position_type = 'short' if self.direction == 'SHORT' else 'long'
            
            if calculator_trade_type == 'equity-delivery':
                calculator = EquityDeliveryCalculator(platform, exchange, calculator_trade_type)
            elif calculator_trade_type == 'equity-intraday':
                calculator = EquityIntradayCalculator(platform, exchange, calculator_trade_type)
            else:
                return None
            
            # Calculate charges using the same logic as the view
            result = calculator.calculate_transaction_charges(transaction_data, position_type)
            
            # Check for errors (intraday calculator returns error dict for unsupported brokers)
            if isinstance(result, dict) and 'error' in result:
                return None
            
            # Return the full calculation result
            return result
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Detailed calculation failed for trade {self.id}: {str(e)}")
            return None
    
    def is_precise_calculation_available(self):
        """Check if precise calculation is available for this trade"""
        # Since we only support EQUITY_DELIVERY and EQUITY_INTRADAY with Dhan and Groww
        supported_trade_types = ['EQUITY_DELIVERY', 'EQUITY_INTRADAY']
        supported_brokers = ['Dhan', 'Groww']
        
        # For EQUITY_INTRADAY, only Dhan is supported
        if self.trade_type == 'EQUITY_INTRADAY':
            return self.broker == 'Dhan'
        
        # For EQUITY_DELIVERY, both Dhan and Groww are supported
        return self.trade_type in supported_trade_types and self.broker in supported_brokers
    

    def calculate_unrealized_pnl(self, current_price):
        if self.status == "OPEN":
            if hasattr(self, 'direction') and self.direction == "SHORT":
                # For short trades, entry price is stored in sell_price
                entry_price = float(self.sell_price)
                return float(self.quantity) * (entry_price - float(current_price))
            else:
                # For long trades, entry price is stored in buy_price
                entry_price = float(self.buy_price)
                return float(self.quantity) * (float(current_price) - entry_price)
        return None

    @property
    def risk_reward_ratio(self):
        if self.stop_loss and self.target_price:
            # Get entry price based on trade direction
            if self.direction == "SHORT":
                # For short trades, entry price is stored in sell_price
                if not self.sell_price:
                    return None
                entry_price = float(self.sell_price)
            else:
                # For long trades, entry price is stored in buy_price
                if not self.buy_price:
                    return None
                entry_price = float(self.buy_price)
            
            risk = abs(entry_price - float(self.stop_loss))
            reward = abs(float(self.target_price) - entry_price)
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
