from django.urls import path, include
from rest_framework.routers import DefaultRouter
from calculator.views import (
    calculate_charges, 
    test_api, 
    TransactionRecordViewSet, 
    TransactionGroupViewSet,
    save_calculation,
    health_check,
    SaveCalculationAPIView,
    TradeJournalViewSet,
    TradeTagsViewSet,
    JournalAnalyticsAPIView
)

router = DefaultRouter()
router.register(r'transactions', TransactionRecordViewSet, basename='transaction')
router.register(r'transaction-groups', TransactionGroupViewSet, basename='transaction-group')
router.register(r'trade-journals', TradeJournalViewSet, basename='trade-journal')
router.register(r'trade-tags', TradeTagsViewSet, basename='trade-tag')

urlpatterns = [
    path('', include(router.urls)),
    path('calculate/', calculate_charges, name='calculate'),
    path('test/', test_api, name='test'),
    path('save-calculation/', save_calculation, name='save-calculation'),
    path('save-calculation-api/', SaveCalculationAPIView.as_view(), name='save-calculation-api'),
    path('health/', health_check, name='health-check'),
    path('journal/analytics/', JournalAnalyticsAPIView.as_view(), name='journal-analytics'),
]