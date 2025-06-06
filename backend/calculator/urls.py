from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter

# Create a router for viewsets
router = DefaultRouter()
router.register(r'transactions', views.TransactionRecordViewSet)
router.register(r'transaction-groups', views.TransactionGroupViewSet)
router.register(r'journal', views.TradeJournalViewSet)
router.register(r'tags', views.TradeTagsViewSet)

app_name = 'calculator'

urlpatterns = [
    path('calculate/', views.calculate_charges),
    path('test/', views.test_api, name='test_api'),
    path('', include(router.urls)),
    path('save-calculation/', views.save_calculation, name='save_calculation'),
    path('save-calculation-class/', views.SaveCalculationAPIView.as_view(), name='save_calculation_class'),
    path('health-check/', views.health_check, name='health_check'),
    path('journal/analytics/', views.JournalAnalyticsAPIView.as_view(), name='journal_analytics'),
]