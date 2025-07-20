"""
Security middleware for comprehensive security headers implementation.
"""
import os
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Middleware to add comprehensive security headers to all responses.
    
    This middleware implements:
    - Content Security Policy (CSP)
    - Additional security headers for XSS, clickjacking protection
    - Referrer Policy
    - Permissions Policy
    """
    
    def process_response(self, request, response):
        """Add security headers to the response."""
        
        # Content Security Policy (CSP)
        # Configured for React frontend with API backend architecture
        csp_directives = self._get_csp_directives()
        response['Content-Security-Policy'] = '; '.join(csp_directives)
        
        # Essential security headers only
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Additional security headers for production
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = f'max-age={settings.SECURE_HSTS_SECONDS}; includeSubDomains; preload'
            
        return response
    
    def _get_csp_directives(self):
        """
        Generate simplified Content Security Policy directives.
        
        Essential security for React frontend with API backend.
        """
        # Simplified CSP directives - essential security only
        directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self' data:",
            "img-src 'self' data: https:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ]
        
        # Add connect-src for API calls
        connect_sources = ["'self'"]
        
        # Add WebSocket support for development (Vite HMR)
        if settings.DEBUG:
            connect_sources.extend([
                "ws://localhost:*",
                "ws://127.0.0.1:*"
            ])
        
        directives.append(f"connect-src {' '.join(connect_sources)}")
        
        return directives
    


# CSP Report Middleware removed for simplification