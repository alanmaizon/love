"""
Shared settings for all environments.

Environment is selected via DJANGO_SETTINGS_MODULE:
  - config.settings.dev   (local development; DEBUG, relaxed cookies/CORS)
  - config.settings.prod  (production; HTTPS hardening behind a proxy)

Secrets come from the environment only (.env locally, SSM in prod). See
.env.example. Never commit real values.
"""
from pathlib import Path
import os
import sys
from dotenv import load_dotenv
import dj_database_url
import json

load_dotenv()  # Load .env variables (local dev)

# config/settings/base.py -> parents[2] is the love_backend/ project root.
BASE_DIR = Path(__file__).resolve().parents[2]

# Treat `apps/` as a sources root so each app is importable by its short name
# (e.g. `donations`, `core`). This keeps app labels and table names (donations_*)
# and the existing migration history unchanged after relocating apps under apps/.
# NOTE: there is intentionally no apps/__init__.py — `apps` is a path entry, not
# a package, so apps are never double-imported as both `donations` and
# `apps.donations`.
sys.path.insert(0, str(BASE_DIR / "apps"))

# SECURITY WARNING: keep the secret key used in production secret!
# Dev-only fallback; prod.py refuses to boot without a real SECRET_KEY.
SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-only-insecure-key'

# Safe-by-default; dev.py overrides to True.
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY')

ALLOWED_HOSTS = json.loads(os.getenv("ALLOWED_HOSTS", '["localhost", "127.0.0.1"]'))

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    # Local apps (apps/ is on sys.path; referenced by short name).
    'core',
    'accounts',
    'campaigns',
    'messaging',
    'donations',
    'payments',
]

# --- Media storage: S3 in prod (django-storages), filesystem locally ---
# boto3 resolves credentials from the ECS task role in prod (no keys in env).
# The S3 backend string is imported lazily, so settings load fine without
# django-storages installed when AWS_STORAGE_BUCKET_NAME is unset (local dev).
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME', '')
AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', '')
AWS_QUERYSTRING_AUTH = False        # public, unsigned media URLs
AWS_S3_FILE_OVERWRITE = False
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

STORAGES = {
    'default': (
        {'BACKEND': 'storages.backends.s3.S3Storage'}
        if AWS_STORAGE_BUCKET_NAME
        else {'BACKEND': 'django.core.files.storage.FileSystemStorage'}
    ),
    # WhiteNoise: hashed + compressed static for long-cache busting in prod.
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
]

CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'register': '5/hour',
        'checkout': '30/hour',
    },
}

# Phase 4 — trust & compliance (overridden in dev.py / prod.py)
REQUIRE_EMAIL_VERIFICATION = os.environ.get("REQUIRE_EMAIL_VERIFICATION", "False") == "True"
_max_checkout = os.environ.get("MAX_CHECKOUT_AMOUNT", "10000")
MAX_CHECKOUT_AMOUNT = None if _max_checkout == "" else _max_checkout

WEBHOOK_PAYLOAD_RETENTION_DAYS = int(os.environ.get("WEBHOOK_PAYLOAD_RETENTION_DAYS", "90"))
ADMIN_REQUIRE_2FA = os.environ.get("ADMIN_REQUIRE_2FA", "False") == "True"

# Test-only hooks (e.g. confirm a donation without driving Stripe's hosted
# Checkout UI in CI). Endpoints guard on DEBUG *and* this flag, so they are
# unavailable in production even if DEBUG were accidentally on.
E2E_TEST_HOOKS = os.environ.get("E2E_TEST_HOOKS", "False").lower() in ("true", "1", "yes")

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
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

WSGI_APPLICATION = 'config.wsgi.application'

# Database: defaults to SQLite locally; DATABASE_URL (RDS) in prod.
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL', f"sqlite:///{os.path.join(BASE_DIR, 'db.sqlite3')}")
    )
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (storage backend configured in STORAGES above).
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Cookie domain is env-driven so the same image runs on ALB DNS / custom domain /
# localhost. Unset/blank = bind to the current host. Secure flags + SameSite are
# set per-environment in dev.py / prod.py.
SESSION_COOKIE_DOMAIN = os.environ.get('COOKIE_DOMAIN') or None
CSRF_COOKIE_DOMAIN = os.environ.get('COOKIE_DOMAIN') or None

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}

EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend',
)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD') or os.environ.get('GOOGLE_APP_PASS', '')
DEFAULT_FROM_EMAIL = os.environ.get(
    'DEFAULT_FROM_EMAIL', 'Love That Gives Back <noreply@lovethatgivesback.com>',
)

# --- Stripe (test keys locally; live keys via SSM in prod) ---
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
# Platform application fee in basis points (100 = 1%). Default 0 -> 100% to charity.
PLATFORM_FEE_BPS = int(os.environ.get('PLATFORM_FEE_BPS', '0'))
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
STRIPE_CURRENCY = os.environ.get('STRIPE_CURRENCY', 'eur')
