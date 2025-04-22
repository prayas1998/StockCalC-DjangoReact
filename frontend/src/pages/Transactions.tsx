import { checkApiConnection } from "@/lib/api-helpers";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, CalendarIcon, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import Header from "@/components/ui/header";
import { useUserTransactions } from "@/hooks/useUserTransactions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { API_ENDPOINTS, API_BASE_URL, getApiUrl } from "@/config";

// Format date to display in a readable format
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Get platform icon
const getPlatformIcon = (platform: string) => {
  const firstLetter = platform.charAt(0).toUpperCase();
  return firstLetter;
};

// Get color based on P&L value
const getPnLColor = (value: string) => {
  const numValue = parseFloat(value);
  if (numValue > 0) return "text-green-500";
  if (numValue < 0) return "text-red-500";
  return "text-gray-500";
};

const Transactions = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { 
    transactions, 
    loading, 
    error, 
    searchQuery, 
    setSearchQuery, 
    refreshTransactions 
  } = useUserTransactions();
  
  // For debugging purposes
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  
  // State for expanded transaction details
  const [expandedTransactionId, setExpandedTransactionId] = useState<number | null>(null);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // Check connection when there's an error
  useEffect(() => {
    if (error) {
      checkApiConnection()
        .then(isConnected => {
          console.log('API connection status:', isConnected);
        });
    }
  }, [error]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Toggle transaction details view
  const toggleTransactionDetails = (id: number) => {
    if (expandedTransactionId === id) {
      setExpandedTransactionId(null);
    } else {
      setExpandedTransactionId(id);
    }
  };

  // Check API connection manually
  const handleCheckConnection = async () => {
    setIsCheckingConnection(true);
    setConnectionStatus(null);
    
    try {
      const isConnected = await checkApiConnection();
      setConnectionStatus(isConnected ? 'Connected' : 'Failed');
    } catch (err) {
      setConnectionStatus('Error');
      console.error('Connection check error:', err);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="bg-secondary/50 dark:bg-secondary/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Your Transactions</h1>
              <p className="text-muted-foreground">
                View and manage your saved transactions
              </p>
            </div>
          </div>

          {/* Search input */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search transactions by company name..." 
              className="pl-10"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          {loading ? (
            <Card className="p-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading transactions...</p>
              </div>
            </Card>
          ) : error ? (
            <Card className="p-6">
              <div className="text-center py-12">
                <h3 className="text-xl font-medium mb-2 text-destructive">Error loading transactions</h3>
                <p className="text-muted-foreground mb-6">
                  {error}
                </p>
                <div className="flex flex-col items-center gap-4">
                  <Button onClick={() => refreshTransactions()}>
                    Try again
                  </Button>
                  
                  {/* Debug section */}
                  <div className="mt-8 border-t pt-4 w-full max-w-md">
                    <p className="text-sm text-muted-foreground mb-2">Debug Information</p>
                    <div className="text-xs space-y-1 bg-secondary/20 rounded-md p-3">
                      <p>API URL: {API_BASE_URL}</p>
                      <p>Endpoint: {getApiUrl(API_ENDPOINTS.TRANSACTION_GROUPS)}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Button 
                          size="sm"
                          variant="outline"
                          disabled={isCheckingConnection}
                          onClick={handleCheckConnection}
                        >
                          {isCheckingConnection && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                          Check API Connection
                        </Button>
                        {connectionStatus && (
                          <span className={connectionStatus === 'Connected' ? 'text-green-500' : 'text-destructive'}>
                            {connectionStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : transactions.length === 0 ? (
            <Card className="p-6">
              <div className="text-center py-12">
                <h3 className="text-xl font-medium mb-2">No transactions yet</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery ? "No transactions match your search" : "Your saved transactions will appear here"}
                </p>
                <Button onClick={() => navigate("/")}>
                  Go back to calculator
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className="overflow-hidden">
                  <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 bg-primary/10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getPlatformIcon(transaction.platform)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{transaction.title}</CardTitle>
                          <div className="flex items-center mt-1 text-sm text-muted-foreground">
                            <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                            <span>{formatDate(transaction.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-medium ${getPnLColor(transaction.net_pnl)}`}>
                          {parseFloat(transaction.net_pnl) > 0 ? '+' : ''}{formatCurrency(transaction.net_pnl)}
                          {parseFloat(transaction.net_pnl) > 0 
                            ? <TrendingUp className="inline ml-1 h-4 w-4" /> 
                            : parseFloat(transaction.net_pnl) < 0 
                              ? <TrendingDown className="inline ml-1 h-4 w-4" /> 
                              : null}
                        </div>
                        <div className="flex gap-2 mt-1 justify-end">
                          <Badge variant="outline" className="text-xs">
                            {transaction.exchange}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {transaction.platform}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {transaction.trade_type.replace(/-/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-muted-foreground">Quantity: </span>
                        <span className="font-medium">{transaction.total_quantity}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg. Buy Price: </span>
                        <span className="font-medium">{formatCurrency(transaction.average_buy_price)}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleTransactionDetails(transaction.id)}
                      >
                        {expandedTransactionId === transaction.id ? "Hide Details" : "View Details"}
                      </Button>
                    </div>

                    {/* Transaction details */}
                    {expandedTransactionId === transaction.id && (
                      <div className="mt-4">
                        <Separator className="mb-4" />
                        <h4 className="text-sm font-medium mb-2">Transaction Details</h4>
                        <div className="space-y-3">
                          {transaction.transactions.map((item, index) => (
                            <div key={item.id} className="bg-secondary/50 rounded-md p-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Quantity:</span>
                                <span className="font-medium">{item.quantity}</span>
                              </div>
                              {parseFloat(item.buy_price) > 0 && (
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-muted-foreground">Buy Price:</span>
                                  <span className="font-medium">{formatCurrency(item.buy_price)}</span>
                                </div>
                              )}
                              {parseFloat(item.sell_price) > 0 && (
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-muted-foreground">Sell Price:</span>
                                  <span className="font-medium">{formatCurrency(item.sell_price)}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Net P&L:</span>
                                <span className={`font-medium ${getPnLColor(item.net_pnl)}`}>
                                  {formatCurrency(item.net_pnl)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions; 