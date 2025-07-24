"""
Base serializers and common validation logic
"""

from rest_framework import serializers


class BaseTradeValidationMixin:
    """
    Mixin providing common validation logic for trade serializers
    """
    
    def validate_broker(self, value):
        """Validate broker selection"""
        valid_brokers = ['Dhan', 'Groww']
        if value not in valid_brokers:
            raise serializers.ValidationError(f"Broker must be one of: {', '.join(valid_brokers)}")
        return value
    
    def validate_exchange(self, value):
        """Validate exchange selection"""
        valid_exchanges = ['NSE', 'BSE']
        if value not in valid_exchanges:
            raise serializers.ValidationError(f"Exchange must be one of: {', '.join(valid_exchanges)}")
        return value

    def validate_buy_price(self, value):
        """Validate buy price based on trade direction and status"""
        status = self.initial_data.get('status')
        direction = self.initial_data.get('direction')
        
        if direction == 'SHORT':
            if status == 'CLOSED_MANUAL':
                if value is None or value <= 0:
                    raise serializers.ValidationError("Exit price is required and must be greater than 0 for manually closed short trades")
            elif status in ['OPEN', 'CANCELLED']:
                if value is not None and value <= 0:
                    raise serializers.ValidationError("Buy price must be greater than 0 if provided")
            else:
                if value is not None and value <= 0:
                    raise serializers.ValidationError("Buy price must be greater than 0 if provided")
        else:
            # For LONG trades, buy_price is always required (entry price)
            if value is None or value <= 0:
                raise serializers.ValidationError("Buy price is required and must be greater than 0 for long trades")
        
        return value
    
    def validate_sell_price(self, value):
        """Validate sell price based on trade direction and status"""
        status = self.initial_data.get('status')
        direction = self.initial_data.get('direction')
        
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
        """Validate exit date for closed trades"""
        status = self.initial_data.get('status')
        
        if status in ['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL']:
            if value is None:
                raise serializers.ValidationError("Exit date is required for closed trades")
        
        return value
    
    def validate_stop_loss(self, value):
        """Validate stop loss price"""
        status = self.initial_data.get('status')
        
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
        
        elif value is not None and value <= 0:
            raise serializers.ValidationError("Stop loss must be greater than 0")
        
        return value
    
    def validate_target_price(self, value):
        """Validate target price"""
        status = self.initial_data.get('status')
        
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
        
        elif value is not None and value <= 0:
            raise serializers.ValidationError("Target price must be greater than 0")
        
        return value

    def validate_cross_field_relationships(self, data):
        """Validate relationships between fields"""
        status = data.get('status')
        buy_price = data.get('buy_price')
        direction = data.get('direction', 'LONG')
        target_price = data.get('target_price')
        stop_loss = data.get('stop_loss')
        
        # For updates, merge with existing instance data
        if hasattr(self, 'instance') and self.instance:
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
        
        # Validate target price vs entry price
        if target_price is not None:
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
        
        # Validate stop loss vs entry price
        if stop_loss is not None:
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
        
        # Validate required fields for specific statuses
        if status == 'CLOSED_TARGET' and target_price is None:
            raise serializers.ValidationError({
                'target_price': ["Target price is required for trades closed at target"]
            })
        
        if status == 'CLOSED_STOPLOSS' and stop_loss is None:
            raise serializers.ValidationError({
                'stop_loss': ["Stop loss is required for trades closed at stop loss"]
            })
        
        return data