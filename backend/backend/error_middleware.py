"""
Global error handling middleware for Django.

This middleware catches unhandled exceptions and provides consistent
error responses with proper sanitization.
"""

import logging
import json
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from calculator.error_handling import ErrorHandler, ErrorCategory, ErrorSeverity

logger = logging.getLogger('security.errors')


class GlobalErrorHandlingMiddleware(MiddlewareMixin):
    """
    Middleware to handle unhandled exceptions globally.
    
    This catches any exceptions that weren't handled by views or DRF
    and provides consistent error responses.
    """
    
    def process_exception(self, request, exception):
        """
        Process unhandled exceptions.
        
        Args:
            request: Django request object
            exception: The unhandled exception
            
        Returns:
            JsonResponse with error details or None to continue normal processing
        """
        
        # Skip handling for certain exception types that should be handled elsewhere
        if self._should_skip_handling(exception):
            return None
        
        # Categorize the error
        category = ErrorHandler.categorize_error(exception)
        severity = ErrorSeverity.HIGH  # Unhandled exceptions are high severity
        
        # Handle the error
        error_data, status_code = ErrorHandler.handle_error(
            exception,
            category=category,
            severity=severity,
            context={'middleware': 'GlobalErrorHandlingMiddleware'},
            request=request
        )
        
        # Return JSON response for API requests
        if self._is_api_request(request):
            return JsonResponse(error_data, status=status_code)
        
        # For non-API requests, you might want to render an error page
        # For now, we'll still return JSON for consistency
        return JsonResponse(error_data, status=status_code)
    
    def _should_skip_handling(self, exception):
        """
        Determine if this exception should be skipped by this middleware.
        
        Args:
            exception: The exception to check
            
        Returns:
            bool: True if should skip, False otherwise
        """
        
        # Skip 404 errors - let Django handle them
        if hasattr(exception, 'status_code') and exception.status_code == 404:
            return True
        
        # Skip permission denied errors - let DRF handle them
        if exception.__class__.__name__ in ['PermissionDenied', 'Http404']:
            return True
        
        return False
    
    def _is_api_request(self, request):
        """
        Determine if this is an API request.
        
        Args:
            request: Django request object
            
        Returns:
            bool: True if API request, False otherwise
        """
        
        # Check if path starts with /api/
        if request.path.startswith('/api/'):
            return True
        
        # Check Accept header for JSON
        accept_header = request.META.get('HTTP_ACCEPT', '')
        if 'application/json' in accept_header:
            return True
        
        # Check Content-Type for JSON
        content_type = request.META.get('CONTENT_TYPE', '')
        if 'application/json' in content_type:
            return True
        
        return False


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Simplified middleware to log only errors and important events.
    """
    
    def process_response(self, request, response):
        """Log only error responses for API requests."""
        
        # Only log API requests with errors
        if not request.path.startswith('/api/'):
            return response
        
        # Skip logging for health checks
        if '/health-check/' in request.path:
            return response
        
        # Log only errors (4xx and 5xx)
        if response.status_code >= 400:
            logger.warning(f"API Error: {request.method} {request.path} - {response.status_code}")
        
        return response
    
    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip