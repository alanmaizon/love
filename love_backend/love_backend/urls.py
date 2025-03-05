#love_backend/love_backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def backend_root(request):
    return HttpResponse("<h1>Welcome to Love Backend</h1><p>Try /api/ stuff!</p>")

urlpatterns = [
    path('', backend_root), 
    path('admin/', admin.site.urls),
    path('api/', include('donations.urls')),
]

