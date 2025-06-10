import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calculator, AlertTriangle, CheckCircle } from "lucide-react";
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

interface PositionSizingResult {
  quantity: number;
  positionValue: number;
  capitalUsed: number;
  buyingPower?: number;
  estimatedCharges: number;
  actualRiskAmount: number;
  riskBudget: number;
  stopLossRisk: number;
  breakevenPrice: number;
  riskUtilization: number; // % of risk budget used
  canAfford: boolean;
  leverageUsed?: number;
  warnings: string[];
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
  const [selectedBroker, setSelectedBroker] = React.useState<'Dhan' | 'Groww'>('Dhan');
  const [positionTradeType, setPositionTradeType] = React.useState<'equity-delivery' | 'equity-intraday'>('equity-delivery');

  const handleInputChange = (field: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onChange(field, value);
    }
  };

  const getRiskValue = (): number => {
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

  // Enhanced position sizing calculation with binary search and precise risk management
  const positionSizingResult: PositionSizingResult | null = useMemo(() => {
    if (isGrowwIntraday) return null;
    
    const risk = getRiskValue();
    const sl = parseFloat(stopLoss);
    const cap = parseFloat(capital);
    const ep = parseFloat(entryPrice);
    
    // Validation
    if (isNaN(risk) || risk <= 0 || isNaN(sl) || sl <= 0 || isNaN(ep) || ep <= 0) {
      return null;
    }

    const warnings: string[] = [];
    const isIntraday = positionTradeType === 'equity-intraday';
    
    // Calculate effective capital requirement per share
    const effectiveCapitalPerShare = isIntraday ? ep / LEVERAGE : ep;
    
    // Check if user has enough capital for even 1 share
    if (!isNaN(cap) && cap > 0 && effectiveCapitalPerShare > cap) {
      warnings.push(`Insufficient capital: Need ${formatCurrency(effectiveCapitalPerShare)} for 1 share, but only have ${formatCurrency(cap)}`);
    }

    // Binary search for optimal quantity
    let optimalQuantity = 0;
    let low = 0;
    let high = Math.min(
      Math.floor(risk / sl), // Max based on simple stop loss
      isIntraday && !isNaN(cap) && cap > 0 ? Math.floor((cap * LEVERAGE) / ep) : 1000000 // Max based on buying power
    );
    
    // Ensure we have a reasonable upper bound
    if (high <= 0) {
      // Even 1 share might be too risky, but let's check
      high = 1;
    }

    let bestResult: any = null;
    const MAX_ITERATIONS = 50;
    let iterations = 0;

    while (low <= high && iterations < MAX_ITERATIONS) {
      const mid = Math.floor((low + high) / 2);
      if (mid === 0) break;
      
      const buyValue = mid * ep;
      const sellValue = mid * (ep - sl); // Stop loss scenario
      
      // Calculate charges for this position size
      const charges = calculateCharges(buyValue, Math.abs(sellValue), exchange, selectedBroker, positionTradeType);
      
      const stopLossRisk = mid * sl;
      const totalRisk = stopLossRisk + charges.totalCharges;
      
      // Check if this quantity fits within risk budget
      if (totalRisk <= risk) {
        // This quantity is acceptable, try for more
        optimalQuantity = mid;
        bestResult = {
          quantity: mid,
          buyValue,
          charges,
          stopLossRisk,
          totalRisk
        };
        low = mid + 1;
      } else {
        // This quantity is too risky, try less
        high = mid - 1;
      }
      iterations++;
    }

    // If no quantity found through binary search, check if even 1 share fits
    if (optimalQuantity === 0) {
      const buyValue = 1 * ep;
      const sellValue = 1 * (ep - sl);
      const charges = calculateCharges(buyValue, Math.abs(sellValue), exchange, selectedBroker, positionTradeType);
      const stopLossRisk = 1 * sl;
      const totalRisk = stopLossRisk + charges.totalCharges;
      
      if (totalRisk <= risk) {
        optimalQuantity = 1;
        bestResult = {
          quantity: 1,
          buyValue,
          charges,
          stopLossRisk,
          totalRisk
        };
      } else {
        // Even 1 share exceeds risk budget
        warnings.push(`Risk budget too low: Even 1 share requires ${formatCurrency(totalRisk)} risk, but budget is ${formatCurrency(risk)}`);
        
        // Still show the calculation for 1 share for reference
        bestResult = {
          quantity: 1,
          buyValue,
          charges,
          stopLossRisk,
          totalRisk
        };
      }
    }

    if (!bestResult) return null;

    // Calculate final metrics
    const positionValue = bestResult.buyValue;
    let capitalUsed: number;
    let buyingPower: number | undefined;
    let leverageUsed: number | undefined;

    if (isIntraday) {
      capitalUsed = positionValue / LEVERAGE;
      leverageUsed = LEVERAGE;
      if (!isNaN(cap) && cap > 0) {
        buyingPower = cap * LEVERAGE;
        if (positionValue > buyingPower) {
          warnings.push(`Position value ${formatCurrency(positionValue)} exceeds buying power ${formatCurrency(buyingPower)}`);
        }
      }
    } else {
      capitalUsed = positionValue;
      if (!isNaN(cap) && cap > 0 && capitalUsed > cap) {
        warnings.push(`Required capital ${formatCurrency(capitalUsed)} exceeds available capital ${formatCurrency(cap)}`);
      }
    }

    // Calculate breakeven price (entry price + charges per share)
    const breakevenPrice = ep + (bestResult.charges.totalCharges / optimalQuantity);
    
    // Risk utilization percentage
    const riskUtilization = (bestResult.totalRisk / risk) * 100;
    
    // Check if position is affordable
    const canAfford = bestResult.totalRisk <= risk && 
      (isNaN(cap) || cap <= 0 || capitalUsed <= cap);

    // Add performance warnings
    if (riskUtilization < 80) {
      warnings.push(`Low risk utilization: Only using ${riskUtilization.toFixed(1)}% of risk budget`);
    }
    
    if (bestResult.charges.totalCharges / bestResult.totalRisk > 0.1) {
      warnings.push(`High charge ratio: Charges are ${((bestResult.charges.totalCharges / bestResult.totalRisk) * 100).toFixed(1)}% of total risk`);
    }

    return {
      quantity: optimalQuantity,
      positionValue,
      capitalUsed,
      buyingPower,
      estimatedCharges: bestResult.charges.totalCharges,
      actualRiskAmount: bestResult.totalRisk,
      riskBudget: risk,
      stopLossRisk: bestResult.stopLossRisk,
      breakevenPrice,
      riskUtilization,
      canAfford,
      leverageUsed,
      warnings
    };
  }, [riskMode, riskAmount, riskPercent, stopLoss, capital, entryPrice, selectedBroker, positionTradeType, LEVERAGE, isGrowwIntraday]);

  return (
    <Card className="p-6 bg-card shadow-sm mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Position Sizing Calculator</h2>
      </div>
      
      {/* Controls */}
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

      {/* Input Fields */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {riskMode === 'amount' ? (
          <div>
            <Label htmlFor="riskAmount">Risk per Trade (₹) *</Label>
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
            <Label htmlFor="riskPercent">Risk per Trade (%) *</Label>
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
          <Label htmlFor="stopLoss">Stop Loss (₹ per share) *</Label>
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
          <Label htmlFor="entryPrice">Entry Price (₹) *</Label>
          <Input
            id="entryPrice"
            type="text"
            placeholder="e.g. 200"
            value={entryPrice}
            onChange={e => handleInputChange('entryPrice', e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="capital">Total Capital (₹)</Label>
          <Input
            id="capital"
            type="text"
            placeholder="Your total capital"
            value={capital}
            onChange={e => handleInputChange('capital', e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Groww Intraday Warning */}
      {isGrowwIntraday && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <strong>Not Supported:</strong> Equity Intraday calculations are not available for Groww broker.
          </div>
        </div>
      )}

      {/* Results */}
      {positionSizingResult && !isGrowwIntraday && (
        <div className="mt-6">
          <div className={`p-4 border rounded-lg ${positionSizingResult.canAfford ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-3">
              {positionSizingResult.canAfford ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <h3 className="font-semibold text-lg">
                {positionSizingResult.canAfford ? 'Position Sizing Results' : 'Position Not Affordable'}
              </h3>
            </div>
            
            {/* Main Results */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Quantity to Trade:</span>
                  <span className="text-xl font-bold text-primary">{positionSizingResult.quantity.toLocaleString()} shares</span>
                </div>
                <div className="flex justify-between">
                  <span>Position Value:</span>
                  <span className="font-medium">{formatCurrency(positionSizingResult.positionValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Capital Required:</span>
                  <span className="font-medium">{formatCurrency(positionSizingResult.capitalUsed)}</span>
                </div>
                {positionSizingResult.leverageUsed && (
                  <div className="flex justify-between">
                    <span>Leverage Used:</span>
                    <span className="font-medium">{positionSizingResult.leverageUsed}x</span>
                  </div>
                )}
                {positionSizingResult.buyingPower && (
                  <div className="flex justify-between">
                    <span>Available Buying Power:</span>
                    <span className="font-medium">{formatCurrency(positionSizingResult.buyingPower)}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Breakeven Price:</span>
                  <span className="font-medium">₹{positionSizingResult.breakevenPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Risk Utilization:</span>
                  <span className="font-medium">{positionSizingResult.riskUtilization.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${positionSizingResult.riskUtilization > 90 ? 'bg-red-500' : positionSizingResult.riskUtilization > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(positionSizingResult.riskUtilization, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Risk Breakdown */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2">Risk Breakdown</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stop Loss Risk:</span>
                    <span>{formatCurrency(positionSizingResult.stopLossRisk)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trading Charges:</span>
                    <span>{formatCurrency(positionSizingResult.estimatedCharges)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Total Risk:</span>
                    <span className={positionSizingResult.canAfford ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(positionSizingResult.actualRiskAmount)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Risk Budget:</span>
                    <span>{formatCurrency(positionSizingResult.riskBudget)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Remaining Risk:</span>
                    <span>{formatCurrency(Math.max(0, positionSizingResult.riskBudget - positionSizingResult.actualRiskAmount))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {positionSizingResult.warnings.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-sm mb-2 text-amber-700">Warnings & Notes</h4>
                <ul className="text-sm space-y-1">
                  {positionSizingResult.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2 text-amber-700">
                      <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Calculation Method Note */}
            {/* <div className="border-t pt-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>Calculated using {selectedBroker} {positionTradeType.replace('equity-', '').replace('-', ' ')} charges with binary search optimization</span>
              </div>
            </div> */}
          </div>
        </div>
      )}
    </Card>
  );
};

export default PositionSizingCalculator;