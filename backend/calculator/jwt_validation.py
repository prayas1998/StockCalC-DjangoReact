"""
Enhanced JWT validation utilities with comprehensive token introspection,
claims validation, and security features.
"""

import jwt
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Tuple
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone as django_timezone
# Models removed for simplification - using Supabase authentication


logger = logging.getLogger('security.auth')


class JWTValidationError(Exception):
    """Custom exception for JWT validation errors."""
    pass


class TokenIntrospector:
    """
    Comprehensive JWT token introspection and validation utility.
    
    Provides detailed token analysis, claims validation, and security checks
    beyond basic JWT verification.
    """
    
    # Required claims for Supabase tokens
    REQUIRED_CLAIMS = ['sub', 'email', 'iat', 'exp']
    
    # Optional but recommended claims
    OPTIONAL_CLAIMS = ['aud', 'iss', 'role', 'user_metadata']
    
    # Maximum token age (for additional security)
    MAX_TOKEN_AGE_HOURS = 24
    
    def __init__(self, jwt_secret: str = None):
        """
        Initialize the token introspector.
        
        Args:
            jwt_secret: JWT secret for token validation
        """
        self.jwt_secret = jwt_secret or getattr(settings, 'SUPABASE_JWT_SECRET', None)
        if not self.jwt_secret:
            raise JWTValidationError("JWT secret not configured")
    
    def introspect_token(self, token: str, request=None) -> Dict[str, Any]:
        """
        Perform comprehensive token introspection.
        
        Args:
            token: JWT token to introspect
            request: Django request object for logging
            
        Returns:
            Dictionary with token introspection results
            
        Raises:
            JWTValidationError: If token validation fails
        """
        introspection_result = {
            'valid': False,
            'payload': None,
            'header': None,
            'claims_validation': {},
            'security_checks': {},
            'errors': [],
            'warnings': [],
            'metadata': {}
        }
        
        try:
            # Extract token header without verification
            header = self._extract_token_header(token)
            introspection_result['header'] = header
            
            # Validate token structure
            self._validate_token_structure(token, introspection_result)
            
            # Decode and verify token
            payload = self._decode_and_verify_token(token, introspection_result)
            introspection_result['payload'] = payload
            
            if payload:
                # Validate claims
                self._validate_claims(payload, introspection_result)
                
                # Perform security checks
                self._perform_security_checks(token, payload, introspection_result, request)
                
                # Check token blacklist
                self._check_token_blacklist(token, payload, introspection_result)
                
                # Validate token age and freshness
                self._validate_token_freshness(payload, introspection_result)
                
                # Extract metadata
                self._extract_token_metadata(payload, introspection_result)
                
                # Determine overall validity
                introspection_result['valid'] = len(introspection_result['errors']) == 0
            
            # Log introspection attempt
            self._log_introspection_attempt(introspection_result, request)
            
        except Exception as e:
            introspection_result['errors'].append(f"Introspection failed: {str(e)}")
            logger.error(f"Token introspection error: {e}")
        
        return introspection_result
    
    def _extract_token_header(self, token: str) -> Dict[str, Any]:
        """Extract JWT header without verification."""
        try:
            return jwt.get_unverified_header(token)
        except Exception as e:
            raise JWTValidationError(f"Failed to extract token header: {e}")
    
    def _validate_token_structure(self, token: str, result: Dict[str, Any]) -> None:
        """Validate basic token structure."""
        parts = token.split('.')
        if len(parts) != 3:
            result['errors'].append("Invalid JWT structure: token must have 3 parts")
            return
        
        # Check header
        header = result.get('header', {})
        if not header.get('alg'):
            result['errors'].append("Missing algorithm in token header")
        elif header.get('alg') != 'HS256':
            result['warnings'].append(f"Unexpected algorithm: {header.get('alg')}")
        
        if not header.get('typ'):
            result['warnings'].append("Missing token type in header")
        elif header.get('typ') != 'JWT':
            result['warnings'].append(f"Unexpected token type: {header.get('typ')}")
    
    def _decode_and_verify_token(self, token: str, result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Decode and verify JWT token."""
        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=['HS256'],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_aud": False,  # Supabase doesn't always include audience
                    "require": ["sub", "email", "iat", "exp"]
                }
            )
            return payload
            
        except jwt.ExpiredSignatureError:
            result['errors'].append("Token has expired")
        except jwt.InvalidSignatureError:
            result['errors'].append("Invalid token signature")
        except jwt.InvalidTokenError as e:
            result['errors'].append(f"Invalid token: {str(e)}")
        except jwt.MissingRequiredClaimError as e:
            result['errors'].append(f"Missing required claim: {str(e)}")
        except Exception as e:
            result['errors'].append(f"Token verification failed: {str(e)}")
        
        return None
    
    def _validate_claims(self, payload: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Validate JWT claims."""
        claims_validation = result['claims_validation']
        
        # Check required claims
        for claim in self.REQUIRED_CLAIMS:
            if claim in payload:
                claims_validation[claim] = {'present': True, 'valid': True}
                
                # Validate specific claims
                if claim == 'sub' and not payload[claim]:
                    claims_validation[claim]['valid'] = False
                    result['errors'].append("Subject (sub) claim is empty")
                
                elif claim == 'email' and not self._is_valid_email(payload[claim]):
                    claims_validation[claim]['valid'] = False
                    result['errors'].append("Invalid email format in token")
                
                elif claim in ['iat', 'exp'] and not isinstance(payload[claim], int):
                    claims_validation[claim]['valid'] = False
                    result['errors'].append(f"Invalid timestamp format for {claim}")
            else:
                claims_validation[claim] = {'present': False, 'valid': False}
                result['errors'].append(f"Missing required claim: {claim}")
        
        # Check optional claims
        for claim in self.OPTIONAL_CLAIMS:
            if claim in payload:
                claims_validation[claim] = {'present': True, 'valid': True}
                
                # Validate role claim if present
                if claim == 'role' and payload[claim] not in ['authenticated', 'anon']:
                    claims_validation[claim]['valid'] = False
                    result['warnings'].append(f"Unexpected role: {payload[claim]}")
            else:
                claims_validation[claim] = {'present': False, 'valid': None}
    
    def _perform_security_checks(self, token: str, payload: Dict[str, Any], 
                                result: Dict[str, Any], request=None) -> None:
        """Perform additional security checks."""
        security_checks = result['security_checks']
        
        # Check token reuse (basic check using cache)
        token_hash = TokenBlacklist.create_token_hash(token)
        cache_key = f"token_seen_{token_hash}"
        
        if cache.get(cache_key):
            security_checks['token_reuse'] = True
            result['warnings'].append("Token has been seen before (potential replay)")
        else:
            cache.set(cache_key, True, 3600)  # Cache for 1 hour
            security_checks['token_reuse'] = False
        
        # Check for suspicious patterns
        user_id = payload.get('sub')
        if user_id:
            # Check for rapid token usage from different IPs
            if request:
                ip_address = self._get_client_ip(request)
                recent_attempts_key = f"recent_auth_{user_id}"
                recent_attempts = cache.get(recent_attempts_key, [])
                
                # Add current attempt
                current_attempt = {
                    'ip': ip_address,
                    'timestamp': datetime.now().isoformat()
                }
                recent_attempts.append(current_attempt)
                
                # Keep only last 10 attempts
                recent_attempts = recent_attempts[-10:]
                cache.set(recent_attempts_key, recent_attempts, 3600)
                
                # Check for multiple IPs
                unique_ips = set(attempt['ip'] for attempt in recent_attempts)
                if len(unique_ips) > 3:
                    security_checks['multiple_ips'] = True
                    result['warnings'].append("Token used from multiple IP addresses")
                else:
                    security_checks['multiple_ips'] = False
        
        # Check token issuing time
        iat = payload.get('iat')
        if iat:
            issued_time = datetime.fromtimestamp(iat, tz=timezone.utc)
            now = datetime.now(timezone.utc)
            
            # Check if token was issued in the future
            if issued_time > now + timedelta(minutes=5):  # 5 minute tolerance
                security_checks['future_issued'] = True
                result['errors'].append("Token issued in the future")
            else:
                security_checks['future_issued'] = False
    
    def _check_token_blacklist(self, token: str, payload: Dict[str, Any], 
                              result: Dict[str, Any]) -> None:
        """Check if token is blacklisted."""
        try:
            is_blacklisted = TokenBlacklist.is_token_blacklisted(token)
            result['security_checks']['blacklisted'] = is_blacklisted
            
            if is_blacklisted:
                result['errors'].append("Token is blacklisted")
        except Exception as e:
            logger.error(f"Error checking token blacklist: {e}")
            result['warnings'].append("Could not verify token blacklist status")
    
    def _validate_token_freshness(self, payload: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Validate token age and freshness."""
        iat = payload.get('iat')
        exp = payload.get('exp')
        
        if iat and exp:
            now = datetime.now(timezone.utc).timestamp()
            
            # Check token age
            token_age_hours = (now - iat) / 3600
            if token_age_hours > self.MAX_TOKEN_AGE_HOURS:
                result['warnings'].append(f"Token is old ({token_age_hours:.1f} hours)")
            
            # Check remaining lifetime
            remaining_hours = (exp - now) / 3600
            if remaining_hours < 1:
                result['warnings'].append(f"Token expires soon ({remaining_hours:.1f} hours)")
            
            result['metadata']['token_age_hours'] = token_age_hours
            result['metadata']['remaining_hours'] = remaining_hours
    
    def _extract_token_metadata(self, payload: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Extract useful metadata from token."""
        metadata = result['metadata']
        
        # Basic user info
        metadata['user_id'] = payload.get('sub')
        metadata['email'] = payload.get('email')
        metadata['role'] = payload.get('role')
        
        # Timestamps
        if payload.get('iat'):
            metadata['issued_at'] = datetime.fromtimestamp(
                payload['iat'], tz=timezone.utc
            ).isoformat()
        
        if payload.get('exp'):
            metadata['expires_at'] = datetime.fromtimestamp(
                payload['exp'], tz=timezone.utc
            ).isoformat()
        
        # User metadata
        user_metadata = payload.get('user_metadata', {})
        if user_metadata:
            metadata['user_metadata'] = user_metadata
    
    def _log_introspection_attempt(self, result: Dict[str, Any], request=None) -> None:
        """Log token introspection attempt."""
        payload = result.get('payload', {})
        user_id = payload.get('sub') if payload else None
        email = payload.get('email') if payload else None
        
        ip_address = None
        user_agent = None
        
        if request:
            ip_address = self._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Determine failure reason
        failure_reason = None
        if not result['valid'] and result['errors']:
            if 'expired' in result['errors'][0].lower():
                failure_reason = 'expired_token'
            elif 'blacklisted' in result['errors'][0].lower():
                failure_reason = 'blacklisted_token'
            elif 'signature' in result['errors'][0].lower():
                failure_reason = 'invalid_signature'
            elif 'structure' in result['errors'][0].lower():
                failure_reason = 'malformed_token'
            elif 'claim' in result['errors'][0].lower():
                failure_reason = 'missing_claims'
            else:
                failure_reason = 'invalid_token'
        
        # Log attempt
        try:
            AuthenticationAttempt.log_attempt(
                user_id=user_id,
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=result['valid'],
                failure_reason=failure_reason,
                token_hash=TokenBlacklist.create_token_hash(
                    request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
                ) if request and request.META.get('HTTP_AUTHORIZATION') else None
            )
        except Exception as e:
            logger.warning(f"Failed to log authentication attempt: {e}")
    
    def _is_valid_email(self, email: str) -> bool:
        """Basic email validation."""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def _get_client_ip(self, request) -> str:
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip


class TokenManager:
    """
    Utility class for token management operations.
    """
    
    @staticmethod
    def blacklist_user_tokens(user_id: str, reason: str = 'logout', 
                             ip_address: str = None, user_agent: str = None) -> int:
        """
        Blacklist all tokens for a specific user.
        
        Args:
            user_id: User ID to blacklist tokens for
            reason: Reason for blacklisting
            ip_address: IP address of the request
            user_agent: User agent string
            
        Returns:
            Number of tokens blacklisted
        """
        # This is a simplified implementation
        # In a real scenario, you'd need to track active tokens
        logger.info(f"Blacklisting all tokens for user {user_id}, reason: {reason}")
        
        # For now, we'll just log this action
        # In a complete implementation, you'd maintain a list of active tokens
        return 0
    
    @staticmethod
    def cleanup_expired_data():
        """Clean up expired tokens and old authentication attempts."""
        try:
            # Clean up expired blacklisted tokens
            expired_tokens = TokenBlacklist.cleanup_expired_tokens()
            
            # Clean up old authentication attempts (keep 30 days)
            old_attempts = AuthenticationAttempt.cleanup_old_attempts(days=30)
            
            logger.info(
                f"Cleanup completed: {expired_tokens} expired tokens, "
                f"{old_attempts} old attempts removed"
            )
            
            return expired_tokens + old_attempts
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            return 0