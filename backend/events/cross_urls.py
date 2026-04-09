from django.urls import path

from . import views

urlpatterns = [
    path('mine/', views.my_events, name='my-events'),
]
