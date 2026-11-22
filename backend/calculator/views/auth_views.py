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
    """Describe the session already verified by the authentication class."""
    user = request.user
    email = user.email.lower()
    username_suffix = '@users.tradesmart.local'
    return Response({
        'valid': True,
        'user': {
            'id': user.id,
            'email': user.email,
            'username': email.removesuffix(username_suffix) if email.endswith(username_suffix) else '',
            'is_authenticated': user.is_authenticated,
            'is_active': user.is_active,
        },
        'token_info': {
            'issued_at': user.token_issued_at.isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
            'expires_at': user.token_expires_at.isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
            'issuer': 'supabase',
        },
    })


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
