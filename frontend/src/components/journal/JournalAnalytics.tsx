import { useMemo } from 'react';
import { ArrowDown, ArrowUp, TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Target, Shield, Zap, Calculator, PieChart as PieChartIcon, LineChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart as RechartsLineChart, Line } from 'recharts';
import { useJournalAnalytics } from '@/hooks/useJournalAnalytics';
import { formatCurrency } from '@/lib/utils';
import type { JournalAnalytics } from '@/types/journal';
import type { CalculationError } from '@/types/api';

function isJournalAnalytics(data: JournalAnalytics | CalculationError | undefined): data is JournalAnalytics {
  return !!data && !('error' in data) && typeof data === 'object';
}

export function JournalAnalytics() {
  const { analytics, derivedMetrics, isLoading, isError, refreshAnalytics } = useJournalAnalytics();

  // Format monthly performance data for chart
  const monthlyChartData = useMemo(() => {
    if (!isJournalAnalytics(analytics) || !analytics.monthly_performance) return [];
    return analytics.monthly_performance.map(month => ({
      name: month.month,
      pnl: month.total_pnl,
      trades: month.trade_count
    }));
  }, [analytics]);

  // Format stock performance data for chart
  const stockPerformanceData = useMemo(() => {
    if (!isJournalAnalytics(analytics) || !analytics.best_performing_stocks || !analytics.worst_performing_stocks) return [];
    
    // Combine and deduplicate stocks by company name
    const stockMap = new Map();
    
    // Add best performing stocks
    analytics.best_performing_stocks.forEach(stock => {
      stockMap.set(stock.company_name, {
        name: stock.company_name,
        pnl: stock.total_pnl,
        trades: stock.trade_count
      });
    });
    
    // Add worst performing stocks (only if not already present)
    analytics.worst_performing_stocks.forEach(stock => {
      if (!stockMap.has(stock.company_name)) {
        stockMap.set(stock.company_name, {
          name: stock.company_name,
          pnl: stock.total_pnl,
          trades: stock.trade_count
        });
      }
    });
    
    // Convert map to array and sort by P&L
    return Array.from(stockMap.values())
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 10); // Show top 10
  }, [analytics]);

  // Format trade type distribution for pie chart
  const tradeTypeData = useMemo(() => {
    if (!isJournalAnalytics(analytics) || !analytics.trade_type_distribution) return [];
    return analytics.trade_type_distribution.map(item => ({
      name: item.trade_type.replace('_', ' '),
      value: item.count
    }));
  }, [analytics]);

  // Format status distribution for pie chart
  const statusData = useMemo(() => {
    if (!isJournalAnalytics(analytics) || !analytics.status_distribution) return [];
    return analytics.status_distribution.map(item => ({
      name: item.status.replace('_', ' '),
      value: item.count
    }));
  }, [analytics]);

  // Format drawdown data for chart
  const drawdownData = useMemo(() => {
    if (!isJournalAnalytics(analytics) || !analytics.drawdown_series) return [];
    return analytics.drawdown_series.map((item, index) => ({
      trade: index + 1,
      cumulative_pnl: item.cumulative_pnl,
      drawdown: -item.drawdown // Negative for visual representation
    }));
  }, [analytics]);

  // Colors for charts
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

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
    return (
      <div className="space-y-6">
        <div className="p-8 text-center text-muted-foreground">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium mb-2">No Analytics Data Available</h3>
          <p>Start adding trades to your journal to see analytics and insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Trades Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Activity className="h-4 w-4 mr-1" />
              Total Trades
            </CardDescription>
            <CardTitle className="text-3xl">
              {analytics.total_trades || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-green-600">{analytics.open_trades || 0}</span> open
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
            <CardDescription className="flex items-center">
              <Target className="h-4 w-4 mr-1" />
              Win Rate
            </CardDescription>
            <CardTitle className="text-3xl">
              {(derivedMetrics?.winRatePercentage || 0).toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-green-600">{analytics.profitable_trades || 0}</span> wins
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-red-600">{analytics.losing_trades || 0}</span> losses
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total P&L Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              Total P&L
            </CardDescription>
            <CardTitle className={`text-3xl ${(analytics.total_pnl || 0) > 0 ? 'text-green-500' : (analytics.total_pnl || 0) < 0 ? 'text-red-500' : ''}`}>
              {formatCurrency(analytics.total_pnl || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center">
              {(analytics.total_pnl || 0) > 0 ? (
                <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  Profitable
                </Badge>
              ) : (analytics.total_pnl || 0) < 0 ? (
                <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
                  <ArrowDown className="h-3 w-3 mr-1" />
                  Loss
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Activity className="h-3 w-3 mr-1" />
                  Breakeven
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profit Factor Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Calculator className="h-4 w-4 mr-1" />
              Profit Factor
            </CardDescription>
            <CardTitle className={`text-3xl ${(analytics.profit_factor || 0) > 1 ? 'text-green-500' : (analytics.profit_factor || 0) < 1 ? 'text-red-500' : ''}`}>
              {(analytics.profit_factor || 0).toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center">
              {(analytics.profit_factor || 0) > 1.5 ? (
                <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Excellent
                </Badge>
              ) : (analytics.profit_factor || 0) > 1 ? (
                <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Good
                </Badge>
              ) : (
                <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Poor
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg P&L Per Trade</CardDescription>
            <CardTitle className={`text-2xl ${(analytics.avg_pnl_per_trade || 0) > 0 ? 'text-green-500' : (analytics.avg_pnl_per_trade || 0) < 0 ? 'text-red-500' : ''}`}>
              {formatCurrency(analytics.avg_pnl_per_trade || 0)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Shield className="h-4 w-4 mr-1" />
              Max Drawdown
            </CardDescription>
            <CardTitle className="text-2xl text-red-500">
              -{formatCurrency(Math.abs(analytics.max_drawdown || 0))}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expectancy</CardDescription>
            <CardTitle className={`text-2xl ${(analytics.expectancy || 0) > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(analytics.expectancy || 0)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Risk:Reward</CardDescription>
            <CardTitle className="text-2xl">
              1:{(analytics.avg_risk_reward || 0).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Win/Loss Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Largest Win</CardDescription>
            <CardTitle className="text-2xl text-green-500">
              {formatCurrency(analytics.largest_win || 0)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Largest Loss</CardDescription>
            <CardTitle className="text-2xl text-red-500">
              {formatCurrency(analytics.largest_loss || 0)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Win</CardDescription>
            <CardTitle className="text-2xl text-green-500">
              {formatCurrency(analytics.avg_win || 0)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Loss</CardDescription>
            <CardTitle className="text-2xl text-red-500">
              {formatCurrency(analytics.avg_loss || 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="stocks" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Stocks
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Distribution
          </TabsTrigger>
          <TabsTrigger value="drawdown" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Drawdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
              <CardDescription>P&L and trade count by month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {monthlyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => {
                        if (name === 'pnl') return [formatCurrency(value as number), 'P&L'];
                        return [value, 'Trades'];
                      }} />
                      <Area type="monotone" dataKey="pnl" stroke="#10b981" fillOpacity={1} fill="url(#colorPnl)" name="pnl" />
                    </AreaChart>
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
        </TabsContent>

        <TabsContent value="stocks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Performance</CardTitle>
              <CardDescription>Top performing stocks by P&L</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {stockPerformanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value, name) => {
                        if (name === 'pnl') return [formatCurrency(value as number), 'P&L'];
                        return [value, 'Trades'];
                      }} />
                      <Bar dataKey="pnl" fill="#3b82f6" name="pnl" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No stock data available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Trade Type Distribution</CardTitle>
                <CardDescription>Breakdown by trade types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {tradeTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tradeTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {tradeTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>No trade type data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Breakdown by trade status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>No status data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="drawdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Drawdown Analysis</CardTitle>
              <CardDescription>Cumulative P&L and drawdown over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {drawdownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={drawdownData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="trade" />
                      <YAxis yAxisId="left" orientation="left" stroke="#10b981" />
                      <YAxis yAxisId="right" orientation="right" stroke="#ef4444" />
                      <Tooltip formatter={(value, name) => {
                        if (name === 'cumulative_pnl') return [formatCurrency(value as number), 'Cumulative P&L'];
                        if (name === 'drawdown') return [formatCurrency(value as number), 'Drawdown'];
                        return [value, name];
                      }} />
                      <Line yAxisId="left" type="monotone" dataKey="cumulative_pnl" stroke="#10b981" strokeWidth={2} name="cumulative_pnl" />
                      <Line yAxisId="right" type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} name="drawdown" />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No drawdown data available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
    </div>
  );
}