from django.contrib import admin
from .models import TradeJournal, TradeTags, TradeJournalTags

# Register your models here.
admin.site.register(TradeJournal)
admin.site.register(TradeTags)
admin.site.register(TradeJournalTags)
