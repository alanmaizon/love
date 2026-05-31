"""Local development settings: DEBUG on, relaxed cookies, permissive CORS."""
import json
import os
from .base import *  # noqa: F401,F403

DEBUG = True

CORS_ALLOW_ALL_ORIGINS = True
CSRF_TRUSTED_ORIGINS = json.loads(os.getenv(
    "CSRF_TRUSTED_ORIGINS", '["http://localhost:5173","http://127.0.0.1:5173"]',
))

# Plain http://localhost — do not require HTTPS-only / cross-site cookies.
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
