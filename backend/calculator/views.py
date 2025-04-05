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

        calculator = TradeCalculator(platform, exchange, trade_type)
        
        # Initialize accumulators for running totals
        cumulative_quantity = Decimal('0')
        cumulative_buy_value = Decimal('0')
        total_buy_value = Decimal('0')
        total_sell_value = Decimal('0')
        total_brokerage = Decimal('0')
        
        # Process each transaction
        transactions_data = []
        for transaction in transactions:
            quantity = Decimal(str(transaction['quantity']))
            buy_price = Decimal(str(transaction['buyPrice']))
            sell_price = Decimal(str(transaction['sellPrice']))

            # Calculate values for this transaction
            buy_value = quantity * buy_price
            sell_value = quantity * sell_price
            
            # Update cumulative totals for average price calculation
            cumulative_quantity += quantity
            cumulative_buy_value += buy_value
            
            # Calculate Groww brokerage for just this transaction
            # Buy side brokerage: 0.1% of buy value (min ₹2, max ₹20)
            buy_brokerage = min(max(buy_value * Decimal('0.001'), Decimal('2')), Decimal('20')) if buy_value > 0 else Decimal('0')
            # Sell side brokerage: 0.1% of sell value (min ₹2, max ₹20)
            sell_brokerage = min(max(sell_value * Decimal('0.001'), Decimal('2')), Decimal('20')) if sell_value > 0 else Decimal('0')
            # Total brokerage for this transaction
            transaction_brokerage = buy_brokerage + sell_brokerage
            
            # Update running totals
            total_buy_value += buy_value
            total_sell_value += sell_value
            total_brokerage += transaction_brokerage

            # Store transaction data with cumulative average price and transaction brokerage
            transactions_data.append({
                'quantity': str(quantity),
                'buyValue': str(buy_value),
                'sellValue': str(sell_value),
                'averageBuyPrice': str(
                    (cumulative_buy_value / cumulative_quantity).quantize(Decimal('0.01'))
                    if cumulative_quantity > 0 and cumulative_buy_value > 0
                    else '0.00'
                ),
                'charges': str(transaction_brokerage.quantize(Decimal('0.01')))  # This is just the Groww brokerage
            })

        # Calculate final totals for government levies
        total_turnover = total_buy_value + total_sell_value
        stt = calculator.govt_charges.calculate_stt(total_turnover)
        exchange_charges = calculator.govt_charges.calculate_exchange_charges(total_turnover)
        stamp_duty = calculator.govt_charges.calculate_stamp_duty(total_buy_value)
        sebi_fee = calculator.govt_charges.calculate_sebi_fee(total_turnover)
        ipft = calculator.govt_charges.calculate_ipft(total_turnover)

        # Final GST Calculation on all applicable charges
        taxable_components = sum([
            total_brokerage,
            exchange_charges,
            sebi_fee,
            ipft
        ])
        gst = calculator.govt_charges.calculate_gst(taxable_components)

        # Calculate total charges (brokerage + all government levies)
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
                'totalQuantity': str(cumulative_quantity.quantize(Decimal('1'))),
                'totalBuyValue': str(total_buy_value.quantize(Decimal('0.01'))),
                'totalSellValue': str(total_sell_value.quantize(Decimal('0.01'))),
                'averageBuyPrice': str(
                    (total_buy_value / cumulative_quantity).quantize(Decimal('0.01'))
                    if cumulative_quantity > 0 and total_buy_value > 0
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