"""
Production-ready rate limiting implementation
Comprehensive rate limiting with different limits for different endpoint types
"""

from functools import wraps
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from rest_framework.response import Response
from rest_framework import status
import time
import logging

logger = logging.getLogger(__name__)


# Simplified Throttle Classes
class AuthUserThrottle(UserRateThrottle):
    scope = 'auth'

class AuthAnonThrottle(AnonRateThrottle):
    scope = 'auth_anon'

class DataOpsUserThrottle(UserRateThrottle):
    scope = 'data_operations'

class DataOpsAnonThrottle(AnonRateThrottle):
    scope = 'data_operations_anon'

class GeneralUserThrottle(UserRateThrottle):
    scope = 'general'

class GeneralAnonThrottle(AnonRateThrottle):
    scope = 'general_anon'

# Simplified endpoint mapping - removed burst protection and complex calculation throttles
ENDPOINT_THROTTLES = {
    'authentication': [AuthUserThrottle, AuthAnonThrottle],
    'data_operations': [DataOpsUserThrottle, DataOpsAnonThrottle],
    'general_api': [GeneralUserThrottle, GeneralAnonThrottle],
}


def get_client_identifier(request):
    """Get client identifier for logging"""
    if hasattr(request, 'user') and request.user.is_authenticated:
        return f"user {request.user.id}"
    return f"IP {request.META.get('REMOTE_ADDR', 'unknown')}"


def create_rate_limit_response(throttle, endpoint_type, client_id):
    """Create standardized rate limit response"""
    response_data = {
        'error': 'Rate limit exceeded',
        'detail': f'Too many requests. Rate limit: {throttle.rate}',
        'retry_after': throttle.wait(),
        'throttle_type': throttle.__class__.__name__,
        'endpoint_type': endpoint_type,
        'timestamp': int(time.time())
    }
    
    logger.warning(
        f"Rate limit exceeded: {throttle.__class__.__name__} for {client_id} "
        f"on {endpoint_type} endpoint"
    )
    
    return Response(response_data, status=status.HTTP_429_TOO_MANY_REQUESTS)


def apply_throttling(request, endpoint_type='general_api'):
    """
    Apply rate limiting to a request
    Returns (allowed: bool, response: Response or None)
    """
    throttle_classes = ENDPOINT_THROTTLES.get(endpoint_type, ENDPOINT_THROTTLES['general_api'])
    client_id = get_client_identifier(request)
    
    for throttle_class in throttle_classes:
        throttle = throttle_class()
        
        if not throttle.allow_request(request, None):
            return False, create_rate_limit_response(throttle, endpoint_type, client_id)
    
    return True, None


def rate_limit(endpoint_type='general_api'):
    """
    Decorator for applying rate limiting to function-based views
    
    Usage:
        @rate_limit('authentication')
        def my_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            allowed, throttle_response = apply_throttling(request, endpoint_type)
            if not allowed:
                return throttle_response
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


# Simplified decorators for different endpoint types
def auth_rate_limit(view_func):
    """Rate limiting for authentication endpoints"""
    return rate_limit('authentication')(view_func)


def data_ops_rate_limit(view_func):
    """Rate limiting for data operations endpoints"""
    return rate_limit('data_operations')(view_func)


def general_rate_limit(view_func):
    """Rate limiting for general API endpoints"""
    return rate_limit('general_api')(view_func)


# Calculation endpoints now use general rate limiting (simplified)
def calc_rate_limit(view_func):
    """Rate limiting for calculation endpoints (uses general limits)"""
    return rate_limit('general_api')(view_func)