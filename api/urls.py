from django.urls import path
from logs.views import LogListView, upload_csv, statistics
from authentication.views import register, login
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Authentication
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Logs
    path('logs/', LogListView.as_view(), name='log-list'),

    # CSV Upload
    path('upload/', upload_csv, name='csv-upload'),

    # Statistics
    path('stats/', statistics, name='statistics'),
]