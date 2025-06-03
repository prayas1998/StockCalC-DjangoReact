from .equity_delivery import EquityDeliveryCharges
from .equity_intraday import EquityIntradayCharges

def get_government_charges(trade_type, exchange):
    if trade_type == 'equity-delivery':
        return EquityDeliveryCharges(exchange)
    elif trade_type == 'equity-intraday':
        return EquityIntradayCharges(exchange)
    else:
        raise ValueError(f"Unsupported trade type: {trade_type}")