# Import all views to expose them at the views package level
from .calculation_views import calculate_charges, save_calculation
from .transaction_views import (
    test_api, 
    TransactionRecordViewSet, 
    TransactionGroupViewSet,
    SaveCalculationAPIView
)
from .health_views import health_check

# This allows the urls.py file to continue using the original import paths
# For example: from calculator.views import calculate_charges