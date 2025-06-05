from rest_framework.decorators import api_view
from rest_framework.response import Response
from decimal import Decimal
from ..calculations.equity_delivery import EquityDeliveryCalculator
from ..calculations.equity_intraday import EquityIntradayCalculator

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

        # Select the appropriate calculator
        if trade_type == 'equity-delivery':
            calculator = EquityDeliveryCalculator(platform, exchange, trade_type)
        elif trade_type == 'equity-intraday':
            calculator = EquityIntradayCalculator(platform, exchange, trade_type)
        else:
            return Response({"error": f"Unsupported trade type: {trade_type}"}, status=400)

        # Delegate all calculation logic to the calculator
        response_data = calculator.calculate_transaction_charges(transactions)
        return Response(response_data)

    except (KeyError, ValueError, TypeError, ZeroDivisionError) as e:
        return Response({"error": "Invalid input data", "detail": str(e)}, status=400)

@api_view(['POST'])
def save_calculation(request):
    """
    Save calculation results
    """
    from decimal import Decimal
    from rest_framework import status
    from ..models import TransactionGroup, TransactionRecord
    
    # Extract data from the request
    title = request.data.get('title', 'Untitled Calculation')
    platform = request.data.get('platform', 'groww').lower()
    exchange = request.data.get('exchange', 'NSE').upper()
    trade_type = request.data.get('tradeType', 'equity-delivery')
    transactions_data = request.data.get('transactions', [])
    
    if not transactions_data:
        return Response(
            {"error": "No transaction data provided"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Create transaction group
        group = TransactionGroup.objects.create(
            user=request.user if request.user.is_authenticated else None,
            title=title,
            platform=platform,
            exchange=exchange,
            trade_type=trade_type
        )
        
        # Process each transaction
        for transaction_data in transactions_data:
            quantity = Decimal(str(transaction_data['quantity']))
            
            # Handle buy price (may be 0 for sell-only transactions)
            buy_price_str = transaction_data.get('buyPrice', '0')
            buy_price = Decimal(buy_price_str) if buy_price_str else Decimal('0')
            
            # Handle sell price (may be 0 for buy-only transactions)
            sell_price_str = transaction_data.get('sellPrice', '0') 
            sell_price = Decimal(sell_price_str) if sell_price_str else Decimal('0')
            
            # Calculate values
            buy_value = quantity * buy_price
            sell_value = quantity * sell_price
            
            # Create transaction record
            TransactionRecord.objects.create(
                group=group,
                user=request.user if request.user.is_authenticated else None,
                quantity=quantity,
                buy_price=buy_price,
                sell_price=sell_price,
                buy_value=buy_value,
                sell_value=sell_value,
                total_brokerage=Decimal('0'),  # Will be calculated in save method
                gross_pnl=sell_value - buy_value,
                net_pnl=sell_value - buy_value,  # Temporary; will be adjusted with charges
                platform=platform,
                exchange=exchange,
                trade_type=trade_type,
                title=title
            )
        
        # Update summary calculations
        group.update_summary()
        
        # Return success response
        return Response({
            "status": "success",
            "message": "Transaction saved successfully",
            "group_id": group.id
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )