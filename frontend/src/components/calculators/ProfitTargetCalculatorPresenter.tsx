import React from 'react';
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { CalculatorCard } from '@/components/shared/CalculatorCard';
import { ResultsPanel } from '@/components/shared/ResultsPanel';
import { formatCurrency } from '@/pages/Tools/ChargesUtils';
import { ProfitTargetCalculatorHook } from '@/hooks/useProfitTargetCalculator';
import { SharedCalculatorState } from '@/hooks/useSharedCalculatorState';

interface ProfitTargetCalculatorPresenterProps extends ProfitTargetCalculatorHook {
  sharedState: SharedCalculatorState;
  onPositionTypeChange: (positionType: 'long' | 'short') => void;
  onBrokerChange: (broker: 'Dhan' | 'Groww') => void;
  onTradeTypeChange: (tradeType: 'equity-delivery' | 'equity-intraday') => void;
}

export const ProfitTargetCalculatorPresenter: React.FC<ProfitTargetCalculatorPresenterProps> = ({
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
      title="Profit Target Calculator"
      description="Calculate the required exit price to achieve your target profit percentage after all charges."
      disabled={isDisabled}
    >
      {/* Broker selector moved to shared section in Tools.tsx */}
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <NumericInput
            id="quantity"
            placeholder="Enter quantity"
            value={state.quantity}
            onChange={value => updateField('quantity', value)}
            className="mt-1"
            allowDecimal={false}
            min={1}
          />
        </div>
        <div>
          <Label htmlFor="buyPrice">Entry Price Per Share</Label>
          <NumericInput
            id="buyPrice"
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
          <Label htmlFor="profitPercentage">Target Profit Percentage</Label>
          <NumericInput
            id="profitPercentage"
            placeholder="Enter percentage (e.g. 5 for 5%)"
            value={state.profitPercentage}
            onChange={value => updateField('profitPercentage', value)}
            className="mt-1"
            allowDecimal={true}
            min={0}
            maxDecimalPlaces={2}
          />
        </div>
      </div>
      
      {result && (
        <ResultsPanel
          title="Results"
          results={[
            {
              label: "Required Exit Price",
              value: formatCurrency(result.sellingPrice),
              className: "text-primary font-semibold"
            },
            {
              label: "Gross Profit",
              value: formatCurrency(result.grossProfit)
            },
            {
              label: "Total Charges",
              value: formatCurrency(result.charges.totalCharges)
            },
            {
              label: "Net Profit",
              value: formatCurrency(result.netProfit),
              className: "font-semibold",
              style: { color: result.netProfit > 0 ? '#16a34a' : '#dc2626' }
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