import { Button } from "@/components/ui/button";
import { User, Moon, Sun, ChevronDown, Calculator } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Define charge type to avoid duplication
type Charges = {
  brokerage: number;
  stt: number;
  exchangeCharges: number;
  gst: number;
  stampDuty: number;
  sebiCharges: number;
  ipft: number;
  totalCharges: number;
};

const Tools = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage on initial load
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("darkMode");
      return savedMode ? JSON.parse(savedMode) : true; // Default dark mode
    }
    return true; // Fallback for server-side
  });
  
  const [platform, setPlatform] = useState(() => {
    const path = window.location.pathname.slice(1);
    if (path === "tools") return "Groww"; // Default to Groww when on tools page
    return path.charAt(0).toUpperCase() + path.slice(1) || "Groww";
  });

  // Profit Target Calculator states
  const [targetBuyPrice, setTargetBuyPrice] = useState("");
  const [targetQuantity, setTargetQuantity] = useState("");
  const [targetProfitPercentage, setTargetProfitPercentage] = useState("");
  const [targetResult, setTargetResult] = useState<{
    sellingPrice: number;
    grossProfit: number;
    netProfit: number;
    charges: Charges;
  } | null>(null);
  
  // Net Profit Calculator states
  const [profitBuyPrice, setProfitBuyPrice] = useState("");
  const [profitQuantity, setProfitQuantity] = useState("");
  const [profitSellPrice, setProfitSellPrice] = useState("");
  const [profitResult, setProfitResult] = useState<{
    grossProfit: number;
    netProfit: number;
    profitPercentage: number;
    isProfit: boolean;
    charges: Charges;
  } | null>(null);
  
  // Exchange state (for both calculators)
  const exchange = "NSE"; // Fixed to NSE

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]); // Save to localStorage on change

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
  
  // Format currency helper
  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  // Calculate charges based on formulas.md
  const calculateCharges = (buyValue: number, sellValue: number, exchange: string): Charges => {
    const totalTurnover = buyValue + sellValue;
    
    // 1. Brokerage (for Groww equity-delivery)
    // Buy: 0.1% of buy value (min ₹2, max ₹20)
    // Sell: 0.1% of sell value (min ₹2, max ₹20)
    const buyBrokerage = Math.min(Math.max(buyValue * 0.001, 2), 20);
    const sellBrokerage = Math.min(Math.max(sellValue * 0.001, 2), 20);
    const brokerage = buyBrokerage + sellBrokerage;
    
    // 2. STT (Securities Transaction Tax)
    // 0.1% of total turnover (buy + sell value)
    const stt = Math.round(totalTurnover * 0.001);
    
    // 3. Exchange Charges
    // NSE: 0.00297% of total turnover
    // BSE: 0.00375% of total turnover
    const exchangeCharges = exchange === "NSE" 
      ? parseFloat((totalTurnover * 0.0000297).toFixed(2))
      : parseFloat((totalTurnover * 0.0000375).toFixed(2));
    
    // 4. Stamp Duty
    // 0.015% of buy value
    const stampDuty = Math.round(buyValue * 0.00015);
    
    // 5. SEBI Turnover Fee
    // 0.0001% of total turnover
    const sebiCharges = parseFloat((totalTurnover * 0.000001).toFixed(2));
    
    // 6. IPFT (Investor Protection Fund Trust)
    // 0.0001% of total turnover - NSE trades only
    const ipft = exchange === "NSE" 
      ? parseFloat((totalTurnover * 0.000001).toFixed(2))
      : 0;
    
    // 7. GST
    // 18% of (Brokerage + Exchange Charges + SEBI Fee + IPFT)
    const taxableAmount = brokerage + exchangeCharges + sebiCharges + ipft;
    const gst = parseFloat((taxableAmount * 0.18).toFixed(2));
    
    // Total Charges
    const totalCharges = brokerage + stt + exchangeCharges + stampDuty + sebiCharges + ipft + gst;
    
    return {
      brokerage,
      stt,
      exchangeCharges,
      gst,
      stampDuty,
      sebiCharges,
      ipft,
      totalCharges
    };
  };
  
  // Calculate target selling price
  const calculateTargetSellingPrice = () => {
    if (!targetBuyPrice || !targetQuantity || !targetProfitPercentage) {
      setTargetResult(null);
      return;
    }
    
    const buyPrice = parseFloat(targetBuyPrice);
    const quantity = parseInt(targetQuantity);
    const profitPercentage = parseFloat(targetProfitPercentage);
    
    if (isNaN(buyPrice) || isNaN(quantity) || isNaN(profitPercentage) || buyPrice <= 0 || quantity <= 0 || profitPercentage <= 0) {
      setTargetResult(null);
      return;
    }
    
    // Calculate the total buy value
    const buyValue = buyPrice * quantity;
    
    // Target gross profit amount
    const desiredGrossProfit = buyValue * (profitPercentage / 100);
    
    // Iteratively find the selling price that gives the desired net profit
    // Start with a selling price that would give the gross profit
    let sellingPrice = buyPrice * (1 + profitPercentage / 100);
    let sellValue = sellingPrice * quantity;
    let charges = calculateCharges(buyValue, sellValue, exchange);
    let netProfit = sellValue - buyValue - charges.totalCharges;
    let targetNetProfit = desiredGrossProfit;
    
    // Binary search to find the selling price
    let low = buyPrice;
    let high = buyPrice * 2; // Assuming we won't need a selling price more than double the buy price
    
    // Maximum iterations to prevent infinite loop
    const MAX_ITERATIONS = 20;
    let iterations = 0;
    
    while (Math.abs(netProfit - targetNetProfit) > 0.01 && iterations < MAX_ITERATIONS) {
      if (netProfit < targetNetProfit) {
        low = sellingPrice;
        sellingPrice = (sellingPrice + high) / 2;
      } else {
        high = sellingPrice;
        sellingPrice = (low + sellingPrice) / 2;
      }
      
      sellValue = sellingPrice * quantity;
      charges = calculateCharges(buyValue, sellValue, exchange);
      netProfit = sellValue - buyValue - charges.totalCharges;
      
      iterations++;
    }
    
    // Final calculation with the found selling price
    sellValue = sellingPrice * quantity;
    charges = calculateCharges(buyValue, sellValue, exchange);
    const grossProfit = sellValue - buyValue;
    netProfit = grossProfit - charges.totalCharges;
    
    setTargetResult({
      sellingPrice,
      grossProfit,
      netProfit,
      charges
    });
  };
  
  // Calculate net profit
  const calculateNetProfit = () => {
    if (!profitBuyPrice || !profitQuantity || !profitSellPrice) {
      setProfitResult(null);
      return;
    }
    
    const buyPrice = parseFloat(profitBuyPrice);
    const quantity = parseInt(profitQuantity);
    const sellPrice = parseFloat(profitSellPrice);
    
    if (isNaN(buyPrice) || isNaN(quantity) || isNaN(sellPrice) || buyPrice <= 0 || quantity <= 0 || sellPrice <= 0) {
      setProfitResult(null);
      return;
    }
    
    // Calculate the total buy and sell values
    const buyValue = buyPrice * quantity;
    const sellValue = sellPrice * quantity;
    
    // Calculate charges
    const charges = calculateCharges(buyValue, sellValue, exchange);
    
    // Calculate profits
    const grossProfit = sellValue - buyValue;
    const netProfit = grossProfit - charges.totalCharges;
    
    // Calculate percentage
    const profitPercentage = (netProfit / buyValue) * 100;
    const isProfit = netProfit >= 0;
    
    setProfitResult({
      grossProfit,
      netProfit,
      profitPercentage,
      isProfit,
      charges
    });
  };
  
  // Handle input changes with validation
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  return (
    <div className="min-h-screen">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">TradeSmart</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/tools")} className="flex items-center gap-2">
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Stock Market Tools</h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Profit Target Calculator */}
          <Card className="p-6 bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Profit Target Calculator</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Calculate the required selling price to achieve your target profit percentage after all charges.
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="text"
                  placeholder="Enter quantity"
                  value={targetQuantity}
                  onChange={(e) => handleInputChange(setTargetQuantity, e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="buyPrice">Buy Price Per Share</Label>
                <Input
                  id="buyPrice"
                  type="text"
                  placeholder="Enter buy price"
                  value={targetBuyPrice}
                  onChange={(e) => handleInputChange(setTargetBuyPrice, e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="profitPercentage">Target Profit Percentage</Label>
                <Input
                  id="profitPercentage"
                  type="text"
                  placeholder="Enter percentage (e.g. 5 for 5%)"
                  value={targetProfitPercentage}
                  onChange={(e) => handleInputChange(setTargetProfitPercentage, e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <Button 
                onClick={calculateTargetSellingPrice}
                className="w-full mt-2"
              >
                Calculate Target Price
              </Button>
            </div>
            
            {targetResult && (
              <div className="mt-6 p-4 border rounded-md bg-secondary/20">
                <h3 className="font-semibold text-lg mb-2">Results</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-primary font-semibold">
                    <span>Required Selling Price:</span>
                    <span>{formatCurrency(targetResult.sellingPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gross Profit:</span>
                    <span className="font-medium">{formatCurrency(targetResult.grossProfit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Charges:</span>
                    <span className="font-medium">{formatCurrency(targetResult.charges.totalCharges)}</span>
                  </div>
                  <div className="flex justify-between text-primary font-semibold">
                    <span>Net Profit:</span>
                    <span>{formatCurrency(targetResult.netProfit)}</span>
                  </div>
                  
                  <div className="pt-2 mt-2 border-t">
                    <div className="text-sm font-medium mb-1">Charges Breakdown</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brokerage:</span>
                        <span>{formatCurrency(targetResult.charges.brokerage)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">STT:</span>
                        <span>{formatCurrency(targetResult.charges.stt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exchange:</span>
                        <span>{formatCurrency(targetResult.charges.exchangeCharges)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GST:</span>
                        <span>{formatCurrency(targetResult.charges.gst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stamp Duty:</span>
                        <span>{formatCurrency(targetResult.charges.stampDuty)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SEBI Fee:</span>
                        <span>{formatCurrency(targetResult.charges.sebiCharges)}</span>
                      </div>
                      {exchange === "NSE" && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IPFT:</span>
                          <span>{formatCurrency(targetResult.charges.ipft)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
          
          {/* Net P&L Calculator */}
          <Card className="p-6 bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Net P&L Calculator</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Calculate your net profit or loss after all charges based on your buy and sell prices.
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="profitQuantity">Quantity</Label>
                <Input
                  id="profitQuantity"
                  type="text"
                  placeholder="Enter quantity"
                  value={profitQuantity}
                  onChange={(e) => handleInputChange(setProfitQuantity, e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="profitBuyPrice">Buy Price Per Share</Label>
                <Input
                  id="profitBuyPrice"
                  type="text"
                  placeholder="Enter buy price"
                  value={profitBuyPrice}
                  onChange={(e) => handleInputChange(setProfitBuyPrice, e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="sellPrice">Sell Price Per Share</Label>
                <Input
                  id="sellPrice"
                  type="text"
                  placeholder="Enter sell price"
                  value={profitSellPrice}
                  onChange={(e) => handleInputChange(setProfitSellPrice, e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <Button 
                onClick={calculateNetProfit}
                className="w-full mt-2"
                variant={profitSellPrice && profitBuyPrice && parseFloat(profitSellPrice) < parseFloat(profitBuyPrice) ? "destructive" : "default"}
              >
                {profitSellPrice && profitBuyPrice && parseFloat(profitSellPrice) < parseFloat(profitBuyPrice) 
                  ? "Calculate Net Loss" 
                  : "Calculate Net Profit"}
              </Button>
            </div>
            
            {profitResult && (
              <div className="mt-6 p-4 border rounded-md bg-secondary/20">
                <h3 className="font-semibold text-lg mb-2">Results</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Gross {profitResult.isProfit ? "Profit" : "Loss"}:</span>
                    <span className="font-medium">{formatCurrency(Math.abs(profitResult.grossProfit))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Charges:</span>
                    <span className="font-medium">{formatCurrency(profitResult.charges.totalCharges)}</span>
                  </div>
                  <div className="flex justify-between text-primary font-semibold">
                    <span>Net {profitResult.isProfit ? "Profit" : "Loss"}:</span>
                    <span className={profitResult.isProfit ? "text-primary" : "text-destructive"}>
                      {formatCurrency(Math.abs(profitResult.netProfit))} ({profitResult.profitPercentage.toFixed(2)}%)
                    </span>
                  </div>
                  
                  <div className="pt-2 mt-2 border-t">
                    <div className="text-sm font-medium mb-1">Charges Breakdown</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brokerage:</span>
                        <span>{formatCurrency(profitResult.charges.brokerage)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">STT:</span>
                        <span>{formatCurrency(profitResult.charges.stt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exchange:</span>
                        <span>{formatCurrency(profitResult.charges.exchangeCharges)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GST:</span>
                        <span>{formatCurrency(profitResult.charges.gst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stamp Duty:</span>
                        <span>{formatCurrency(profitResult.charges.stampDuty)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SEBI Fee:</span>
                        <span>{formatCurrency(profitResult.charges.sebiCharges)}</span>
                      </div>
                      {exchange === "NSE" && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IPFT:</span>
                          <span>{formatCurrency(profitResult.charges.ipft)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Tools;