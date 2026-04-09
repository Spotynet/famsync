"""
Event and category URLs.
- family_event_patterns: included under /api/families/<family_id>/
- urlpatterns: included under /api/categories/ (global defaults)
"""
from django.urls import path

from . import views

# Included under /api/families/<family_id>/
family_event_patterns = [
    path('events/', views.event_list_create, name='event-list-create'),
    path('events/<int:event_id>/', views.event_detail, name='event-detail'),
    path('events/<int:event_id>/attendees/me/', views.attendee_me, name='attendee-me'),
    path('categories/', views.family_categories, name='family-categories'),
    path('categories/<int:cat_id>/', views.family_category_detail, name='family-category-detail'),
]

# Included under /api/categories/
urlpatterns = [
    path('', views.global_categories, name='global-categories'),
]
