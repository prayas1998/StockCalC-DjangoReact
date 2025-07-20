from rest_framework.decorators import api_view
from rest_framework.response import Response
from decimal import Decimal
from ..calculations.equity_delivery import EquityDeliveryCalculator
from ..calculations.equity_intraday import EquityIntradayCalculator
from ..rate_limiting import general_rate_limit

@api_view(["POST"])
@general_rate_limit
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
        position_type = request.data.get("positionType", "long")

        # Select the appropriate calculator
        if trade_type == 'equity-delivery':
            calculator = EquityDeliveryCalculator(platform, exchange, trade_type)
        elif trade_type == 'equity-intraday':
            calculator = EquityIntradayCalculator(platform, exchange, trade_type)
        else:
            return Response({"error": f"Unsupported trade type: {trade_type}"}, status=400)

        # Delegate all calculation logic to the calculator
        response_data = calculator.calculate_transaction_charges(transactions, position_type)
        
        return Response(response_data)

    except (KeyError, ValueError, TypeError, ZeroDivisionError) as e:
        return Response({"error": "Invalid input data", "detail": str(e)}, status=400)

