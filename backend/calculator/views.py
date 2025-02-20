from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from decimal import Decimal, ROUND_HALF_UP
from .utils import TradeCalculator


@api_view(['POST'])
def calculate_charges(request):
    """
    Calculate charges for stock trades with support for different platforms and types
    """
    try:
        # Extract basic parameters
        platform = request.data.get('platform', 'groww').lower()
        exchange = request.data.get('exchange', 'NSE').upper()
        trade_type = request.data.get('tradeType', 'equity-delivery')
        transactions = request.data.get('transactions', [])

        calculator = TradeCalculator(platform, exchange)
        
        # Initialize accumulators
        total_quantity = Decimal('0')
        total_buy_value = Decimal('0')
        total_sell_value = Decimal('0')
        total_brokerage = Decimal('0')
        
        # Process each transaction
        transactions_data = []
        for transaction in transactions:
            quantity = Decimal(str(transaction['quantity']))
            buy_price = Decimal(str(transaction['buyPrice']))
            sell_price = Decimal(str(transaction['sellPrice']))

            # Calculate values
            buy_value = quantity * buy_price
            sell_value = quantity * sell_price
            
            # Calculate brokerage for the transaction
            transaction_brokerage = calculator.calculate_brokerage(buy_value, sell_value)
            
            # Accumulate values
            total_quantity += quantity
            total_buy_value += buy_value
            total_sell_value += sell_value
            total_brokerage += transaction_brokerage

            # Store transaction data
            transactions_data.append({
                'quantity': str(quantity),
                'buyValue': str(buy_value),
                'sellValue': str(sell_value),
                'averageBuyPrice': str(
                    (buy_value / quantity).quantize(Decimal('0.01')) 
                    if quantity > 0 and buy_value > 0
                    else '0.00'
                )
            })

        # Calculate total charges
        total_turnover = total_buy_value + total_sell_value
        stt = calculator.calculate_stt(total_turnover) # changed here
        exchange_charges = calculator.calculate_exchange_charges(total_turnover)
        stamp_duty = calculator.calculate_stamp_duty(total_buy_value)
        sebi_fee = calculator.calculate_sebi_fee(total_turnover)
        ipft = calculator.calculate_ipft(total_turnover)

        # GST Calculation
        taxable_components = total_brokerage + exchange_charges + sebi_fee + ipft
        gst = calculator.calculate_gst(taxable_components)

        # Calculate totals
        total_charges = sum([
            total_brokerage,
            stt,
            exchange_charges,
            stamp_duty,
            sebi_fee,
            ipft,
            gst
        ])
        gross_pnl = total_sell_value - total_buy_value
        net_pnl = gross_pnl - total_charges

        # Format response
        response_data = {
            'summary': {
                'totalQuantity': str(total_quantity.quantize(Decimal('1'))),
                'totalBuyValue': str(total_buy_value.quantize(Decimal('0.01'))),
                'totalSellValue': str(total_sell_value.quantize(Decimal('0.01'))),
                'averageBuyPrice': str(
                    (total_buy_value / total_quantity).quantize(Decimal('0.01')) 
                    if total_quantity > 0 and total_buy_value > 0
                    else '0.00'
                ),
                'turnover': str(total_turnover.quantize(Decimal('0.01'))),
                'grossPnL': str(gross_pnl.quantize(Decimal('0.01'))),
                'netPnL': str(net_pnl.quantize(Decimal('0.01')))
            },
            'charges': {
                'brokerage': str(total_brokerage.quantize(Decimal('0.01'))),
                'stt': str(stt.quantize(Decimal('0.01'))),
                'exchangeCharges': str(exchange_charges.quantize(Decimal('0.01'))),
                'stampDuty': str(stamp_duty.quantize(Decimal('0.01'))),
                'sebiFee': str(sebi_fee.quantize(Decimal('0.01'))),
                'ipft': str(ipft.quantize(Decimal('0.01'))),
                'gst': str(gst.quantize(Decimal('0.01'))),
                'totalCharges': str(total_charges.quantize(Decimal('0.01')))
            },
            'transactions': transactions_data
        }

        return Response(response_data)

    except (KeyError, ValueError, TypeError, ZeroDivisionError) as e:
        return Response({
            'error': 'Invalid input data',
            'detail': str(e)
        }, status=400)