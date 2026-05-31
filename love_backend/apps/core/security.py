"""Shared security helpers (origin checks, error detail exposure)."""
from django.conf import settings
from urllib.parse import urlparse


def allowed_frontend_origins():
    """Origins permitted for credentialed / CSRF-exempt public POSTs (checkout)."""
    origins = set()
    if getattr(settings, "FRONTEND_URL", None):
        origins.add(settings.FRONTEND_URL.rstrip("/"))
    for origin in getattr(settings, "CORS_ALLOWED_ORIGINS", []) or []:
        origins.add(origin.rstrip("/"))
    if getattr(settings, "DEBUG", False):
        for origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
            origins.add(origin)
    return origins


def request_origin_allowed(request):
    """True when Origin or Referer matches an allowed frontend origin."""
    allowed = allowed_frontend_origins()
    for header in ("HTTP_ORIGIN", "HTTP_REFERER"):
        raw = request.META.get(header)
        if not raw:
            continue
        parsed = urlparse(raw)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if origin in allowed:
            return True
    return False


def expose_error_details():
    return bool(getattr(settings, "DEBUG", False))


def sanitize_stripe_event_payload(event_dict):
    """Store webhook payloads without nested Connect account PII blobs."""
    data = event_dict.get("data", {})
    obj = data.get("object")
    if isinstance(obj, dict):
        trimmed = {k: v for k, v in obj.items() if k not in (
            "individual", "company", "persons", "requirements",
            "external_accounts", "settings",
        )}
        return {
            "id": event_dict.get("id"),
            "type": event_dict.get("type"),
            "data": {"object": trimmed},
        }
    return {"id": event_dict.get("id"), "type": event_dict.get("type")}
