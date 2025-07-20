"""
Environment Variable Validation and Configuration Management

This module provides robust validation for environment variables across different
deployment environments (development and production) with proper error
handling and detailed error messages.
"""

import os
import re
import sys
import logging
from typing import Dict, List, Optional, Any, Callable, Union
from urllib.parse import urlparse
from pathlib import Path


class EnvironmentValidationError(Exception):
    """Custom exception for environment validation errors."""
    pass


class EnvironmentValidator:
    """
    Comprehensive environment variable validator with support for different
    environment configurations and validation rules.
    """
    
    def __init__(self, environment: str = None):
        """
        Initialize the environment validator.
        
        Args:
            environment: The current environment (dev, prod)
        """
        self.environment = environment or self._detect_environment()
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.logger = logging.getLogger('security.env')
        
    def _detect_environment(self) -> str:
        """Auto-detect the current environment based on various indicators."""
        # Check explicit environment variable
        env = os.getenv('DJANGO_ENV', '').lower()
        if env in ['dev', 'development', 'prod', 'production']:
            return env
            
        # Check DEBUG setting
        debug = os.getenv('DEBUG_VALUE', 'True').lower()
        if debug in ['false', '0', 'no']:
            return 'prod'
            
        # Check for production indicators
        if any(os.getenv(var) for var in ['HEROKU_APP_NAME', 'VERCEL', 'RAILWAY_ENVIRONMENT']):
            return 'prod'
            
        # Default to development
        return 'dev'
    
    def validate_required(self, var_name: str, description: str = None) -> Optional[str]:
        """
        Validate that a required environment variable is present and not empty.
        
        Args:
            var_name: Name of the environment variable
            description: Human-readable description for error messages
            
        Returns:
            The environment variable value if valid, None otherwise
        """
        value = os.getenv(var_name)
        if not value or value.strip() == '':
            error_msg = f"Required environment variable '{var_name}' is missing or empty"
            if description:
                error_msg += f" ({description})"
            self.errors.append(error_msg)
            return None
        return value.strip()
    
    def validate_optional(self, var_name: str, default: str = None, 
                         description: str = None) -> str:
        """
        Validate an optional environment variable with a default value.
        
        Args:
            var_name: Name of the environment variable
            default: Default value if not set
            description: Human-readable description
            
        Returns:
            The environment variable value or default
        """
        value = os.getenv(var_name, default)
        if value is None or (isinstance(value, str) and value.strip() == ''):
            if description:
                self.warnings.append(f"Optional variable '{var_name}' not set ({description})")
            return default
        return value.strip() if isinstance(value, str) else value
    
    def validate_boolean(self, var_name: str, default: bool = False, 
                        description: str = None) -> bool:
        """
        Validate a boolean environment variable.
        
        Args:
            var_name: Name of the environment variable
            default: Default boolean value
            description: Human-readable description
            
        Returns:
            Boolean value
        """
        value = os.getenv(var_name, str(default)).lower()
        if value in ['true', '1', 'yes', 'on']:
            return True
        elif value in ['false', '0', 'no', 'off']:
            return False
        else:
            error_msg = f"Invalid boolean value for '{var_name}': '{value}'"
            if description:
                error_msg += f" ({description})"
            self.errors.append(error_msg)
            return default
    
    def validate_integer(self, var_name: str, default: int = None, 
                        min_val: int = None, max_val: int = None,
                        description: str = None) -> Optional[int]:
        """
        Validate an integer environment variable.
        
        Args:
            var_name: Name of the environment variable
            default: Default integer value
            min_val: Minimum allowed value
            max_val: Maximum allowed value
            description: Human-readable description
            
        Returns:
            Integer value if valid, None otherwise
        """
        value = os.getenv(var_name)
        if value is None:
            if default is not None:
                return default
            if description:
                self.warnings.append(f"Integer variable '{var_name}' not set ({description})")
            return None
            
        try:
            int_value = int(value)
            if min_val is not None and int_value < min_val:
                self.errors.append(f"'{var_name}' value {int_value} is below minimum {min_val}")
                return None
            if max_val is not None and int_value > max_val:
                self.errors.append(f"'{var_name}' value {int_value} is above maximum {max_val}")
                return None
            return int_value
        except ValueError:
            error_msg = f"Invalid integer value for '{var_name}': '{value}'"
            if description:
                error_msg += f" ({description})"
            self.errors.append(error_msg)
            return None
    
    def validate_url(self, var_name: str, schemes: List[str] = None, 
                    required: bool = True, description: str = None) -> Optional[str]:
        """
        Validate a URL environment variable.
        
        Args:
            var_name: Name of the environment variable
            schemes: Allowed URL schemes (e.g., ['http', 'https'])
            required: Whether the variable is required
            description: Human-readable description
            
        Returns:
            URL string if valid, None otherwise
        """
        value = os.getenv(var_name)
        if not value:
            if required:
                error_msg = f"Required URL variable '{var_name}' is missing"
                if description:
                    error_msg += f" ({description})"
                self.errors.append(error_msg)
            return None
            
        try:
            parsed = urlparse(value)
            if not parsed.scheme or not parsed.netloc:
                self.errors.append(f"Invalid URL format for '{var_name}': '{value}'")
                return None
                
            if schemes and parsed.scheme not in schemes:
                self.errors.append(
                    f"Invalid URL scheme for '{var_name}': '{parsed.scheme}'. "
                    f"Allowed schemes: {', '.join(schemes)}"
                )
                return None
                
            return value
        except Exception as e:
            error_msg = f"Error parsing URL for '{var_name}': {str(e)}"
            if description:
                error_msg += f" ({description})"
            self.errors.append(error_msg)
            return None
    
    def validate_database_url(self, var_name: str, required: bool = True,
                             description: str = None) -> Optional[str]:
        """
        Validate a database URL with specific checks for database connections.
        
        Args:
            var_name: Name of the environment variable
            required: Whether the variable is required
            description: Human-readable description
            
        Returns:
            Database URL if valid, None otherwise
        """
        value = self.validate_url(
            var_name, 
            schemes=['postgres', 'postgresql', 'mysql', 'sqlite'], 
            required=required,
            description=description
        )
        
        if value:
            parsed = urlparse(value)
            # Additional database-specific validations
            if parsed.scheme in ['postgres', 'postgresql']:
                if not parsed.hostname:
                    self.errors.append(f"Database URL '{var_name}' missing hostname")
                    return None
                if not parsed.path or parsed.path == '/':
                    self.errors.append(f"Database URL '{var_name}' missing database name")
                    return None
                    
        return value
    
    def validate_jwt_secret(self, var_name: str, min_length: int = 32,
                           description: str = None) -> Optional[str]:
        """
        Validate a JWT secret with security requirements.
        
        Args:
            var_name: Name of the environment variable
            min_length: Minimum required length for security
            description: Human-readable description
            
        Returns:
            JWT secret if valid, None otherwise
        """
        value = self.validate_required(var_name, description)
        if not value:
            return None
            
        if len(value) < min_length:
            self.errors.append(
                f"JWT secret '{var_name}' is too short. "
                f"Minimum length: {min_length}, current: {len(value)}"
            )
            return None
            
        # Check for common weak secrets
        weak_secrets = [
            'secret', 'password', 'key', 'jwt_secret', 'your_secret_here',
            'change_me', 'default', 'test', '123456', 'admin'
        ]
        
        if value.lower() in weak_secrets:
            self.errors.append(
                f"JWT secret '{var_name}' appears to be a weak/default value. "
                f"Please use a strong, randomly generated secret."
            )
            return None
            
        return value
    
    def validate_django_secret_key(self, var_name: str = 'DJANGO_SECRET_KEY',
                                  description: str = None) -> Optional[str]:
        """
        Validate Django secret key with specific requirements.
        
        Args:
            var_name: Name of the environment variable
            description: Human-readable description
            
        Returns:
            Secret key if valid, None otherwise
        """
        return self.validate_jwt_secret(
            var_name, 
            min_length=50,  # Django recommends 50+ characters
            description=description or "Django secret key for cryptographic signing"
        )
    
    def validate_allowed_hosts(self, var_name: str = 'DJANGO_ALLOWED_HOSTS',
                              description: str = None) -> List[str]:
        """
        Validate Django ALLOWED_HOSTS setting.
        
        Args:
            var_name: Name of the environment variable
            description: Human-readable description
            
        Returns:
            List of allowed hosts
        """
        value = os.getenv(var_name, '')
        if not value.strip():
            if self.environment == 'prod':
                self.errors.append(
                    f"ALLOWED_HOSTS must be specified in production environment"
                )
                return []
            else:
                # Default for development
                return ['localhost', '127.0.0.1']
        
        hosts = [host.strip() for host in value.split(',') if host.strip()]
        
        # Validate each host
        for host in hosts:
            if host == '*':
                if self.environment == 'prod':
                    self.warnings.append(
                        "Using '*' in ALLOWED_HOSTS is not recommended for production"
                    )
            elif not self._is_valid_hostname(host):
                self.warnings.append(f"Potentially invalid hostname in ALLOWED_HOSTS: '{host}'")
        
        return hosts
    
    def _is_valid_hostname(self, hostname: str) -> bool:
        """Check if a hostname is valid."""
        if len(hostname) > 253:
            return False
        if hostname[-1] == ".":
            hostname = hostname[:-1]
        allowed = re.compile(r"(?!-)[A-Z\d-]{1,63}(?<!-)$", re.IGNORECASE)
        return all(allowed.match(x) for x in hostname.split("."))
    
    def validate_cors_origins(self, var_name: str = 'CORS_ALLOWED_ORIGINS',
                             description: str = None) -> List[str]:
        """
        Validate CORS allowed origins.
        
        Args:
            var_name: Name of the environment variable
            description: Human-readable description
            
        Returns:
            List of allowed CORS origins
        """
        value = os.getenv(var_name, '')
        if not value.strip():
            return []  # Will use defaults from settings
            
        origins = [origin.strip() for origin in value.split(',') if origin.strip()]
        valid_origins = []
        
        for origin in origins:
            if self.validate_url(f"CORS_ORIGIN_{origins.index(origin)}", 
                               schemes=['http', 'https'], required=False):
                valid_origins.append(origin)
        
        return valid_origins
    
    def get_environment_config(self) -> Dict[str, Any]:
        """
        Get the complete validated environment configuration.
        
        Returns:
            Dictionary containing all validated environment variables
        """
        config = {
            'environment': self.environment,
            'debug': self.environment in ['dev', 'development'],
        }
        
        # Core Django settings
        config['secret_key'] = self.validate_django_secret_key()
        config['allowed_hosts'] = self.validate_allowed_hosts()
        config['debug'] = self.validate_boolean('DEBUG_VALUE', default=config['debug'])
        
        # Database environment configuration - use DB_ENV for database selection
        config['db_env'] = self.validate_optional('DB_ENV', 'dev', "Database environment")
        
        # Database configuration based on DB_ENV setting
        if config['db_env'] == 'prod':
            config['database_url'] = self.validate_database_url(
                'DATABASE_URL', 
                required=True,
                description="Production database connection string"
            )
        else:
            config['database_url'] = self.validate_database_url(
                'DOCKER_DATABASE_URL',
                required=False,
                description="Development database connection string"
            )
        
        # Authentication settings
        config['jwt_secret'] = self.validate_jwt_secret(
            'SUPABASE_JWT_SECRET',
            description="Supabase JWT secret for token validation"
        )
        
        # Supabase admin settings for server-side user management
        config['supabase_url'] = self.validate_url(
            'SUPABASE_URL',
            schemes=['https'],
            required=self.environment == 'prod',
            description="Supabase project URL for admin operations"
        )
        
        # Service role key is required for production, optional for development
        if self.environment == 'prod':
            config['supabase_service_role_key'] = self.validate_required(
                'SUPABASE_SERVICE_ROLE_KEY',
                description="Supabase service role key for admin operations"
            )
        else:
            # In development, still validate if present but don't require it
            service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            if service_key and service_key.strip():
                config['supabase_service_role_key'] = service_key.strip()
            else:
                config['supabase_service_role_key'] = None
                self.warnings.append("SUPABASE_SERVICE_ROLE_KEY not set - account deletion will only clean Django data")
        
        # CORS settings
        config['cors_origins'] = self.validate_cors_origins()
        
        # Environment-specific settings
        if self.environment == 'prod':
            self._validate_production_settings(config)
        else:
            self._validate_development_settings(config)
        
        return config
    
    def _validate_production_settings(self, config: Dict[str, Any]) -> None:
        """Validate production-specific settings."""
        # Ensure debug is False in production
        if config.get('debug', False):
            self.errors.append("DEBUG must be False in production environment")
        
        # Ensure HTTPS settings
        if not self.validate_boolean('SECURE_SSL_REDIRECT', True):
            self.warnings.append("SECURE_SSL_REDIRECT should be True in production")
        
        # Check for required production variables
        required_prod_vars = [
            ('DATABASE_URL', 'Production database URL'),
            ('DJANGO_SECRET_KEY', 'Django secret key'),
            ('SUPABASE_JWT_SECRET', 'Supabase JWT secret'),
            ('SUPABASE_URL', 'Supabase project URL'),
            ('SUPABASE_SERVICE_ROLE_KEY', 'Supabase service role key'),
        ]
        
        # Map environment variable names to their corresponding config keys
        key_mapping = {
            'DJANGO_SECRET_KEY': 'secret_key',
            'SUPABASE_JWT_SECRET': 'jwt_secret', 
            'DATABASE_URL': 'database_url',
            'SUPABASE_URL': 'supabase_url',
            'SUPABASE_SERVICE_ROLE_KEY': 'supabase_service_role_key'
        }
        
        for var_name, description in required_prod_vars:
            config_key = key_mapping.get(var_name, var_name.lower())
            if not config.get(config_key):
                self.errors.append(f"Production requires {var_name} ({description})")
    
    def _validate_development_settings(self, config: Dict[str, Any]) -> None:
        """Validate development-specific settings."""
        # Development can be more lenient but should still have basic security
        if not config.get('jwt_secret'):
            self.warnings.append("JWT secret should be set even in development")
    
    def validate_and_report(self) -> Dict[str, Any]:
        """
        Validate all environment variables and report results.
        
        Returns:
            Validated configuration dictionary
            
        Raises:
            EnvironmentValidationError: If critical validation errors occur
        """
        self.logger.info(f"Validating environment configuration for: {self.environment}")
        
        config = self.get_environment_config()
        
        # Report warnings
        for warning in self.warnings:
            self.logger.warning(f"Environment warning: {warning}")
        
        # Report errors and raise exception if any critical errors
        if self.errors:
            error_msg = f"Environment validation failed with {len(self.errors)} error(s):\n"
            for i, error in enumerate(self.errors, 1):
                error_msg += f"  {i}. {error}\n"
                self.logger.error(f"Environment error: {error}")
            
            raise EnvironmentValidationError(error_msg)
        
        self.logger.info(f"Environment validation completed successfully for {self.environment}")
        return config


def validate_environment() -> Dict[str, Any]:
    """
    Convenience function to validate the current environment.
    
    Returns:
        Validated configuration dictionary
        
    Raises:
        EnvironmentValidationError: If validation fails
    """
    validator = EnvironmentValidator()
    return validator.validate_and_report()


def get_environment_info() -> Dict[str, str]:
    """
    Get information about the current environment setup.
    
    Returns:
        Dictionary with environment information
    """
    validator = EnvironmentValidator()
    
    return {
        'environment': validator.environment,
        'python_version': sys.version,
        'django_settings_module': os.getenv('DJANGO_SETTINGS_MODULE', 'Not set'),
        'working_directory': str(Path.cwd()),
        'env_file_exists': Path('.env').exists(),
    }