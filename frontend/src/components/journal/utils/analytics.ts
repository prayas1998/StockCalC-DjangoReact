/**
 * Analytics utilities for journal data processing
 */

import { TradeJournal, JournalAnalytics } from '@/types/journal';
import { formatCurrency } from '@/lib/utils';

/**
 * Calculate additional metrics from trade data
 */
export function calculateDerivedMetrics(analytics: JournalAnalytics) {
  return {
    winRatePercentage: parseFloat((analytics.win_rate * 100).toFixed(2)),
    avgRiskReward: parseFloat((analytics.avg_risk_reward || 0).toFixed(2)),
    profitFactor: parseFloat((analytics.profit_factor || 0).toFixed(2)),
    maxDrawdownFormatted: formatCurrency(Math.abs(analytics.max_drawdown || 0)),
    expectancyFormatted: formatCurrency(analytics.expectancy || 0),
    largestWinFormatted: formatCurrency(analytics.largest_win || 0),
    largestLossFormatted: formatCurrency(analytics.largest_loss || 0),
    avgWinFormatted: formatCurrency(analytics.avg_win || 0),
    avgLossFormatted: formatCurrency(analytics.avg_loss || 0),
    totalPnLFormatted: formatCurrency(analytics.total_pnl || 0),
    avgPnLFormatted: formatCurrency(analytics.avg_pnl_per_trade || 0),
  };
}

/**
 * Transform monthly performance data for charts
 */
export function transformMonthlyData(monthlyPerformance: JournalAnalytics['monthly_performance']) {
  if (!monthlyPerformance) return [];
  
  return monthlyPerformance.map(month => ({
    name: month.month,
    pnl: month.total_pnl,
    trades: month.trade_count,
    formattedPnL: formatCurrency(month.total_pnl),
  }));
}

/**
 * Transform stock performance data for charts
 */
export function transformStockData(
  bestStocks: JournalAnalytics['best_performing_stocks'],
  worstStocks: JournalAnalytics['worst_performing_stocks']
) {
  if (!bestStocks || !worstStocks) return [];
  
  // Combine and deduplicate stocks by company name
  const stockMap = new Map();
  
  // Add best performing stocks
  bestStocks.forEach(stock => {
    stockMap.set(stock.company_name, {
      name: stock.company_name,
      pnl: stock.total_pnl,
      trades: stock.trade_count,
      formattedPnL: formatCurrency(stock.total_pnl),
    });
  });
  
  // Add worst performing stocks (only if not already present)
  worstStocks.forEach(stock => {
    if (!stockMap.has(stock.company_name)) {
      stockMap.set(stock.company_name, {
        name: stock.company_name,
        pnl: stock.total_pnl,
        trades: stock.trade_count,
        formattedPnL: formatCurrency(stock.total_pnl),
      });
    }
  });
  
  // Convert map to array and sort by P&L
  return Array.from(stockMap.values())
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 10); // Show top 10
}

/**
 * Transform trade type distribution for pie charts
 */
export function transformTradeTypeData(distribution: JournalAnalytics['trade_type_distribution']) {
  if (!distribution) return [];
  
  return distribution.map(item => ({
    name: item.trade_type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
    value: item.count,
    percentage: 0, // Will be calculated by the chart
  }));
}

/**
 * Transform status distribution for pie charts
 */
export function transformStatusData(distribution: JournalAnalytics['status_distribution']) {
  if (!distribution) return [];
  
  return distribution.map(item => ({
    name: item.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
    value: item.count,
    percentage: 0, // Will be calculated by the chart
  }));
}

/**
 * Transform drawdown data for line charts
 */
export function transformDrawdownData(drawdownSeries: JournalAnalytics['drawdown_series']) {
  if (!drawdownSeries) return [];
  
  return drawdownSeries.map((item, index) => ({
    trade: index + 1,
    cumulative_pnl: item.cumulative_pnl,
    drawdown: -item.drawdown, // Negative for visual representation
    formattedCumulativePnL: formatCurrency(item.cumulative_pnl),
    formattedDrawdown: formatCurrency(-item.drawdown),
  }));
}

/**
 * Calculate portfolio metrics from trades
 */
export function calculatePortfolioMetrics(trades: TradeJournal[]) {
  if (!trades.length) {
    return {
      totalValue: 0,
      totalPnL: 0,
      totalInvested: 0,
      averageHoldingPeriod: 0,
      largestPosition: 0,
      diversificationRatio: 0,
    };
  }

  const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const totalInvested = trades.reduce((sum, trade) => sum + (trade.buy_price * trade.quantity), 0);
  
  // Calculate holding periods for closed trades
  const closedTrades = trades.filter(trade => trade.exit_date);
  const holdingPeriods = closedTrades.map(trade => {
    const entryDate = new Date(trade.entry_date);
    const exitDate = new Date(trade.exit_date!);
    return Math.abs(exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
  });
  
  const averageHoldingPeriod = holdingPeriods.length > 0 
    ? holdingPeriods.reduce((sum, period) => sum + period, 0) / holdingPeriods.length
    : 0;

  // Find largest position by value
  const largestPosition = Math.max(...trades.map(trade => trade.buy_price * trade.quantity));

  // Calculate diversification (unique companies / total trades)
  const uniqueCompanies = new Set(trades.map(trade => trade.company_name)).size;
  const diversificationRatio = uniqueCompanies / trades.length;

  return {
    totalValue: totalInvested + totalPnL,
    totalPnL,
    totalInvested,
    averageHoldingPeriod: Math.round(averageHoldingPeriod),
    largestPosition,
    diversificationRatio: parseFloat(diversificationRatio.toFixed(2)),
  };
}

/**
 * Calculate risk metrics
 */
export function calculateRiskMetrics(trades: TradeJournal[]) {
  if (!trades.length) {
    return {
      sharpeRatio: 0,
      maxConsecutiveLosses: 0,
      maxConsecutiveWins: 0,
      volatility: 0,
      valueAtRisk: 0,
    };
  }

  const returns = trades.map(trade => (trade.pnl || 0) / (trade.buy_price * trade.quantity));
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  
  // Calculate volatility (standard deviation of returns)
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  
  // Sharpe ratio (assuming risk-free rate of 0 for simplicity)
  const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;

  // Calculate consecutive wins/losses
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  trades.forEach(trade => {
    const pnl = trade.pnl || 0;
    if (pnl > 0) {
      currentWins++;
      currentLosses = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
    } else if (pnl < 0) {
      currentLosses++;
      currentWins = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
    }
  });

  // Value at Risk (95% confidence level)
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const varIndex = Math.floor(returns.length * 0.05);
  const valueAtRisk = sortedReturns[varIndex] || 0;

  return {
    sharpeRatio: parseFloat(sharpeRatio.toFixed(3)),
    maxConsecutiveLosses,
    maxConsecutiveWins,
    volatility: parseFloat(volatility.toFixed(4)),
    valueAtRisk: parseFloat(valueAtRisk.toFixed(4)),
  };
}

/**
 * Generate performance summary
 */
export function generatePerformanceSummary(analytics: JournalAnalytics) {
  const derived = calculateDerivedMetrics(analytics);
  
  const summary = {
    overall: 'neutral' as 'positive' | 'negative' | 'neutral',
    highlights: [] as string[],
    concerns: [] as string[],
    recommendations: [] as string[],
  };

  // Determine overall performance
  if (analytics.total_pnl > 0 && derived.winRatePercentage > 50) {
    summary.overall = 'positive';
  } else if (analytics.total_pnl < 0 || derived.winRatePercentage < 40) {
    summary.overall = 'negative';
  }

  // Add highlights
  if (derived.winRatePercentage > 60) {
    summary.highlights.push(`Excellent win rate of ${derived.winRatePercentage}%`);
  }
  if (derived.profitFactor > 1.5) {
    summary.highlights.push(`Strong profit factor of ${derived.profitFactor}`);
  }
  if (analytics.total_pnl > 0) {
    summary.highlights.push(`Positive total P&L of ${derived.totalPnLFormatted}`);
  }

  // Add concerns
  if (derived.winRatePercentage < 40) {
    summary.concerns.push(`Low win rate of ${derived.winRatePercentage}%`);
  }
  if (derived.profitFactor < 1) {
    summary.concerns.push(`Poor profit factor of ${derived.profitFactor}`);
  }
  if (Math.abs(analytics.max_drawdown || 0) > Math.abs(analytics.total_pnl || 0) * 0.3) {
    summary.concerns.push(`High maximum drawdown of ${derived.maxDrawdownFormatted}`);
  }

  // Add recommendations
  if (derived.winRatePercentage < 50) {
    summary.recommendations.push('Focus on improving trade selection and entry timing');
  }
  if (derived.profitFactor < 1.2) {
    summary.recommendations.push('Work on risk management and position sizing');
  }
  if (analytics.avg_risk_reward < 1.5) {
    summary.recommendations.push('Target trades with better risk-reward ratios');
  }

  return summary;
}