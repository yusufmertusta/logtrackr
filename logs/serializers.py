from rest_framework import serializers
from .models import Log
import pandas as pd

class LogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Log
        fields = '__all__'
        read_only_fields = ('uploaded_by', 'created_at')

class CSVUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    
    def validate_file(self, value):
        if not value.name.endswith('.csv'):
            raise serializers.ValidationError("Sadece CSV dosyaları kabul edilir")
        return value
    
    def save(self, user):
        import logging
        file = self.validated_data['file']
        df = pd.read_csv(file)
        
        required_columns = ['receive_time', 'type', 'severity', 'threat', 'source_ip']
        if not all(col in df.columns for col in required_columns):
            raise serializers.ValidationError(f"CSV dosyası şu kolonları içermelidir: {required_columns}")
        
        logs = []
        errors = []
        valid_severities = {'low', 'medium', 'high', 'critical'}
        for idx, row in df.iterrows():
            try:
                # Try parsing with seconds, then without seconds, then fallback
                try:
                    receive_time = pd.to_datetime(row['receive_time'], format='%d.%m.%Y %H:%M:%S', errors='raise')
                except Exception:
                    try:
                        receive_time = pd.to_datetime(row['receive_time'], format='%d.%m.%Y %H:%M', errors='raise')
                    except Exception:
                        receive_time = pd.to_datetime(row['receive_time'], dayfirst=True, errors='raise')
                severity = str(row['severity']).strip().lower()
                if severity not in valid_severities:
                    raise ValueError(f"Geçersiz severity: {severity}")
                log = Log(
                    receive_time=receive_time,
                    type=row['type'],
                    severity=severity,
                    threat=row['threat'],
                    source_ip=row['source_ip'],
                    uploaded_by=user
                )
                logs.append(log)
            except Exception as e:
                errors.append(f"Row {idx+2} failed: {e} | Data: {row.to_dict()}")
                continue
        
        created = 0
        if logs:
            Log.objects.bulk_create(logs)
            created = len(logs)
        
        if errors:
            logging.warning("CSV upload errors:\n" + "\n".join(errors))
        
        if created == 0:
            raise serializers.ValidationError("Hiçbir log kaydı eklenemedi. Hatalar: " + "; ".join(errors))
        
        return created