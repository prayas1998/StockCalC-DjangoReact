from django.urls import path
from . import views
from .views.auth_views import (
    logout_user, revoke_all_tokens, token_introspection, security_status
)

app_name = 'calculator'

urlpatterns = [
    path('calculate/', views.calculate_charges),
    path('health-check/', views.health_check, name='health_check'),
    # Profile management endpoints
    path('profile/', views.ProfileAPIView.as_view(), name='profile'),
    path('profile/change-password/', views.change_password, name='change_password'),
    path('profile/delete-account/', views.delete_account, name='delete_account'),
    # Authentication token management endpoints (simplified)
    
    # Enhanced authentication endpoints with blacklist support
    path('auth/logout/', logout_user, name='logout_user'),
    path('auth/revoke-all/', revoke_all_tokens, name='revoke_all_tokens'),
    path('auth/introspect/', token_introspection, name='token_introspection'),
    path('auth/security-status/', security_status, name='security_status'),
]