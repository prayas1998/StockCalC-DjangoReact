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
    breakevenPrice: number;
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
    breakevenPrice: number;
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
  const [positionType, setPositionType] = useState<'long' | 'short'>('long');

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    // navigate function might not be available in artifact
    console.log(`Navigate to: /${newPlatform.toLowerCase()}`);
  };

  // Calculate target selling price (now: target exit price)
  const calculateTargetSellingPrice = () => {
    if (!targetBuyPrice || !targetQuantity || !targetProfitPercentage) {
      setTargetResult(null);
      return;
    }

    const entryPrice = parseFloat(targetBuyPrice);
    const quantity = parseInt(targetQuantity);
    const profitPercentage = parseFloat(targetProfitPercentage);

    if (isNaN(entryPrice) || isNaN(quantity) || isNaN(profitPercentage) || entryPrice <= 0 || quantity <= 0 || profitPercentage <= 0) {
      setTargetResult(null);
      return;
    }

    // Determine position type
    const isIntradayShort = selectedTradeType === 'equity-intraday' && selectedBroker === 'Dhan' && positionType === 'short';
    const isLong = !isIntradayShort;

    // Calculate the total entry value
    const entryValue = entryPrice * quantity;
    // Target gross profit amount
    const desiredGrossProfit = entryValue * (profitPercentage / 100);

    // Iteratively find the exit price that gives the desired net profit
    let exitPrice = entryPrice * (isLong ? (1 + profitPercentage / 100) : (1 - profitPercentage / 100));
    let exitValue = exitPrice * quantity;
    let charges = calculateCharges(
      isLong ? entryValue : exitValue,
      isLong ? exitValue : entryValue,
      exchange,
      selectedBroker,
      selectedTradeType
    );
    let netProfit = isLong
      ? exitValue - entryValue - charges.totalCharges
      : entryValue - exitValue - charges.totalCharges;
    const targetNetProfit = desiredGrossProfit;

    // Binary search to find the exit price
    let low = isLong ? entryPrice : 0.01;
    let high = isLong ? entryPrice * 2 : entryPrice;
    const MAX_ITERATIONS = 20;
    let iterations = 0;

    while (Math.abs(netProfit - targetNetProfit) > 0.01 && iterations < MAX_ITERATIONS) {
      if (netProfit < targetNetProfit) {
        if (isLong) low = exitPrice;
        else high = exitPrice;
        exitPrice = (exitPrice + high) / 2;
      } else {
        if (isLong) high = exitPrice;
        else low = exitPrice;
        exitPrice = (low + exitPrice) / 2;
      }
      exitValue = exitPrice * quantity;
      charges = calculateCharges(
        isLong ? entryValue : exitValue,
        isLong ? exitValue : entryValue,
        exchange,
        selectedBroker,
        selectedTradeType
      );
      netProfit = isLong
        ? exitValue - entryValue - charges.totalCharges
        : entryValue - exitValue - charges.totalCharges;
      iterations++;
    }

    // Final calculation with the found exit price
    exitValue = exitPrice * quantity;
    charges = calculateCharges(
      isLong ? entryValue : exitValue,
      isLong ? exitValue : entryValue,
      exchange,
      selectedBroker,
      selectedTradeType
    );
    const grossProfit = isLong ? exitValue - entryValue : entryValue - exitValue;
    netProfit = grossProfit - charges.totalCharges;

    // Breakeven price calculation
    const breakevenPrice = isLong
      ? entryPrice + (charges.totalCharges / quantity)
      : entryPrice - (charges.totalCharges / quantity);

    setTargetResult({
      sellingPrice: exitPrice,
      grossProfit,
      netProfit,
      charges,
      breakevenPrice
    });
  };

  // Calculate net profit
  const calculateNetProfit = () => {
    if (!profitBuyPrice || !profitQuantity || !profitSellPrice) {
      setProfitResult(null);
      return;
    }

    const entryPrice = parseFloat(profitBuyPrice);
    const quantity = parseInt(profitQuantity);
    const exitPrice = parseFloat(profitSellPrice);

    if (isNaN(entryPrice) || isNaN(quantity) || isNaN(exitPrice) || entryPrice <= 0 || quantity <= 0 || exitPrice <= 0) {
      setProfitResult(null);
      return;
    }

    // Determine position type
    const isIntradayShort = selectedTradeType === 'equity-intraday' && selectedBroker === 'Dhan' && positionType === 'short';
    const isLong = !isIntradayShort;

    // Calculate the total entry and exit values
    const entryValue = entryPrice * quantity;
    const exitValue = exitPrice * quantity;

    // Calculate charges using the utility function
    const charges = calculateCharges(
      isLong ? entryValue : exitValue,
      isLong ? exitValue : entryValue,
      exchange,
      selectedBroker,
      selectedTradeType
    );

    // Calculate profits
    const grossProfit = isLong ? exitValue - entryValue : entryValue - exitValue;
    const netProfit = grossProfit - charges.totalCharges;

    // Calculate percentage
    const profitPercentage = (netProfit / entryValue) * 100;
    const isProfit = netProfit >= 0;

    // Breakeven price calculation
    const breakevenPrice = isLong
      ? entryPrice + (charges.totalCharges / quantity)
      : entryPrice - (charges.totalCharges / quantity);

    setProfitResult({
      grossProfit,
      netProfit,
      profitPercentage,
      isProfit,
      charges,
      breakevenPrice
    });
  };

  // Handle input changes with validation
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  // Position Sizing Calculation - Now using the utility function
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

  // FIXED Position Sizing Calculation with Charges Consideration - Using utility function
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

      // Calculate charges for this quantity using utility function
      const charges = calculateCharges(buyValue, Math.abs(sellValue), exchange, selectedBroker, selectedTradeType);

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
      const charges = calculateCharges(buyValue, Math.abs(sellValue), exchange, selectedBroker, selectedTradeType);
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

    // Final charges calculation for display using utility function
    const finalBuyValue = optimalQuantity * ep;
    const finalSellValue = optimalQuantity * (ep - sl);
    const finalCharges = calculateCharges(finalBuyValue, Math.abs(finalSellValue), exchange, selectedBroker, selectedTradeType);
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
        {/* <div className="flex flex-wrap gap-4 mb-8">
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
        </div> */}

        {/* Show warning and disable calculators if Groww + Intraday selected */}
        {selectedTradeType === 'equity-intraday' && selectedBroker === 'Groww' && (
          <div className="mb-8 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded">
            <strong>Note:</strong> Equity Intraday calculations are only supported for Dhan broker at this time.
          </div>
        )}

        {/* Shared Settings Header */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="font-medium text-gray-700">P&L Calculators</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-gray-600">Broker:</Label>
                <ToggleGroup type="single" value={selectedBroker} onValueChange={val => val && setSelectedBroker(val as 'Dhan' | 'Groww')} className="h-8">
                  <ToggleGroupItem value="Dhan" className="px-3 py-1 text-xs">Dhan</ToggleGroupItem>
                  <ToggleGroupItem value="Groww" className="px-3 py-1 text-xs">Groww</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-gray-600">Type:</Label>
                <ToggleGroup type="single" value={selectedTradeType} onValueChange={val => val && setSelectedTradeType(val as 'equity-delivery' | 'equity-intraday')} className="h-8">
                  <ToggleGroupItem value="equity-delivery" className="px-3 py-1 text-xs">Delivery</ToggleGroupItem>
                  <ToggleGroupItem value="equity-intraday" className="px-3 py-1 text-xs">Intraday</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <ProfitTargetCalculator
            selectedBroker={selectedBroker}
            selectedTradeType={selectedTradeType}
            positionType={positionType}
            targetBuyPrice={targetBuyPrice}
            targetQuantity={targetQuantity}
            targetProfitPercentage={targetProfitPercentage}
            targetResult={targetResult}
            onChange={(field, value) => {
              if (field === 'targetBuyPrice') setTargetBuyPrice(value);
              else if (field === 'targetQuantity') setTargetQuantity(value);
              else if (field === 'targetProfitPercentage') setTargetProfitPercentage(value);
              else if (field === 'positionType') setPositionType(value as 'long' | 'short');
            }}
            onCalculate={calculateTargetSellingPrice}
            exchange={exchange}
          />
          <NetPLCalculator
            selectedBroker={selectedBroker}
            selectedTradeType={selectedTradeType}
            positionType={positionType}
            profitBuyPrice={profitBuyPrice}
            profitQuantity={profitQuantity}
            profitSellPrice={profitSellPrice}
            profitResult={profitResult}
            onChange={(field, value) => {
              if (field === 'profitBuyPrice') setProfitBuyPrice(value);
              else if (field === 'profitQuantity') setProfitQuantity(value);
              else if (field === 'profitSellPrice') setProfitSellPrice(value);
              else if (field === 'positionType') setPositionType(value as 'long' | 'short');
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