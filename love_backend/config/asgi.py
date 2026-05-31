"""
ASGI config for the love_backend project.
"""

import os
from django.core.asgi import get_asgi_application

# Containers run prod; override via env if needed.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.prod')

application = get_asgi_application()
