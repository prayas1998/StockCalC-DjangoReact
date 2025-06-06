import { useMemo } from 'react';
import { ArrowDown, ArrowUp, TrendingUp, TrendingDown, Activity, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useJournalAnalytics } from '@/hooks/useJournalAnalytics';
import { formatCurrency } from '@/lib/utils';
import type { JournalAnalytics } from '@/types/journal';
import type { CalculationError } from '@/types/api';

function isJournalAnalytics(data: JournalAnalytics | CalculationError | undefined): data is JournalAnalytics {
  return !!data && !('error' in data);
}

export function JournalAnalytics() {
  const { analytics, derivedMetrics, isLoading, isError, refreshAnalytics } = useJournalAnalytics();

  // Format monthly performance data for chart
  const monthlyChartData = useMemo(() => {
    if (!isJournalAnalytics(analytics)) return [];
    return analytics.monthly_performance.map(month => ({
      name: month.month,
      pnl: month.total_pnl,
      trades: month.trade_count
    }));
  }, [analytics]);

  // Format stock performance data for chart
  const stockPerformanceData = useMemo(() => {
    if (!isJournalAnalytics(analytics)) return [];
    const combinedStocks = [
      ...analytics.best_performing_stocks,
      ...analytics.worst_performing_stocks
    ];
    return combinedStocks
      .sort((a, b) => b.total_pnl - a.total_pnl)
      .map(stock => ({
        name: stock.company_name,
        pnl: stock.total_pnl,
        trades: stock.trade_count
      }));
  }, [analytics]);

  // Colors for charts
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (isError || (analytics && 'error' in analytics)) {
    return (
      <div className="p-4 border rounded-lg bg-destructive/10 text-destructive">
        <h3 className="font-medium mb-2">Failed to load analytics</h3>
        <p className="text-sm mb-4">{analytics && 'error' in analytics ? analytics.error : 'There was an error loading your trading analytics.'}</p>
        <button 
          onClick={refreshAnalytics}
          className="px-4 py-2 bg-card text-card-foreground rounded-md text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading || !analytics) {
    return <AnalyticsSkeleton />;
  }

  if (!isJournalAnalytics(analytics)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Trades Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Trades</CardDescription>
            <CardTitle className="text-3xl">
              {analytics.total_trades || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{analytics.open_trades || 0}</span> open
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{analytics.closed_trades || 0}</span> closed
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Win Rate Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Win Rate</CardDescription>
            <CardTitle className="text-3xl">
              {derivedMetrics?.winRatePercentage || 0}%
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center">
              {(derivedMetrics?.winRatePercentage || 0) >= 50 ? (
                <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Good
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Needs Improvement
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total P&L Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total P&L</CardDescription>
            <CardTitle className={`text-3xl ${(analytics.total_pnl || 0) > 0 ? 'text-green-500' : (analytics.total_pnl || 0) < 0 ? 'text-red-500' : ''}`}>
              {formatCurrency(analytics.total_pnl || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center">
              {(analytics.total_pnl || 0) > 0 ? (
                <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  Profit
                </Badge>
              ) : (analytics.total_pnl || 0) < 0 ? (
                <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
                  <ArrowDown className="h-3 w-3 mr-1" />
                  Loss
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Activity className="h-3 w-3 mr-1" />
                  Neutral
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Average P&L Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg P&L Per Trade</CardDescription>
            <CardTitle className={`text-3xl ${(analytics.avg_pnl_per_trade || 0) > 0 ? 'text-green-500' : (analytics.avg_pnl_per_trade || 0) < 0 ? 'text-red-500' : ''}`}>
              {formatCurrency(analytics.avg_pnl_per_trade || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center">
              <Badge variant="outline">
                <DollarSign className="h-3 w-3 mr-1" />
                Per Trade
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance Chart */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Monthly Performance</CardTitle>
          <CardDescription>P&L and trade count by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'pnl') return formatCurrency(value as number);
                      return value;
                    }}
                  />
                  <Bar yAxisId="left" dataKey="pnl" fill="#8884d8" name="P&L" />
                  <Bar yAxisId="right" dataKey="trades" fill="#82ca9d" name="Trades" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No monthly data available</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stock Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best Performing Stocks */}
        <Card>
          <CardHeader>
            <CardTitle>Best Performing Stocks</CardTitle>
            <CardDescription>Stocks with highest P&L</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.best_performing_stocks && analytics.best_performing_stocks.length > 0 ? (
              <div className="space-y-4">
                {analytics.best_performing_stocks.map((stock, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-medium">{stock.company_name}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-muted-foreground">{stock.trade_count} trades</span>
                      <span className="font-medium text-green-500">{formatCurrency(stock.total_pnl)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Worst Performing Stocks */}
        <Card>
          <CardHeader>
            <CardTitle>Worst Performing Stocks</CardTitle>
            <CardDescription>Stocks with lowest P&L</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.worst_performing_stocks && analytics.worst_performing_stocks.length > 0 ? (
              <div className="space-y-4">
                {analytics.worst_performing_stocks.map((stock, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[(index + 3) % COLORS.length] }} />
                      <span className="font-medium">{stock.company_name}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-muted-foreground">{stock.trade_count} trades</span>
                      <span className="font-medium text-red-500">{formatCurrency(stock.total_pnl)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Skeleton loader for analytics
function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-20 mt-1" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array(2).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-40 mt-1" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array(3).fill(0).map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}