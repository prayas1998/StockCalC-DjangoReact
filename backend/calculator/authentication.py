from rest_framework import authentication
from rest_framework import exceptions
from django.contrib.auth.models import User
import jwt
import os

class SupabaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None
        try:
            if not auth_header.startswith('Bearer '):
                return None
            token = auth_header.split(' ')[1]
            jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
            if not jwt_secret:
                raise exceptions.AuthenticationFailed('JWT secret not configured')
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=['HS256'],
                options={"verify_signature": True, "verify_aud": False}
            )
            user_id = payload.get('sub')
            if not user_id:
                raise exceptions.AuthenticationFailed('Invalid token payload')
            user, created = User.objects.get_or_create(
                username=user_id,
                defaults={
                    'email': payload.get('email', ''),
                    'is_active': True
                }
            )
            return (user, token)
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid token')
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Authentication failed: {str(e)}') 