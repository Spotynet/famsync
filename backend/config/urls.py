"""
URL configuration for famsync project.
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include


def root(request):
    return JsonResponse({
        'name': 'Famsync API',
        'status': 'running',
        'endpoints': {
            'admin': '/admin/',
            'auth': '/api/auth/',
        },
    })


urlpatterns = [
    path('', root),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
]
