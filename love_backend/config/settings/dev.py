"""Local development settings: DEBUG on, relaxed cookies, permissive CORS."""
import json
import os
from django.db.backends.signals import connection_created
from .base import *  # noqa: F401,F403

DEBUG = True
REQUIRE_EMAIL_VERIFICATION = os.environ.get("REQUIRE_EMAIL_VERIFICATION", "False") == "True"


def _configure_sqlite(connection, **kwargs):
    """Reduce 'database is locked' when sync-checkout and webhooks overlap."""
    if connection.vendor != "sqlite":
        return
    with connection.cursor() as cursor:
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA busy_timeout=30000;")


connection_created.connect(_configure_sqlite)

CORS_ALLOW_ALL_ORIGINS = True
CSRF_TRUSTED_ORIGINS = json.loads(os.getenv(
    "CSRF_TRUSTED_ORIGINS", '["http://localhost:5173","http://127.0.0.1:5173"]',
))

# Plain http://localhost — do not require HTTPS-only / cross-site cookies.
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

if DATABASES["default"]["ENGINE"].endswith("sqlite3"):
    DATABASES["default"].setdefault("OPTIONS", {})
    DATABASES["default"]["OPTIONS"]["timeout"] = 30

# Avoid SMTP auth failures blocking drain_outbox / ops_health locally.
if not os.environ.get("EMAIL_BACKEND") and not os.environ.get("EMAIL_HOST_USER"):
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
