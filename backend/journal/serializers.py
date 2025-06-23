from rest_framework import serializers
from django.contrib.auth.models import User
from .models import TradeTags, TradeJournal, TradeJournalTags
import re

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class TradeTagsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeTags
        fields = ['id', 'name', 'color', 'user', 'created_at']
        read_only_fields = ['user', 'created_at']
    
    def validate_color(self, value):
        if not re.match(r'^#(?:[0-9a-fA-F]{3}){1,2}$', value):
            raise serializers.ValidationError("Color must be a valid hex color code (e.g., #3B82F6)")
        return value
    
    def validate(self, data):
        request = self.context.get('request')
        if self.instance and request and request.user != self.instance.user:
            raise serializers.ValidationError("You can only edit your own tags")
        return data
    
    def create(self, validated_data):
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
        return None
    
    def get_risk_reward_ratio(self, obj):
        return obj.risk_reward_ratio
    
    def get_is_profitable(self, obj):
        return obj.is_profitable
    
    def validate_sell_price(self, value):
        status = self.initial_data.get('status')
        if status and status != 'OPEN' and (value is None or value == 0):
            raise serializers.ValidationError("Sell price is required when status is not OPEN")
        return value
    
    def validate_exit_date(self, value):
        status = self.initial_data.get('status')
        if status and status != 'OPEN' and value is None:
            raise serializers.ValidationError("Exit date is required when status is not OPEN")
        return value
    
    def validate_buy_price(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Buy price must be greater than 0")
        return value
    
    def validate_stop_loss(self, value):
        buy_price = self.initial_data.get('buy_price')
        direction = self.initial_data.get('direction', 'LONG')
        if value is not None and buy_price is not None:
            if direction == 'LONG' and float(value) >= float(buy_price):
                raise serializers.ValidationError("Stop loss must be less than buy price for long positions")
            if direction == 'SHORT' and float(value) <= float(buy_price):
                raise serializers.ValidationError("Stop loss must be greater than buy price for short positions")
        return value
    
    def validate_target_price(self, value):
        buy_price = self.initial_data.get('buy_price')
        direction = self.initial_data.get('direction', 'LONG')
        if value is not None and buy_price is not None:
            if direction == 'LONG' and float(value) <= float(buy_price):
                raise serializers.ValidationError("Target price must be greater than buy price for long positions")
            if direction == 'SHORT' and float(value) >= float(buy_price):
                raise serializers.ValidationError("Target price must be less than buy price for short positions")
        return value
    
    def validate_broker(self, value):
        valid_brokers = ['Dhan', 'Groww', 'Rise', 'Others']
        if value not in valid_brokers:
            raise serializers.ValidationError(f"Broker must be one of: {', '.join(valid_brokers)}")
        return value
    
    def validate_exchange(self, value):
        valid_exchanges = ['NSE', 'BSE']
        if value not in valid_exchanges:
            raise serializers.ValidationError(f"Exchange must be one of: {', '.join(valid_exchanges)}")
        return value
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        return super().create(validated_data)

class TradeJournalListSerializer(serializers.ModelSerializer):
    tags = TradeTagsSerializer(many=True, read_only=True)
    pnl = serializers.SerializerMethodField()
    risk_reward_ratio = serializers.SerializerMethodField()
    is_profitable = serializers.SerializerMethodField()
    
    class Meta:
        model = TradeJournal
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at']
    
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
    
    def validate_broker(self, value):
        valid_brokers = ['Dhan', 'Groww', 'Rise', 'Others']
        if value not in valid_brokers:
            raise serializers.ValidationError(f"Broker must be one of: {', '.join(valid_brokers)}")
        return value
    
    def validate_exchange(self, value):
        valid_exchanges = ['NSE', 'BSE']
        if value not in valid_exchanges:
            raise serializers.ValidationError(f"Exchange must be one of: {', '.join(valid_exchanges)}")
        return value
    
    def validate_buy_price(self, value):
        print(f"DEBUG: TradeJournalCreateSerializer validating buy_price: {value}")
        if value is None or value <= 0:
            print(f"DEBUG: Buy price validation failed: {value}")
            raise serializers.ValidationError("Buy price must be greater than 0")
        return value
    
    def validate_sell_price(self, value):
        status = self.initial_data.get('status')
        print(f"DEBUG: TradeJournalCreateSerializer validating sell_price: {value}, status: {status}")
        if status and status != 'OPEN' and (value is None or value == 0):
            print(f"DEBUG: Sell price validation failed: {value}")
            raise serializers.ValidationError("Sell price is required when status is not OPEN")
        return value
    
    def validate_exit_date(self, value):
        status = self.initial_data.get('status')
        if status and status != 'OPEN' and value is None:
            raise serializers.ValidationError("Exit date is required when status is not OPEN")
        return value
    
    def validate_stop_loss(self, value):
        buy_price = self.initial_data.get('buy_price')
        direction = self.initial_data.get('direction', 'LONG')
        if value is not None and buy_price is not None:
            if direction == 'LONG' and float(value) >= float(buy_price):
                raise serializers.ValidationError("Stop loss must be less than buy price for long positions")
            if direction == 'SHORT' and float(value) <= float(buy_price):
                raise serializers.ValidationError("Stop loss must be greater than buy price for short positions")
        return value
    
    def validate_target_price(self, value):
        buy_price = self.initial_data.get('buy_price')
        direction = self.initial_data.get('direction', 'LONG')
        if value is not None and buy_price is not None:
            if direction == 'LONG' and float(value) <= float(buy_price):
                raise serializers.ValidationError("Target price must be greater than buy price for long positions")
            if direction == 'SHORT' and float(value) >= float(buy_price):
                raise serializers.ValidationError("Target price must be less than buy price for short positions")
        return value
    
    def validate_tags(self, tags):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            for tag in tags:
                if tag.user != request.user:
                    raise serializers.ValidationError(f"Tag '{tag.name}' does not belong to you")
        return tags
    
    def create(self, validated_data):
        # Debug: Print validated data
        print("DEBUG: TradeJournalCreateSerializer validated_data:")
        print(f"Validated data: {validated_data}")
        
        tags = validated_data.pop('tags', [])
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        trade_journal = TradeJournal.objects.create(**validated_data)
        for tag in tags:
            TradeJournalTags.objects.create(trade=trade_journal, tag=tag)
        return trade_journal
    
    def update(self, instance, validated_data):
        tags = validated_data.pop('tags', None)
        
        # Update the trade journal instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Handle tags update if tags are provided
        if tags is not None:
            # Clear existing tag relationships
            TradeJournalTags.objects.filter(trade=instance).delete()
            
            # Create new tag relationships
            for tag in tags:
                TradeJournalTags.objects.create(trade=instance, tag=tag)
        
        return instance