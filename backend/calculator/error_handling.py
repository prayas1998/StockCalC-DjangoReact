"""
Production-safe error handling utilities.

This module provides centralized error handling with proper sanitization,
categorization, and environment-aware error disclosure.
"""

import logging
import traceback
from typing import Dict, Any, Optional, Union, Tuple
from enum import Enum
from django.conf import settings
from django.http import JsonResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.exceptions import ValidationError, AuthenticationFailed, PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, DatabaseError
import uuid

# Configure logger for error handling
logger = logging.getLogger('security.errors')


class ErrorCategory(Enum):
    """Error categories for proper handling and logging."""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    NOT_FOUND = "not_found"
    RATE_LIMIT = "rate_limit"
    DATABASE = "database"
    EXTERNAL_SERVICE = "external_service"
    SERVER_ERROR = "server_error"
    CONFIGURATION = "configuration"


class ErrorSeverity(Enum):
    """Error severity levels for monitoring and alerting."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorHandler:
    """
    Centralized error handler with production-safe error sanitization.
    """
    
    # Error messages for production (sanitized)
    PRODUCTION_ERROR_MESSAGES = {
        ErrorCategory.AUTHENTICATION: "Authentication failed. Please log in again.",
        ErrorCategory.AUTHORIZATION: "You don't have permission to perform this action.",
        ErrorCategory.VALIDATION: "The provided data is invalid.",
        ErrorCategory.NOT_FOUND: "The requested resource was not found.",
        ErrorCategory.RATE_LIMIT: "Too many requests. Please try again later.",
        ErrorCategory.DATABASE: "A database error occurred. Please try again.",
        ErrorCategory.EXTERNAL_SERVICE: "An external service is temporarily unavailable.",
        ErrorCategory.SERVER_ERROR: "An internal server error occurred. Please try again later.",
        ErrorCategory.CONFIGURATION: "A configuration error occurred.",
    }
    
    # HTTP status codes for each error category
    STATUS_CODES = {
        ErrorCategory.AUTHENTICATION: status.HTTP_401_UNAUTHORIZED,
        ErrorCategory.AUTHORIZATION: status.HTTP_403_FORBIDDEN,
        ErrorCategory.VALIDATION: status.HTTP_400_BAD_REQUEST,
        ErrorCategory.NOT_FOUND: status.HTTP_404_NOT_FOUND,
        ErrorCategory.RATE_LIMIT: status.HTTP_429_TOO_MANY_REQUESTS,
        ErrorCategory.DATABASE: status.HTTP_500_INTERNAL_SERVER_ERROR,
        ErrorCategory.EXTERNAL_SERVICE: status.HTTP_503_SERVICE_UNAVAILABLE,
        ErrorCategory.SERVER_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
        ErrorCategory.CONFIGURATION: status.HTTP_500_INTERNAL_SERVER_ERROR,
    }
    
    @classmethod
    def handle_error(
        cls,
        error: Exception,
        category: ErrorCategory = ErrorCategory.SERVER_ERROR,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        context: Optional[Dict[str, Any]] = None,
        user_message: Optional[str] = None,
        request=None
    ) -> Tuple[Dict[str, Any], int]:
        """
        Handle an error with proper categorization and sanitization.
        
        Args:
            error: The exception that occurred
            category: Error category for proper handling
            severity: Error severity level
            context: Additional context for logging
            user_message: Custom user-facing message
            request: Django request object for additional context
            
        Returns:
            Tuple of (error_response_dict, http_status_code)
        """
        # Generate unique error ID for tracking
        error_id = str(uuid.uuid4())
        
        # Determine if we're in debug mode
        is_debug = getattr(settings, 'DEBUG', False)
        
        # Extract request context
        request_context = cls._extract_request_context(request) if request else {}
        
        # Log the error with full details
        cls._log_error(error, category, severity, error_id, context, request_context)
        
        # Create sanitized response
        response_data = cls._create_error_response(
            error, category, error_id, user_message, is_debug
        )
        
        # Get appropriate HTTP status code
        status_code = cls.STATUS_CODES.get(category, status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return response_data, status_code
    
    @classmethod
    def _extract_request_context(cls, request) -> Dict[str, Any]:
        """Extract relevant context from Django request."""
        context = {}
        
        if request:
            context.update({
                'method': request.method,
                'path': request.path,
                'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') else None,
                'user_email': getattr(request.user, 'email', None) if hasattr(request, 'user') else None,
                'ip_address': cls._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            })
        
        return context
    
    @classmethod
    def _get_client_ip(cls, request) -> str:
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip
    
    @classmethod
    def _log_error(
        cls,
        error: Exception,
        category: ErrorCategory,
        severity: ErrorSeverity,
        error_id: str,
        context: Optional[Dict[str, Any]],
        request_context: Dict[str, Any]
    ) -> None:
        """Log error with appropriate level and context."""
        
        # Prepare log context
        log_context = {
            'error_id': error_id,
            'category': category.value,
            'severity': severity.value,
            'error_type': type(error).__name__,
            'error_message': str(error),
            **request_context,
            **(context or {})
        }
        
        # Log with appropriate level based on severity
        log_message = f"Error {error_id}: {category.value} - {str(error)}"
        
        if severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message, extra=log_context, exc_info=True)
        elif severity == ErrorSeverity.HIGH:
            logger.error(log_message, extra=log_context, exc_info=True)
        elif severity == ErrorSeverity.MEDIUM:
            logger.warning(log_message, extra=log_context)
        else:
            logger.info(log_message, extra=log_context)
    
    @classmethod
    def _create_error_response(
        cls,
        error: Exception,
        category: ErrorCategory,
        error_id: str,
        user_message: Optional[str],
        is_debug: bool
    ) -> Dict[str, Any]:
        """Create sanitized error response."""
        
        # Base response structure
        response = {
            'error': True,
            'error_id': error_id,
            'category': category.value,
            'message': user_message or cls.PRODUCTION_ERROR_MESSAGES.get(
                category, "An error occurred."
            )
        }
        
        # Add debug information only in development
        if is_debug:
            response.update({
                'debug_info': {
                    'error_type': type(error).__name__,
                    'error_message': str(error),
                    'traceback': traceback.format_exc()
                }
            })
        
        return response
    
    @classmethod
    def categorize_error(cls, error: Exception) -> ErrorCategory:
        """Automatically categorize an error based on its type."""
        
        if isinstance(error, (AuthenticationFailed,)):
            return ErrorCategory.AUTHENTICATION
        
        elif isinstance(error, (PermissionDenied,)):
            return ErrorCategory.AUTHORIZATION
        
        elif isinstance(error, (ValidationError, DjangoValidationError, ValueError)):
            return ErrorCategory.VALIDATION
        
        elif isinstance(error, (IntegrityError, DatabaseError)):
            return ErrorCategory.DATABASE
        
        elif "does not exist" in str(error).lower():
            return ErrorCategory.NOT_FOUND
        
        elif "rate limit" in str(error).lower() or "throttle" in str(error).lower():
            return ErrorCategory.RATE_LIMIT
        
        else:
            return ErrorCategory.SERVER_ERROR
    
    @classmethod
    def determine_severity(cls, error: Exception, category: ErrorCategory) -> ErrorSeverity:
        """Determine error severity based on type and category."""
        
        if category in [ErrorCategory.DATABASE, ErrorCategory.CONFIGURATION]:
            return ErrorSeverity.HIGH
        
        elif category in [ErrorCategory.SERVER_ERROR, ErrorCategory.EXTERNAL_SERVICE]:
            return ErrorSeverity.MEDIUM
        
        elif category in [ErrorCategory.AUTHENTICATION, ErrorCategory.AUTHORIZATION]:
            return ErrorSeverity.MEDIUM
        
        else:
            return ErrorSeverity.LOW


# Convenience functions for common error scenarios
def handle_authentication_error(error: Exception, request=None, user_message: str = None) -> Tuple[Dict[str, Any], int]:
    """Handle authentication errors."""
    return ErrorHandler.handle_error(
        error,
        category=ErrorCategory.AUTHENTICATION,
        severity=ErrorSeverity.MEDIUM,
        user_message=user_message,
        request=request
    )


def handle_validation_error(error: Exception, request=None, user_message: str = None) -> Tuple[Dict[str, Any], int]:
    """Handle validation errors."""
    return ErrorHandler.handle_error(
        error,
        category=ErrorCategory.VALIDATION,
        severity=ErrorSeverity.LOW,
        user_message=user_message,
        request=request
    )


def handle_database_error(error: Exception, request=None, context: Dict[str, Any] = None) -> Tuple[Dict[str, Any], int]:
    """Handle database errors."""
    return ErrorHandler.handle_error(
        error,
        category=ErrorCategory.DATABASE,
        severity=ErrorSeverity.HIGH,
        context=context,
        request=request
    )


def handle_server_error(error: Exception, request=None, context: Dict[str, Any] = None) -> Tuple[Dict[str, Any], int]:
    """Handle general server errors."""
    return ErrorHandler.handle_error(
        error,
        category=ErrorCategory.SERVER_ERROR,
        severity=ErrorSeverity.MEDIUM,
        context=context,
        request=request
    )


# Custom DRF exception handler
def custom_exception_handler(exc, context):
    """
    Custom exception handler for Django REST Framework.
    
    This replaces the default DRF exception handler to provide
    consistent error formatting and proper sanitization.
    """
    
    # Call DRF's default exception handler first
    response = drf_exception_handler(exc, context)
    
    # If DRF handled the exception, customize the response
    if response is not None:
        request = context.get('request')
        
        # Categorize the error
        category = ErrorHandler.categorize_error(exc)
        severity = ErrorHandler.determine_severity(exc, category)
        
        # Handle the error through our system
        error_data, status_code = ErrorHandler.handle_error(
            exc,
            category=category,
            severity=severity,
            request=request
        )
        
        # Update the response
        response.data = error_data
        response.status_code = status_code
    
    return response


# Decorator for view error handling
def handle_view_errors(category: ErrorCategory = ErrorCategory.SERVER_ERROR, 
                      severity: ErrorSeverity = ErrorSeverity.MEDIUM):
    """
    Decorator to automatically handle errors in views.
    
    Usage:
        @handle_view_errors(category=ErrorCategory.VALIDATION)
        def my_view(request):
            # view logic
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            try:
                return view_func(request, *args, **kwargs)
            except Exception as e:
                error_data, status_code = ErrorHandler.handle_error(
                    e,
                    category=category,
                    severity=severity,
                    request=request
                )
                return JsonResponse(error_data, status=status_code)
        return wrapper
    return decorator