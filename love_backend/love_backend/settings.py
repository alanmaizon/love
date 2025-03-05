from pathlib import Path
import os
import dj_database_url
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env

BASE_DIR = Path(__file__).resolve().parent.parent

# ==========================================================================================
# Security & Debug
# ==========================================================================================
SECRET_KEY = os.environ.get('SECRET_KEY', 'fallback-secret-key')
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# When DEBUG is False, make sure your domain(s) are in ALLOWED_HOSTS
# e.g. ALLOWED_HOSTS=love-backend-8wbj.onrender.com,.onrender.com
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# ==========================================================================================
# Installed Apps & Middleware
# ==========================================================================================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',      # django-cors-headers
    'donations',        # Your custom app
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',                 # Must be high in the list
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
]

# ==========================================================================================
# CORS & REST Framework
# ==========================================================================================
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    # Ensure you set CORS_ALLOWED_ORIGINS in your Render environment variables
    # e.g. CORS_ALLOWED_ORIGINS=https://love-frontend.onrender.com
    CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')

CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
}

# ==========================================================================================
# Database
# ==========================================================================================
# Use dj_database_url for parsing DATABASE_URL environment variable.
# e.g. DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME
DATABASES = {
    'default': dj_database_url.config(
        default=f"sqlite:///{os.path.join(BASE_DIR, 'db.sqlite3')}"
    )
}

# ==========================================================================================
# URLs & WSGI
# ==========================================================================================
ROOT_URLCONF = 'love_backend.urls'
WSGI_APPLICATION = 'love_backend.wsgi.application'

# ==========================================================================================
# Templates
# ==========================================================================================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ==========================================================================================
# Password Validators
# ==========================================================================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ==========================================================================================
# Internationalization
# ==========================================================================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ==========================================================================================
# Static Files & WhiteNoise
# ==========================================================================================
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# WhiteNoise allows your app to serve its own static files
# more efficiently.
# Docs: http://whitenoise.evans.io/en/stable/
# e.g. add any additional settings here if needed.

# ==========================================================================================
# Security & SSL
# ==========================================================================================
if DEBUG:
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
else:
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'True') == 'True'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 3600
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# Cookie domain settings for .onrender.com subdomains:
# This tells Django to allow cookies to be valid for any subdomain under onrender.com
SESSION_COOKIE_DOMAIN = ".onrender.com"
CSRF_COOKIE_DOMAIN = ".onrender.com"

# Enable cross-site cookies
SESSION_COOKIE_SAMESITE = None
CSRF_COOKIE_SAMESITE = None

# ==========================================================================================
# Logging
# ==========================================================================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
