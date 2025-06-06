import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Plus, RefreshCcw } from "lucide-react";
import Header from "@/components/ui/header";
import { useAuth } from "@/context/AuthContext";
import { useJournal } from "@/hooks/useJournal";
import { useJournalFilters } from "@/hooks/useJournalFilters";
import { useJournalAnalytics } from "@/hooks/useJournalAnalytics";

// Journal header component that displays analytics data
const JournalHeader = ({ analytics, derivedMetrics, isLoading }: { 
  analytics: any, 
  derivedMetrics: any, 
  isLoading: boolean 
}) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>Trading Journal Stats</CardTitle>
      <CardDescription>Your trading performance at a glance</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">Win Rate</span>
          <span className="text-2xl font-bold">
            {isLoading ? '--' : derivedMetrics?.winRatePercentage ? `${derivedMetrics.winRatePercentage}%` : '0%'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">Total P&L</span>
          <span className="text-2xl font-bold">
            {isLoading ? '--' : analytics?.total_pnl ? `$${analytics.total_pnl.toFixed(2)}` : '$0.00'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">Avg R:R</span>
          <span className="text-2xl font-bold">
            {isLoading ? '--' : derivedMetrics?.avgRiskReward || '0.00'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">Total Trades</span>
          <span className="text-2xl font-bold">
            {isLoading ? '--' : analytics?.total_trades || '0'}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const JournalFilters = ({ searchQuery, setSearchQuery }: { searchQuery: string, setSearchQuery: (query: string) => void }) => (
  <div className="flex flex-col md:flex-row gap-4 mb-6">
    <div className="relative flex-1">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search trades..."
        className="pl-8"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
    <div className="flex gap-2">
      {/* Filter buttons will be implemented in future tasks */}
      <Button variant="outline" size="sm">Status</Button>
      <Button variant="outline" size="sm">Date</Button>
      <Button variant="outline" size="sm">Tags</Button>
    </div>
  </div>
);

const TradesList = () => (
  <div className="space-y-4">
    {/* Trade cards will be implemented in future tasks */}
    <Card>
      <CardContent className="p-4">
        <div className="text-center text-muted-foreground py-8">
          No trades found. Add your first trade to get started.
        </div>
      </CardContent>
    </Card>
  </div>
);

const AddTradeButton = () => (
  <Button className="fixed bottom-6 right-6 rounded-full w-12 h-12 p-0 shadow-lg">
    <Plus className="h-6 w-6" />
  </Button>
);

const Journal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { filters, searchQuery, setSearchQuery } = useJournalFilters();
  const { 
    trades, 
    isLoading: tradesLoading, 
    isError: tradesError, 
    error: tradesErrorMessage, 
    fetchNextPage, 
    hasNextPage,
    refreshTrades,
    apiConnectionFailed 
  } = useJournal(filters);
  
  const {
    analytics,
    derivedMetrics,
    isLoading: analyticsLoading,
    isError: analyticsError,
    refreshAnalytics
  } = useJournalAnalytics();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Trading Journal</h1>
            <p className="text-muted-foreground">Track and analyze your trades</p>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
              refreshTrades();
              refreshAnalytics();
            }} 
            disabled={tradesLoading || analyticsLoading}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>

        <JournalHeader 
          analytics={analytics} 
          derivedMetrics={derivedMetrics} 
          isLoading={analyticsLoading} 
        />
        <JournalFilters searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        {tradesLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading trades...</p>
          </div>
        )}

        {tradesError && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-destructive mb-2">Error loading trades</p>
                <p className="text-sm text-muted-foreground mb-4">{tradesErrorMessage?.message || 'An unknown error occurred'}</p>
                <Button onClick={refreshTrades} disabled={tradesLoading}>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!tradesLoading && !tradesError && trades.length === 0 && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="mb-2">No trades found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery ? 'Try adjusting your search or filters' : 'Start tracking your trades by adding your first entry'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => {/* Open add trade form */}}>
                    Add Your First Trade
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!tradesLoading && !tradesError && trades.length > 0 && <TradesList />}

        {hasNextPage && (
          <div className="text-center mt-6">
            <Button 
              variant="outline" 
              onClick={() => fetchNextPage()}
              disabled={tradesLoading}
            >
              Load More
            </Button>
          </div>
        )}

        <AddTradeButton />
      </main>
    </div>
  );
};

export default Journal;