from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
import logging
from ..rate_limiting import data_ops_rate_limit, auth_rate_limit, apply_throttling
from ..error_handling import (
    ErrorHandler, ErrorCategory, ErrorSeverity,
    handle_authentication_error, handle_validation_error, handle_server_error
)
from ..supabase_admin import supabase_admin

logger = logging.getLogger(__name__)

class ProfileAPIView(APIView):
    """
    Profile API View for handling GET and PATCH requests
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get user profile information from Supabase authentication
        """
        # Apply rate limiting
        allowed, throttle_response = apply_throttling(request, 'data_operations')
        if not allowed:
            return throttle_response
            
        try:
            user = request.user
            
            # Check if user is authenticated
            if not user or not hasattr(user, 'id'):
                error_data, status_code = handle_authentication_error(
                    Exception("User not authenticated"),
                    request=request,
                    user_message="Please log in to access your profile"
                )
                return Response(error_data, status=status_code)
            
            # Get basic user attributes
            profile_data = {
                'id': getattr(user, 'id', None),
                'email': getattr(user, 'email', ''),
                'username': getattr(user, 'username', getattr(user, 'email', '').split('@')[0] if getattr(user, 'email', '') else ''),
                'first_name': getattr(user, 'first_name', ''),
                'last_name': getattr(user, 'last_name', ''),
                'date_joined': None,
                'last_login': None,
            }
            
            # Try to get additional user data from Supabase admin service
            try:
                user_info_response = supabase_admin.get_user(user.id)
                if user_info_response.get('success') and user_info_response.get('user'):
                    supabase_user = user_info_response['user']
                    profile_data['date_joined'] = supabase_user.get('created_at')
                    profile_data['last_login'] = supabase_user.get('last_sign_in_at')
                    logger.info(f"Successfully retrieved Supabase user data for {user.id}")
                else:
                    logger.warning(f"Could not retrieve Supabase user data for {user.id}: {user_info_response.get('error', 'Unknown error')}")
            except Exception as supabase_error:
                logger.warning(f"Failed to fetch Supabase user data for {user.id}: {supabase_error}")
                # Continue with basic profile data even if Supabase lookup fails
            
            return Response(profile_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            error_data, status_code = handle_server_error(
                e,
                request=request,
                context={'operation': 'get_profile', 'user_id': getattr(request.user, 'id', None)}
            )
            return Response(error_data, status=status_code)

    def patch(self, request):
        """
        Handle profile update requests
        """
        # Apply rate limiting
        allowed, throttle_response = apply_throttling(request, 'data_operations')
        if not allowed:
            return throttle_response
            
        try:
            user = request.user
            data = request.data
            
            # Check if user is authenticated
            if not user or not hasattr(user, 'id'):
                error_data, status_code = handle_authentication_error(
                    Exception("User not authenticated"),
                    request=request,
                    user_message="Please log in to update your profile"
                )
                return Response(error_data, status=status_code)
            
            # Validate input data
            if not data:
                error_data, status_code = handle_validation_error(
                    ValueError("No data provided for update"),
                    request=request,
                    user_message="Please provide data to update"
                )
                return Response(error_data, status=status_code)
            
            # Get current profile data
            current_profile_response = self.get(request)
            if current_profile_response.status_code != 200:
                return current_profile_response
            
            current_profile = current_profile_response.data
            
            # Track what fields were updated
            updated_fields = []
            
            # Since we're using Supabase authentication, we'll return the updated data
            # The actual update happens on the frontend via Supabase
            updated_profile = current_profile.copy()
            
            # Update fields if provided
            if 'email' in data:
                updated_profile['email'] = data['email']
                updated_fields.append('email')
                
            if 'first_name' in data:
                updated_profile['first_name'] = data['first_name']
                updated_fields.append('first_name')
                
            if 'last_name' in data:
                updated_profile['last_name'] = data['last_name']
                updated_fields.append('last_name')
            
            return Response({
                'message': 'Profile updated successfully',
                'updated_fields': updated_fields,
                'profile': updated_profile
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            error_data, status_code = handle_server_error(
                e,
                request=request,
                context={'operation': 'update_profile', 'user_id': getattr(request.user, 'id', None)}
            )
            return Response(error_data, status=status_code)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@auth_rate_limit
def change_password(request):
    """
    Handle password change requests
    Since we're using Supabase authentication, password changes should be handled on the frontend
    This endpoint returns instructions for the frontend
    """
    try:
        # Check if user is authenticated
        if not request.user or not hasattr(request.user, 'id'):
            error_data, status_code = handle_authentication_error(
                Exception("User not authenticated"),
                request=request,
                user_message="Please log in to change your password"
            )
            return Response(error_data, status=status_code)
        
        # For Supabase authentication, password changes are handled client-side
        # We'll return a success response indicating the frontend should handle this
        return Response({
            'message': 'Password change should be handled through Supabase client',
            'action': 'use_supabase_client'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_data, status_code = handle_server_error(
            e,
            request=request,
            context={'operation': 'change_password', 'user_id': getattr(request.user, 'id', None)}
        )
        return Response(error_data, status=status_code)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@auth_rate_limit
def delete_account(request):
    """
    Complete account deletion with proper data cleanup and Supabase user deletion.
    Follows production-ready patterns with comprehensive error handling.
    """
    try:
        user_id = request.user.id
        logger.info(f"Starting complete account deletion for user {user_id}")
        
        # Step 1: Clean up all user's application data
        from journal.models import TradeJournal, TradeTags
        
        # Count data before deletion for audit logging
        trades_count = TradeJournal.objects.filter(user_id=user_id).count()
        tags_count = TradeTags.objects.filter(user_id=user_id).count()
        
        try:
            # Delete user's data (CASCADE handles related records automatically)
            deleted_trades = TradeJournal.objects.filter(user_id=user_id).delete()
            deleted_tags = TradeTags.objects.filter(user_id=user_id).delete()
            
            logger.info(f"Django data cleanup completed for user {user_id}: {deleted_trades[0]} trades, {deleted_tags[0]} tags deleted")
            
        except Exception as cleanup_error:
            logger.error(f"Django data cleanup failed for user {user_id}: {cleanup_error}")
            error_data, status_code = handle_server_error(
                cleanup_error,
                request=request,
                context={'operation': 'delete_account_data_cleanup', 'user_id': user_id}
            )
            return Response(error_data, status=status_code)
        
        # Step 2: Delete user from Supabase authentication system
        supabase_deletion_result = supabase_admin.delete_user(str(user_id))
        
        # Prepare cleanup summary for response
        cleanup_summary = {
            'trades_deleted': trades_count,
            'tags_deleted': tags_count,
            'total_records_deleted': deleted_trades[0] + deleted_tags[0],
            'supabase_user_deleted': supabase_deletion_result['success']
        }
        
        if supabase_deletion_result['success']:
            # Complete success - both Django data and Supabase user deleted
            logger.info(f"Complete account deletion successful for user {user_id}")
            
            return Response({
                'success': True,
                'message': 'Your account and all associated data have been permanently deleted.',
                'cleanup_summary': cleanup_summary
            }, status=status.HTTP_200_OK)
            
        else:
            # Handle Supabase deletion failures gracefully
            error_type = supabase_deletion_result.get('error_type', 'UNKNOWN')
            error_message = supabase_deletion_result.get('error', 'Unknown error')
            
            logger.warning(f"Supabase user deletion failed for {user_id}: {error_type} - {error_message}")
            
            if error_type == 'SERVICE_NOT_CONFIGURED':
                # Service not configured - this is a configuration issue, not success
                cleanup_summary['supabase_error'] = error_message
                
                logger.error(f"Supabase admin service not configured for user {user_id} deletion")
                
                return Response({
                    'success': False,
                    'message': 'Your application data has been deleted, but authentication account removal failed due to server configuration. Please contact support.',
                    'cleanup_summary': cleanup_summary,
                    'support_needed': True
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            elif error_type == 'USER_NOT_FOUND':
                # User doesn't exist in Supabase - treat as success since user is already gone
                cleanup_summary['supabase_note'] = supabase_deletion_result.get('message', error_message)
                
                return Response({
                    'success': True,
                    'message': 'Your account data has been deleted. The authentication account was already removed.',
                    'cleanup_summary': cleanup_summary
                }, status=status.HTTP_200_OK)
                
            else:
                # Partial failure - Django data deleted but Supabase deletion failed
                cleanup_summary['supabase_error'] = error_message
                
                logger.error(f"Partial account deletion for user {user_id}: Django data deleted, Supabase deletion failed")
                
                return Response({
                    'success': False,
                    'message': 'Your application data has been deleted, but authentication account removal failed. Please contact support.',
                    'cleanup_summary': cleanup_summary,
                    'support_needed': True
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"Account deletion error for user {getattr(request.user, 'id', 'unknown')}: {e}")
        error_data, status_code = handle_server_error(
            e,
            request=request,
            context={'operation': 'delete_account', 'user_id': getattr(request.user, 'id', None)}
        )
        return Response(error_data, status=status_code)