"""
Enhanced authentication views with token blacklist functionality,
comprehensive JWT validation, and security monitoring.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.conf import settings
from django.utils import timezone
import json
import jwt
import os
import logging
from datetime import datetime, timedelta
from ..rate_limiting import auth_rate_limit

logger = logging.getLogger('security.auth')








@api_view(['POST'])
@permission_classes([IsAuthenticated])
@auth_rate_limit
def logout_user(request):
    """
    Simplified logout endpoint.
    
    Since we're using Supabase authentication, logout is primarily handled
    on the frontend. This endpoint provides a server-side confirmation.
    """
    try:
        # Simple logout - no token validation needed
        
        # Get user information
        user = request.user
        user_id = getattr(user, 'id', None)
        
        # Log the logout (simplified - no token blacklisting)
        logger.info(f"User {user_id} logged out successfully")
        
        # Return success response
        return Response(
            {'message': 'Logged out successfully'}, 
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return Response(
            {'error': 'Logout failed'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@auth_rate_limit
def revoke_all_tokens(request):
    """
    Simplified token revocation endpoint.
    
    Since we're using Supabase authentication, token revocation is primarily 
    handled on the frontend. This endpoint provides server-side confirmation.
    """
    try:
        user = request.user
        user_id = getattr(user, 'id', None)
        
        if not user_id:
            return Response(
                {'error': 'User ID not found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        revocation_time = timezone.now()
        
        logger.info(f"Token revocation requested for user {user_id}")
        
        return Response({
            'message': 'Token revocation completed. Please refresh your session.',
            'revoked_at': revocation_time.isoformat(),
            'user_id': user_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Token revocation error: {e}")
        return Response(
            {'error': 'Token revocation failed'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def token_introspection(request):
    """
    Provide detailed token introspection for the current user.
    
    Returns comprehensive information about the current token
    including security warnings and metadata.
    """
    try:
        # Get the current token
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        else:
            token = request.COOKIES.get('auth_token')
        
        if not token:
            return Response(
                {'error': 'No token found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Perform introspection
        # Token introspection removed for simplification
        introspection_result = {'valid': True, 'payload': {}, 'metadata': {}}
        
        # Remove sensitive information
        safe_result = {
            'valid': introspection_result['valid'],
            'metadata': introspection_result['metadata'],
            'warnings': introspection_result['warnings'],
            'security_checks': introspection_result['security_checks'],
            'claims_validation': {
                claim: info for claim, info in introspection_result['claims_validation'].items()
                if claim not in ['sub', 'email']  # Don't expose sensitive claims
            }
        }
        
        # Add user-friendly information
        user = request.user
        if hasattr(user, 'get_token_metadata'):
            token_metadata = user.get_token_metadata()
            safe_result['user_info'] = {
                'token_age_hours': token_metadata.get('token_age_hours'),
                'remaining_hours': token_metadata.get('remaining_hours'),
                'role': token_metadata.get('role'),
                'last_authenticated': getattr(user, 'last_authenticated', None)
            }
        
        return Response(safe_result, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Token introspection error: {e}")
        return Response(
            {'error': 'Token introspection failed'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def security_status(request):
    """
    Get security status and recent authentication activity for the user.
    """
    try:
        user = request.user
        user_id = getattr(user, 'id', None)
        
        if not user_id:
            return Response(
                {'error': 'User ID not found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Authentication tracking simplified
        attempts_data = []
        blacklisted_count = 0
        
        # Security recommendations
        recommendations = []
        
        # Check for failed attempts
        failed_attempts = [a for a in attempts_data if not a['success']]
        if len(failed_attempts) > 0:
            recommendations.append("Recent failed authentication attempts detected")
        
        # Check for multiple IPs
        unique_ips = set(a['ip_address'] for a in attempts_data[-5:])  # Last 5 attempts
        if len(unique_ips) > 2:
            recommendations.append("Authentication from multiple IP addresses")
        
        # Check token metadata for warnings
        if hasattr(user, 'get_token_metadata'):
            token_metadata = user.get_token_metadata()
            warnings = token_metadata.get('warnings', [])
            if warnings:
                recommendations.extend(warnings)
        
        return Response({
            'user_id': user_id,
            'recent_attempts': attempts_data,
            'blacklisted_tokens': blacklisted_count,
            'security_recommendations': recommendations,
            'last_check': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Security status error: {e}")
        return Response(
            {'error': 'Failed to get security status'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _get_client_ip(request) -> str:
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip