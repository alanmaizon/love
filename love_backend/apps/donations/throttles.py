from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class RegisterRateThrottle(AnonRateThrottle):
    scope = "register"


class CheckoutRateThrottle(AnonRateThrottle):
    scope = "checkout"
