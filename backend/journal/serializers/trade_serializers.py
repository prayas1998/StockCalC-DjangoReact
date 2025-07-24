"""
Trade journal serializers for CRUD operations and data validation
"""

from rest_framework import serializers
from ..models import TradeJournal, TradeTags, TradeJournalTags
from .base_serializers import BaseTradeValidationMixin
from .tag_serializers import TradeTagsSerializer


class TradeJournalSerializer(BaseTradeValidationMixin, serializers.ModelSerializer):
    """
    Full serializer for trade journal entries with calculated fields
    """
    tags = TradeTagsSerializer(many=True, read_only=True)
    pnl = serializers.SerializerMethodField()
    unrealized_pnl = serializers.SerializerMethodField()
    risk_reward_ratio = serializers.SerializerMethodField()
    is_profitable = serializers.SerializerMethodField()
    is_precise_calculation = serializers.SerializerMethodField()
    missing_fields_for_pnl = serializers.SerializerMethodField()
    
    class Meta:
        model = TradeJournal
        fields = '__all__'
        read_only_fields = ['user_id', 'created_at', 'updated_at']
    
    def get_pnl(self, obj):
        """Calculate and return net P&L"""
        return obj.calculate_pnl()
    
    def get_unrealized_pnl(self, obj):
        """Calculate unrealized P&L for open trades"""
        return None  # Placeholder for future implementation
    
    def get_risk_reward_ratio(self, obj):
        """Get risk-reward ratio"""
        return obj.risk_reward_ratio
    
    def get_is_profitable(self, obj):
        """Check if trade is profitable"""
        return obj.is_profitable
    
    def get_is_precise_calculation(self, obj):
        """Check if precise calculation is available"""
        return obj.is_precise_calculation_available()
    
    def get_missing_fields_for_pnl(self, obj):
        """Get list of missing fields for P&L calculation"""
        return obj.get_missing_fields_for_pnl()
    
    def validate(self, data):
        """Cross-field validation"""
        return self.validate_cross_field_relationships(data)
    
    def create(self, validated_data):
        """Set user_id when creating a trade"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user_id'] = request.user.id
        return super().create(validated_data)


class TradeJournalListSerializer(BaseTradeValidationMixin, serializers.ModelSerializer):
    """
    Optimized serializer for list views with essential calculated fields
    """
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
        """Calculate and return net P&L"""
        return obj.calculate_pnl()
    
    def get_risk_reward_ratio(self, obj):
        """Get risk-reward ratio"""
        return obj.risk_reward_ratio
    
    def get_is_profitable(self, obj):
        """Check if trade is profitable"""
        return obj.is_profitable
    
    def get_is_precise_calculation(self, obj):
        """Check if precise calculation is available"""
        return obj.is_precise_calculation_available()
    
    def get_missing_fields_for_pnl(self, obj):
        """Get list of missing fields for P&L calculation"""
        return obj.get_missing_fields_for_pnl()


class TradeJournalCreateSerializer(BaseTradeValidationMixin, serializers.ModelSerializer):
    """
    Serializer for creating and updating trade journal entries with tag management
    """
    tags = serializers.PrimaryKeyRelatedField(queryset=TradeTags.objects.all(), many=True, required=False)
    
    class Meta:
        model = TradeJournal
        exclude = ['user_id', 'created_at', 'updated_at']
    
    def validate_tags(self, tags):
        """Validate that tags belong to the current user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            for tag in tags:
                if str(tag.user_id) != request.user.id:
                    raise serializers.ValidationError(f"Tag '{tag.name}' does not belong to you")
        return tags
    
    def validate(self, data):
        """Cross-field validation"""
        return self.validate_cross_field_relationships(data)
    
    def create(self, validated_data):
        """Create trade with tag associations"""
        tags = validated_data.pop('tags', [])
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user_id'] = request.user.id
        
        trade_journal = TradeJournal.objects.create(**validated_data)
        
        # Create tag associations
        for tag in tags:
            TradeJournalTags.objects.create(trade=trade_journal, tag=tag)
        
        return trade_journal
    
    def update(self, instance, validated_data):
        """Update trade with tag associations"""
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