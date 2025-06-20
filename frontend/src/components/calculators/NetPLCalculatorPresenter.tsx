import React from 'react';
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { CalculatorCard } from '@/components/shared/CalculatorCard';
import { ResultsPanel } from '@/components/shared/ResultsPanel';
import { formatCurrency } from '@/pages/Tools/ChargesUtils';
import { NetPLCalculatorHook } from '@/hooks/useNetPLCalculator';
import { SharedCalculatorState } from '@/hooks/useSharedCalculatorState';

interface NetPLCalculatorPresenterProps extends NetPLCalculatorHook {
  sharedState: SharedCalculatorState;
  onPositionTypeChange: (positionType: 'long' | 'short') => void;
  onBrokerChange: (broker: 'Dhan' | 'Groww') => void;
  onTradeTypeChange: (tradeType: 'equity-delivery' | 'equity-intraday') => void;
}

export const NetPLCalculatorPresenter: React.FC<NetPLCalculatorPresenterProps> = ({
  state,
  result,
  updateField,
  sharedState,
  onPositionTypeChange,
  onBrokerChange,
  onTradeTypeChange
}) => {
  const isDisabled = sharedState.selectedTradeType === 'equity-intraday' && sharedState.selectedBroker === 'Groww';

  return (
    <CalculatorCard
      title="Net P&L Calculator"
      description="Calculate your net profit or loss after all charges based on your entry and exit prices."
      disabled={isDisabled}
    >
      {/* Broker selector moved to shared section in Tools.tsx */}
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="profitQuantity">Quantity</Label>
          <NumericInput
            id="profitQuantity"
            placeholder="Enter quantity"
            value={state.quantity}
            onChange={value => updateField('quantity', value)}
            className="mt-1"
            allowDecimal={false}
            min={1}
          />
        </div>
        <div>
          <Label htmlFor="profitBuyPrice">Entry Price Per Share</Label>
          <NumericInput
            id="profitBuyPrice"
            placeholder="Enter entry price"
            value={state.buyPrice}
            onChange={value => updateField('buyPrice', value)}
            className="mt-1"
            allowDecimal={true}
            min={0.01}
            maxDecimalPlaces={2}
          />
        </div>
        <div>
          <Label htmlFor="sellPrice">Exit Price Per Share</Label>
          <NumericInput
            id="sellPrice"
            placeholder="Enter exit price"
            value={state.sellPrice}
            onChange={value => updateField('sellPrice', value)}
            className="mt-1"
            allowDecimal={true}
            min={0.01}
            maxDecimalPlaces={2}
          />
        </div>
      </div>
      
      {result && (
        <ResultsPanel
          title="Results"
          results={[
            {
              label: result.isProfit ? "Gross Profit" : "Gross Loss",
              value: formatCurrency(Math.abs(result.grossProfit))
            },
            {
              label: "Total Charges",
              value: formatCurrency(result.charges.totalCharges)
            },
            {
              label: result.isProfit ? "Net Profit" : "Net Loss",
              value: `${formatCurrency(Math.abs(result.netProfit))} (${result.profitPercentage.toFixed(2)}%)`,
              className: result.isProfit ? "text-primary" : "text-destructive",
              style: { color: result.isProfit ? '#16a34a' : '#dc2626' }
            }
          ]}
          charges={result.charges}
          exchange={sharedState.exchange}
          breakevenPrice={result.breakevenPrice}
        />
      )}
    </CalculatorCard>
  );
};