# backend/accounts/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('csrf/', views.csrf_token, name='csrf-token'),
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('user/', views.user_view, name='current-user'),
]