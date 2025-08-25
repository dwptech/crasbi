from rest_framework import serializers
from .models import SourceConnection

class SourceConnectionSerializer(serializers.ModelSerializer):
    db_type_display = serializers.CharField(source='get_db_type_display', read_only=True)
    inserted_by_username = serializers.CharField(source='inserted_by', read_only=True)
    
    class Meta:
        model = SourceConnection
        fields = ['id', 'source_name', 'db_type', 'db_type_display', 'host', 'port', 'username', 'password', 'is_active', 'created_at', 'updated_at', 'inserted_by_username']
        read_only_fields = ['id', 'created_at', 'inserted_by_username']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        # Set inserted_by from request user or default value
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['inserted_by'] = request.user.username
        else:
            validated_data['inserted_by'] = 'system'
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Set updated_at timestamp
        from django.utils import timezone
        instance.updated_at = timezone.now()
        return super().update(instance, validated_data)

class SourceConnectionDetailSerializer(serializers.ModelSerializer):
    db_type_display = serializers.CharField(source='get_db_type_display', read_only=True)
    connection_string = serializers.SerializerMethodField()
    
    class Meta:
        model = SourceConnection
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'inserted_by']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def get_connection_string(self, obj):
        return obj.get_connection_string()
