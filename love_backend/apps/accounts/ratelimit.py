"""Simple IP rate limits for non-DRF views (login)."""
from django.core.cache import cache


def _client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def too_many_attempts(request, *, scope: str, limit: int, window_seconds: int) -> bool:
    key = f"ratelimit:{scope}:{_client_ip(request)}"
    count = cache.get(key, 0)
    if count >= limit:
        return True
    cache.set(key, count + 1, window_seconds)
    return False
