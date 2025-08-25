from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SourceConnectionViewSet

router = DefaultRouter()
router.register(r'source-connections', SourceConnectionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
