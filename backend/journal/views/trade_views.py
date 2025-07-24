"""
Trade journal views for CRUD operations and search functionality
"""

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Case, When, Value, IntegerField, BooleanField, Count, F
from calculator.rate_limiting import apply_throttling
from ..models import TradeJournal, TradeTags
from ..serializers import (
    TradeJournalSerializer,
    TradeJournalListSerializer,
    TradeJournalCreateSerializer,
)
import uuid
import logging

logger = logging.getLogger(__name__)


class JournalPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class TradeJournalViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing trade journal entries
    Provides CRUD operations, search, and status updates
    """
    queryset = TradeJournal.objects.all().order_by('-entry_date')
    serializer_class = TradeJournalSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = JournalPagination

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return TradeJournalListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return TradeJournalCreateSerializer
        return TradeJournalSerializer

    def get_queryset(self):
        """Filter queryset by authenticated user and apply filters"""
        user = self.request.user
        if not user or not hasattr(user, 'id'):
            logger.error(f"No authenticated user or user has no id: {user}")
            return TradeJournal.objects.none()
            
        user_id = getattr(user, 'id', None)
        if not user_id:
            logger.error(f"User id is None: {user}")
            return TradeJournal.objects.none()
        
        # Convert string UUID to UUID object if necessary
        try:
            if isinstance(user_id, str):
                user_id = uuid.UUID(user_id)
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid user_id format: {user_id}, error: {e}")
            return TradeJournal.objects.none()
            
        queryset = TradeJournal.objects.filter(user_id=user_id).prefetch_related('tags').order_by('-entry_date')

        # Apply filters
        queryset = self._apply_filters(queryset)
        return queryset

    def _apply_filters(self, queryset):
        """Apply query parameter filters to the queryset"""
        # Filter by status - handle array format (both APIs now use same format)
        status_filter = self.request.query_params.getlist('status')
        if status_filter:
            queryset = queryset.filter(status__in=status_filter)

        # Filter by trade_type - handle array format (consistent across all APIs)
        trade_type_filter = self.request.query_params.getlist('trade_type')
        if trade_type_filter:
            queryset = queryset.filter(trade_type__in=trade_type_filter)

        # Filter by tags (must match all selected tags)
        tag_ids = self.request.query_params.getlist('tags') or self.request.query_params.get('tags')
        if tag_ids:
            if isinstance(tag_ids, str):
                tag_ids = [tag_ids]
            for tag_id in tag_ids:
                queryset = queryset.filter(tags__id=tag_id)
            queryset = queryset.distinct()

        # Filter by company names
        companies = self.request.query_params.getlist('companies') or self.request.query_params.get('companies')
        if companies:
            if isinstance(companies, str):
                companies = [companies]
            queryset = queryset.filter(company_name__in=companies)

        return queryset

    def create(self, request, *args, **kwargs):
        """Create a new trade with rate limiting"""
        allowed, throttle_response = apply_throttling(request, 'data_operations')
        if not allowed:
            return throttle_response
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """Set user_id when creating a trade"""
        user_id = getattr(self.request.user, 'id', None)
        if not user_id:
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
    def search(self, request):
        """3-tier relevance scoring search with filter support"""
        query = request.query_params.get('query', '').strip().lower()
        if not query:
            return Response({'error': 'Query parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Start with base queryset (already includes user filtering and filters via get_queryset)
        queryset = self.get_queryset()
        
        # Simple 3-tier scoring: Exact (100), Prefix (50), Contains (10)
        # Use Max to get highest score when trade has multiple matching tags
        from django.db.models import Max
        
        search_queryset = queryset.annotate(
            relevance_score=Case(
                # Exact matches (100 points)
                When(company_name__iexact=query, then=Value(100)),
                When(tags__name__iexact=query, then=Value(100)),
                # Prefix matches (50 points)
                When(company_name__istartswith=query, then=Value(50)),
                When(tags__name__istartswith=query, then=Value(50)),
                # Contains matches (10 points)
                When(company_name__icontains=query, then=Value(10)),
                When(tags__name__icontains=query, then=Value(10)),
                When(personal_notes__icontains=query, then=Value(10)),
                default=Value(0),
                output_field=IntegerField()
            )
        ).filter(
            Q(company_name__icontains=query) |
            Q(personal_notes__icontains=query) |
            Q(tags__name__icontains=query)
        ).values('id').annotate(
            max_score=Max('relevance_score')
        ).values_list('id', flat=True)
        
        # Get the actual trade objects with their highest scores
        trade_ids = list(search_queryset)
        final_queryset = TradeJournal.objects.filter(
            id__in=trade_ids,
            user_id=self.request.user.id
        ).prefetch_related('tags').annotate(
            relevance_score=Case(
                # Exact matches (100 points)
                When(company_name__iexact=query, then=Value(100)),
                When(tags__name__iexact=query, then=Value(100)),
                # Prefix matches (50 points)
                When(company_name__istartswith=query, then=Value(50)),
                When(tags__name__istartswith=query, then=Value(50)),
                # Contains matches (10 points)
                When(company_name__icontains=query, then=Value(10)),
                When(tags__name__icontains=query, then=Value(10)),
                When(personal_notes__icontains=query, then=Value(10)),
                default=Value(0),
                output_field=IntegerField()
            )
        ).order_by('-relevance_score', '-entry_date')
        
        page = self.paginate_queryset(final_queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(final_queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def suggestions(self, request):
        """Simple 3-tier search suggestions with trading term boost"""
        query = request.query_params.get('query', '').strip()
        if len(query) < 2:
            return Response([])
        
        user = request.user
        if not user or not hasattr(user, 'id'):
            return Response([])
            
        user_id = getattr(user, 'id', None)
        if not user_id:
            return Response([])
        
        # Convert string UUID to UUID object if necessary
        try:
            if isinstance(user_id, str):
                user_id = uuid.UUID(user_id)
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid user_id format: {user_id}, error: {e}")
            return Response([])
        
        suggestions = []
        query_lower = query.lower()
        
        # Get companies with simple 3-tier scoring
        companies = TradeJournal.objects.filter(
            user_id=user_id, 
            company_name__icontains=query
        ).values('company_name').annotate(
            trade_count=Count('id')
        ).distinct()[:5]
        
        for company in companies:
            name = company['company_name']
            name_lower = name.lower()
            
            # Simple 3-tier scoring
            if name_lower == query_lower:
                score = 100  # Exact match
            elif name_lower.startswith(query_lower):
                score = 50   # Prefix match
            else:
                score = 10   # Contains match
                
            suggestions.append({
                'id': f"company-{name}",
                'text': name,
                'type': 'company',
                'score': score
            })
        
        # Get tags with simple 3-tier scoring
        tags = TradeTags.objects.filter(
            user_id=user_id,
            name__icontains=query
        )[:5]
        
        for tag in tags:
            name_lower = tag.name.lower()
            
            # Simple 3-tier scoring
            if name_lower == query_lower:
                score = 100  # Exact match
            elif name_lower.startswith(query_lower):
                score = 50   # Prefix match
            else:
                score = 10   # Contains match
            
            # Trading term boost (+25 points)
            import re
            trading_patterns = [
                r'\d+\s*(ma|ema|rsi|sma)',
                r'(breakout|support|resistance)'
            ]
            if any(re.search(pattern, query_lower) for pattern in trading_patterns):
                score += 25
                
            suggestions.append({
                'id': f"tag-{tag.id}",
                'text': tag.name,
                'type': 'tag',
                'score': score
            })
        
        # Sort by score and return top 10
        suggestions.sort(key=lambda x: x['score'], reverse=True)
        return Response(suggestions[:10])

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get analytics data - delegates to analytics views"""
        from .analytics_views import JournalAnalyticsAPIView
        analytics_view = JournalAnalyticsAPIView()
        analytics_view.request = request
        return analytics_view.get(request)

    @action(detail=False, methods=['get'])
    def tag_analytics(self, request):
        """Get analytics for a specific tag - delegates to analytics views"""
        tag_name = request.query_params.get('tag_name')
        if not tag_name:
            return Response({'error': 'tag_name parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .analytics_views import JournalAnalyticsAPIView
        analytics_view = JournalAnalyticsAPIView()
        analytics_view.request = request
        return analytics_view.get_tag_analytics(request, tag_name)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update the status of a specific trade"""
        trade = self.get_object()
        status_value = request.data.get('status')
        if not status_value:
            return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        valid_statuses = [choice[0] for choice in TradeJournal.STATUS_CHOICES]
        if status_value not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {valid_statuses}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        trade.status = status_value
        trade.save(update_fields=['status', 'updated_at'])
        serializer = self.get_serializer(trade)
        return Response(serializer.data)