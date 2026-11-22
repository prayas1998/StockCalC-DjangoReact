from contextlib import closing
from datetime import datetime, timezone
from http.client import HTTPException, HTTPSConnection
import json
import jwt
from time import time
from urllib.parse import urlsplit
from uuid import UUID

from django.conf import settings
from rest_framework import authentication, exceptions, status


class AuthenticationUnavailable(exceptions.APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Authentication service is temporarily unavailable.'


def get_project_user(token):
    public_key = getattr(settings, 'SUPABASE_PUBLISHABLE_KEY', None)
    try:
        project = urlsplit(getattr(settings, 'SUPABASE_URL', None) or '')
        if (
            not public_key or project.scheme != 'https' or not project.hostname
            or project.username is not None or project.query or project.fragment
        ):
            raise AuthenticationUnavailable()

        # Connect to the configured project only. HTTPSConnection does not follow redirects.
        with closing(HTTPSConnection(project.hostname, project.port, timeout=5)) as connection:
            connection.request('GET', f"{project.path.rstrip('/')}/auth/v1/user", headers={
                'apikey': public_key,
                'Authorization': f'Bearer {token}',
                'Accept': 'application/json',
            })
            response = connection.getresponse()
            if response.status in (400, 401, 403, 404):
                raise exceptions.AuthenticationFailed('Invalid authentication token. Please log in again.')
            if response.status != 200:
                raise AuthenticationUnavailable()
            user = json.load(response)
    except (OSError, HTTPException, ValueError):
        raise AuthenticationUnavailable() from None

    if not isinstance(user, dict):
        raise AuthenticationUnavailable()
    return user


class SupabaseUser:
    """Simplified Supabase user class."""
    
    def __init__(self, user_id, email, first_name, last_name, *, issued_at=None, expires_at=None):
        self.id = user_id
        self.pk = user_id  # Add pk attribute for Django compatibility
        self.email = email
        self.first_name = first_name
        self.last_name = last_name
        self.token_issued_at = issued_at
        self.token_expires_at = expires_at
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
    """Authenticate callers against the configured Supabase project's Auth service."""
    
    def authenticate(self, request):
        credentials = authentication.get_authorization_header(request).split()
        if not credentials or credentials[0].lower() != b'bearer':
            return None
        if len(credentials) != 2:
            raise exceptions.AuthenticationFailed('Invalid authentication token. Please log in again.')

        # Reject malformed and expired inputs locally. Only the project can verify signatures.
        try:
            token = credentials[1].decode('ascii')
            claims = jwt.decode(token, options={"verify_signature": False})
            subject = str(UUID(claims.get('sub', '')))
        except (jwt.PyJWTError, TypeError, ValueError, AttributeError):
            raise exceptions.AuthenticationFailed('Invalid authentication token. Please log in again.') from None

        issued_at = claims.get('iat')
        expires_at = claims.get('exp')
        now = int(time())
        if type(issued_at) is not int or type(expires_at) is not int or issued_at > now + 60:
            raise exceptions.AuthenticationFailed('Invalid authentication token. Please log in again.')
        if expires_at <= now:
            raise exceptions.AuthenticationFailed('Your session has expired. Please log in again.')

        try:
            issued_at = datetime.fromtimestamp(issued_at, tz=timezone.utc)
            expires_at = datetime.fromtimestamp(expires_at, tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            raise exceptions.AuthenticationFailed('Invalid authentication token. Please log in again.') from None

        account = get_project_user(token)
        email = account.get('email')
        if (
            account.get('id') != subject or account.get('role') != 'authenticated'
            or account.get('is_anonymous') is True or not isinstance(email, str) or not email.strip()
        ):
            raise exceptions.AuthenticationFailed('Invalid authentication token. Please log in again.')

        metadata = account.get('user_metadata')
        if not isinstance(metadata, dict):
            metadata = {}
        user = SupabaseUser(
            user_id=account['id'],
            email=email,
            first_name=metadata.get('first_name') or '',
            last_name=metadata.get('last_name') or '',
            issued_at=issued_at,
            expires_at=expires_at,
        )
        return user, token

    def authenticate_header(self, request):
        return 'Bearer'
