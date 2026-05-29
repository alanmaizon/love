from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Custom session authentication class that bypasses the CSRF check.
    This is useful for endpoints like login where you want to authenticate
    using Django's auth but avoid CSRF errors during testing or API calls.
    """
    def enforce_csrf(self, request):
        # Simply bypass CSRF checks.
        return
