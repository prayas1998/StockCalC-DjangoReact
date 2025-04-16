import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { calculateCharges } from "../services/api";
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

interface Transaction {
  id: string;
  companyName?: string;
  quantity: string;
  buyPrice: string;
  sellPrice: string;
}

interface CalculationState {
  error: string | null;
  result: CalculationResponse | null;
}

const Index = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage on initial load
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("darkMode");
      return savedMode ? JSON.parse(savedMode) : true; // Default dark mode
    }
    return true; // Fallback for server-side
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

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "1", companyName: "", quantity: "0", buyPrice: "0", sellPrice: "0" },
  ]);

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
      document.documentElement.classList.add("dark");
    }
  }, []); // Empty array = runs only once

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const addTransaction = () => {
    setTransactions([
      ...transactions,
      {
        id: Math.random().toString(),
        quantity: "0",
        buyPrice: "0",
        sellPrice: "0",
      },
    ]);
  };

  const removeTransaction = (id: string) => {
    if (transactions.length > 1) {
      setTransactions(transactions.filter((t) => t.id !== id));
    }
  };

  const updateTransaction = (
    id: string,
    field: keyof Transaction,
    value: string
  ) => {
    setTransactions(
      transactions.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    navigate(`/${newPlatform.toLowerCase()}`);
  };

  const handleCalculateCharges = useCallback(async () => {
    setCalculationState({
      error: null,
      result: null,
    });

    try {
      const isValid = transactions.every(
        (t) =>
          t.quantity &&
          t.buyPrice &&
          t.sellPrice &&
          !isNaN(Number(t.quantity)) &&
          !isNaN(Number(t.buyPrice)) &&
          !isNaN(Number(t.sellPrice))
      );

      if (!isValid) {
        throw new Error("Please fill all fields with valid numbers");
      }

      const formattedTransactions = transactions.map((t) => ({
        quantity: t.quantity,
        buyPrice: t.buyPrice,
        sellPrice: t.sellPrice,
      }));

      const result = await calculateCharges(
        platform.toLowerCase(),
        exchange,
        tradeType,
        formattedTransactions
      );

      if ("error" in result) {
        throw new Error(`${result.error}: ${result.detail || ""}`);
      }

      setCalculationState({
        error: null,
        result,
      });
    } catch (error) {
      setCalculationState({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        result: null,
      });
    }
  }, [platform, exchange, tradeType, transactions]);

  // Add this useEffect to trigger recalculation
  useEffect(() => {
    const allFieldsFilled = transactions.every(
      (t) => t.quantity.trim() && t.buyPrice.trim() && t.sellPrice.trim()
    );

    const allValidNumbers = transactions.every(
      (t) =>
        !isNaN(Number(t.quantity)) &&
        !isNaN(Number(t.buyPrice)) &&
        !isNaN(Number(t.sellPrice))
    );

    if (allFieldsFilled && allValidNumbers) {
      handleCalculateCharges();
    } else {
      // Reset to default values when inputs are invalid
      setCalculationState({
        error: null,
        result: null,
      });
    }
  }, [exchange, tradeType, transactions, handleCalculateCharges]);

  const getCompanyName = () => {
    return transactions[0]?.companyName || "this company";
  };

  const saveTransactions = () => {
    console.log("Saving transactions:", transactions);
  };

  const [calculationState, setCalculationState] = useState<CalculationState>({
    error: null,
    result: null,
  });

  // Helper function for number formatting
  const formatCurrency = (value: string | number | undefined) => {
    const numberValue = Number(value || 0);
    return numberValue.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      style: "currency",
      currency: "INR",
    });
  };

  return (
    <div className="min-h-screen">
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
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div>
            <h1
              className="text-xl font-bold cursor-pointer hover:text-primary transition-colors"
              onClick={() => navigate("/groww")}
            >
              TradeSmart
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/tools")}
              className="flex items-center gap-2"
            >
              Tools
            </Button>
            <Button variant="ghost" className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Login
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  {platform}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handlePlatformChange("Groww")}>
                  Groww
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePlatformChange("Rise")}>
                  Rise
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handlePlatformChange("Others")}
                >
                  Others
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-full"
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-200 to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-950 min-h-[40vh] flex items-center">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full mb-8">
            <span className="text-primary text-sm font-medium">
              Calculate Stock Market Charges
            </span>
            <ChevronRight className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-6xl font-bold tracking-tight sm:text-7xl mb-6">
            Smart Trading
            <br />
            Starts Here
          </h1>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Calculate all your trading charges instantly with our advanced
            calculator.
          </p>
        </div>
      </section>

      <section className="section-padding bg-secondary/50 dark:bg-secondary/10">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6 glass">
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-4 block">
                  Trade Type
                </Label>
                <ToggleGroup
                  type="single"
                  value={tradeType}
                  onValueChange={(value) => value && setTradeType(value)}
                  className="justify-start"
                >
                  <ToggleGroupItem value="equity-delivery" className="text-sm">
                    Equity - delivery
                  </ToggleGroupItem>
                  <ToggleGroupItem value="equity-intraday" className="text-sm">
                    Equity - intraday
                  </ToggleGroupItem>
                  <ToggleGroupItem value="fno" className="text-sm">
                    F&O
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="flex flex-wrap gap-8 items-start">
                <div>
                  <Label className="text-base font-medium mb-4 block">
                    Exchange
                  </Label>
                  <ToggleGroup
                    type="single"
                    value={exchange}
                    onValueChange={(value) => value && setExchange(value)}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="NSE" className="text-sm">
                      NSE
                    </ToggleGroupItem>
                    <ToggleGroupItem value="BSE" className="text-sm">
                      BSE
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {tradeType === "fno" && (
                  <div>
                    <Label className="text-base font-medium mb-4 block">
                      Instrument Type
                    </Label>
                    <ToggleGroup
                      type="single"
                      value={instrumentType}
                      onValueChange={(value) =>
                        value && setInstrumentType(value)
                      }
                      className="justify-start"
                    >
                      <ToggleGroupItem value="future" className="text-sm">
                        Future
                      </ToggleGroupItem>
                      <ToggleGroupItem value="option" className="text-sm">
                        Option
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {transactions.map((transaction, index) => (
                  <Card key={transaction.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Transaction {index + 1}</h4>
                        {transactions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTransaction(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {index === 0 && (
                          <div className="md:col-span-5">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                              id="companyName"
                              placeholder="Enter company name"
                              value={transaction.companyName}
                              onChange={(e) =>
                                updateTransaction(
                                  transaction.id,
                                  "companyName",
                                  e.target.value
                                )
                              }
                              className="mt-1"
                            />
                          </div>
                        )}

                        <div>
                          <Label htmlFor={`quantity-${transaction.id}`}>
                            Quantity
                          </Label>
                          <Input
                            id={`quantity-${transaction.id}`}
                            type="number"
                            min="0"
                            placeholder="Quantity"
                            value={transaction.quantity}
                            onFocus={() => {
                              if (transaction.quantity === "0") {
                                updateTransaction(
                                  transaction.id,
                                  "quantity",
                                  ""
                                );
                              }
                            }}
                            onChange={(e) =>
                              updateTransaction(
                                transaction.id,
                                "quantity",
                                e.target.value
                              )
                            }
                            onBlur={(e) => {
                              if (e.target.value === "") {
                                updateTransaction(
                                  transaction.id,
                                  "quantity",
                                  "0"
                                );
                              }
                            }}
                            onKeyDown={(e) => {
                              if (["e", "E", "+", "-"].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`buyPrice-${transaction.id}`}>
                            Buy Price
                          </Label>
                          <Input
                            id={`buyPrice-${transaction.id}`}
                            type="number"
                            min="0"
                            placeholder="Buy Price"
                            value={transaction.buyPrice}
                            onFocus={() => {
                              if (transaction.buyPrice === "0") {
                                updateTransaction(
                                  transaction.id,
                                  "buyPrice",
                                  ""
                                );
                              }
                            }}
                            onChange={(e) =>
                              updateTransaction(
                                transaction.id,
                                "buyPrice",
                                e.target.value
                              )
                            }
                            onBlur={(e) => {
                              if (e.target.value === "") {
                                updateTransaction(
                                  transaction.id,
                                  "buyPrice",
                                  "0"
                                );
                              }
                            }}
                            onKeyDown={(e) => {
                              if (["e", "E", "+", "-"].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`sellPrice-${transaction.id}`}>
                            Sell Price
                          </Label>
                          <Input
                            id={`sellPrice-${transaction.id}`}
                            type="number"
                            min="0"
                            placeholder="Sell Price"
                            value={transaction.sellPrice}
                            onFocus={() => {
                              if (transaction.sellPrice === "0") {
                                updateTransaction(
                                  transaction.id,
                                  "sellPrice",
                                  ""
                                );
                              }
                            }}
                            onChange={(e) =>
                              updateTransaction(
                                transaction.id,
                                "sellPrice",
                                e.target.value
                              )
                            }
                            onBlur={(e) => {
                              if (e.target.value === "") {
                                updateTransaction(
                                  transaction.id,
                                  "sellPrice",
                                  "0"
                                );
                              }
                            }}
                            onKeyDown={(e) => {
                              if (["e", "E", "+", "-"].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                          />
                        </div>
                        <div className="flex flex-col justify-end text-sm text-muted-foreground space-y-1">
                          <div>
                            Avg. Price:{" "}
                            {formatCurrency(
                              calculationState.result?.transactions[index]
                                ?.averageBuyPrice
                            )}
                          </div>
                          <div>
                            Charges:{" "}
                            {formatCurrency(
                              calculationState.result?.charges?.totalCharges &&
                                Number(
                                  calculationState.result.charges.totalCharges
                                ) / transactions.length
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                <Button
                  onClick={addTransaction}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add transaction for {getCompanyName()}
                </Button>

                <div className="flex gap-4 justify-end">
                  <Button
                    onClick={saveTransactions}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Transactions
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Results Section */}
          <Card className="p-6 glass mt-8">
            {calculationState.error && (
              <div className="p-4 mb-4 text-red-500 bg-red-50 rounded-lg">
                Error: {calculationState.error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <div className="text-sm text-muted-foreground">Turnover</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    calculationState.result?.summary.turnover || 0
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Gross P&L</div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(
                    calculationState.result?.summary.grossPnL ?? 0
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-lg font-semibold">Charges</div>
                  <div className="text-lg font-semibold">
                    {formatCurrency(
                      calculationState.result?.charges.totalCharges ?? 0
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-base font-medium">Brokerage</h4>
                      <span>
                        {formatCurrency(
                          calculationState.result?.charges.brokerage ?? 0
                        )}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-medium mb-3">
                      Other Charges
                    </h4>
                    <div className="space-y-3">
                      {[
                        {
                          key: "stt",
                          label: "Securities Transaction Tax (STT)",
                        },
                        { key: "exchangeCharges", label: "Exchange Charges" },
                        { key: "sebiFee", label: "SEBI Turnover Fees" },
                        { key: "gst", label: "GST" },
                        { key: "stampDuty", label: "Stamp Duty" },
                        ...(exchange === "NSE"
                          ? [{ key: "ipft", label: "IPFT" }]
                          : []), // Conditional IPFT
                      ].map(({ key, label }) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{label}</span>
                          <span>
                            {formatCurrency(
                              calculationState.result?.charges[
                                key as keyof typeof calculationState.result.charges
                              ] ?? 0
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground">Net P&L</div>
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(calculationState.result?.summary.netPnL ?? 0)}
                </div>
              </div>
            </div>
          </Card>

          {/* Features Section */}
          <section className="section-padding">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold">
                  Why Choose Our Calculator?
                </h2>
                <p className="text-muted-foreground mt-4">
                  Designed to make your trading decisions easier and more
                  informed
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: Calculator,
                    title: "Accurate Calculations",
                    description:
                      "Get precise calculations for all charges based on latest rates",
                  },
                  {
                    icon: Clock,
                    title: "Real-time Updates",
                    description:
                      "Charges are updated instantly as you modify trade details",
                  },
                  {
                    icon: Shield,
                    title: "Reliable & Secure",
                    description:
                      "Your data is secure and calculations are verified",
                  },
                ].map((feature, index) => (
                  <Card key={index} className="p-6 glass">
                    <feature.icon className="w-12 h-12 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
              <div className="text-center text-muted-foreground">
                <p>© 2024 TradeSmart. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
};

export default Index;
