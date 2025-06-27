from django.urls import path, include
from . import views

urlpatterns = [
    path('logs/', views.LogListView.as_view(), name='log-list'),
    path('upload/', views.upload_csv, name='upload-csv'),
    path('stats/', views.statistics, name='statistics'),
    path('api/', include('api.urls')),
]