from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.db.models import Count, Q
from datetime import datetime
from .models import Log
from .serializers import LogSerializer, CSVUploadSerializer

class LogListView(generics.ListAPIView):
    serializer_class = LogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Log.objects.all()
        severity = self.request.query_params.get('severity')
        search = self.request.query_params.get('search')
        
        if severity:
            queryset = queryset.filter(severity=severity)
        if search:
            queryset = queryset.filter(
                Q(threat__icontains=search) | 
                Q(source_ip__icontains=search) |
                Q(type__icontains=search)
            )
        return queryset

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_csv(request):
    """
    CSV upload endpoint. Expects a multipart/form-data POST with a 'file' field.
    """
    if 'file' not in request.FILES:
        return Response({'message': 'Dosya bulunamadı. Lütfen bir CSV dosyası seçin.'}, status=status.HTTP_400_BAD_REQUEST)
    serializer = CSVUploadSerializer(data=request.data)
    if serializer.is_valid():
        try:
            count = serializer.save(request.user)
            return Response({
                'message': f'{count} log kaydı başarıyla yüklendi',
                'processed_rows': count
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                'message': f'Yükleme sırasında hata oluştu: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    return Response({'message': 'Geçersiz dosya veya format.', 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statistics(request):
    # Severity dağılımı
    severity_stats = Log.objects.values('severity').annotate(count=Count('id'))
    
    # IP bazlı dağılım (top 10)
    ip_stats = Log.objects.values('source_ip').annotate(count=Count('id')).order_by('-count')[:10]
    
    # Saat bazlı dağılım
    hour_stats = []
    for hour in range(24):
        count = Log.objects.filter(receive_time__hour=hour).count()
        hour_stats.append({'hour': hour, 'count': count})
    
    # Tehdit türleri (top 10)
    threat_stats = Log.objects.values('type').annotate(count=Count('id')).order_by('-count')[:10]
    
    # Genel istatistikler
    total_logs = Log.objects.count()
    critical_logs = Log.objects.filter(severity='critical').count()
    unique_ips = Log.objects.values('source_ip').distinct().count()
    
    return Response({
        'severity_distribution': list(severity_stats),
        'ip_distribution': list(ip_stats),
        'hourly_distribution': hour_stats,
        'threat_types': list(threat_stats),
        'general_stats': {
            'total_logs': total_logs,
            'critical_logs': critical_logs,
            'unique_ips': unique_ips
        }
    })