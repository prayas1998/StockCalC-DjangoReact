from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TradeJournalViewSet, TradeTagsViewSet, JournalAnalyticsAPIView

router = DefaultRouter()
router.register(r'journal', TradeJournalViewSet, basename='journal')
router.register(r'tags', TradeTagsViewSet, basename='tags')

urlpatterns = [
    path('', include(router.urls)),
    path('journal/analytics/', JournalAnalyticsAPIView.as_view(), name='journal_analytics'),
] 