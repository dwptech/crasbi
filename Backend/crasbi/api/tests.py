from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import SourceConnection

# Create your tests here.

class SourceConnectionModelTest(TestCase):
    def setUp(self):
        self.connection = SourceConnection.objects.create(
            source_name='Test Connection',
            db_type='sqlserver',
            host='localhost',
            port=1433,
            username='testuser',
            password='testpass',
            inserted_by='testuser'
        )

    def test_source_connection_creation(self):
        self.assertEqual(self.connection.source_name, 'Test Connection')
        self.assertEqual(self.connection.db_type, 'sqlserver')
        self.assertEqual(self.connection.host, 'localhost')
        self.assertEqual(self.connection.port, 1433)
        self.assertTrue(self.connection.is_active)

    def test_password_hashing(self):
        # Password should be hashed
        self.assertTrue(self.connection.password.startswith('hash_'))

class SourceConnectionAPITest(APITestCase):
    def setUp(self):
        self.connection_data = {
            'source_name': 'API Test Connection',
            'db_type': 'postgresql',
            'host': 'testhost.com',
            'port': 5432,
            'username': 'apiuser',
            'password': 'apipass',
            'is_active': True
        }

    def test_create_source_connection(self):
        url = reverse('sourceconnection-list')
        response = self.client.post(url, self.connection_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SourceConnection.objects.count(), 1)
        self.assertEqual(SourceConnection.objects.get().source_name, 'API Test Connection')

    def test_get_source_connections_list(self):
        SourceConnection.objects.create(
            source_name='Test Connection',
            db_type='mysql',
            host='localhost',
            port=3306,
            username='testuser',
            password='testpass',
            inserted_by='system'
        )
        url = reverse('sourceconnection-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
