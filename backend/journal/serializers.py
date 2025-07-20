from rest_framework import serializers
# Removed User import - using Supabase UUIDs directly
from .models import TradeTags, TradeJournal, TradeJournalTags
import re

# Removed UserSerializer - using Supabase UUIDs directly

class TradeTagsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeTags
        fields = ['id', 'name', 'color', 'user_id', 'created_at']
        read_only_fields = ['user_id', 'created_at']
    
    def validate_color(self, value):
        if not re.match(r'^#(?:[0-9a-fA-F]{3}){1,2}$', value):
            raise serializers.ValidationError("Color must be a valid hex color code (e.g., #3B82F6)")
        return value
    
    def validate(self, data):
        request = self.context.get('request')
        if self.instance and request and request.user.id != str(self.instance.user_id):
            raise serializers.ValidationError("You can only edit your own tags")
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user_id'] = request.user.id
        return super().create(validated_data)

class TradeJournalSerializer(serializers.ModelSerializer):
    tags = TradeTagsSerializer(many=True, read_only=True)
    pnl = serializers.SerializerMethodField()
    unrealized_pnl = serializers.SerializerMethodField()
    risk_reward_ratio = serializers.SerializerMethodField()
    is_profitable = serializers.SerializerMethodField()
    is_precise_calculation = serializers.SerializerMethodField()
    missing_fields_for_pnl = serializers.SerializerMethodField()
    # Removed user serializer - using Supabase UUIDs directly
    
    class Meta:
        model = TradeJournal
        fields = '__all__'
        read_only_fields = ['user_id', 'created_at', 'updated_at']
    
    def get_pnl(self, obj):
        return obj.calculate_pnl()
    
    def get_unrealized_pnl(self, obj):
        return None
    
    def get_risk_reward_ratio(self, obj):
        return obj.risk_reward_ratio
    
    def get_is_profitable(self, obj):
        return obj.is_profitable
    
    def get_is_precise_calculation(self, obj):
        return obj.is_precise_calculation_available()
    
    def get_missing_fields_for_pnl(self, obj):
        return obj.get_missing_fields_for_pnl()
    
    def validate_sell_price(self, value):
        # Get status and direction from the request data
        status = self.initial_data.get('status')
        direction = self.initial_data.get('direction')
        
        # For LONG trades with CLOSED_MANUAL status, sell_price is required (exit price)
        # For SHORT trades, sell_price is always required (entry price)
        if direction == 'LONG':
            if status == 'CLOSED_MANUAL':
                if value is None or value <= 0:
                    raise serializers.ValidationError("Exit price is required and must be greater than 0 for manually closed long trades")
            elif value is not None and value <= 0:
                raise serializers.ValidationError("Sell price must be greater than 0 if provided")
        else:
            # For SHORT trades, sell_price is always required (entry price)
            if value is None or value <= 0:
                raise serializers.ValidationError("Entry price is required and must be greater than 0 for short trades")
        
        return value
    
    def validate_exit_date(self, value):
        # Only validate exit_date if it's required for the current status
        status = self.initial_data.get('status')
        
        # If status is any closed status, exit_date is required
        if status in ['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL']:
            if value is None:
                raise serializers.ValidationError("Exit date is required for closed trades")
        
        return value
    
    def validate_buy_price(self, value):
        # Get status and direction from the request data
        status = self.initial_data.get('status')
        direction = self.initial_data.get('direction')
        
        # For SHORT trades, buy_price can be null for OPEN status (no exit price yet)
        # For SHORT trades with CLOSED_MANUAL status, buy_price is required (exit price)
        if direction == 'SHORT':
            if status == 'CLOSED_MANUAL':
                if value is None or value <= 0:
                    raise serializers.ValidationError("Exit price is required and must be greater than 0 for manually closed short trades")
            elif status in ['OPEN', 'CANCELLED']:
                # For OPEN/CANCELLED SHORT trades, buy_price can be null
                if value is not None and value <= 0:
                    raise serializers.ValidationError("Buy price must be greater than 0 if provided")
            else:
                # For CLOSED_TARGET/CLOSED_STOPLOSS SHORT trades, buy_price can be null (exit price comes from target/stop)
                if value is not None and value <= 0:
                    raise serializers.ValidationError("Buy price must be greater than 0 if provided")
        else:
            # For LONG trades, buy_price is always required (entry price)
            if value is None or value <= 0:
                raise serializers.ValidationError("Buy price is required and must be greater than 0 for long trades")
        
        return value
    
    def validate_stop_loss(self, value):
        # Only validate stop_loss if it's required for the current status
        status = self.initial_data.get('status')
        
        # If status is CLOSED_STOPLOSS, stop_loss is required and must be valid
        if status == 'CLOSED_STOPLOSS':
            if value is None or value <= 0:
                raise serializers.ValidationError("Stop loss is required and must be greater than 0 for trades closed at stop loss")
            
            buy_price = self.initial_data.get('buy_price')
            direction = self.initial_data.get('direction', 'LONG')
            if buy_price is not None:
                if direction == 'LONG' and float(value) >= float(buy_price):
                    raise serializers.ValidationError("Stop loss must be less than buy price for long positions")
                if direction == 'SHORT' and float(value) <= float(buy_price):
                    raise serializers.ValidationError("Stop loss must be greater than buy price for short positions")
        
        # For other statuses, only validate if value is provided and > 0
        elif value is not None and value <= 0:
            raise serializers.ValidationError("Stop loss must be greater than 0")
        
        return value
    
    def validate_target_price(self, value):
        # Only validate target_price if it's required for the current status
        status = self.initial_data.get('status')
        
        # If status is CLOSED_TARGET, target_price is required and must be valid
        if status == 'CLOSED_TARGET':
            if value is None or value <= 0:
                raise serializers.ValidationError("Target price is required and must be greater than 0 for trades closed at target")
            
            buy_price = self.initial_data.get('buy_price')
            direction = self.initial_data.get('direction', 'LONG')
            if buy_price is not None:
                if direction == 'LONG' and float(value) <= float(buy_price):
                    raise serializers.ValidationError("Target price must be greater than buy price for long positions")
                if direction == 'SHORT' and float(value) > float(buy_price):
                    raise serializers.ValidationError("Target price must be less than or equal to buy price for short positions")
        
        # For other statuses, only validate if value is provided and > 0
        elif value is not None and value <= 0:
            raise serializers.ValidationError("Target price must be greater than 0")
        
        return value
    
    def validate_broker(self, value):
        valid_brokers = ['Dhan', 'Groww']
        if value not in valid_brokers:
            raise serializers.ValidationError(f"Broker must be one of: {', '.join(valid_brokers)}")
        return value
    
    def validate_exchange(self, value):
        valid_exchanges = ['NSE', 'BSE']
        if value not in valid_exchanges:
            raise serializers.ValidationError(f"Exchange must be one of: {', '.join(valid_exchanges)}")
        return value
    
    def validate(self, data):
        """
        Cross-field validation based on trade status and direction
        """
        status = data.get('status')
        buy_price = data.get('buy_price')
        direction = data.get('direction', 'LONG')
        target_price = data.get('target_price')
        stop_loss = data.get('stop_loss')
        
        # For updates, merge with existing instance data
        if self.instance:
            # Get current values from instance if not provided in data
            if 'buy_price' not in data:
                buy_price = self.instance.buy_price
            if 'direction' not in data:
                direction = self.instance.direction
            if 'status' not in data:
                status = self.instance.status
            if 'target_price' not in data:
                target_price = self.instance.target_price
            if 'stop_loss' not in data:
                stop_loss = self.instance.stop_loss
        
        # Cross-field validation for target price based on direction and entry price
        if target_price is not None:
            # Get entry price based on direction
            entry_price = buy_price if direction == 'LONG' else data.get('sell_price')
            if entry_price is not None:
                if direction == 'LONG' and float(target_price) <= float(entry_price):
                    raise serializers.ValidationError({
                        'target_price': [f"Target price ({target_price}) must be greater than entry price ({entry_price}) for long positions"]
                    })
                if direction == 'SHORT' and float(target_price) >= float(entry_price):
                    raise serializers.ValidationError({
                        'target_price': [f"Target price ({target_price}) must be less than entry price ({entry_price}) for short positions"]
                    })
        
        # Cross-field validation for stop loss based on direction and entry price
        if stop_loss is not None:
            # Get entry price based on direction
            entry_price = buy_price if direction == 'LONG' else data.get('sell_price')
            if entry_price is not None:
                if direction == 'LONG' and float(stop_loss) >= float(entry_price):
                    raise serializers.ValidationError({
                        'stop_loss': [f"Stop loss ({stop_loss}) must be less than entry price ({entry_price}) for long positions"]
                    })
                if direction == 'SHORT' and float(stop_loss) <= float(entry_price):
                    raise serializers.ValidationError({
                        'stop_loss': [f"Stop loss ({stop_loss}) must be greater than entry price ({entry_price}) for short positions"]
                    })
        
        # Validate required fields for CLOSED_TARGET status
        if status == 'CLOSED_TARGET' and target_price is None:
            raise serializers.ValidationError({
                'target_price': ["Target price is required for trades closed at target"]
            })
        
        # Validate required fields for CLOSED_STOPLOSS status
        if status == 'CLOSED_STOPLOSS' and stop_loss is None:
            raise serializers.ValidationError({
                'stop_loss': ["Stop loss is required for trades closed at stop loss"]
            })
        
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user_id'] = request.user.id
        return super().create(validated_data)

class TradeJournalListSerializer(serializers.ModelSerializer):
    tags = TradeTagsSerializer(many=True, read_only=True)
    pnl = serializers.SerializerMethodField()
    risk_reward_ratio = serializers.SerializerMethodField()
    is_profitable = serializers.SerializerMethodField()
    is_precise_calculation = serializers.SerializerMethodField()
    missing_fields_for_pnl = serializers.SerializerMethodField()
    
    class Meta:
        model = TradeJournal
        fields = '__all__'
        read_only_fields = ['user_id', 'created_at', 'updated_at']
    
    def get_pnl(self, obj):
        return obj.calculate_pnl()
    
    def get_risk_reward_ratio(self, obj):
        return obj.risk_reward_ratio
    
    def get_is_profitable(self, obj):
        return obj.is_profitable
    
    def get_is_precise_calculation(self, obj):
        return obj.is_precise_calculation_available()
    
    def get_missing_fields_for_pnl(self, obj):
        return obj.get_missing_fields_for_pnl()

class TradeJournalCreateSerializer(serializers.ModelSerializer):
    tags = serializers.PrimaryKeyRelatedField(queryset=TradeTags.objects.all(), many=True, required=False)
    
    class Meta:
        model = TradeJournal
        exclude = ['user_id', 'created_at', 'updated_at']
    
    def validate_broker(self, value):
        valid_brokers = ['Dhan', 'Groww']
        if value not in valid_brokers:
            raise serializers.ValidationError(f"Broker must be one of: {', '.join(valid_brokers)}")
        return value
    
    def validate_exchange(self, value):
        valid_exchanges = ['NSE', 'BSE']
        if value not in valid_exchanges:
            raise serializers.ValidationError(f"Exchange must be one of: {', '.join(valid_exchanges)}")
        return value
    
    def validate_buy_price(self, value):
        # Get status and direction from the request data
        status = self.initial_data.get('status')
        direction = self.initial_data.get('direction')
        
        # For SHORT trades, buy_price can be null for OPEN status (no exit price yet)
        # For SHORT trades with CLOSED_MANUAL status, buy_price is required (exit price)
        if direction == 'SHORT':
            if status == 'CLOSED_MANUAL':
                if value is None or value <= 0:
                    raise serializers.ValidationError("Exit price is required and must be greater than 0 for manually closed short trades")
            elif status in ['OPEN', 'CANCELLED']:
                # For OPEN/CANCELLED SHORT trades, buy_price can be null
                if value is not None and value <= 0:
                    raise serializers.ValidationError("Buy price must be greater than 0 if provided")
            else:
                # For CLOSED_TARGET/CLOSED_STOPLOSS SHORT trades, buy_price can be null (exit price comes from target/stop)
                if value is not None and value <= 0:
                    raise serializers.ValidationError("Buy price must be greater than 0 if provided")
        else:
            # For LONG trades, buy_price is always required (entry price)
            if value is None or value <= 0:
                raise serializers.ValidationError("Buy price is required and must be greater than 0 for long trades")
        
        return value
    
    def validate_sell_price(self, value):
        # Get status and direction from the request data
        status = self.initial_data.get('status')
        direction = self.initial_data.get('direction')
        
        # For LONG trades with CLOSED_MANUAL status, sell_price is required (exit price)
        # For SHORT trades, sell_price is always required (entry price)
        if direction == 'LONG':
            if status == 'CLOSED_MANUAL':
                if value is None or value <= 0:
                    raise serializers.ValidationError("Exit price is required and must be greater than 0 for manually closed long trades")
            elif value is not None and value <= 0:
                raise serializers.ValidationError("Sell price must be greater than 0 if provided")
        else:
            # For SHORT trades, sell_price is always required (entry price)
            if value is None or value <= 0:
                raise serializers.ValidationError("Entry price is required and must be greater than 0 for short trades")
        
        return value
    
    def validate_exit_date(self, value):
        # Only validate exit_date if it's required for the current status
        status = self.initial_data.get('status')
        
        # If status is any closed status, exit_date is required
        if status in ['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL']:
            if value is None:
                raise serializers.ValidationError("Exit date is required for closed trades")
        
        return value
    
    def validate_stop_loss(self, value):
        # Only validate stop_loss if it's required for the current status
        status = self.initial_data.get('status')
        
        # If status is CLOSED_STOPLOSS, stop_loss is required and must be valid
        if status == 'CLOSED_STOPLOSS':
            if value is None or value <= 0:
                raise serializers.ValidationError("Stop loss is required and must be greater than 0 for trades closed at stop loss")
            
            buy_price = self.initial_data.get('buy_price')
            direction = self.initial_data.get('direction', 'LONG')
            if buy_price is not None:
                if direction == 'LONG' and float(value) >= float(buy_price):
                    raise serializers.ValidationError("Stop loss must be less than buy price for long positions")
                if direction == 'SHORT' and float(value) <= float(buy_price):
                    raise serializers.ValidationError("Stop loss must be greater than buy price for short positions")
        
        # For other statuses, only validate if value is provided and > 0
        elif value is not None and value <= 0:
            raise serializers.ValidationError("Stop loss must be greater than 0")
        
        return value
    
    def validate_target_price(self, value):
        # Only validate target_price if it's required for the current status
        status = self.initial_data.get('status')
        
        # If status is CLOSED_TARGET, target_price is required and must be valid
        if status == 'CLOSED_TARGET':
            if value is None or value <= 0:
                raise serializers.ValidationError("Target price is required and must be greater than 0 for trades closed at target")
            
            buy_price = self.initial_data.get('buy_price')
            direction = self.initial_data.get('direction', 'LONG')
            if buy_price is not None:
                if direction == 'LONG' and float(value) <= float(buy_price):
                    raise serializers.ValidationError("Target price must be greater than buy price for long positions")
                if direction == 'SHORT' and float(value) > float(buy_price):
                    raise serializers.ValidationError("Target price must be less than or equal to buy price for short positions")
        
        # For other statuses, only validate if value is provided and > 0
        elif value is not None and value <= 0:
            raise serializers.ValidationError("Target price must be greater than 0")
        
        return value
    
    def validate_tags(self, tags):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            for tag in tags:
                if str(tag.user_id) != request.user.id:
                    raise serializers.ValidationError(f"Tag '{tag.name}' does not belong to you")
        return tags
    
    def validate(self, data):
        """
        Cross-field validation for target price and stop loss vs entry price
        """
        # Get required fields
        buy_price = data.get('buy_price')
        direction = data.get('direction')
        target_price = data.get('target_price')
        stop_loss = data.get('stop_loss')
        status = data.get('status')
        
        # For updates, get missing fields from instance
        if self.instance:
            if 'buy_price' not in data:
                buy_price = self.instance.buy_price
            if 'direction' not in data:
                direction = self.instance.direction
            if 'status' not in data:
                status = self.instance.status
            if 'target_price' not in data:
                target_price = self.instance.target_price
            if 'stop_loss' not in data:
                stop_loss = self.instance.stop_loss
        
        # Cross-field validation for target price based on direction and entry price
        if target_price is not None:
            # Get entry price based on direction
            entry_price = buy_price if direction == 'LONG' else data.get('sell_price')
            if entry_price is not None:
                if direction == 'LONG' and float(target_price) <= float(entry_price):
                    raise serializers.ValidationError({
                        'target_price': [f"Target price ({target_price}) must be greater than entry price ({entry_price}) for long positions"]
                    })
                if direction == 'SHORT' and float(target_price) >= float(entry_price):
                    raise serializers.ValidationError({
                        'target_price': [f"Target price ({target_price}) must be less than entry price ({entry_price}) for short positions"]
                    })
        
        # Cross-field validation for stop loss based on direction and entry price
        if stop_loss is not None:
            # Get entry price based on direction
            entry_price = buy_price if direction == 'LONG' else data.get('sell_price')
            if entry_price is not None:
                if direction == 'LONG' and float(stop_loss) >= float(entry_price):
                    raise serializers.ValidationError({
                        'stop_loss': [f"Stop loss ({stop_loss}) must be less than entry price ({entry_price}) for long positions"]
                    })
                if direction == 'SHORT' and float(stop_loss) <= float(entry_price):
                    raise serializers.ValidationError({
                        'stop_loss': [f"Stop loss ({stop_loss}) must be greater than entry price ({entry_price}) for short positions"]
                    })
        
        # Validate required fields for CLOSED_TARGET status
        if status == 'CLOSED_TARGET' and target_price is None:
            raise serializers.ValidationError({
                'target_price': ["Target price is required for trades closed at target"]
            })
        
        # Validate required fields for CLOSED_STOPLOSS status
        if status == 'CLOSED_STOPLOSS' and stop_loss is None:
            raise serializers.ValidationError({
                'stop_loss': ["Stop loss is required for trades closed at stop loss"]
            })
        
        return data
    
    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user_id'] = request.user.id
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