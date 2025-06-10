import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calculator } from "lucide-react";
import { formatCurrency, calculateCharges } from "./ChargesUtils";

interface PositionSizingCalculatorProps {
  riskMode: 'amount' | 'percent';
  capital: string;
  riskAmount: string;
  riskPercent: string;
  stopLoss: string;
  entryPrice: string;
  onChange: (field: string, value: string) => void;
  LEVERAGE: number;
}

const PositionSizingCalculator: React.FC<PositionSizingCalculatorProps> = ({
  riskMode,
  capital,
  riskAmount,
  riskPercent,
  stopLoss,
  entryPrice,
  onChange,
  LEVERAGE
}) => {
  const exchange = "NSE";
  const [selectedBroker, setSelectedBroker] = useState<'Dhan' | 'Groww'>('Dhan');
  const [positionTradeType, setPositionTradeType] = useState<'equity-delivery' | 'equity-intraday'>('equity-delivery');

  const handleInputChange = (field: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onChange(field, value);
    }
  };

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

  const isGrowwIntraday = selectedBroker === 'Groww' && positionTradeType === 'equity-intraday';

  const positionSizingResult = React.useMemo(() => {
    if (isGrowwIntraday) return null;
    const risk = getRiskValue();
    const sl = parseFloat(stopLoss);
    const cap = parseFloat(capital);
    const ep = parseFloat(entryPrice);
    if (isNaN(risk) || risk <= 0 || isNaN(sl) || sl <= 0 || isNaN(ep) || ep <= 0) {
      return null;
    }
    let optimalQuantity = 0;
    let bestNetRisk = 0;
    let bestCharges = 0;
    let bestPositionValue = 0;
    let bestCapitalUsed: number | undefined = undefined;
    let bestBuyingPower: number | undefined = undefined;
    let maxQty = 100000; // Arbitrary high limit to prevent infinite loop
    for (let qty = 1; qty <= maxQty; qty++) {
      const buyValue = qty * ep;
      const sellValue = qty * (ep - sl);
      const charges = calculateCharges(buyValue, Math.abs(sellValue), exchange, selectedBroker, positionTradeType);
      let capitalUsed: number | undefined;
      let buyingPower: number | undefined;
      if (positionTradeType === 'equity-intraday') {
        if (!isNaN(cap) && cap > 0) {
          buyingPower = cap * LEVERAGE;
          const maxQtyByLeverage = Math.floor(buyingPower / ep);
          if (qty > maxQtyByLeverage) break;
          capitalUsed = (qty * ep) / LEVERAGE;
        } else {
          capitalUsed = buyValue / LEVERAGE;
        }
      } else {
        capitalUsed = buyValue;
      }
      const totalRiskAmount = (qty * sl) + charges.totalCharges;
      if (totalRiskAmount > risk) break;
      optimalQuantity = qty;
      bestNetRisk = totalRiskAmount;
      bestCharges = charges.totalCharges;
      bestPositionValue = buyValue;
      bestCapitalUsed = capitalUsed;
      bestBuyingPower = buyingPower;
    }
    if (optimalQuantity === 0) {
      optimalQuantity = 1;
      const buyValue = optimalQuantity * ep;
      const sellValue = optimalQuantity * (ep - sl);
      const charges = calculateCharges(buyValue, Math.abs(sellValue), exchange, selectedBroker, positionTradeType);
      bestNetRisk = (optimalQuantity * sl) + charges.totalCharges;
      bestCharges = charges.totalCharges;
      bestPositionValue = buyValue;
      bestCapitalUsed = positionTradeType === 'equity-intraday' ? buyValue / LEVERAGE : buyValue;
      bestBuyingPower = positionTradeType === 'equity-intraday' && !isNaN(cap) && cap > 0 ? cap * LEVERAGE : undefined;
    }
    return {
      quantity: optimalQuantity,
      positionValue: bestPositionValue,
      capitalUsed: bestCapitalUsed,
      buyingPower: bestBuyingPower,
      estimatedCharges: bestCharges,
      actualRiskAmount: bestNetRisk,
      riskBudget: risk
    };
  }, [riskMode, riskAmount, riskPercent, stopLoss, capital, entryPrice, selectedBroker, positionTradeType, LEVERAGE, exchange, isGrowwIntraday]);

  return (
    <Card className="p-6 bg-card shadow-sm mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Position Sizing Calculator</h2>
      </div>
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <Label className="mb-2 block">Broker</Label>
          <ToggleGroup type="single" value={selectedBroker} onValueChange={val => val && setSelectedBroker(val as 'Dhan' | 'Groww')}>
            <ToggleGroupItem value="Dhan">Dhan</ToggleGroupItem>
            <ToggleGroupItem value="Groww">Groww</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div>
          <Label className="mb-2 block">Trade Type</Label>
          <ToggleGroup type="single" value={positionTradeType} onValueChange={val => val && setPositionTradeType(val as 'equity-delivery' | 'equity-intraday')}>
            <ToggleGroupItem value="equity-delivery">Equity Delivery</ToggleGroupItem>
            <ToggleGroupItem value="equity-intraday">Equity Intraday</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div>
          <Label className="mb-2 block">Risk Mode</Label>
          <ToggleGroup type="single" value={riskMode} onValueChange={val => val && onChange('riskMode', val)}>
            <ToggleGroupItem value="amount">Fixed Amount (₹)</ToggleGroupItem>
            <ToggleGroupItem value="percent">% of Capital</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        {riskMode === 'amount' ? (
          <div>
            <Label htmlFor="riskAmount">Risk per Trade (₹)</Label>
            <Input
              id="riskAmount"
              type="text"
              placeholder="Amount you can risk"
              value={riskAmount}
              onChange={e => handleInputChange('riskAmount', e.target.value)}
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
              onChange={e => handleInputChange('riskPercent', e.target.value)}
              className="mt-1"
            />
          </div>
        )}
        <div>
          <Label htmlFor="stopLoss">Stop Loss (points)</Label>
          <Input
            id="stopLoss"
            type="text"
            placeholder="e.g. 8"
            value={stopLoss}
            onChange={e => handleInputChange('stopLoss', e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="capital">Capital (₹) <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Input
            id="capital"
            type="text"
            placeholder="Enter your capital (optional)"
            value={capital}
            onChange={e => handleInputChange('capital', e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="entryPrice">Entry Price (₹) <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Input
            id="entryPrice"
            type="text"
            placeholder="e.g. 200 (optional)"
            value={entryPrice}
            onChange={e => handleInputChange('entryPrice', e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      {isGrowwIntraday && (
        <div className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded">
          <strong>Note:</strong> Equity Intraday calculations are not supported for Groww broker.
        </div>
      )}
      {positionSizingResult && !isGrowwIntraday && (
        <div className="mt-6 p-4 border rounded-md bg-secondary/20">
          <h3 className="font-semibold text-lg mb-2">Results</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Quantity to Trade:</span>
              <span className="font-medium">{positionSizingResult.quantity}</span>
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              ✓ Quantity calculated considering all charges ({selectedBroker} - {positionTradeType.replace('equity-', '').replace('-', ' ')})
            </div>
            <div className="flex justify-between">
              <span>Position Value:</span>
              <span className="font-medium">{formatCurrency(positionSizingResult.positionValue ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Effective Capital Used:</span>
              <span className="font-medium">{formatCurrency(positionSizingResult.capitalUsed ?? 0)}</span>
            </div>
            {positionTradeType === 'equity-intraday' && positionSizingResult.buyingPower !== undefined && (
              <div className="flex justify-between">
                <span>Buying Power (5x):</span>
                <span className="font-medium">{formatCurrency(positionSizingResult.buyingPower ?? 0)}</span>
              </div>
            )}
            <div className="pt-2 mt-2 border-t">
              <div className="text-sm font-medium mb-1">Risk Breakdown</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stop Loss Risk:</span>
                  <span>{formatCurrency((positionSizingResult.actualRiskAmount ?? 0) - (positionSizingResult.estimatedCharges ?? 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Charges:</span>
                  <span>{formatCurrency(positionSizingResult.estimatedCharges ?? 0)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total Risk:</span>
                  <span>{formatCurrency(positionSizingResult.actualRiskAmount ?? 0)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Risk Budget:</span>
                  <span>{formatCurrency(positionSizingResult.riskBudget ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PositionSizingCalculator; 