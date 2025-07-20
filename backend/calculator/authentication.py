from rest_framework import authentication
from rest_framework import exceptions
import jwt
import os
import logging
from datetime import datetime, timezone
from django.conf import settings

logger = logging.getLogger('security.auth')

class SupabaseUser:
    """Simplified Supabase user class."""
    
    def __init__(self, user_id, email, first_name, last_name):
        self.id = user_id
        self.pk = user_id  # Add pk attribute for Django compatibility
        self.email = email
        self.first_name = first_name
        self.last_name = last_name
        self.is_authenticated = True
        self.is_active = True
        self.is_anonymous = False
        self.is_staff = False
        self.is_superuser = False
    
    def __str__(self):
        return f"SupabaseUser({self.id})"
    
    def __repr__(self):
        return f"SupabaseUser(id={self.id}, email={self.email})"
    
    # Add methods that Django components might expect
    def get_username(self):
        return self.email
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
    
    def get_short_name(self):
        return self.first_name or self.email
    
    def has_perm(self, perm, obj=None):
        return False
    
    def has_perms(self, perm_list, obj=None):
        return False
    
    def has_module_perms(self, package_name):
        return False


class SupabaseAuthentication(authentication.BaseAuthentication):
    """
    Simplified Supabase authentication with basic JWT validation.
    """
    
    def authenticate(self, request):
        """
        Authenticate request using simplified JWT validation.
        """
        # Extract token from request
        token = self._extract_token(request)
        if not token:
            return None
        
        try:
            # Get JWT secret
            jwt_secret = getattr(settings, 'SUPABASE_JWT_SECRET', None)
            if not jwt_secret:
                jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
            
            if not jwt_secret:
                logger.error("JWT secret not configured")
                raise exceptions.AuthenticationFailed('Authentication service not configured')
            
            # Decode and validate token
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=['HS256'],
                options={"verify_signature": True, "verify_aud": False}
            )
            
            # Extract user information
            user_id = payload.get('sub')
            email = payload.get('email', '')
            user_metadata = payload.get('user_metadata', {})
            
            # Extract user names
            first_name = user_metadata.get('first_name', '')
            last_name = user_metadata.get('last_name', '')
            
            # Create user instance
            user = SupabaseUser(
                user_id=user_id,
                email=email,
                first_name=first_name,
                last_name=last_name
            )
            
            logger.info(f"Authentication successful for {email}")
            return (user, token)
            
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Your session has expired. Please log in again.')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid authentication token. Please log in again.')
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            raise exceptions.AuthenticationFailed('Authentication failed')
    
    def _extract_token(self, request):
        """
        Extract JWT token from request headers.
        """
        # Try Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            return auth_header.split(' ')[1]
        
        return None