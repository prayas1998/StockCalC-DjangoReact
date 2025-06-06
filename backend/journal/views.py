from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count, Sum, Avg, Q, F, Case, When, Value, IntegerField
from django.db.models.functions import TruncMonth
from .models import TradeJournal, TradeTags, TradeJournalTags
from .serializers import (
    TradeJournalSerializer,
    TradeJournalListSerializer,
    TradeJournalCreateSerializer,
    TradeTagsSerializer
)

class JournalPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class TradeJournalViewSet(viewsets.ModelViewSet):
    queryset = TradeJournal.objects.all().order_by('-entry_date')
    serializer_class = TradeJournalSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = JournalPagination

    def get_serializer_class(self):
        if self.action == 'list':
            return TradeJournalListSerializer
        elif self.action == 'create':
            return TradeJournalCreateSerializer
        return TradeJournalSerializer

    def get_queryset(self):
        user = self.request.user
        return TradeJournal.objects.filter(user=user).prefetch_related('tags').order_by('-entry_date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('query', '')
        if not query:
            return Response({'error': 'Query parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        queryset = self.get_queryset().filter(
            Q(company_name__icontains=query) | Q(personal_notes__icontains=query)
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        analytics_view = JournalAnalyticsAPIView()
        analytics_view.request = request
        return analytics_view.get(request)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        trade = self.get_object()
        status_value = request.data.get('status')
        if not status_value:
            return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)
        valid_statuses = [choice[0] for choice in TradeJournal.STATUS_CHOICES]
        if status_value not in valid_statuses:
            return Response({'error': f'Invalid status. Must be one of: {valid_statuses}'}, status=status.HTTP_400_BAD_REQUEST)
        trade.status = status_value
        trade.save(update_fields=['status', 'updated_at'])
        serializer = self.get_serializer(trade)
        return Response(serializer.data)

class TradeTagsViewSet(viewsets.ModelViewSet):
    queryset = TradeTags.objects.all()
    serializer_class = TradeTagsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return TradeTags.objects.filter(user=user).order_by('name')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def popular(self, request):
        user = request.user
        popular_tags = TradeTags.objects.filter(user=user)\
            .annotate(usage_count=Count('journals'))\
            .order_by('-usage_count')[:10]
        serializer = self.get_serializer(popular_tags, many=True)
        return Response(serializer.data)

class JournalAnalyticsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        user = request.user
        trades = TradeJournal.objects.filter(user=user)
        total_trades = trades.count()
        open_trades = trades.filter(status='OPEN').count()
        closed_trades = trades.filter(status__startswith='CLOSED').count()
        profitable_trades = trades.filter(status__startswith='CLOSED').annotate(
            is_profit=Case(
                When(sell_price__gt=F('buy_price'), then=Value(1)),
                default=Value(0),
                output_field=IntegerField()
            )
        ).aggregate(profitable_count=Sum('is_profit'))
        win_rate = 0
        if closed_trades > 0:
            win_rate = (profitable_trades['profitable_count'] or 0) / closed_trades * 100
        pnl_data = trades.filter(status__startswith='CLOSED').aggregate(
            total_pnl=Sum((F('sell_price') - F('buy_price')) * F('quantity'), output_field=IntegerField()),
            avg_pnl=Avg((F('sell_price') - F('buy_price')) * F('quantity'), output_field=IntegerField())
        )
        best_performers = trades.filter(status__startswith='CLOSED')\
            .values('company_name')\
            .annotate(
                total_pnl=Sum((F('sell_price') - F('buy_price')) * F('quantity')),
                trade_count=Count('id')
            )\
            .order_by('-total_pnl')[:5]
        worst_performers = trades.filter(status__startswith='CLOSED')\
            .values('company_name')\
            .annotate(
                total_pnl=Sum((F('sell_price') - F('buy_price')) * F('quantity')),
                trade_count=Count('id')
            )\
            .order_by('total_pnl')[:5]
        monthly_performance = trades.filter(status__startswith='CLOSED')\
            .annotate(month=TruncMonth('exit_date'))\
            .values('month')\
            .annotate(
                total_pnl=Sum((F('sell_price') - F('buy_price')) * F('quantity')),
                trade_count=Count('id')
            )\
            .order_by('month')
        response_data = {
            'total_trades': total_trades,
            'open_trades': open_trades,
            'closed_trades': closed_trades,
            'win_rate': round(win_rate, 2),
            'total_pnl': pnl_data['total_pnl'] or 0,
            'avg_pnl_per_trade': pnl_data['avg_pnl'] or 0,
            'best_performing_stocks': list(best_performers),
            'worst_performing_stocks': list(worst_performers),
            'monthly_performance': list(monthly_performance)
        }
        return Response(response_data)
