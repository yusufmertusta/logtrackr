# api/views.py - API Views for LogTrackr

from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.db.models.functions import Extract
from django.utils import timezone
from datetime import datetime, timedelta
import csv
import io
import pandas as pd
from .models import LogEntry
from .serializers import LogEntrySerializer, UserRegistrationSerializer, CustomTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT login view"""
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(APIView):
    """User registration endpoint"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            return Response({
                'message': 'Kullanıcı başarıyla oluşturuldu',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                },
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(access_token),
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogListView(generics.ListAPIView):
    """List all log entries with filtering and pagination"""
    serializer_class = LogEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = LogEntry.objects.all().order_by('-timestamp')
        
        # Filter by severity
        severity = self.request.query_params.get('severity', None)
        if severity:
            queryset = queryset.filter(severity=severity)
        
        # Filter by IP address
        ip_address = self.request.query_params.get('ip_address', None)
        if ip_address:
            queryset = queryset.filter(ip_address=ip_address)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d')
                queryset = queryset.filter(timestamp__gte=start_date)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d')
                queryset = queryset.filter(timestamp__lte=end_date)
            except ValueError:
                pass
        
        # Search in message
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(message__icontains=search) |
                Q(threat_type__icontains=search) |
                Q(ip_address__icontains=search)
            )
        
        return queryset


class LogDetailView(generics.RetrieveAPIView):
    """Get single log entry details"""
    queryset = LogEntry.objects.all()
    serializer_class = LogEntrySerializer
    permission_classes = [IsAuthenticated]


class CSVUploadView(APIView):
    """CSV file upload endpoint"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if 'file' not in request.FILES:
            return Response({
                'error': 'Dosya bulunamadı'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        
        # Validate file type
        if not file.name.endswith('.csv'):
            return Response({
                'error': 'Sadece CSV dosyaları kabul edilir'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size (max 10MB)
        if file.size > 10 * 1024 * 1024:
            return Response({
                'error': 'Dosya boyutu 10MB\'dan büyük olamaz'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Read CSV file
            file_content = file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(file_content))
            
            created_count = 0
            error_count = 0
            errors = []
            
            for row_num, row in enumerate(csv_reader, start=2):
                try:
                    # Validate required fields
                    required_fields = ['timestamp', 'ip_address', 'severity', 'message']
                    missing_fields = [field for field in required_fields if not row.get(field)]
                    
                    if missing_fields:
                        error_count += 1
                        errors.append(f"Satır {row_num}: Eksik alanlar: {', '.join(missing_fields)}")
                        continue
                    
                    # Parse timestamp
                    timestamp_str = row['timestamp']
                    try:
                        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        try:
                            timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S.%f')
                        except ValueError:
                            error_count += 1
                            errors.append(f"Satır {row_num}: Geçersiz timestamp formatı")
                            continue
                    
                    # Create log entry
                    log_entry = LogEntry.objects.create(
                        timestamp=timestamp,
                        ip_address=row['ip_address'],
                        severity=row['severity'].upper(),
                        message=row['message'],
                        threat_type=row.get('threat_type', ''),
                        location=row.get('location', ''),
                        user_agent=row.get('user_agent', ''),
                        created_by=request.user
                    )
                    created_count += 1
                    
                except Exception as e:
                    error_count += 1
                    errors.append(f"Satır {row_num}: {str(e)}")
            
            return Response({
                'message': 'CSV dosyası başarıyla işlendi',
                'created_count': created_count,
                'error_count': error_count,
                'errors': errors[:10] if errors else []  # Limit to first 10 errors
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': f'CSV işleme hatası: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class StatisticsView(APIView):
    """Statistics endpoint"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get date range from query params
            days = int(request.query_params.get('days', 30))
            start_date = timezone.now() - timedelta(days=days)
            
            # Base queryset
            queryset = LogEntry.objects.filter(timestamp__gte=start_date)
            
            # Summary statistics
            total_logs = queryset.count()
            critical_logs = queryset.filter(severity='CRITICAL').count()
            unique_ips = queryset.values('ip_address').distinct().count()
            threat_types_count = queryset.exclude(threat_type='').values('threat_type').distinct().count()
            
            # Severity distribution
            severity_stats = queryset.values('severity').annotate(
                count=Count('id')
            ).order_by('severity')
            
            severity_data = {
                'critical': 0,
                'high': 0,
                'medium': 0,
                'low': 0,
                'info': 0
            }
            
            for item in severity_stats:
                severity_data[item['severity'].lower()] = item['count']
            
            # Top 10 IPs
            top_ips = list(queryset.values('ip_address').annotate(
                count=Count('id')
            ).order_by('-count')[:10])
            
            # Hourly activity (last 24 hours)
            hourly_data = [0] * 24
            hourly_stats = queryset.filter(
                timestamp__gte=timezone.now() - timedelta(days=1)
            ).annotate(
                hour=Extract('timestamp', 'hour')
            ).values('hour').annotate(
                count=Count('id')
            )
            
            for item in hourly_stats:
                hourly_data[item['hour']] = item['count']
            
            # Threat types distribution
            threat_types = list(queryset.exclude(threat_type='').values('threat_type').annotate(
                count=Count('id')
            ).order_by('-count')[:10])
            
            # Detailed statistics for tables
            ip_stats = list(queryset.values('ip_address').annotate(
                count=Count('id')
            ).order_by('-count')[:20])
            
            threat_stats = list(queryset.exclude(threat_type='').values('threat_type').annotate(
                count=Count('id')
            ).order_by('-count')[:20])
            
            # Recent activity (last 7 days)
            recent_activity = []
            for i in range(7):
                date = timezone.now().date() - timedelta(days=i)
                count = queryset.filter(timestamp__date=date).count()
                recent_activity.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'count': count
                })
            
            return Response({
                'summary': {
                    'total_logs': total_logs,
                    'critical_logs': critical_logs,
                    'unique_ips': unique_ips,
                    'threat_types': threat_types_count,
                },
                'charts': {
                    'severity': severity_data,
                    'top_ips': [{'ip': item['ip_address'], 'count': item['count']} for item in top_ips],
                    'hourly_activity': hourly_data,
                    'threat_types': [{'type': item['threat_type'], 'count': item['count']} for item in threat_types],
                },
                'details': {
                    'ip_stats': [{'ip': item['ip_address'], 'count': item['count']} for item in ip_stats],
                    'threat_stats': [{'type': item['threat_type'], 'count': item['count']} for item in threat_stats],
                },
                'recent_activity': recent_activity,
                'date_range': {
                    'start': start_date.strftime('%Y-%m-%d'),
                    'end': timezone.now().strftime('%Y-%m-%d'),
                    'days': days
                }
            })
            
        except Exception as e:
            return Response({
                'error': f'İstatistik verileri alınırken hata oluştu: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExportStatisticsView(APIView):
    """Export statistics data"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            format_type = request.query_params.get('format', 'json')
            days = int(request.query_params.get('days', 30))
            start_date = timezone.now() - timedelta(days=days)
            
            queryset = LogEntry.objects.filter(timestamp__gte=start_date)
            
            if format_type == 'csv':
                response = Response(content_type='text/csv')
                response['Content-Disposition'] = f'attachment; filename="logtrackr_statistics_{timezone.now().strftime("%Y%m%d")}.csv"'
                
                # Create CSV data
                logs_data = queryset.values(
                    'timestamp', 'ip_address', 'severity', 'message', 'threat_type', 'location'
                )
                
                if logs_data:
                    df = pd.DataFrame(list(logs_data))
                    csv_buffer = io.StringIO()
                    df.to_csv(csv_buffer, index=False)
                    response.content = csv_buffer.getvalue()
                else:
                    response.content = "No data available\n"
                
                return response
            
            else:  # JSON format
                stats_view = StatisticsView()
                stats_response = stats_view.get(request)
                return stats_response
                
        except Exception as e:
            return Response({
                'error': f'Veri dışa aktarılırken hata oluştu: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Quick dashboard statistics"""
    try:
        # Last 24 hours stats
        last_24h = timezone.now() - timedelta(hours=24)
        recent_logs = LogEntry.objects.filter(timestamp__gte=last_24h)
        
        # Last 7 days stats
        last_7d = timezone.now() - timedelta(days=7)
        week_logs = LogEntry.objects.filter(timestamp__gte=last_7d)
        
        return Response({
            'last_24h': {
                'total': recent_logs.count(),
                'critical': recent_logs.filter(severity='CRITICAL').count(),
                'unique_ips': recent_logs.values('ip_address').distinct().count(),
            },
            'last_7d': {
                'total': week_logs.count(),
                'critical': week_logs.filter(severity='CRITICAL').count(),
                'unique_ips': week_logs.values('ip_address').distinct().count(),
            },
            'all_time': {
                'total': LogEntry.objects.count(),
                'critical': LogEntry.objects.filter(severity='CRITICAL').count(),
                'unique_ips': LogEntry.objects.values('ip_address').distinct().count(),
            }
        })
        
    except Exception as e:
        return Response({
            'error': f'Dashboard verileri alınırken hata oluştu: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def bulk_delete_logs(request):
    """Bulk delete logs by IDs"""
    try:
        ids = request.data.get('ids', [])
        if not ids:
            return Response({
                'error': 'Silinecek log ID\'leri belirtilmedi'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        deleted_count = LogEntry.objects.filter(id__in=ids).delete()[0]
        
        return Response({
            'message': f'{deleted_count} log kaydı silindi',
            'deleted_count': deleted_count
        })
        
    except Exception as e:
        return Response({
            'error': f'Toplu silme işlemi sırasında hata oluştu: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)