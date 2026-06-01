"""Production settings: HTTPS hardening behind a TLS-terminating proxy (ALB/CloudFront)."""
import os
import json
from django.core.exceptions import ImproperlyConfigured
from .base import *  # noqa: F401,F403

DEBUG = False

_insecure_keys = ('', 'dev-only-insecure-key', 'fallback-secret-key', 'change-me-generate-a-long-random-string')
if not SECRET_KEY or SECRET_KEY in _insecure_keys:
    raise ImproperlyConfigured(
        'SECRET_KEY must be set to a strong random value in production (SSM / env).'
    )

# Explicit allow-lists from env (JSON arrays).
CORS_ALLOWED_ORIGINS = json.loads(os.getenv("CORS_ALLOWED_ORIGINS", '[]'))
CSRF_TRUSTED_ORIGINS = json.loads(os.getenv("CSRF_TRUSTED_ORIGINS", '[]'))

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
SECURE_SSL_REDIRECT = True

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'

SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Transactional email via Amazon SES (boto3 uses the ECS task role).
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django_ses.SESBackend')
AWS_SES_REGION_NAME = os.environ.get(
    'AWS_SES_REGION_NAME', os.environ.get('AWS_S3_REGION_NAME', 'eu-west-1'),
)

REQUIRE_EMAIL_VERIFICATION = os.environ.get("REQUIRE_EMAIL_VERIFICATION", "True") == "True"

if ADMIN_REQUIRE_2FA:
    INSTALLED_APPS += [
        "django_otp",
        "django_otp.plugins.otp_totp",
        "django_otp.plugins.otp_static",
    ]
    MIDDLEWARE.insert(
        MIDDLEWARE.index("django.contrib.auth.middleware.AuthenticationMiddleware") + 1,
        "django_otp.middleware.OTPMiddleware",
    )
