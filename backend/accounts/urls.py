# backend/accounts/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('user/', views.user_view, name='current-user'),
]