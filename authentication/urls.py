from django.urls import path, include  
from . import views


urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('api/', include('api.urls')),
]