# Import all views to expose them at the views package level
from .calculation_views import calculate_charges
from .health_views import health_check
from .profile_views import ProfileAPIView, change_password, delete_account

# This allows the urls.py file to continue using the original import paths
# For example: from calculator.views import calculate_charges