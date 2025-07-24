"""
Tag serializers for trade categorization and organization
"""

from rest_framework import serializers
from ..models import TradeTags
import re


class TradeTagsSerializer(serializers.ModelSerializer):
    """
    Serializer for trade tags with validation and user association
    """
    
    class Meta:
        model = TradeTags
        fields = ['id', 'name', 'color', 'user_id', 'created_at']
        read_only_fields = ['user_id', 'created_at']
    
    def validate_color(self, value):
        """Validate hex color format"""
        if not re.match(r'^#(?:[0-9a-fA-F]{3}){1,2}$', value):
            raise serializers.ValidationError("Color must be a valid hex color code (e.g., #3B82F6)")
        return value
    
    def validate(self, data):
        """Validate user ownership for updates"""
        request = self.context.get('request')
        if self.instance and request and request.user.id != str(self.instance.user_id):
            raise serializers.ValidationError("You can only edit your own tags")
        return data
    
    def create(self, validated_data):
        """Set user_id when creating a tag"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user_id'] = request.user.id
        return super().create(validated_data)