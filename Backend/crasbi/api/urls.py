from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SourceConnectionViewSet, JobViewSet, ETLViewSet

router = DefaultRouter()
router.register(r'source-connections', SourceConnectionViewSet)
router.register(r'jobs', JobViewSet)
router.register(r'etl', ETLViewSet, basename='etl')

urlpatterns = [
    path('', include(router.urls)),
]

