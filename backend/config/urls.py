"""
URL configuration for famsync project.
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from events.urls import family_event_patterns


def root(request):
    return JsonResponse({
        'name': 'Famsync API',
        'status': 'running',
        'endpoints': {
            'admin': '/admin/',
            'auth': '/api/auth/',
            'families': '/api/families/',
            'groups': '/api/groups/',
            'events_mine': '/api/events/mine/',
            'categories': '/api/categories/',
            'integrations': '/api/integrations/',
        },
    })


urlpatterns = [
    path('', root),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    # families + groups aliases (same views)
    path('api/families/', include('families.urls')),
    path('api/families/<int:family_id>/', include(family_event_patterns)),
    path('api/groups/', include('families.urls')),
    path('api/groups/<int:family_id>/', include(family_event_patterns)),
    # cross-group events
    path('api/events/', include('events.cross_urls')),
    path('api/categories/', include('events.urls')),
    path('api/integrations/', include('integrations.urls')),
]
