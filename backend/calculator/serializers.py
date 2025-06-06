from rest_framework import serializers
from .models import TransactionRecord, TransactionGroup
from django.contrib.auth.models import User
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
        transactions = obj.transactions.filter(user=self.context['request'].user)
        return TransactionRecordSerializer(transactions, many=True).data

class TransactionGroupCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    platform = serializers.ChoiceField(choices=TransactionRecord.PLATFORM_CHOICES, default='groww')
    exchange = serializers.ChoiceField(choices=TransactionRecord.EXCHANGE_CHOICES, default='NSE')
    trade_type = serializers.ChoiceField(choices=TransactionRecord.TRADE_TYPE_CHOICES, default='equity-delivery')
    transactions = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    
    def create(self, validated_data):
        transactions_data = validated_data.pop('transactions')
        request = self.context.get('request')
        user = None
        if request and request.user.is_authenticated:
            user = request.user
            validated_data['user'] = user
        group = TransactionGroup.objects.create(**validated_data)
        for transaction_data in transactions_data:
            transaction_data['platform'] = validated_data['platform']
            transaction_data['exchange'] = validated_data['exchange'] 
            transaction_data['trade_type'] = validated_data['trade_type']
            transaction_data['group'] = group
            if user:
                transaction_data['user'] = user
            TransactionRecord.objects.create(**transaction_data)
        group.update_summary()
        return group 