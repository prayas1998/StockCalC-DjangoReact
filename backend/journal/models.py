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

    def calculate_pnl(self):
        if self.status.startswith("CLOSED") and self.sell_price is not None:
            return float(self.quantity) * (float(self.sell_price) - float(self.buy_price))
        return None

    def calculate_unrealized_pnl(self, current_price):
        if self.status == "OPEN":
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
