# Migration to assign current user's UUID to existing trades
from django.db import migrations
import uuid


def assign_user_id_to_existing_trades(apps, schema_editor):
    """
    Assign a default UUID to existing trades that don't have user_id
    Since we can't determine the original user, we'll use a placeholder UUID
    Users will need to either:
    1. Delete old trades and recreate them, or
    2. We assign them to the first user who logs in
    """
    TradeJournal = apps.get_model('journal', 'TradeJournal')
    TradeTags = apps.get_model('journal', 'TradeTags')
    
    # Count trades without user_id
    trades_without_user = TradeJournal.objects.filter(user_id__isnull=True).count()
    tags_without_user = TradeTags.objects.filter(user_id__isnull=True).count()
    
    if trades_without_user > 0 or tags_without_user > 0:
        # Generate a placeholder UUID for orphaned data
        placeholder_uuid = uuid.uuid4()
        
        print(f"Found {trades_without_user} trades and {tags_without_user} tags without user_id")
        print(f"Assigning placeholder UUID: {placeholder_uuid}")
        
        # Update trades
        TradeJournal.objects.filter(user_id__isnull=True).update(user_id=placeholder_uuid)
        
        # Update tags
        TradeTags.objects.filter(user_id__isnull=True).update(user_id=placeholder_uuid)
        
        print("Migration completed. Users will need to re-associate their data.")


class Migration(migrations.Migration):

    dependencies = [
        ("journal", "0004_fix_user_id_migration"),
    ]

    operations = [
        migrations.RunPython(assign_user_id_to_existing_trades, migrations.RunPython.noop),
    ]