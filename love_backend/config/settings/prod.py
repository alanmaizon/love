"""Production settings: HTTPS hardening behind a TLS-terminating proxy (ALB/CloudFront)."""
import os
import json
from .base import *  # noqa: F401,F403

DEBUG = False

# Explicit allow-lists from env (JSON arrays).
CORS_ALLOWED_ORIGINS = json.loads(os.getenv("CORS_ALLOWED_ORIGINS", '[]'))
# Django 4+: frontend origin(s) must be trusted for CSRF-protected POSTs.
CSRF_TRUSTED_ORIGINS = json.loads(os.getenv("CSRF_TRUSTED_ORIGINS", '[]'))

# The proxy speaks HTTPS to the browser and HTTP to Django; trust the header so
# request.is_secure(), secure cookies, HSTS, and redirects behave correctly.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
SECURE_SSL_REDIRECT = True

# Secure, cross-site cookies (frontend and API on different origins, over HTTPS).
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'

# HSTS — 1 year, includeSubDomains, preload.
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
