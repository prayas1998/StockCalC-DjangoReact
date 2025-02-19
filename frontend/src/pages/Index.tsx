import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRight, Calculator, ArrowRight, Clock, Shield, Moon, Sun, ChevronDown, Plus, Trash2, User, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Transaction {
  id: string;
  companyName?: string;
  quantity: string;
  buyPrice: string;
  sellPrice: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [exchange, setExchange] = useState("NSE");
  const [tradeType, setTradeType] = useState("equity-delivery");
  const [instrumentType, setInstrumentType] = useState("future"); // for F&O
  
  // Initialize platform based on current path
  const [platform, setPlatform] = useState(() => {
    const path = window.location.pathname.slice(1);
    return path.charAt(0).toUpperCase() + path.slice(1) || "Groww";
  });

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "1", companyName: "", quantity: "", buyPrice: "", sellPrice: "" }
  ]);

  // Dark mode toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const addTransaction = () => {
    setTransactions([
      ...transactions,
      {
        id: Math.random().toString(),
        quantity: "",
        buyPrice: "",
        sellPrice: ""
      }
    ]);
  };

  const removeTransaction = (id: string) => {
    if (transactions.length > 1) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const updateTransaction = (id: string, field: keyof Transaction, value: string) => {
    setTransactions(transactions.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    navigate(`/${newPlatform.toLowerCase()}`);
  };

  const getCompanyName = () => {
    return transactions[0]?.companyName || "this company";
  };

  const saveTransactions = () => {
    console.log("Saving transactions:", transactions);
    // Here you can add the logic to save transactions
  };

  // Calculate average price (placeholder for backend calculation)
  const getAveragePrice = (transactions: Transaction[], currentIndex: number) => {
    // This will be replaced with backend calculation
    return "₹100.00";
  };

  // Calculate charges (placeholder for backend calculation)
  const getCharges = (transaction: Transaction) => {
    // This will be replaced with backend calculation
    return "₹10.00";
  };

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">TradeSmart</h1>
          </div>
          <div className="flex items-center gap-4">
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
                <DropdownMenuItem onClick={() => handlePlatformChange("Others")}>
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
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-200 to-blue-50 dark:from-gray-900 dark:to-background min-h-[40vh] flex items-center">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full mb-8">
            <span className="text-primary text-sm font-medium">Calculate Stock Market Charges</span>
            <ChevronRight className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-6xl font-bold tracking-tight sm:text-7xl mb-6">
            Smart Trading
            <br />
            Starts Here
          </h1>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Calculate all your trading charges instantly with our advanced calculator.
          </p>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="section-padding bg-secondary/50 dark:bg-secondary/10">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6 glass">
            <div className="space-y-6">
              {/* Trade Type and Exchange toggles */}
              <div>
                <Label className="text-base font-medium mb-4 block">Trade Type</Label>
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
                  <Label className="text-base font-medium mb-4 block">Exchange</Label>
                  <ToggleGroup 
                    type="single" 
                    value={exchange} 
                    onValueChange={(value) => value && setExchange(value)}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="NSE" className="text-sm">NSE</ToggleGroupItem>
                    <ToggleGroupItem value="BSE" className="text-sm">BSE</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {tradeType === "fno" && (
                  <div>
                    <Label className="text-base font-medium mb-4 block">Instrument Type</Label>
                    <ToggleGroup 
                      type="single" 
                      value={instrumentType}
                      onValueChange={(value) => value && setInstrumentType(value)}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="future" className="text-sm">Future</ToggleGroupItem>
                      <ToggleGroupItem value="option" className="text-sm">Option</ToggleGroupItem>
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
                              onChange={(e) => updateTransaction(transaction.id, "companyName", e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        )}
                        
                        <div>
                          <Label htmlFor={`quantity-${transaction.id}`}>Quantity</Label>
                          <Input
                            id={`quantity-${transaction.id}`}
                            type="number"
                            placeholder="Quantity"
                            value={transaction.quantity}
                            onChange={(e) => updateTransaction(transaction.id, "quantity", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`buyPrice-${transaction.id}`}>Buy Price</Label>
                          <Input
                            id={`buyPrice-${transaction.id}`}
                            type="number"
                            placeholder="Buy Price"
                            value={transaction.buyPrice}
                            onChange={(e) => updateTransaction(transaction.id, "buyPrice", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`sellPrice-${transaction.id}`}>Sell Price</Label>
                          <Input
                            id={`sellPrice-${transaction.id}`}
                            type="number"
                            placeholder="Sell Price"
                            value={transaction.sellPrice}
                            onChange={(e) => updateTransaction(transaction.id, "sellPrice", e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col justify-end text-sm text-muted-foreground space-y-1">
                          <div>Avg. Price: {getAveragePrice(transactions, index)}</div>
                          <div>Charges: {getCharges(transaction)}</div>
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
                  <Button>
                    Calculate Charges
                  </Button>
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
            <div className="space-y-6">
              <div>
                <div className="text-sm text-muted-foreground">Turnover</div>
                <div className="text-2xl font-bold">₹1,25,000.00</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">P&L</div>
                <div className="text-2xl font-bold text-primary">₹25,000.00</div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-lg font-semibold">Charges</div>
                  <div className="text-lg font-semibold">₹184.23</div>
                </div>

                <div className="space-y-6">
                  {/* Brokerage Section */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-base font-medium">Brokerage</h4>
                      <span>₹40.00</span>
                    </div>
                  </div>

                  {/* Other Charges Section */}
                  <div>
                    <h4 className="text-base font-medium mb-3">Other Charges</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Securities Transaction Tax (STT)</span>
                        <span>₹125.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exchange Charges</span>
                        <span>₹3.71</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SEBI Turnover Fees</span>
                        <span>₹0.13</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GST</span>
                        <span>₹7.89</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stamp Duty</span>
                        <span>₹7.50</span>
                      </div>
                      {exchange === "NSE" && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IPFT</span>
                          <span>₹0.05</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground">Net P&L</div>
                <div className="text-3xl font-bold text-primary">₹24,815.77</div>
              </div>
            </div>
          </Card>

          {/* Features Section */}
          <section className="section-padding">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold">Why Choose Our Calculator?</h2>
                <p className="text-muted-foreground mt-4">
                  Designed to make your trading decisions easier and more informed
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: Calculator,
                    title: "Accurate Calculations",
                    description: "Get precise calculations for all charges based on latest rates",
                  },
                  {
                    icon: Clock,
                    title: "Real-time Updates",
                    description: "Charges are updated instantly as you modify trade details",
                  },
                  {
                    icon: Shield,
                    title: "Reliable & Secure",
                    description: "Your data is secure and calculations are verified",
                  },
                ].map((feature, index) => (
                  <Card key={index} className="p-6 glass">
                    <feature.icon className="w-12 h-12 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
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
