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
        elif self.action in ['create', 'update', 'partial_update']:
            return TradeJournalCreateSerializer
        return TradeJournalSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = TradeJournal.objects.filter(user=user).prefetch_related('tags').order_by('-entry_date')

        # Filtering by status
        status = self.request.query_params.getlist('status') or self.request.query_params.get('status')
        if status:
            if isinstance(status, list) and len(status) > 0:
                queryset = queryset.filter(status__in=status)
            else:
                queryset = queryset.filter(status=status)

        # Filtering by trade_type
        trade_type = self.request.query_params.getlist('trade_type') or self.request.query_params.get('trade_type')
        if trade_type:
            if isinstance(trade_type, list) and len(trade_type) > 0:
                queryset = queryset.filter(trade_type__in=trade_type)
            else:
                queryset = queryset.filter(trade_type=trade_type)

        # Filtering by tags (must match all selected tags)
        tag_ids = self.request.query_params.getlist('tags') or self.request.query_params.get('tags')
        if tag_ids:
            if isinstance(tag_ids, str):
                tag_ids = [tag_ids]
            for tag_id in tag_ids:
                queryset = queryset.filter(tags__id=tag_id)
            queryset = queryset.distinct()

        return queryset

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

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

    def calculate_pnl_for_trade(self, trade):
        """Calculate Net P&L for a single trade using the same backend API"""
        if not trade.sell_price:
            return 0
        
        # Use the same calculation logic as individual trades for consistency
        return trade.calculate_pnl() or 0

    def get(self, request, format=None):
        user = request.user
        trades = TradeJournal.objects.filter(user=user)
        closed_trades_qs = trades.filter(status__in=['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL'])
        
        total_trades = trades.count()
        open_trades = trades.filter(status='OPEN').count()
        closed_trades = closed_trades_qs.count()
        
        # Calculate P&L properly considering direction
        total_pnl = 0
        profitable_trades_count = 0
        losing_trades_count = 0
        trade_pnls = []
        
        for trade in closed_trades_qs:
            if trade.sell_price:
                pnl = self.calculate_pnl_for_trade(trade)
                total_pnl += pnl
                trade_pnls.append(pnl)
                if pnl > 0:
                    profitable_trades_count += 1
                else:
                    losing_trades_count += 1
        
        # Calculate win rate (return as decimal, not percentage)
        win_rate = 0
        if closed_trades > 0:
            win_rate = profitable_trades_count / closed_trades
        
        # Calculate average P&L
        avg_pnl_per_trade = total_pnl / closed_trades if closed_trades > 0 else 0
        
        # Calculate profit factor
        total_profits = sum(pnl for pnl in trade_pnls if pnl > 0)
        total_losses = abs(sum(pnl for pnl in trade_pnls if pnl < 0))
        profit_factor = total_profits / total_losses if total_losses > 0 else 0
        
        # Calculate maximum drawdown
        cumulative_pnl = 0
        peak = 0
        max_drawdown = 0
        drawdown_series = []
        
        for pnl in trade_pnls:
            cumulative_pnl += pnl
            if cumulative_pnl > peak:
                peak = cumulative_pnl
            drawdown = peak - cumulative_pnl
            if drawdown > max_drawdown:
                max_drawdown = drawdown
            drawdown_series.append({
                'cumulative_pnl': cumulative_pnl,
                'drawdown': drawdown
            })
        
        # Calculate largest win and loss
        largest_win = max(trade_pnls) if trade_pnls else 0
        largest_loss = min(trade_pnls) if trade_pnls else 0
        
        # Calculate average win and loss
        avg_win = total_profits / profitable_trades_count if profitable_trades_count > 0 else 0
        avg_loss = total_losses / losing_trades_count if losing_trades_count > 0 else 0
        
        # Calculate expectancy
        expectancy = (win_rate * avg_win) - ((1-win_rate) * avg_loss) if closed_trades > 0 else 0
        
        # Best and worst performing stocks with proper P&L calculation
        stock_performance = {}
        for trade in closed_trades_qs:
            if trade.sell_price:
                company = trade.company_name
                pnl = self.calculate_pnl_for_trade(trade)
                if company not in stock_performance:
                    stock_performance[company] = {'total_pnl': 0, 'trade_count': 0}
                stock_performance[company]['total_pnl'] += pnl
                stock_performance[company]['trade_count'] += 1
        
        # Convert to list and sort
        stock_list = [
            {'company_name': company, 'total_pnl': data['total_pnl'], 'trade_count': data['trade_count']}
            for company, data in stock_performance.items()
        ]
        best_performers = sorted(stock_list, key=lambda x: x['total_pnl'], reverse=True)[:5]
        worst_performers = sorted(stock_list, key=lambda x: x['total_pnl'])[:5]
        
        # Monthly performance with proper P&L calculation
        monthly_performance = {}
        for trade in closed_trades_qs:
            if trade.sell_price and trade.exit_date:
                month_key = trade.exit_date.strftime('%Y-%m')
                pnl = self.calculate_pnl_for_trade(trade)
                if month_key not in monthly_performance:
                    monthly_performance[month_key] = {'total_pnl': 0, 'trade_count': 0}
                monthly_performance[month_key]['total_pnl'] += pnl
                monthly_performance[month_key]['trade_count'] += 1
        
        monthly_list = [
            {'month': month, 'total_pnl': data['total_pnl'], 'trade_count': data['trade_count']}
            for month, data in monthly_performance.items()
        ]
        monthly_list.sort(key=lambda x: x['month'])
        
        # Trade distribution by type and status
        trade_type_distribution = list(trades.values('trade_type').annotate(count=Count('id')))
        status_distribution = list(trades.values('status').annotate(count=Count('id')))
        
        # Risk metrics
        risk_reward_ratios = []
        for trade in trades.filter(stop_loss__isnull=False, target_price__isnull=False):
            if trade.risk_reward_ratio:
                risk_reward_ratios.append(trade.risk_reward_ratio)
        
        avg_risk_reward = sum(risk_reward_ratios) / len(risk_reward_ratios) if risk_reward_ratios else 0
        
        response_data = {
            'total_trades': total_trades,
            'open_trades': open_trades,
            'closed_trades': closed_trades,
            'win_rate': round(win_rate, 4),
            'total_pnl': round(total_pnl, 2),  # Net P&L including all charges
            'avg_pnl_per_trade': round(avg_pnl_per_trade, 2),
            'profit_factor': round(profit_factor, 2),
            'max_drawdown': round(max_drawdown, 2),
            'largest_win': round(largest_win, 2),
            'largest_loss': round(largest_loss, 2),
            'avg_win': round(avg_win, 2),
            'avg_loss': round(avg_loss, 2),
            'expectancy': round(expectancy, 2),
            'avg_risk_reward': round(avg_risk_reward, 2),
            'profitable_trades': profitable_trades_count,
            'losing_trades': losing_trades_count,
            'best_performing_stocks': best_performers,
            'worst_performing_stocks': worst_performers,
            'monthly_performance': monthly_list,
            'drawdown_series': drawdown_series,
            'trade_type_distribution': trade_type_distribution,
            'status_distribution': status_distribution,
        }
        return Response(response_data)
