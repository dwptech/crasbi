from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
import hashlib
import os

class SourceConnection(models.Model):
    DB_TYPE_CHOICES = [
        ('mysql', 'MySQL'),
        ('postgresql', 'PostgreSQL'),
        ('sqlserver', 'SQL Server'),
        ('oracle', 'Oracle'),
        ('sqlite', 'SQLite'),
        ('mongodb', 'MongoDB'),
        ('redis', 'Redis'),
        ('elasticsearch', 'Elasticsearch'),
    ]
    
    id = models.AutoField(primary_key=True)
    source_name = models.CharField(max_length=255)
    db_type = models.CharField(max_length=50, choices=DB_TYPE_CHOICES)
    host = models.CharField(max_length=255)
    port = models.IntegerField()
    username = models.CharField(max_length=100)
    password = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(null=True, blank=True)
    inserted_by = models.CharField(max_length=100)

    class Meta:
        # db_table = 'source_connection'  # Uncomment when using SQL Server
        verbose_name = 'Source Connection'
        verbose_name_plural = 'Source Connections'
        ordering = ['-created_at']
        unique_together = ['source_name', 'host', 'port']

    def __str__(self):
        return f"{self.source_name} ({self.db_type} - {self.host}:{self.port})"

    def save(self, *args, **kwargs):
        # Hash password before saving if it's not already hashed
        if self.password and not self.password.startswith('hash_'):
            salt = os.urandom(32).hex()
            hashed = hashlib.pbkdf2_hmac('sha256', self.password.encode('utf-8'), salt.encode('utf-8'), 100000)
            self.password = f"hash_{salt}_{hashed.hex()}"
        super().save(*args, **kwargs)

    def get_connection_string(self):
        """Generate connection string based on database type"""
        if self.db_type == 'mysql':
            return f"mysql://{self.username}:{self.password}@{self.host}:{self.port}"
        elif self.db_type == 'postgresql':
            return f"postgresql://{self.username}:{self.password}@{self.host}:{self.port}"
        elif self.db_type == 'sqlserver':
            return f"mssql+pyodbc://{self.username}:{self.password}@{self.host}:{self.port}"
        elif self.db_type == 'oracle':
            return f"oracle+cx_oracle://{self.username}:{self.password}@{self.host}:{self.port}"
        elif self.db_type == 'sqlite':
            return f"sqlite:///{self.host}"
        elif self.db_type == 'mongodb':
            return f"mongodb://{self.username}:{self.password}@{self.host}:{self.port}"
        elif self.db_type == 'redis':
            return f"redis://{self.username}:{self.password}@{self.host}:{self.port}"
        elif self.db_type == 'elasticsearch':
            return f"http://{self.username}:{self.password}@{self.host}:{self.port}"
        return f"{self.db_type}://{self.username}@{self.host}:{self.port}"

    def clean(self):
        """Custom validation"""
        if self.port < 1 or self.port > 65535:
            raise ValidationError('Port must be between 1 and 65535')
        
        if not self.host or self.host.strip() == '':
            raise ValidationError('Host cannot be empty')
