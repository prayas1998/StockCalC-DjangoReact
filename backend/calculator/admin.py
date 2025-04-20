from django.contrib import admin
from .models import TransactionRecord, TransactionGroup

# Register your models here.
@admin.register(TransactionRecord)
class TransactionRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'platform', 'exchange', 'trade_type', 'quantity', 'buy_price', 'sell_price', 'net_pnl', 'created_at')
    list_filter = ('platform', 'exchange', 'trade_type', 'created_at')
    search_fields = ('title', 'user__username')
    readonly_fields = ('buy_value', 'sell_value', 'gross_pnl', 'net_pnl')
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'title')
        }),
        ('Transaction Details', {
            'fields': ('platform', 'exchange', 'trade_type', 'quantity', 'buy_price', 'sell_price')
        }),
        ('Calculated Values', {
            'fields': ('buy_value', 'sell_value', 'gross_pnl', 'net_pnl')
        }),
        ('Charges', {
            'fields': ('total_brokerage', 'stt', 'exchange_charges', 'stamp_duty', 'sebi_fee', 'ipft', 'gst', 'total_charges')
        }),
        ('Group', {
            'fields': ('group',)
        }),
    )

@admin.register(TransactionGroup)
class TransactionGroupAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'user', 'platform', 'exchange', 'trade_type', 'total_quantity', 'net_pnl', 'created_at')
    list_filter = ('platform', 'exchange', 'trade_type', 'created_at')
    search_fields = ('title', 'user__username')
    readonly_fields = ('total_quantity', 'total_buy_value', 'total_sell_value', 'average_buy_price', 'total_charges', 'gross_pnl', 'net_pnl')
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'title')
        }),
        ('Transaction Details', {
            'fields': ('platform', 'exchange', 'trade_type')
        }),
        ('Summary', {
            'fields': ('total_quantity', 'total_buy_value', 'total_sell_value', 'average_buy_price', 'total_charges', 'gross_pnl', 'net_pnl')
        }),
    )
