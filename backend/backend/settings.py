from pathlib import Path
import os
from dotenv import load_dotenv
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file in the root directory
load_dotenv(dotenv_path=BASE_DIR.parent / '.env')

# Import and validate environment configuration
from .env_validation import validate_environment, EnvironmentValidationError

# Validate environment variables before proceeding
try:
    env_config = validate_environment()
except EnvironmentValidationError as e:
    print(f"\n{'='*60}")
    print("ENVIRONMENT VALIDATION FAILED")
    print(f"{'='*60}")
    print(str(e))
    print("Please fix the above environment variable issues before starting the application.")
    print(f"{'='*60}\n")
    raise SystemExit(1)

# Use validated environment configuration
SECRET_KEY = env_config['secret_key']
DEBUG = env_config['debug']
ALLOWED_HOSTS = env_config['allowed_hosts']

# Authentication configuration
SUPABASE_JWT_SECRET = env_config.get('jwt_secret')
SUPABASE_URL = env_config.get('supabase_url')
SUPABASE_SERVICE_ROLE_KEY = env_config.get('supabase_service_role_key')

# Authentication configuration loaded from environment


# Application definition

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',  # For building APIs
    'corsheaders',    # For handling CORS
    'calculator',     # Our calculator app
    'journal',        # Journal app for trade journal functionality
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'backend.middleware.SecurityHeadersMiddleware',  # Simplified security headers
    'backend.error_middleware.RequestLoggingMiddleware',  # Essential logging only
    'corsheaders.middleware.CorsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'backend.error_middleware.GlobalErrorHandlingMiddleware',  # Essential error handling
]

# Allow requests from your React app
# Default development origins
DEFAULT_CORS_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080", 
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8082",
    "http://localhost:8081",
]

# Production origins (can be overridden with environment variable)
PRODUCTION_CORS_ORIGINS = [
    "https://stockcalc-frontend.vercel.app",
    "https://stockcalc-frontend-prayas1998s-projects.vercel.app", 
    "https://stockcalc-frontend-prayas1998-prayas1998s-projects.vercel.app",
    "https://tradesmartcalculator.vercel.app",
]

# Get CORS origins from validated environment or use defaults
validated_cors_origins = env_config.get('cors_origins', [])
if validated_cors_origins:
    CORS_ALLOWED_ORIGINS = validated_cors_origins
else:
    # Use defaults based on debug mode
    if DEBUG:
        CORS_ALLOWED_ORIGINS = DEFAULT_CORS_ORIGINS + PRODUCTION_CORS_ORIGINS
    else:
        CORS_ALLOWED_ORIGINS = PRODUCTION_CORS_ORIGINS

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny'  # For now, allow all requests
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'calculator.authentication.SupabaseAuthentication',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'EXCEPTION_HANDLER': 'calculator.error_handling.custom_exception_handler',
    'DEFAULT_THROTTLE_RATES': {
        # Simplified rate limiting for small user base (4-5 users)
        # Authentication endpoints - keep reasonable for security
        'auth': '20/min',
        'auth_anon': '10/min',
        
        # Data operations (CRUD) - generous for small user base
        'data_operations': '1000/hour',
        'data_operations_anon': '200/hour',
        
        # General API endpoints - very generous
        'general': '2000/hour',
        'general_anon': '500/hour',
        
        # Legacy rates (for backward compatibility)
        'anon': '500/hour',
        'user': '2000/hour'
    }
}

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

conn_age = 60 if DEBUG else 1800

# Database configuration using validated environment
DATABASE_URL = env_config.get('database_url')
if not DATABASE_URL:
    # Fallback error handling with detailed message
    env_name = env_config.get('environment', 'unknown')
    if env_name == 'prod':
        raise EnvironmentValidationError(
            "Production environment requires DATABASE_URL to be set. "
            "Please configure your production database connection string."
        )
    else:
        raise EnvironmentValidationError(
            f"No database URL configured for {env_name} environment. "
            f"Please set DOCKER_DATABASE_URL for development or DATABASE_URL for production."
        )

DATABASES = {
    "default": dj_database_url.parse(DATABASE_URL, conn_max_age=conn_age)
}
print("Database URL: ", DATABASE_URL)

# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

# Password validation removed - using Supabase authentication


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Simplified logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'security.auth': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',  # Only log warnings and errors
    },
}

# Security settings
# Basic security headers (enhanced by custom middleware)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# HTTP Strict Transport Security (HSTS)
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0  # 1 year in production
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# SSL/TLS settings for production
SECURE_SSL_REDIRECT = not DEBUG  # Redirect HTTP to HTTPS in production
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # For reverse proxy

# Referrer Policy
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Additional security settings
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'
SECURE_CROSS_ORIGIN_EMBEDDER_POLICY = 'require-corp'

# Security settings simplified

# CSRF settings
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Strict'
CSRF_USE_SESSIONS = False
CSRF_COOKIE_NAME = 'csrftoken'

# Session security
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
SESSION_COOKIE_AGE = 3600  # 1 hour

# Cache configuration for rate limiting
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'rate-limiting-cache',
        'TIMEOUT': 3600,
        'OPTIONS': {
            'MAX_ENTRIES': 10000,
        }
    }
}
