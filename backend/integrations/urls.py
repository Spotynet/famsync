from django.urls import path

from . import views

urlpatterns = [
    path('google-calendar/', views.google_calendar_integration),
    path('google-calendar/connect/', views.google_calendar_connect),
    path('google-calendar/callback/', views.google_calendar_callback),
    path('google-calendar/sync/', views.google_calendar_sync),
]
