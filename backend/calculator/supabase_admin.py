"""
Production-ready Supabase Admin Service for server-side user management.
Follows all guidelines from .agent.md for maintainable, secure code.
"""

import logging
from typing import Optional, Dict, Any
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger('security.supabase')


class SupabaseAdminService:
    """
    Production-ready Supabase admin service for user management operations.
    
    Features:
    - Proper error handling and logging
    - Configuration validation
    - Graceful degradation when not configured
    - Security-focused implementation
    - Comprehensive audit logging
    """
    
    def __init__(self):
        """Initialize the Supabase admin service with proper validation."""
        self._client = None
        self._is_configured = False
        self._initialize_service()
    
    def _initialize_service(self) -> None:
        """
        Initialize Supabase admin service with comprehensive validation.
        Follows security best practices and graceful error handling.
        """
        try:
            supabase_url = getattr(settings, 'SUPABASE_URL', None)
            service_role_key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', None)
            
            if not supabase_url or not service_role_key or (isinstance(supabase_url, str) and supabase_url.strip() == '') or (isinstance(service_role_key, str) and service_role_key.strip() == ''):
                logger.warning(
                    "Supabase admin service not configured. "
                    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for full account deletion functionality."
                )
                self._is_configured = False
                return
            
            # Validate URL format
            if not supabase_url.startswith('https://'):
                logger.error("SUPABASE_URL must use HTTPS protocol")
                self._is_configured = False
                return
            
            # Validate service role key format (should be a JWT)
            if not service_role_key.startswith('eyJ'):
                logger.error("SUPABASE_SERVICE_ROLE_KEY appears to be invalid (should be a JWT token)")
                self._is_configured = False
                return
            
            # Initialize Supabase client
            from supabase import create_client
            self._client = create_client(supabase_url, service_role_key)
            self._is_configured = True
            
            logger.info("Supabase admin service initialized successfully")
            
        except ImportError as import_error:
            logger.error(
                "Supabase Python client not installed. "
                "Run 'pip install supabase' to enable account deletion functionality. "
                f"Import error: {import_error}"
            )
            self._is_configured = False
        except Exception as e:
            logger.error(f"Failed to initialize Supabase admin service: {e}")
            self._is_configured = False
    
    def is_configured(self) -> bool:
        """Check if the admin service is properly configured."""
        return self._is_configured
    
    def delete_user(self, user_id: str) -> Dict[str, Any]:
        """
        Delete a user from Supabase authentication with comprehensive error handling.
        
        Args:
            user_id: The UUID of the user to delete
            
        Returns:
            Dictionary containing deletion result and metadata
        """
        # Input validation
        if not user_id or not isinstance(user_id, str):
            logger.warning(f"Invalid user_id provided for deletion: {user_id}")
            return {
                'success': False,
                'user_id': user_id,
                'error': 'Invalid user ID format',
                'error_type': 'INVALID_INPUT'
            }
        
        # Check if service is configured
        if not self.is_configured():
            logger.warning(f"Cannot delete user {user_id} - Supabase admin service not configured")
            return {
                'success': False,
                'user_id': user_id,
                'error': 'Supabase admin service not configured',
                'error_type': 'SERVICE_NOT_CONFIGURED'
            }
        
        # Attempt user deletion with comprehensive error handling
        try:
            logger.info(f"Attempting to delete Supabase user: {user_id}")
            
            # Check if user exists first (optional but good practice)
            try:
                user_response = self._client.auth.admin.get_user_by_id(user_id)
                if not user_response or not user_response.user:
                    logger.info(f"User {user_id} not found in Supabase - may already be deleted")
                    return {
                        'success': True,  # Treat as success since user doesn't exist
                        'user_id': user_id,
                        'message': 'User not found - may already be deleted',
                        'error_type': 'USER_NOT_FOUND'
                    }
            except Exception as check_error:
                logger.warning(f"Could not verify user existence for {user_id}: {check_error}")
                # Continue with deletion attempt anyway
            
            # Perform the actual deletion
            deletion_response = self._client.auth.admin.delete_user(user_id)
            
            # Check if deletion was successful
            if deletion_response and hasattr(deletion_response, 'user') and deletion_response.user is None:
                # Successful deletion - user should be None after deletion
                logger.info(f"Successfully deleted Supabase user: {user_id}")
                return {
                    'success': True,
                    'user_id': user_id,
                    'message': 'User successfully deleted from Supabase',
                    'response': deletion_response
                }
            elif deletion_response:
                # Log successful deletion for audit purposes
                logger.info(f"Successfully deleted Supabase user: {user_id}")
                return {
                    'success': True,
                    'user_id': user_id,
                    'message': 'User successfully deleted from Supabase',
                    'response': deletion_response
                }
            else:
                # Unexpected response
                logger.warning(f"Unexpected response from Supabase delete_user for {user_id}: {deletion_response}")
                return {
                    'success': False,
                    'user_id': user_id,
                    'error': 'Unexpected response from Supabase',
                    'error_type': 'UNEXPECTED_RESPONSE'
                }
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"Failed to delete Supabase user {user_id}: {error_message}")
            
            # Categorize errors for better handling
            if "User not found" in error_message or "404" in error_message:
                return {
                    'success': True,  # Treat as success since user doesn't exist
                    'user_id': user_id,
                    'message': 'User not found - may already be deleted',
                    'error_type': 'USER_NOT_FOUND'
                }
            elif "Invalid user ID" in error_message or "400" in error_message:
                return {
                    'success': False,
                    'user_id': user_id,
                    'error': 'Invalid user ID format',
                    'error_type': 'INVALID_USER_ID'
                }
            elif "Unauthorized" in error_message or "401" in error_message:
                return {
                    'success': False,
                    'user_id': user_id,
                    'error': 'Unauthorized - check service role key',
                    'error_type': 'UNAUTHORIZED'
                }
            else:
                return {
                    'success': False,
                    'user_id': user_id,
                    'error': f'Deletion failed: {error_message}',
                    'error_type': 'DELETION_FAILED'
                }
    
    def get_user(self, user_id: str) -> Dict[str, Any]:
        """
        Get user information from Supabase for verification purposes.
        
        Args:
            user_id: The UUID of the user to retrieve
            
        Returns:
            Dictionary containing user information or error details
        """
        if not self.is_configured():
            return {
                'success': False,
                'error': 'Supabase admin service not configured',
                'error_type': 'SERVICE_NOT_CONFIGURED'
            }
        
        try:
            logger.info(f"Retrieving Supabase user info: {user_id}")
            
            user_response = self._client.auth.admin.get_user_by_id(user_id)
            
            if user_response and user_response.user:
                return {
                    'success': True,
                    'user': {
                        'id': user_response.user.id,
                        'email': user_response.user.email,
                        'created_at': user_response.user.created_at,
                        'last_sign_in_at': user_response.user.last_sign_in_at,
                        'email_confirmed_at': user_response.user.email_confirmed_at
                    }
                }
            else:
                return {
                    'success': False,
                    'error': 'User not found',
                    'error_type': 'USER_NOT_FOUND'
                }
                
        except Exception as e:
            logger.error(f"Failed to retrieve Supabase user {user_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'error_type': 'RETRIEVAL_FAILED'
            }
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check of the Supabase admin service.
        
        Returns:
            Dictionary containing health status and configuration info
        """
        return {
            'configured': self.is_configured(),
            'supabase_url_set': bool(getattr(settings, 'SUPABASE_URL', None)),
            'service_role_key_set': bool(getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', None)),
            'client_initialized': self._client is not None
        }


# Global instance for use across the application
# Follows singleton pattern for efficient resource usage
supabase_admin = SupabaseAdminService()