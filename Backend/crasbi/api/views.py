from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import SourceConnection
from .serializers import SourceConnectionSerializer

class SourceConnectionViewSet(viewsets.ModelViewSet):
    queryset = SourceConnection.objects.all()
    serializer_class = SourceConnectionSerializer
    permission_classes = []  # No authentication required
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ['source_name', 'host', 'username', 'db_type']
    ordering_fields = ['source_name', 'db_type', 'host', 'created_at', 'is_active']
    ordering = ['-created_at']
    filterset_fields = ['db_type', 'is_active']

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle the active status of a source connection"""
        source_connection = self.get_object()
        source_connection.is_active = not source_connection.is_active
        source_connection.save()
        serializer = self.get_serializer(source_connection)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def active_connections(self, request):
        """Get only active source connections"""
        connections = SourceConnection.objects.filter(is_active=True)
        serializer = self.get_serializer(connections, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_db_type(self, request):
        """Get source connections grouped by database type"""
        db_type = request.query_params.get('db_type', None)
        if db_type:
            connections = SourceConnection.objects.filter(db_type=db_type)
        else:
            connections = SourceConnection.objects.all()
        
        serializer = self.get_serializer(connections, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def connection_info(self, request, pk=None):
        """Get connection string and basic info without password"""
        source_connection = self.get_object()
        data = {
            'id': source_connection.id,
            'source_name': source_connection.source_name,
            'db_type': source_connection.db_type,
            'host': source_connection.host,
            'port': source_connection.port,
            'username': source_connection.username,
            'is_active': source_connection.is_active,
            'connection_string': source_connection.get_connection_string()
        }
        return Response(data)
