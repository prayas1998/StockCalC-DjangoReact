"""
Tag management views for organizing and categorizing trades
"""

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count
from ..models import TradeTags
from ..serializers import TradeTagsSerializer
import uuid
import logging

logger = logging.getLogger(__name__)


class TradeTagsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing trade tags
    Provides CRUD operations and popular tags functionality
    """
    queryset = TradeTags.objects.all()
    serializer_class = TradeTagsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter tags by authenticated user"""
        user = self.request.user
        if not user or not hasattr(user, 'id'):
            logger.error(f"No authenticated user or user has no id: {user}")
            return TradeTags.objects.none()
            
        user_id = getattr(user, 'id', None)
        if not user_id:
            logger.error(f"User id is None: {user}")
            return TradeTags.objects.none()
            
        # Convert string UUID to UUID object if necessary
        try:
            if isinstance(user_id, str):
                user_id = uuid.UUID(user_id)
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid user_id format: {user_id}, error: {e}")
            return TradeTags.objects.none()
            
        return TradeTags.objects.filter(user_id=user_id).order_by('name')

    def perform_create(self, serializer):
        """Set user_id when creating a tag"""
        user = self.request.user
        if not user or not hasattr(user, 'id'):
            logger.error(f"No authenticated user or user has no id: {user}")
            raise ValueError("User authentication required")
            
        user_id = getattr(user, 'id', None)
        if not user_id:
            logger.error(f"User id is None: {user}")
            raise ValueError("User ID is required")
            
        # Convert string UUID to UUID object if necessary
        try:
            if isinstance(user_id, str):
                user_id = uuid.UUID(user_id)
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid user_id format: {user_id}, error: {e}")
            raise ValueError("Invalid user ID format")
            
        serializer.save(user_id=user_id)

    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get most frequently used tags by the current user"""
        user = request.user
        user_id = getattr(user, 'id', None)
        if not user_id:
            return Response({'error': 'User authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Convert string UUID to UUID object if necessary
        try:
            if isinstance(user_id, str):
                user_id = uuid.UUID(user_id)
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid user_id format: {user_id}, error: {e}")
            return Response({'error': 'Invalid user ID format'}, status=status.HTTP_400_BAD_REQUEST)
            
        popular_tags = TradeTags.objects.filter(user_id=user_id)\
            .annotate(usage_count=Count('journals'))\
            .order_by('-usage_count')[:10]
        serializer = self.get_serializer(popular_tags, many=True)
        return Response(serializer.data)