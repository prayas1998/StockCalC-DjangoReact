# Generated migration to fix user_id column issues
from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("journal", "0003_tradejournal_broker_tradejournal_exchange"),
    ]

    operations = [
        # Step 1: Drop the existing user_id columns if they exist
        migrations.RunSQL(
            "ALTER TABLE journal_tradejournal DROP COLUMN IF EXISTS user_id;",
            reverse_sql="-- No reverse operation"
        ),
        migrations.RunSQL(
            "ALTER TABLE journal_tradetags DROP COLUMN IF EXISTS user_id;",
            reverse_sql="-- No reverse operation"
        ),
        
        # Step 2: Drop the old user foreign key fields if they still exist
        migrations.RunSQL(
            "ALTER TABLE journal_tradejournal DROP COLUMN IF EXISTS user_id;",
            reverse_sql="-- No reverse operation"
        ),
        migrations.RunSQL(
            "ALTER TABLE journal_tradetags DROP COLUMN IF EXISTS user_id;",
            reverse_sql="-- No reverse operation"
        ),
        
        # Step 3: Add the new UUID user_id fields
        migrations.AddField(
            model_name='tradejournal',
            name='user_id',
            field=models.UUIDField(help_text="Supabase user UUID", null=True, blank=True),
        ),
        migrations.AddField(
            model_name='tradetags',
            name='user_id',
            field=models.UUIDField(help_text="Supabase user UUID", null=True, blank=True),
        ),
    ]