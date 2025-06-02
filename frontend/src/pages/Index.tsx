import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthDialog from "@/components/auth/AuthDialog";
import Header from "@/components/ui/header";
import { formatCurrency } from "@/lib/utils";
import { useTransactions } from "@/hooks/useTransactions";
import { useCalculation } from "@/hooks/useCalculation";

// Layout Components
import Hero from "@/components/layout/Hero";
import Features from "@/components/layout/Features";
import Footer from "@/components/layout/Footer";

// Calculator Components
import CalculatorOptions from "@/components/calculator/CalculatorOptions";
import TransactionForm from "@/components/calculator/TransactionForm";
import CalculationResults from "@/components/calculator/CalculationResults";
import SaveTransactionButton from "@/components/calculator/SaveTransactionButton";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage on initial load
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("darkMode");
      return savedMode ? JSON.parse(savedMode) : false; // Default light mode
    }
    return false; // Fallback for server-side
  });

  const [showFirstVisitAlert, setShowFirstVisitAlert] = useState(() => {
    if (typeof window !== "undefined") {
      const hasSeenAlert = localStorage.getItem("hasSeenAlert");
      return !hasSeenAlert;
    }
    return true;
  });

  const [exchange, setExchange] = useState("NSE");
  const [tradeType, setTradeType] = useState("equity-delivery");
  const [instrumentType, setInstrumentType] = useState("future");

  const [platform, setPlatform] = useState(() => {
    const path = window.location.pathname.slice(1).toLowerCase();
    if (["groww", "dhan", "rise", "others"].includes(path)) {
      return path.charAt(0).toUpperCase() + path.slice(1);
    }
    return "Groww";
  });

  // Use custom hook for transactions
  const { 
    transactions, 
    setTransactions
  } = useTransactions();

  // Use custom hook for calculations
  const { 
    calculationState, 
    handleSaveTransactions,
    isSaving 
  } = useCalculation(platform, exchange, tradeType, transactions);

  // If redirected for editing, pre-fill the form with the transaction data
  useEffect(() => {
    if (location.state && location.state.editTransaction) {
      const edit = location.state.editTransaction;
      // Map API transaction group to form transactions
      const mapped = edit.transactions.map((item: any) => ({
        id: String(item.id),
        companyName: edit.title,
        quantity: item.quantity,
        buyPrice: item.buy_price,
        sellPrice: item.sell_price,
      }));
      setTransactions(mapped);
    }
  }, [location.state, setTransactions]);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]); // Save to localStorage on change

  useEffect(() => {
    if (showFirstVisitAlert) {
      localStorage.setItem("hasSeenAlert", "true");
    }
  }, [showFirstVisitAlert]);

  // First-run initialization
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode === null) {
      // Only set default if no existing preference
      document.documentElement.classList.remove("dark");
    }
  }, []); // Empty array = runs only once

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    // Reset transactions when platform changes
    setTransactions([
      { id: "1", companyName: "", quantity: "0", buyPrice: "0", sellPrice: "0" }
    ]);
  }, [platform]);

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    navigate(`/${newPlatform.toLowerCase()}`);
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      {showFirstVisitAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background p-6 rounded-lg max-w-md w-full space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Welcome to TradeSmart</h3>
            </div>
            <p className="text-muted-foreground">
              As our backend is hosted on a free tier service, the first calculation may take 1-2 minutes to initialize. This is a one-time wait when you first open the app. Subsequent calculations will be much faster.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setShowFirstVisitAlert(false)}>
                I Understand
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <AuthDialog 
        isOpen={authDialogOpen} 
        onClose={() => setAuthDialogOpen(false)} 
      />
      
      <Hero />

      <section className="section-padding bg-secondary/50 dark:bg-secondary/10">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6 glass">
            <div className="space-y-6">
              {/* Calculator Options Component */}
              <CalculatorOptions 
                exchange={exchange}
                setExchange={setExchange}
                tradeType={tradeType}
                setTradeType={setTradeType}
                instrumentType={instrumentType}
                setInstrumentType={setInstrumentType}
              />

              {/* Transaction Form Component */}
              <div className="space-y-6">
                <TransactionForm 
                  transactions={transactions}
                  setTransactions={setTransactions}
                  platform={platform}
                  exchange={exchange}
                  tradeType={tradeType}
                />

                <div className="flex gap-4 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/transactions')}
                  >
                    View Saved Transactions
                  </Button>
                  <SaveTransactionButton 
                    user={user}
                    transactions={transactions}
                    platform={platform}
                    exchange={exchange}
                    tradeType={tradeType}
                    setAuthDialogOpen={setAuthDialogOpen}
                    handleSaveTransactions={handleSaveTransactions}
                    isSaving={isSaving}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Calculation Results Component */}
          <CalculationResults 
            calculationState={calculationState}
            formatCurrency={formatCurrency}
            exchange={exchange}
          />

          {/* Features Component */}
          <Features />

          {/* Footer Component */}
          <Footer />
        </div>
      </section>
    </div>
  );
};

export default Index;
