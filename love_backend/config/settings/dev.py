"""Local development settings: DEBUG on, relaxed cookies, permissive CORS."""
from .base import *  # noqa: F401,F403

DEBUG = True

# Allow the Vite dev server (and anything else) during local work.
CORS_ALLOW_ALL_ORIGINS = True

# Plain http://localhost — do not require HTTPS-only / cross-site cookies.
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
