from rest_framework.decorators import api_view
from rest_framework.response import Response
from decimal import Decimal
from ..utils import TradeCalculator

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
        total_dp_charges = Decimal('0')

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

            # Calculate brokerage using the broker-specific calculator
            transaction_brokerage = calculator.broker.calculate_brokerage(buy_value, sell_value)

            # DP charge: only if sell_price > 0
            transaction_dp_charge = calculator.broker.get_dp_charge() if sell_price > 0 else Decimal('0')
            total_dp_charges += transaction_dp_charge

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
                    ),  # This is the broker-specific brokerage
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

        # Calculate total charges (brokerage + all government levies + DP charges)
        total_charges = sum(
            [total_brokerage, stt, exchange_charges, stamp_duty, sebi_fee, ipft, gst, total_dp_charges]
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
                "dpCharges": str(total_dp_charges.quantize(Decimal("0.01"))),
                "totalCharges": str(total_charges.quantize(Decimal("0.01"))),
            },
            "transactions": transactions_data,
        }

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