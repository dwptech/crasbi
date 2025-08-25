from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SourceConnectionViewSet, JobViewSet

router = DefaultRouter()
router.register(r'source-connections', SourceConnectionViewSet)
router.register(r'jobs', JobViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
