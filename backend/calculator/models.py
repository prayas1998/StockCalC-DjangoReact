from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal

# Create your models here.
class TransactionRecord(models.Model):
    PLATFORM_CHOICES = [
        ('groww', 'Groww'),
        ('zerodha', 'Zerodha'),
        ('upstox', 'Upstox'),
        ('dhan', 'Dhan'),
        ('5paisa', '5Paisa'),
        ('angel', 'Angel One'),
        ('icici', 'ICICI Direct'),
        ('other', 'Other'),
    ]
    
    EXCHANGE_CHOICES = [
        ('NSE', 'National Stock Exchange'),
        ('BSE', 'Bombay Stock Exchange'),
    ]
    
    TRADE_TYPE_CHOICES = [
        ('equity-delivery', 'Equity Delivery'),
        ('equity-intraday', 'Equity Intraday'),
        ('futures', 'Futures'),
        ('options', 'Options'),
    ]
    
    # User info (null=True to allow anonymous usage)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    
    # Basic transaction details
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    title = models.CharField(max_length=255, blank=True)
    
    # Transaction parameters
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, default='groww')
    exchange = models.CharField(max_length=3, choices=EXCHANGE_CHOICES, default='NSE')
    trade_type = models.CharField(max_length=20, choices=TRADE_TYPE_CHOICES, default='equity-delivery')
    
    # Store the full transaction data
    quantity = models.PositiveIntegerField()
    buy_price = models.DecimalField(max_digits=10, decimal_places=2)
    sell_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Calculated values (to avoid recalculation)
    buy_value = models.DecimalField(max_digits=12, decimal_places=2)
    sell_value = models.DecimalField(max_digits=12, decimal_places=2)
    total_brokerage = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Charges breakdown
    stt = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    exchange_charges = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    stamp_duty = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    sebi_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    ipft = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    gst = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_charges = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Results
    gross_pnl = models.DecimalField(max_digits=12, decimal_places=2)
    net_pnl = models.DecimalField(max_digits=12, decimal_places=2)
    
    def save(self, *args, **kwargs):
        # Calculate values before saving
        self.buy_value = self.quantity * self.buy_price
        self.sell_value = self.quantity * self.sell_price
        self.gross_pnl = self.sell_value - self.buy_value
        self.net_pnl = self.gross_pnl - self.total_charges
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.quantity} shares @ {self.buy_price}->{self.sell_price} ({self.platform}, {self.exchange})"

class TransactionGroup(models.Model):
    """Model to group multiple transactions together (e.g., for a single calculation)"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    platform = models.CharField(max_length=20, choices=TransactionRecord.PLATFORM_CHOICES, default='groww') 
    exchange = models.CharField(max_length=3, choices=TransactionRecord.EXCHANGE_CHOICES, default='NSE')
    trade_type = models.CharField(max_length=20, choices=TransactionRecord.TRADE_TYPE_CHOICES, default='equity-delivery')
    
    # Summary data
    total_quantity = models.PositiveIntegerField(default=0)
    total_buy_value = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_sell_value = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    average_buy_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_charges = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    gross_pnl = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    net_pnl = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    def __str__(self):
        return f"{self.title} - {self.platform} ({self.created_at.strftime('%Y-%m-%d')})"
    
    def update_summary(self):
        """Update summary calculations based on associated transactions"""
        transactions = self.transactions.all()
        if not transactions:
            return
            
        self.total_quantity = sum(t.quantity for t in transactions)
        self.total_buy_value = sum(t.buy_value for t in transactions)
        self.total_sell_value = sum(t.sell_value for t in transactions)
        self.total_charges = sum(t.total_charges for t in transactions)
        
        # Calculate average buy price only for transactions with buy_price > 0
        buy_transactions = [t for t in transactions if t.buy_price > 0]
        if buy_transactions:
            total_buy_quantity = sum(t.quantity for t in buy_transactions)
            total_buy_cost = sum(t.buy_value for t in buy_transactions)
            if total_buy_quantity > 0:
                self.average_buy_price = total_buy_cost / total_buy_quantity
            else:
                self.average_buy_price = Decimal('0.00')
        else:
            self.average_buy_price = Decimal('0.00')
        
        self.gross_pnl = self.total_sell_value - self.total_buy_value
        self.net_pnl = self.gross_pnl - self.total_charges
        self.save()

# Link TransactionRecord to TransactionGroup
TransactionRecord.add_to_class('group', models.ForeignKey(
    TransactionGroup, 
    on_delete=models.CASCADE, 
    related_name='transactions',
    null=True,
    blank=True
))
