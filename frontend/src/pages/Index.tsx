import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { calculateCharges, saveTransactions } from "../services/api";
import type { CalculationResponse } from "../services/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  Calculator,
  ArrowRight,
  Clock,
  Shield,
  Moon,
  Sun,
  ChevronDown,
  Plus,
  Trash2,
  User,
  Save,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AuthDialog from "@/components/auth/AuthDialog";
import ProfileDropdown from "@/components/auth/ProfileDropdown";
import Header from "@/components/ui/header";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { useTransactions } from "@/hooks/useTransactions";
import { useCalculation } from "@/hooks/useCalculation";
import { formatCurrency } from "@/lib/utils";

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
    const path = window.location.pathname.slice(1);
    return path.charAt(0).toUpperCase() + path.slice(1) || "Groww";
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
                  <SaveTransactionButton 
                    user={user}
                    transactions={transactions}
                    platform={platform}
                    exchange={exchange}
                    tradeType={tradeType}
                    setAuthDialogOpen={setAuthDialogOpen}
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
