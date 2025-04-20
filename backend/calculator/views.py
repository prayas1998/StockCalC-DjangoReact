from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from decimal import Decimal, ROUND_HALF_UP
from .utils import TradeCalculator

# Import models and serializers
from .models import TransactionRecord, TransactionGroup
from .serializers import (
    TransactionRecordSerializer, 
    TransactionGroupSerializer,
    TransactionGroupCreateSerializer
)
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action


@api_view(["POST"])
def calculate_charges(request):
    """
    Calculate charges for stock trades with support for different platforms and types
    """
    try:
        # Extract basic parameters
        platform = request.data.get("platform", "groww").lower()
        exchange = request.data.get("exchange", "NSE").upper()
        trade_type = request.data.get("tradeType", "equity-delivery")
        transactions = request.data.get("transactions", [])

        calculator = TradeCalculator(platform, exchange, trade_type)

        # Initialize accumulators for running totals
        cumulative_quantity = Decimal("0")
        cumulative_buy_value = Decimal("0")
        total_buy_value = Decimal("0")
        total_sell_value = Decimal("0")
        total_brokerage = Decimal("0")

        # Process each transaction
        transactions_data = []
        for transaction in transactions:
            quantity = Decimal(str(transaction["quantity"]))
            buy_price = Decimal(str(transaction["buyPrice"]))
            sell_price = Decimal(str(transaction["sellPrice"]))

            # Calculate values for this transaction
            buy_value = quantity * buy_price
            sell_value = quantity * sell_price

            # Update cumulative totals for average price calculation
            cumulative_quantity += quantity
            cumulative_buy_value += buy_value

            # Calculate Groww brokerage for just this transaction
            # Buy side brokerage: 0.1% of buy value (min ₹2, max ₹20)
            buy_brokerage = (
                min(max(buy_value * Decimal("0.001"), Decimal("2")), Decimal("20"))
                if buy_value > 0
                else Decimal("0")
            )
            # Sell side brokerage: 0.1% of sell value (min ₹2, max ₹20)
            sell_brokerage = (
                min(max(sell_value * Decimal("0.001"), Decimal("2")), Decimal("20"))
                if sell_value > 0
                else Decimal("0")
            )
            # Total brokerage for this transaction
            transaction_brokerage = buy_brokerage + sell_brokerage

            # Update running totals
            total_buy_value += buy_value
            total_sell_value += sell_value
            total_brokerage += transaction_brokerage

            # Store transaction data with cumulative average price and transaction brokerage
            transactions_data.append(
                {
                    "quantity": str(quantity),
                    "buyValue": str(buy_value),
                    "sellValue": str(sell_value),
                    "averageBuyPrice": str(
                        (cumulative_buy_value / cumulative_quantity).quantize(
                            Decimal("0.01")
                        )
                        if cumulative_quantity > 0 and cumulative_buy_value > 0
                        else "0.00"
                    ),
                    "charges": str(
                        transaction_brokerage.quantize(Decimal("0.01"))
                    ),  # This is just the Groww brokerage
                }
            )

        # Calculate final totals for government levies
        total_turnover = total_buy_value + total_sell_value
        stt = calculator.govt_charges.calculate_stt(total_turnover)
        exchange_charges = calculator.govt_charges.calculate_exchange_charges(
            total_turnover
        )
        stamp_duty = calculator.govt_charges.calculate_stamp_duty(total_buy_value)
        sebi_fee = calculator.govt_charges.calculate_sebi_fee(total_turnover)
        ipft = calculator.govt_charges.calculate_ipft(total_turnover)

        # Final GST Calculation on all applicable charges
        taxable_components = sum([total_brokerage, exchange_charges, sebi_fee, ipft])
        gst = calculator.govt_charges.calculate_gst(taxable_components)

        # Calculate total charges (brokerage + all government levies)
        total_charges = sum(
            [total_brokerage, stt, exchange_charges, stamp_duty, sebi_fee, ipft, gst]
        )
        gross_pnl = total_sell_value - total_buy_value
        net_pnl = gross_pnl - total_charges

        # Format response
        response_data = {
            "summary": {
                "totalQuantity": str(cumulative_quantity.quantize(Decimal("1"))),
                "totalBuyValue": str(total_buy_value.quantize(Decimal("0.01"))),
                "totalSellValue": str(total_sell_value.quantize(Decimal("0.01"))),
                "averageBuyPrice": str(
                    (total_buy_value / cumulative_quantity).quantize(Decimal("0.01"))
                    if cumulative_quantity > 0 and total_buy_value > 0
                    else "0.00"
                ),
                "turnover": str(total_turnover.quantize(Decimal("0.01"))),
                "grossPnL": str(gross_pnl.quantize(Decimal("0.01"))),
                "netPnL": str(net_pnl.quantize(Decimal("0.01"))),
            },
            "charges": {
                "brokerage": str(total_brokerage.quantize(Decimal("0.01"))),
                "stt": str(stt.quantize(Decimal("0.01"))),
                "exchangeCharges": str(exchange_charges.quantize(Decimal("0.01"))),
                "stampDuty": str(stamp_duty.quantize(Decimal("0.01"))),
                "sebiFee": str(sebi_fee.quantize(Decimal("0.01"))),
                "ipft": str(ipft.quantize(Decimal("0.01"))),
                "gst": str(gst.quantize(Decimal("0.01"))),
                "totalCharges": str(total_charges.quantize(Decimal("0.01"))),
            },
            "transactions": transactions_data,
        }

        return Response(response_data)

    except (KeyError, ValueError, TypeError, ZeroDivisionError) as e:
        return Response({"error": "Invalid input data", "detail": str(e)}, status=400)


def test_api(request):
    return JsonResponse({"status": "success", "message": "Test API is working!"})


# New viewsets for models

class TransactionRecordViewSet(viewsets.ModelViewSet):
    """
    API endpoint for individual transaction records
    """
    queryset = TransactionRecord.objects.all().order_by('-created_at')
    serializer_class = TransactionRecordSerializer
    
    def get_queryset(self):
        """
        Filter records to return only the user's own records or public records
        """
        user = self.request.user
        if user.is_authenticated:
            return TransactionRecord.objects.filter(user=user).order_by('-created_at')
        return TransactionRecord.objects.none()
    
    def perform_create(self, serializer):
        """
        Associate the current authenticated user with the transaction
        """
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()


class TransactionGroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint for transaction groups
    """
    queryset = TransactionGroup.objects.all().order_by('-created_at')
    serializer_class = TransactionGroupSerializer
    
    def get_queryset(self):
        """
        Filter groups to return only the user's own groups
        """
        user = self.request.user
        if user.is_authenticated:
            return TransactionGroup.objects.filter(user=user).order_by('-created_at')
        return TransactionGroup.objects.none()
    
    def perform_create(self, serializer):
        """
        Associate the current authenticated user with the group
        """
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()
    
    @action(detail=True, methods=['post'])
    def update_summary(self, request, pk=None):
        """
        Recalculate the group summary based on its transactions
        """
        group = self.get_object()
        group.update_summary()
        return Response({'status': 'summary updated'})


class SaveCalculationAPIView(APIView):
    """
    API endpoint to save calculation results to database
    """
    def post(self, request, format=None):
        # Use the special serializer for creating a group with transactions
        serializer = TransactionGroupCreateSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            # Save the group and its transactions
            group = serializer.save()
            
            # Return the saved group data
            return Response(
                TransactionGroupSerializer(group).data, 
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def save_calculation(request):
    """
    Alternative function-based view to save calculation results
    """
    # Extract data from the request
    title = request.data.get('title', 'Untitled Calculation')
    platform = request.data.get('platform', 'groww').lower()
    exchange = request.data.get('exchange', 'NSE').upper()
    trade_type = request.data.get('tradeType', 'equity-delivery')
    transactions = request.data.get('transactions', [])
    
    # Create the transaction group
    group_data = {
        'title': title,
        'platform': platform,
        'exchange': exchange,
        'trade_type': trade_type,
    }
    
    # Associate with user if authenticated
    if request.user.is_authenticated:
        group_data['user'] = request.user
    
    # Create the group
    group = TransactionGroup.objects.create(**group_data)
    
    # Create each transaction
    for tx in transactions:
        # Map frontend format to model format
        transaction_data = {
            'platform': platform,
            'exchange': exchange,
            'trade_type': trade_type,
            'group': group,
            'quantity': int(tx.get('quantity', 0)),
            'buy_price': Decimal(tx.get('buyPrice', 0)),
            'sell_price': Decimal(tx.get('sellPrice', 0)),
            # Set charges from calculation results if available
            'total_brokerage': Decimal(tx.get('charges', 0)),
        }
        
        # Associate with user if authenticated
        if request.user.is_authenticated:
            transaction_data['user'] = request.user
        
        # Create the transaction record
        TransactionRecord.objects.create(**transaction_data)
    
    # Update the group summary
    group.update_summary()
    
    # Return the saved group
    return Response({
        'status': 'success',
        'message': f'Calculation saved with ID: {group.id}',
        'group_id': group.id
    })
