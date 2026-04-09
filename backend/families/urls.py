from django.urls import path

from . import views

urlpatterns = [
    path('', views.family_list_create),
    path('join/', views.family_join),
    path('<int:family_id>/', views.family_detail),
    path('<int:family_id>/invite/', views.family_invite),
    path('<int:family_id>/members/', views.family_members),
    path('<int:family_id>/members/me/', views.family_leave),
    path('<int:family_id>/members/<int:member_id>/', views.family_member_detail),
]
