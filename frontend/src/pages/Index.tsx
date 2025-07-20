import { Card } from "@/components/ui/card";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthDialog from "@/components/auth/AuthDialog";
import Header from "@/components/ui/header";
import { formatCurrency } from "@/lib/utils";
import { useCalculation } from "@/hooks/useCalculation";

// Layout Components
import Hero from "@/components/layout/Hero";
import Features from "@/components/layout/Features";
import Footer from "@/components/layout/Footer";

// Calculator Components
import TransactionForm from "@/components/calculator/TransactionForm";
import CalculationResults from "@/components/calculator/CalculationResults";
import { BrokerTradeTypeSelector } from "@/components/shared/BrokerTradeTypeSelector";
import {
  CalculatorProvider,
  useCalculatorContext,
} from "@/context/CalculatorContext";

// Custom hook for theme management
const useThemeManager = () => {
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage on initial load
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("darkMode");
      return savedMode ? JSON.parse(savedMode) : false; // Default light mode
    }
    return false; // Fallback for server-side
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));

    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // First-run initialization
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode === null) {
      // Only set default if no existing preference
      document.documentElement.classList.remove("dark");
    }
  }, []); // Empty array = runs only once

  return { darkMode, setDarkMode };
};

const IndexContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { darkMode, setDarkMode } = useThemeManager();

  const [showFirstVisitAlert, setShowFirstVisitAlert] = useState(() => {
    if (typeof window !== "undefined") {
      const hasSeenAlert = localStorage.getItem("hasSeenAlert");
      return !hasSeenAlert;
    }
    return true;
  });

  const {
    platform,
    setPlatform,
    exchange,
    setExchange,
    tradeType,
    setTradeType,
    positionType,
    setPositionType,
  } = useCalculatorContext();

  // Calculation state will be received from TransactionForm
  const [calculationState, setCalculationState] = useState({
    error: null,
    result: null,
  });

  const handleCalculationStateChange = useCallback((newState) => {
    setCalculationState(newState);
  }, []);

  useEffect(() => {
    if (showFirstVisitAlert) {
      localStorage.setItem("hasSeenAlert", "true");
    }
  }, [showFirstVisitAlert]);

  const handlePlatformChange = (newPlatform: "Dhan" | "Groww") => {
    setPlatform(newPlatform);
    navigate(`/${newPlatform.toLowerCase()}`);
  };

  const handleTradeTypeChange = (
    newTradeType: "equity-delivery" | "equity-intraday"
  ) => {
    setTradeType(newTradeType);
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
              As our backend is hosted on a free tier service, the first
              calculation may take 1-2 minutes to initialize. This is a one-time
              wait when you first open the app. Subsequent calculations will be
              much faster.
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

      <section id="calculator-section" className="section-padding bg-secondary/50 dark:bg-secondary/10">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6 glass dark:bg-gray-800/70 dark:border-gray-700">
            <div className="space-y-6">
              {/* Broker, Trade Type Selector and Exchange Toggle */}
              <div className="mb-6 flex flex-wrap items-center justify-between">
                <div className="flex-1">
                  <BrokerTradeTypeSelector
                    selectedBroker={platform as "Dhan" | "Groww"}
                    selectedTradeType={tradeType}
                    onBrokerChange={handlePlatformChange}
                    onTradeTypeChange={handleTradeTypeChange}
                    positionType={positionType}
                    onPositionTypeChange={setPositionType}
                    compact={false}
                  />
                </div>

                {/* Exchange Toggle */}
                <div className="flex items-center gap-2 mt-3 md:mt-0">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-300 whitespace-nowrap">
                    Exchange:
                  </div>
                  <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 rounded-md p-1">
                    <button
                      onClick={() => setExchange("NSE")}
                      className={`px-3 py-1 text-sm rounded-sm ${
                        exchange === "NSE"
                          ? "bg-white dark:bg-slate-700 shadow-sm dark:text-gray-100"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                      aria-label="Select NSE exchange"
                      aria-pressed={exchange === "NSE"}
                    >
                      NSE
                    </button>
                    <button
                      onClick={() => setExchange("BSE")}
                      className={`px-3 py-1 text-sm rounded-sm ${
                        exchange === "BSE"
                          ? "bg-white dark:bg-slate-700 shadow-sm dark:text-gray-100"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                      aria-label="Select BSE exchange"
                      aria-pressed={exchange === "BSE"}
                    >
                      BSE
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction Form Component */}
              <div className="space-y-6">
                <TransactionForm
                  onCalculationStateChange={handleCalculationStateChange}
                />
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

// Wrap the component with the CalculatorProvider
const Index = () => {
  return (
    <CalculatorProvider>
      <IndexContent />
    </CalculatorProvider>
  );
};

export default Index;
