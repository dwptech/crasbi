from rest_framework import serializers
from .models import SourceConnection, Job

class SourceConnectionSerializer(serializers.ModelSerializer):
    db_type_display = serializers.CharField(source='get_db_type_display', read_only=True)
    inserted_by_username = serializers.CharField(source='inserted_by', read_only=True)
    connection_string = serializers.SerializerMethodField()
    
    class Meta:
        model = SourceConnection
        fields = [
            'id', 'source_name', 'db_type', 'db_type_display', 'host', 'port', 
            'username', 'password', 'is_active', 'created_at', 'updated_at', 
            'inserted_by_username', 'connection_string'
        ]
        read_only_fields = ['id', 'created_at', 'inserted_by_username']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def get_connection_string(self, obj):
        """Only show connection string in detail view"""
        request = self.context.get('request')
        if request and request.method == 'GET' and 'pk' in request.parser_context.get('kwargs', {}):
            return obj.get_connection_string()
        return None

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

    def to_representation(self, instance):
        """Customize output based on context"""
        data = super().to_representation(instance)
        
        # Remove connection_string from list views
        request = self.context.get('request')
        if request and request.method == 'GET' and 'pk' not in request.parser_context.get('kwargs', {}):
            data.pop('connection_string', None)
        
        return data

class JobSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source='source.source_name', read_only=True)
    inserted_by_username = serializers.CharField(source='created_by', read_only=True)

    class Meta:
        model = Job
        fields = [
            'id', 'job_name', 'source', 'source_name', 'source_table', 'target_table',
            'job_query', 'created_at', 'updated_at', 'inserted_by_username'
        ]
        read_only_fields = ['id', 'created_at', 'inserted_by_username']

    def create(self, validated_data):
        request = self.context.get('request')
        
        # If frontend passes source_name instead of id
        source_name = self.initial_data.get('source_name')
        if source_name:
            try:
                source = SourceConnection.objects.get(source_name=source_name)
                validated_data['source'] = source
            except SourceConnection.DoesNotExist:
                raise serializers.ValidationError({"source": "Invalid source_name."})

        # Handle created_by
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['created_by'] = str(request.user)
        else:
            validated_data['created_by'] = 'system'

        return super().create(validated_data)
    
class JobDetailSerializer(serializers.ModelSerializer):
    source = SourceConnectionSerializer(read_only=True)

    class Meta:
        model = Job
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
