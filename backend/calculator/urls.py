from django.urls import path
from . import views

app_name = 'calculator'

urlpatterns = [
    path('calculate/', views.calculate_charges),
    path('test/', views.test_api, name='test_api'),
]