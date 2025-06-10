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
import { calculateCharges, getDpCharge, formatCurrency, Charges } from "./Tools/ChargesUtils";
import PositionSizingCalculator from "./Tools/PositionSizingCalculator";
import ProfitTargetCalculator from "./Tools/ProfitTargetCalculator";
import NetPLCalculator from "./Tools/NetPLCalculator";

const Tools = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    // Default dark mode for artifact
    return true;
  });
  
  const [platform, setPlatform] = useState("Groww");

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
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    // navigate function might not be available in artifact
    console.log(`Navigate to: /${newPlatform.toLowerCase()}`);
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

  // FIXED Position Sizing Calculation with Charges Consideration
  const positionSizingResult = (() => {
    const risk = getRiskValue();
    const sl = parseFloat(stopLoss);
    const cap = parseFloat(capital);
    const ep = parseFloat(entryPrice);
    
    if (isNaN(risk) || risk <= 0 || isNaN(sl) || sl <= 0) {
      return null;
    }

    // If we don't have entry price, we can't calculate charges, so fall back to simple calculation
    if (isNaN(ep) || ep <= 0) {
      const quantity = Math.floor(risk / sl);
      return {
        quantity,
        positionValue: undefined,
        capitalUsed: undefined,
        buyingPower: undefined,
        hasCapital: !isNaN(cap) && cap > 0,
        hasEntryPrice: false,
        chargesConsidered: false
      };
    }

    // With entry price available, we can calculate charges-adjusted quantity
    let optimalQuantity = 0;
    let bestNetRisk = 0;
    
    // Start with simple calculation as initial estimate
    const initialQuantity = Math.floor(risk / sl);
    
    // Try quantities around the initial estimate to find the best one
    // We'll test from 50% to 150% of initial quantity to find optimal
    const minQty = Math.max(1, Math.floor(initialQuantity * 0.5));
    const maxQty = Math.ceil(initialQuantity * 1.5);
    
    for (let qty = minQty; qty <= maxQty; qty++) {
      const buyValue = qty * ep;
      const sellValue = qty * (ep - sl); // Worst case scenario (stop loss hit)
      
      // Calculate charges for this quantity using existing function
      const charges = calculateCharges(buyValue, Math.abs(sellValue), exchange);
      
      // Total cost includes the stop loss amount plus all charges
      const totalRiskAmount = (qty * sl) + charges.totalCharges;
      
      // Check if this quantity fits within our risk budget
      if (totalRiskAmount <= risk) {
        optimalQuantity = qty;
        bestNetRisk = totalRiskAmount;
      } else {
        break; // If we exceed risk budget, stop searching
      }
    }
    
    // If no quantity fits within risk budget, use quantity 1 as minimum
    if (optimalQuantity === 0) {
      optimalQuantity = 1;
      const buyValue = optimalQuantity * ep;
      const sellValue = optimalQuantity * (ep - sl);
      const charges = calculateCharges(buyValue, Math.abs(sellValue), exchange);
      bestNetRisk = (optimalQuantity * sl) + charges.totalCharges;
    }

    const positionValue = optimalQuantity * ep;
    let capitalUsed: number | undefined;
    let buyingPower: number | undefined;

    if (selectedTradeType === 'equity-intraday') {
      if (!isNaN(cap) && cap > 0) {
        buyingPower = cap * LEVERAGE;
        // Check if position fits within buying power
        const maxQtyByLeverage = Math.floor(buyingPower / ep);
        if (optimalQuantity > maxQtyByLeverage) {
          optimalQuantity = maxQtyByLeverage;
        }
        capitalUsed = (optimalQuantity * ep) / LEVERAGE;
      } else {
        capitalUsed = positionValue / LEVERAGE;
      }
    } else {
      capitalUsed = positionValue;
    }

    // Final charges calculation for display
    const finalBuyValue = optimalQuantity * ep;
    const finalSellValue = optimalQuantity * (ep - sl);
    const finalCharges = calculateCharges(finalBuyValue, Math.abs(finalSellValue), exchange);
    const actualRiskWithCharges = (optimalQuantity * sl) + finalCharges.totalCharges;

    return {
      quantity: optimalQuantity,
      positionValue,
      capitalUsed,
      buyingPower,
      hasCapital: !isNaN(cap) && cap > 0,
      hasEntryPrice: true,
      chargesConsidered: true,
      estimatedCharges: finalCharges.totalCharges,
      actualRiskAmount: actualRiskWithCharges,
      riskBudget: risk
    };
  })();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Position Sizing Calculator */}
        <PositionSizingCalculator
          riskMode={riskMode}
          capital={capital}
          riskAmount={riskAmount}
          riskPercent={riskPercent}
          stopLoss={stopLoss}
          entryPrice={entryPrice}
          onChange={(field, value) => {
            if (field === 'riskMode') setRiskMode(value as 'amount' | 'percent');
            else if (field === 'capital') setCapital(value);
            else if (field === 'riskAmount') setRiskAmount(value);
            else if (field === 'riskPercent') setRiskPercent(value);
            else if (field === 'stopLoss') setStopLoss(value);
            else if (field === 'entryPrice') setEntryPrice(value);
          }}
          LEVERAGE={LEVERAGE}
        />
        
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
          <ProfitTargetCalculator
            selectedBroker={selectedBroker}
            selectedTradeType={selectedTradeType}
            targetBuyPrice={targetBuyPrice}
            targetQuantity={targetQuantity}
            targetProfitPercentage={targetProfitPercentage}
            targetResult={targetResult}
            onChange={(field, value) => {
              if (field === 'targetBuyPrice') setTargetBuyPrice(value);
              else if (field === 'targetQuantity') setTargetQuantity(value);
              else if (field === 'targetProfitPercentage') setTargetProfitPercentage(value);
            }}
            onCalculate={calculateTargetSellingPrice}
            exchange={exchange}
          />
          <NetPLCalculator
            selectedBroker={selectedBroker}
            selectedTradeType={selectedTradeType}
            profitBuyPrice={profitBuyPrice}
            profitQuantity={profitQuantity}
            profitSellPrice={profitSellPrice}
            profitResult={profitResult}
            onChange={(field, value) => {
              if (field === 'profitBuyPrice') setProfitBuyPrice(value);
              else if (field === 'profitQuantity') setProfitQuantity(value);
              else if (field === 'profitSellPrice') setProfitSellPrice(value);
            }}
            onCalculate={calculateNetProfit}
            exchange={exchange}
          />
        </div>
      </div>
    </div>
  );
};

export default Tools;