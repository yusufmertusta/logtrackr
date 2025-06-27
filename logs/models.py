from django.db import models
from django.contrib.auth.models import User

class Log(models.Model):
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    receive_time = models.DateTimeField()
    type = models.CharField(max_length=100)
    severity = models.CharField(max_length=50, choices=SEVERITY_CHOICES)
    threat = models.TextField()
    source_ip = models.GenericIPAddressField()
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-receive_time']
    
    def __str__(self):
        return f"{self.receive_time} - {self.severity} - {self.source_ip}"