"""
Analytics views for journal data analysis and reporting
"""

from rest_framework.views import APIView
from rest_framework import permissions, status
from rest_framework.response import Response
from calculator.rate_limiting import apply_throttling
from django.db.models import Count
from ..models import TradeJournal, TradeTags
import uuid
import logging

logger = logging.getLogger(__name__)


class JournalAnalyticsAPIView(APIView):
    """
    API view for generating comprehensive trading analytics
    Provides overall portfolio metrics and tag-based performance analysis
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        """Get comprehensive analytics for all user trades"""
        # Apply rate limiting
        allowed, throttle_response = apply_throttling(request, 'data_operations')
        if not allowed:
            return throttle_response
            
        user_id = self._get_validated_user_id(request.user)
        if isinstance(user_id, Response):
            return user_id
            
        trades = TradeJournal.objects.filter(user_id=user_id).prefetch_related('tags')
        closed_trades_qs = trades.filter(status__in=['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL']).prefetch_related('tags')
        
        # Calculate basic metrics
        basic_metrics = self._calculate_basic_metrics(trades, closed_trades_qs)
        
        # Calculate P&L metrics
        pnl_metrics = self._calculate_pnl_metrics(closed_trades_qs)
        
        # Calculate performance metrics
        performance_metrics = self._calculate_performance_metrics(pnl_metrics['trade_pnls'], basic_metrics['closed_trades'])
        
        # Calculate stock performance
        stock_performance = self._calculate_stock_performance(closed_trades_qs)
        
        # Calculate monthly performance
        monthly_performance = self._calculate_monthly_performance(closed_trades_qs)
        
        # Calculate tag performance
        tag_performance = self._calculate_tag_performance(closed_trades_qs)
        
        # Calculate trade distributions
        distributions = self._calculate_distributions(trades)
        
        # Calculate risk metrics
        risk_metrics = self._calculate_risk_metrics(trades)
        
        response_data = {
            **basic_metrics,
            **pnl_metrics,
            **performance_metrics,
            **stock_performance,
            **monthly_performance,
            **tag_performance,
            **distributions,
            **risk_metrics,
        }
        
        return Response(response_data)

    def get_tag_analytics(self, request, tag_name):
        """Get detailed analytics for a specific tag"""
        user_id = self._get_validated_user_id(request.user)
        if isinstance(user_id, Response):
            return user_id
        
        # Get the specific tag
        try:
            tag = TradeTags.objects.get(name=tag_name, user_id=user_id)
        except TradeTags.DoesNotExist:
            return Response({'error': f'Tag "{tag_name}" not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get trades for this tag
        trades_with_tag = TradeJournal.objects.filter(user_id=user_id, tags=tag).prefetch_related('tags')
        closed_trades_with_tag = trades_with_tag.filter(status__in=['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL'])
        
        # Calculate metrics for this specific tag
        basic_metrics = {
            'tag_name': tag_name,
            'tag_color': tag.color,
            'total_trades_with_tag': trades_with_tag.count(),
            'open_trades_with_tag': trades_with_tag.filter(status='OPEN').count(),
            'closed_trades_with_tag': closed_trades_with_tag.count(),
        }
        
        # Calculate P&L metrics for the tag
        pnl_metrics = self._calculate_pnl_metrics(closed_trades_with_tag)
        basic_metrics['calculable_trades'] = len(pnl_metrics['trade_pnls'])
        
        # Calculate performance metrics
        performance_metrics = self._calculate_performance_metrics(pnl_metrics['trade_pnls'], basic_metrics['calculable_trades'])
        
        response_data = {
            **basic_metrics,
            **pnl_metrics,
            **performance_metrics,
        }
        
        return Response(response_data)

    def _get_validated_user_id(self, user):
        """Validate and return user ID, or error response"""
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
            
        return user_id

    def _calculate_basic_metrics(self, trades, closed_trades_qs):
        """Calculate basic trade counts and metrics"""
        return {
            'total_trades': trades.count(),
            'open_trades': trades.filter(status='OPEN').count(),
            'closed_trades': closed_trades_qs.count(),
        }

    def _calculate_pnl_metrics(self, closed_trades_qs):
        """Calculate P&L related metrics from closed trades"""
        total_pnl = 0
        profitable_trades_count = 0
        losing_trades_count = 0
        trade_pnls = []
        
        for trade in closed_trades_qs:
            pnl = trade.calculate_pnl()
            if pnl is not None:
                total_pnl += pnl
                trade_pnls.append(pnl)
                if pnl > 0:
                    profitable_trades_count += 1
                else:
                    losing_trades_count += 1
        
        # Calculate average P&L
        avg_pnl_per_trade = total_pnl / len(trade_pnls) if trade_pnls else 0
        
        return {
            'total_pnl': round(total_pnl, 2),
            'avg_pnl_per_trade': round(avg_pnl_per_trade, 2),
            'profitable_trades': profitable_trades_count,
            'losing_trades': losing_trades_count,
            'trade_pnls': trade_pnls,  # Used for further calculations
        }

    def _calculate_performance_metrics(self, trade_pnls, closed_trades_count):
        """Calculate performance metrics like win rate, profit factor, etc."""
        if not trade_pnls:
            return {
                'win_rate': 0,
                'profit_factor': 0,
                'max_drawdown': 0,
                'largest_win': 0,
                'largest_loss': 0,
                'avg_win': 0,
                'avg_loss': 0,
                'expectancy': 0,
            }
        
        # Calculate win rate
        profitable_count = sum(1 for pnl in trade_pnls if pnl > 0)
        win_rate = profitable_count / len(trade_pnls) if trade_pnls else 0
        
        # Calculate profit factor
        total_profits = sum(pnl for pnl in trade_pnls if pnl > 0)
        total_losses = abs(sum(pnl for pnl in trade_pnls if pnl < 0))
        profit_factor = total_profits / total_losses if total_losses > 0 else 0
        
        # Calculate maximum drawdown
        max_drawdown = self._calculate_max_drawdown(trade_pnls)
        
        # Calculate largest win and loss
        largest_win = max(trade_pnls) if trade_pnls else 0
        largest_loss = min(trade_pnls) if trade_pnls else 0
        
        # Calculate average win and loss
        avg_win = total_profits / profitable_count if profitable_count > 0 else 0
        losing_count = len(trade_pnls) - profitable_count
        avg_loss = total_losses / losing_count if losing_count > 0 else 0
        
        # Calculate expectancy
        expectancy = (win_rate * avg_win) - ((1-win_rate) * avg_loss) if trade_pnls else 0
        
        return {
            'win_rate': round(win_rate, 4),
            'profit_factor': round(profit_factor, 2),
            'max_drawdown': round(max_drawdown, 2),
            'largest_win': round(largest_win, 2),
            'largest_loss': round(largest_loss, 2),
            'avg_win': round(avg_win, 2),
            'avg_loss': round(avg_loss, 2),
            'expectancy': round(expectancy, 2),
        }

    def _calculate_max_drawdown(self, trade_pnls):
        """Calculate maximum drawdown from trade P&Ls"""
        cumulative_pnl = 0
        peak = 0
        max_drawdown = 0
        
        for pnl in trade_pnls:
            cumulative_pnl += pnl
            if cumulative_pnl > peak:
                peak = cumulative_pnl
            drawdown = peak - cumulative_pnl
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        
        return max_drawdown

    def _calculate_stock_performance(self, closed_trades_qs):
        """Calculate best and worst performing stocks"""
        stock_performance = {}
        for trade in closed_trades_qs:
            pnl = trade.calculate_pnl()
            if pnl is not None:
                company = trade.company_name
                if company not in stock_performance:
                    stock_performance[company] = {'total_pnl': 0, 'trade_count': 0}
                stock_performance[company]['total_pnl'] += pnl
                stock_performance[company]['trade_count'] += 1
        
        # Convert to list and sort
        stock_list = [
            {'company_name': company, 'total_pnl': data['total_pnl'], 'trade_count': data['trade_count']}
            for company, data in stock_performance.items()
        ]
        # Filter only profitable stocks for best performers
        profitable_stocks = [stock for stock in stock_list if stock['total_pnl'] > 0]
        best_performers = sorted(profitable_stocks, key=lambda x: x['total_pnl'], reverse=True)[:5]
        worst_performers = sorted(stock_list, key=lambda x: x['total_pnl'])[:5]
        
        return {
            'best_performing_stocks': best_performers,
            'worst_performing_stocks': worst_performers,
        }

    def _calculate_monthly_performance(self, closed_trades_qs):
        """Calculate monthly performance breakdown"""
        monthly_performance = {}
        for trade in closed_trades_qs:
            pnl = trade.calculate_pnl()
            if pnl is not None and trade.exit_date:
                month_key = trade.exit_date.strftime('%Y-%m')
                if month_key not in monthly_performance:
                    monthly_performance[month_key] = {'total_pnl': 0, 'trade_count': 0}
                monthly_performance[month_key]['total_pnl'] += pnl
                monthly_performance[month_key]['trade_count'] += 1
        
        monthly_list = [
            {'month': month, 'total_pnl': data['total_pnl'], 'trade_count': data['trade_count']}
            for month, data in monthly_performance.items()
        ]
        monthly_list.sort(key=lambda x: x['month'])
        
        return {'monthly_performance': monthly_list}

    def _calculate_tag_performance(self, closed_trades_qs):
        """Calculate performance metrics for each tag"""
        tag_performance = {}
        
        for trade in closed_trades_qs:
            trade_tags = trade.tags.all()
            
            for tag in trade_tags:
                if tag.id not in tag_performance:
                    tag_performance[tag.id] = {
                        'tag_name': tag.name,
                        'tag_color': tag.color,
                        'total_pnl': 0,
                        'trade_count': 0,
                        'profitable_trades': 0,
                        'losing_trades': 0
                    }
                
                # Calculate P&L using model method
                pnl = trade.calculate_pnl()
                if pnl is not None:
                    tag_performance[tag.id]['trade_count'] += 1
                    tag_performance[tag.id]['total_pnl'] += pnl
                    if pnl > 0:
                        tag_performance[tag.id]['profitable_trades'] += 1
                    else:
                        tag_performance[tag.id]['losing_trades'] += 1
                else:
                    logger.warning(f"Trade ID {trade.id} ({trade.company_name}) - Status: {trade.status} but P&L cannot be calculated. This trade will be excluded from analytics.")
        
        # Convert to list and calculate win rates for tags
        tag_performance_list = []
        for tag_data in tag_performance.values():
            win_rate_tag = 0
            if tag_data['trade_count'] > 0:
                win_rate_tag = tag_data['profitable_trades'] / tag_data['trade_count']
            
            tag_performance_list.append({
                'tag_name': tag_data['tag_name'],
                'tag_color': tag_data['tag_color'],
                'total_pnl': round(tag_data['total_pnl'], 2),
                'trade_count': tag_data['trade_count'],
                'win_rate': round(win_rate_tag, 4),
                'profitable_trades': tag_data['profitable_trades'],
                'losing_trades': tag_data['losing_trades']
            })
        
        # Sort by total P&L descending
        tag_performance_list.sort(key=lambda x: x['total_pnl'], reverse=True)
        
        return {'tag_performance': tag_performance_list}

    def _calculate_distributions(self, trades):
        """Calculate trade type and status distributions"""
        trade_type_distribution = list(trades.values('trade_type').annotate(count=Count('id')))
        status_distribution = list(trades.values('status').annotate(count=Count('id')))
        
        return {
            'trade_type_distribution': trade_type_distribution,
            'status_distribution': status_distribution,
        }

    def _calculate_risk_metrics(self, trades):
        """Calculate risk-related metrics"""
        risk_reward_ratios = []
        for trade in trades.filter(stop_loss__isnull=False, target_price__isnull=False):
            if trade.risk_reward_ratio:
                risk_reward_ratios.append(trade.risk_reward_ratio)
        
        avg_risk_reward = sum(risk_reward_ratios) / len(risk_reward_ratios) if risk_reward_ratios else 0
        
        # Calculate drawdown series for charting
        drawdown_series = self._calculate_drawdown_series(trades)
        
        return {
            'avg_risk_reward': round(avg_risk_reward, 2),
            'drawdown_series': drawdown_series,
        }

    def _calculate_drawdown_series(self, trades):
        """Calculate drawdown series for visualization"""
        closed_trades = trades.filter(status__in=['CLOSED_TARGET', 'CLOSED_STOPLOSS', 'CLOSED_MANUAL']).order_by('exit_date')
        
        cumulative_pnl = 0
        peak = 0
        drawdown_series = []
        
        for trade in closed_trades:
            pnl = trade.calculate_pnl()
            if pnl is not None:
                cumulative_pnl += pnl
                if cumulative_pnl > peak:
                    peak = cumulative_pnl
                drawdown = peak - cumulative_pnl
                drawdown_series.append({
                    'cumulative_pnl': cumulative_pnl,
                    'drawdown': drawdown
                })
        
        return drawdown_series