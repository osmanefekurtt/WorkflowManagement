# authentication/urls.py
from django.urls import path
from .views import login_view, register_view, list_users, user_detail

urlpatterns = [
    path('login/', login_view, name='login'),
    path('register/', register_view, name='register'),
    path('users/', list_users, name='list_users'),
    path('users/<int:pk>/', user_detail, name='user_detail'),
]