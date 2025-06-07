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
import Header from "@/components/ui/header";
import { Switch } from "@/components/ui/switch";

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
  dpCharges: number;
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
    const path = window.location.pathname.slice(1).toLowerCase();
    if (path === "tools") return "Groww"; // Default to Groww when on tools page
    if (["groww", "dhan", "rise", "others"].includes(path)) {
      return path.charAt(0).toUpperCase() + path.slice(1);
    }
    return "Groww";
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

  // Add toggles for broker and trade type
  const [selectedBroker, setSelectedBroker] = useState<'Dhan' | 'Groww'>('Dhan');
  const [selectedTradeType, setSelectedTradeType] = useState<'equity-delivery' | 'equity-intraday'>('equity-delivery');

  // Position Sizing Calculator states
  const [riskMode, setRiskMode] = useState<'amount' | 'percent'>('amount');
  const [capital, setCapital] = useState("");
  const [riskAmount, setRiskAmount] = useState("");
  const [riskPercent, setRiskPercent] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [positionTradeType, setPositionTradeType] = useState<'equity-delivery' | 'equity-intraday'>('equity-delivery');
  const LEVERAGE = 5;

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
  
  // DP charge logic
  const getDpCharge = (broker: string) => {
    if (broker === 'Dhan') return 14.75;
    if (broker === 'Groww') return 21.54;
    return 0;
  };

  // Calculate charges based on selected broker and trade type
  const calculateCharges = (buyValue: number, sellValue: number, exchange: string): Charges => {
    const totalTurnover = buyValue + sellValue;
    let brokerage = 0;
    let stt = 0;
    let exchangeCharges = 0;
    let stampDuty = 0;
    let sebiCharges = 0;
    let ipft = 0;
    let gst = 0;
    let dpCharges = 0;
    let totalCharges = 0;

    if (selectedTradeType === 'equity-delivery') {
      if (selectedBroker === 'Groww') {
        // Groww equity delivery logic
        const buyBrokerage = Math.min(Math.max(buyValue * 0.001, 2), 20);
        const sellBrokerage = Math.min(Math.max(sellValue * 0.001, 2), 20);
        brokerage = buyBrokerage + sellBrokerage;
      } else if (selectedBroker === 'Dhan') {
        brokerage = 0;
      }
      stt = Math.round(totalTurnover * 0.001);
      exchangeCharges = exchange === "NSE"
        ? parseFloat((totalTurnover * 0.0000297).toFixed(2))
        : parseFloat((totalTurnover * 0.0000375).toFixed(2));
      stampDuty = Math.round(buyValue * 0.00015);
      sebiCharges = parseFloat((totalTurnover * 0.000001).toFixed(2));
      ipft = exchange === "NSE"
        ? parseFloat((totalTurnover * 0.000001).toFixed(2))
        : 0;
      const taxableAmount = brokerage + exchangeCharges + sebiCharges + ipft;
      gst = parseFloat((taxableAmount * 0.18).toFixed(2));
      // DP charge only if sellValue > 0
      dpCharges = sellValue > 0 ? getDpCharge(selectedBroker) : 0;
      totalCharges = brokerage + stt + exchangeCharges + stampDuty + sebiCharges + ipft + gst + dpCharges;
    } else if (selectedTradeType === 'equity-intraday') {
      if (selectedBroker === 'Dhan') {
        // Dhan intraday logic
        // Brokerage: min(₹20, 0.03% of turnover per leg) for buy and sell
        const buyBrokerage = buyValue > 0 ? Math.min(20, parseFloat((buyValue * 0.0003).toFixed(2))) : 0;
        const sellBrokerage = sellValue > 0 ? Math.min(20, parseFloat((sellValue * 0.0003).toFixed(2))) : 0;
        brokerage = buyBrokerage + sellBrokerage;
        stt = Math.round(sellValue * 0.00025); // STT only on sell
        exchangeCharges = exchange === "NSE"
          ? parseFloat((totalTurnover * 0.0000297).toFixed(2))
          : parseFloat((totalTurnover * 0.0000375).toFixed(2));
        stampDuty = buyValue > 0 ? Math.round(buyValue * 0.00003) : 0; // Only on buy
        sebiCharges = parseFloat((totalTurnover * 0.000001).toFixed(2));
        ipft = exchange === "NSE"
          ? parseFloat((totalTurnover * 0.000001).toFixed(2))
          : 0;
        const taxableAmount = brokerage + exchangeCharges + sebiCharges + ipft;
        gst = parseFloat((taxableAmount * 0.18).toFixed(2));
        dpCharges = 0; // No DP charges for intraday
        totalCharges = brokerage + stt + exchangeCharges + stampDuty + sebiCharges + ipft + gst;
      } else {
        // Groww intraday not supported
        brokerage = 0;
        stt = 0;
        exchangeCharges = 0;
        stampDuty = 0;
        sebiCharges = 0;
        ipft = 0;
        gst = 0;
        dpCharges = 0;
        totalCharges = 0;
      }
    }
    return {
      brokerage,
      stt,
      exchangeCharges,
      gst,
      stampDuty,
      sebiCharges,
      ipft,
      totalCharges,
      dpCharges,
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

  // Position Sizing Calculation
  const getRiskValue = () => {
    if (riskMode === 'amount') {
      const amt = parseFloat(riskAmount);
      return isNaN(amt) ? 0 : amt;
    } else {
      const cap = parseFloat(capital);
      const pct = parseFloat(riskPercent);
      if (isNaN(cap) || isNaN(pct)) return 0;
      return (cap * pct) / 100;
    }
  };

  const positionSizingResult = (() => {
    const risk = getRiskValue();
    const sl = parseFloat(stopLoss);
    const cap = parseFloat(capital);
    const ep = parseFloat(entryPrice);
    if (isNaN(risk) || risk <= 0 || isNaN(sl) || sl <= 0) {
      return null;
    }
    let quantity = Math.floor(risk / sl);
    let positionValue = undefined;
    let capitalUsed = undefined;
    let buyingPower = undefined;
    if (!isNaN(ep) && ep > 0) {
      positionValue = quantity * ep;
      if (positionTradeType === 'equity-intraday') {
        if (!isNaN(cap) && cap > 0) {
          buyingPower = cap * LEVERAGE;
          // Suggest max possible quantity within buying power
          const maxQtyByLeverage = Math.floor(buyingPower / ep);
          if (quantity > maxQtyByLeverage) quantity = maxQtyByLeverage;
          positionValue = quantity * ep;
          capitalUsed = positionValue / LEVERAGE;
        } else {
          capitalUsed = positionValue / LEVERAGE;
        }
      } else {
        capitalUsed = positionValue;
      }
    }
    if (positionTradeType === 'equity-intraday' && !isNaN(cap) && cap > 0) {
      buyingPower = cap * LEVERAGE;
    }
    return {
      quantity,
      positionValue,
      capitalUsed,
      buyingPower,
      hasCapital: !isNaN(cap) && cap > 0,
      hasEntryPrice: !isNaN(ep) && ep > 0,
    };
  })();

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Stock Market Tools</h1>
        
        {/* Position Sizing Calculator */}
        <Card className="p-6 bg-card shadow-sm mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Position Sizing Calculator</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Calculate optimal position size based on your risk, stop loss, and capital. Helps manage risk per trade.
          </p>
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <Label className="mb-2 block">Trade Type</Label>
              <ToggleGroup type="single" value={positionTradeType} onValueChange={val => val && setPositionTradeType(val as 'equity-delivery' | 'equity-intraday')}>
                <ToggleGroupItem value="equity-delivery">Equity Delivery</ToggleGroupItem>
                <ToggleGroupItem value="equity-intraday">Equity Intraday</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div>
              <Label className="mb-2 block">Risk Mode</Label>
              <ToggleGroup type="single" value={riskMode} onValueChange={val => val && setRiskMode(val as 'amount' | 'percent')}>
                <ToggleGroupItem value="amount">Fixed Amount (₹)</ToggleGroupItem>
                <ToggleGroupItem value="percent">% of Capital</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {/* Risk per trade first */}
            {riskMode === 'amount' ? (
              <div>
                <Label htmlFor="riskAmount">Risk per Trade (₹)</Label>
                <Input
                  id="riskAmount"
                  type="text"
                  placeholder="Amount you can risk"
                  value={riskAmount}
                  onChange={e => handleInputChange(setRiskAmount, e.target.value)}
                  className="mt-1"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="riskPercent">Risk per Trade (%)</Label>
                <Input
                  id="riskPercent"
                  type="text"
                  placeholder="% of capital to risk"
                  value={riskPercent}
                  onChange={e => handleInputChange(setRiskPercent, e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            {/* Stop loss second */}
            <div>
              <Label htmlFor="stopLoss">Stop Loss (points)</Label>
              <Input
                id="stopLoss"
                type="text"
                placeholder="e.g. 8"
                value={stopLoss}
                onChange={e => handleInputChange(setStopLoss, e.target.value)}
                className="mt-1"
              />
            </div>
            {/* Capital third */}
            <div>
              <Label htmlFor="capital">Capital (₹) <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                id="capital"
                type="text"
                placeholder="Enter your capital (optional)"
                value={capital}
                onChange={e => handleInputChange(setCapital, e.target.value)}
                className="mt-1"
              />
            </div>
            {/* Entry price fourth */}
            <div>
              <Label htmlFor="entryPrice">Entry Price (₹) <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                id="entryPrice"
                type="text"
                placeholder="e.g. 200 (optional)"
                value={entryPrice}
                onChange={e => handleInputChange(setEntryPrice, e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          {positionSizingResult && (
            <div className="mt-6 p-4 border rounded-md bg-secondary/20">
              <h3 className="font-semibold text-lg mb-2">Results</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Quantity to Trade:</span>
                  <span className="font-medium">{positionSizingResult.quantity}</span>
                </div>
                {(!positionSizingResult.hasEntryPrice || (positionTradeType === 'equity-intraday' && !positionSizingResult.hasCapital)) && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Please fill in {(!positionSizingResult.hasEntryPrice && !positionSizingResult.hasCapital && positionTradeType === 'equity-intraday') ? 'Entry Price and Capital' : (!positionSizingResult.hasEntryPrice ? 'Entry Price' : 'Capital')} to calculate Position Value and Effective Capital Used.
                  </div>
                )}
                {positionSizingResult.hasEntryPrice && (
                  <div className="flex justify-between">
                    <span>Position Value:</span>
                    <span className="font-medium">{formatCurrency(positionSizingResult.positionValue ?? 0)}</span>
                  </div>
                )}
                {positionSizingResult.hasEntryPrice && (
                  <div className="flex justify-between">
                    <span>Effective Capital Used:</span>
                    <span className="font-medium">{formatCurrency(positionSizingResult.capitalUsed ?? 0)}</span>
                  </div>
                )}
                {positionTradeType === 'equity-intraday' && positionSizingResult.hasCapital && (
                  <div className="flex justify-between">
                    <span>Buying Power (5x):</span>
                    <span className="font-medium">{formatCurrency(positionSizingResult.buyingPower ?? 0)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
        
        {/* Broker and Trade Type Toggles */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div>
            <Label className="mb-2 block">Broker</Label>
            <ToggleGroup type="single" value={selectedBroker} onValueChange={val => val && setSelectedBroker(val as 'Dhan' | 'Groww')}>
              <ToggleGroupItem value="Dhan">Dhan</ToggleGroupItem>
              <ToggleGroupItem value="Groww">Groww</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div>
            <Label className="mb-2 block">Trade Type</Label>
            <ToggleGroup type="single" value={selectedTradeType} onValueChange={val => val && setSelectedTradeType(val as 'equity-delivery' | 'equity-intraday')}>
              <ToggleGroupItem value="equity-delivery">Equity Delivery</ToggleGroupItem>
              <ToggleGroupItem value="equity-intraday">Equity Intraday</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        
        {/* Show warning and disable calculators if Groww + Intraday selected */}
        {selectedTradeType === 'equity-intraday' && selectedBroker === 'Groww' && (
          <div className="mb-8 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded">
            <strong>Note:</strong> Equity Intraday calculations are only supported for Dhan broker at this time.
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Profit Target Calculator */}
          <Card className="p-6 bg-card shadow-sm" aria-disabled={selectedTradeType === 'equity-intraday' && selectedBroker === 'Groww'} style={selectedTradeType === 'equity-intraday' && selectedBroker === 'Groww' ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
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
          <Card className="p-6 bg-card shadow-sm" aria-disabled={selectedTradeType === 'equity-intraday' && selectedBroker === 'Groww'} style={selectedTradeType === 'equity-intraday' && selectedBroker === 'Groww' ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
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