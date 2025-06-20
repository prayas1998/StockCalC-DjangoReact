import React, { useMemo, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, AlertTriangle, CheckCircle } from "lucide-react";
import { CalculatorCard } from '@/components/shared/CalculatorCard';
import { BrokerTradeTypeSelector } from '@/components/shared/BrokerTradeTypeSelector';
import { formatCurrency } from '@/pages/Tools/ChargesUtils';
import { PositionSizingCalculatorHook } from '@/hooks/usePositionSizingCalculator';

interface PositionSizingCalculatorPresenterProps extends PositionSizingCalculatorHook {
  selectedBroker: 'Dhan' | 'Groww';
  selectedTradeType: 'equity-delivery' | 'equity-intraday';
  LEVERAGE: number;
  onBrokerChange: (broker: 'Dhan' | 'Groww') => void;
  onTradeTypeChange: (tradeType: 'equity-delivery' | 'equity-intraday') => void;
}

export const PositionSizingCalculatorPresenter: React.FC<PositionSizingCalculatorPresenterProps> = ({
  state,
  result,
  updateField,
  calculate,
  selectedBroker,
  selectedTradeType,
  LEVERAGE,
  onBrokerChange,
  onTradeTypeChange
}) => {
  // Calculate result using the hook's calculate function
  useEffect(() => {
    calculate();
  }, [state, selectedBroker, selectedTradeType, calculate]);

  // Update the internal trade type when external settings change
  useEffect(() => {
    updateField('tradeType', selectedTradeType);
  }, [selectedTradeType, updateField]);

  const positionSizingResult = useMemo(() => {
    if (!result) return null;
    return result;
  }, [result]);

  return (
    <CalculatorCard
      title="Position Sizing Calculator"
      description="Calculate optimal position size based on your risk tolerance and stop loss."
    >
      <BrokerTradeTypeSelector
        selectedBroker={selectedBroker}
        selectedTradeType={selectedTradeType}
        onBrokerChange={onBrokerChange}
        onTradeTypeChange={onTradeTypeChange}
        showRiskMode={true}
        riskMode={state.riskMode}
        onRiskModeChange={(val) => updateField('riskMode', val)}
        compact={true}
      />

      <div className="space-y-4">

        {state.riskMode === 'percent' && (
          <div>
            <Label htmlFor="capital">Total Capital</Label>
            <NumericInput
              id="capital"
              placeholder="Enter total capital"
              value={state.capital}
              onChange={value => updateField('capital', value)}
              className="mt-1"
              allowDecimal={true}
              min={1}
              maxDecimalPlaces={2}
            />
          </div>
        )}

        <div>
          <Label htmlFor={state.riskMode === 'amount' ? 'riskAmount' : 'riskPercent'}>
            {state.riskMode === 'amount' ? 'Risk Amount' : 'Risk Percentage'}
          </Label>
          <NumericInput
            id={state.riskMode === 'amount' ? 'riskAmount' : 'riskPercent'}
            placeholder={state.riskMode === 'amount' ? 'Enter risk amount' : 'Enter risk percentage'}
            value={state.riskMode === 'amount' ? state.riskAmount : state.riskPercent}
            onChange={value => updateField(state.riskMode === 'amount' ? 'riskAmount' : 'riskPercent', value)}
            className="mt-1"
            allowDecimal={true}
            min={0.01}
            maxDecimalPlaces={state.riskMode === 'amount' ? 2 : 2}
            max={state.riskMode === 'percent' ? 100 : undefined}
          />
        </div>

        <div>
          <Label htmlFor="entryPrice">Entry Price</Label>
          <NumericInput
            id="entryPrice"
            placeholder="Enter entry price"
            value={state.entryPrice}
            onChange={value => updateField('entryPrice', value)}
            className="mt-1"
            allowDecimal={true}
            min={0.01}
            maxDecimalPlaces={2}
          />
        </div>

        <div>
          <Label htmlFor="stopLoss">Stop Loss (per share)</Label>
          <NumericInput
            id="stopLoss"
            placeholder="Enter stop loss amount"
            value={state.stopLoss}
            onChange={value => updateField('stopLoss', value)}
            className="mt-1"
            allowDecimal={true}
            min={0.01}
            maxDecimalPlaces={2}
          />
        </div>

      </div>

      {positionSizingResult && (
        <div className="mt-6 p-4 border rounded-md bg-secondary/20">
          <h3 className="font-semibold text-lg mb-2">Position Size Results</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Optimal Quantity:</span>
              <span className="font-medium">{positionSizingResult.quantity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Position Value:</span>
              <span className="font-medium">{formatCurrency(positionSizingResult.positionValue)}</span>
            </div>
            <div className="flex justify-between">
              <span>Capital Used:</span>
              <span className="font-medium">{formatCurrency(positionSizingResult.capitalUsed)}</span>
            </div>
            {positionSizingResult.hasCapital && (
              <div className="flex justify-between">
                <span>Buying Power:</span>
                <span className="font-medium">{formatCurrency(positionSizingResult.buyingPower)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Risk Budget:</span>
              <span className="font-medium">{formatCurrency(positionSizingResult.riskBudget)}</span>
            </div>
            <div className="flex justify-between">
              <span>Actual Risk (with charges):</span>
              <span className="font-medium">{formatCurrency(positionSizingResult.actualRiskAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Charges:</span>
              <span className="font-medium">{formatCurrency(positionSizingResult.estimatedCharges)}</span>
            </div>
            
            {state.tradeType === 'equity-intraday' && (
              <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                <CheckCircle className="h-4 w-4" />
                <span>Leverage: {LEVERAGE}x applied for intraday</span>
              </div>
            )}
            
            {positionSizingResult.chargesConsidered && (
              <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Trading charges included in calculations</span>
              </div>
            )}
          </div>
        </div>
      )}
    </CalculatorCard>
  );
};