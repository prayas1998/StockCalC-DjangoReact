from rest_framework import serializers
from .models import TransactionRecord, TransactionGroup
from django.contrib.auth.models import User
from journal.models import TradeTags, TradeJournal, TradeJournalTags
import re

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class TransactionRecordSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = TransactionRecord
        fields = '__all__'
        read_only_fields = [
            'buy_value', 'sell_value', 'gross_pnl', 'net_pnl',
            'created_at', 'updated_at'
        ]
    
    def create(self, validated_data):
        # Get user from request context if authenticated
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)

class TransactionGroupSerializer(serializers.ModelSerializer):
    transactions = serializers.SerializerMethodField()
    
    class Meta:
        model = TransactionGroup
        fields = ['id', 'title', 'created_at', 'platform', 'exchange', 
                 'trade_type', 'total_quantity', 'total_buy_value', 
                 'total_sell_value', 'average_buy_price', 'total_charges', 
                 'gross_pnl', 'net_pnl', 'transactions']
    
    def get_transactions(self, obj):
        # Only get transactions that belong to this group AND the requesting user
        transactions = obj.transactions.filter(user=self.context['request'].user)
        return TransactionRecordSerializer(transactions, many=True).data

class TransactionGroupCreateSerializer(serializers.Serializer):
    """Serializer for creating a transaction group with multiple transactions at once"""
    title = serializers.CharField(max_length=255)
    platform = serializers.ChoiceField(choices=TransactionRecord.PLATFORM_CHOICES, default='groww')
    exchange = serializers.ChoiceField(choices=TransactionRecord.EXCHANGE_CHOICES, default='NSE')
    trade_type = serializers.ChoiceField(choices=TransactionRecord.TRADE_TYPE_CHOICES, default='equity-delivery')
    transactions = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    
    def create(self, validated_data):
        # Extract transactions data
        transactions_data = validated_data.pop('transactions')
        
        # Get user from request context if authenticated
        request = self.context.get('request')
        user = None
        if request and request.user.is_authenticated:
            user = request.user
            validated_data['user'] = user
        
        # Create the transaction group
        group = TransactionGroup.objects.create(**validated_data)
        
        # Create the individual transactions
        for transaction_data in transactions_data:
            transaction_data['platform'] = validated_data['platform']
            transaction_data['exchange'] = validated_data['exchange'] 
            transaction_data['trade_type'] = validated_data['trade_type']
            transaction_data['group'] = group
            if user:
                transaction_data['user'] = user
            
            # Create the transaction
            TransactionRecord.objects.create(**transaction_data)
        
        # Update the group summary
        group.update_summary()
        return group 

# Trade Journal Serializers
class TradeTagsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeTags
        fields = ['id', 'name', 'color', 'user', 'created_at']
        read_only_fields = ['user', 'created_at']
    
    def validate_color(self, value):
        # Validate hex color format
        if not re.match(r'^#(?:[0-9a-fA-F]{3}){1,2}$', value):
            raise serializers.ValidationError("Color must be a valid hex color code (e.g., #3B82F6)")
        return value
    
    def validate(self, data):
        # Ensure user can only create/edit their own tags
        request = self.context.get('request')
        if self.instance and request and request.user != self.instance.user:
            raise serializers.ValidationError("You can only edit your own tags")
        return data
    
    def create(self, validated_data):
        # Set the user from the request
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)

class TradeJournalSerializer(serializers.ModelSerializer):
    tags = TradeTagsSerializer(many=True, read_only=True)
    pnl = serializers.SerializerMethodField()
    unrealized_pnl = serializers.SerializerMethodField()
    risk_reward_ratio = serializers.SerializerMethodField()
    is_profitable = serializers.SerializerMethodField()
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = TradeJournal
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_pnl(self, obj):
        return obj.calculate_pnl()
    
    def get_unrealized_pnl(self, obj):
        # For simplicity, we'll return None here
        # In a real implementation, you would pass the current price
        return None
    
    def get_risk_reward_ratio(self, obj):
        return obj.risk_reward_ratio
    
    def get_is_profitable(self, obj):
        return obj.is_profitable
    
    def validate_sell_price(self, value):
        # Validate sell_price is required if status is not OPEN
        status = self.initial_data.get('status')
        if status and status != 'OPEN' and value is None:
            raise serializers.ValidationError("Sell price is required when status is not OPEN")
        return value
    
    def validate_exit_date(self, value):
        # Validate exit_date is required if status is not OPEN
        status = self.initial_data.get('status')
        if status and status != 'OPEN' and value is None:
            raise serializers.ValidationError("Exit date is required when status is not OPEN")
        return value
    
    def validate_stop_loss(self, value):
        # Validate stop_loss is less than buy_price for long positions
        buy_price = self.initial_data.get('buy_price')
        if value is not None and buy_price is not None:
            if float(value) >= float(buy_price):
                raise serializers.ValidationError("Stop loss must be less than buy price for long positions")
        return value
    
    def validate_target_price(self, value):
        # Validate target_price is greater than buy_price for long positions
        buy_price = self.initial_data.get('buy_price')
        if value is not None and buy_price is not None:
            if float(value) <= float(buy_price):
                raise serializers.ValidationError("Target price must be greater than buy price for long positions")
        return value
    
    def create(self, validated_data):
        # Set the user from the request
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)

class TradeJournalListSerializer(serializers.ModelSerializer):
    tags = serializers.SerializerMethodField()
    pnl = serializers.SerializerMethodField()
    risk_reward_ratio = serializers.SerializerMethodField()
    is_profitable = serializers.SerializerMethodField()
    
    class Meta:
        model = TradeJournal
        exclude = ['personal_notes']
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_tags(self, obj):
        return [tag.name for tag in obj.tags.all()]
    
    def get_pnl(self, obj):
        return obj.calculate_pnl()
    
    def get_risk_reward_ratio(self, obj):
        return obj.risk_reward_ratio
    
    def get_is_profitable(self, obj):
        return obj.is_profitable

class TradeJournalCreateSerializer(serializers.ModelSerializer):
    tags = serializers.PrimaryKeyRelatedField(queryset=TradeTags.objects.all(), many=True, required=False)
    
    class Meta:
        model = TradeJournal
        exclude = ['user', 'created_at', 'updated_at']
    
    def validate_tags(self, tags):
        # Ensure user can only use their own tags
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            for tag in tags:
                if tag.user != request.user:
                    raise serializers.ValidationError(f"Tag '{tag.name}' does not belong to you")
        return tags
    
    def create(self, validated_data):
        # Extract tags data
        tags = validated_data.pop('tags', [])
        
        # Set the user from the request
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        
        # Create the trade journal entry
        trade_journal = TradeJournal.objects.create(**validated_data)
        
        # Associate tags
        for tag in tags:
            TradeJournalTags.objects.create(trade=trade_journal, tag=tag)
        
        return trade_journal