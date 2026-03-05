from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path('google/', views.google_auth),
    path('email/request-otp/', views.request_otp),
    path('email/verify-otp/', views.verify_otp_view),
    path('refresh/', TokenRefreshView.as_view()),
    path('logout/', views.logout),
    path('me/', views.me),
]
