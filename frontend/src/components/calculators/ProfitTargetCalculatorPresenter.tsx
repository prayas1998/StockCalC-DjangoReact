import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <Input
            id="quantity"
            type="text"
            placeholder="Enter quantity"
            value={state.quantity}
            onChange={e => updateField('quantity', e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="buyPrice">Entry Price Per Share</Label>
          <Input
            id="buyPrice"
            type="text"
            placeholder="Enter entry price"
            value={state.buyPrice}
            onChange={e => updateField('buyPrice', e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="profitPercentage">Target Profit Percentage</Label>
          <Input
            id="profitPercentage"
            type="text"
            placeholder="Enter percentage (e.g. 5 for 5%)"
            value={state.profitPercentage}
            onChange={e => updateField('profitPercentage', e.target.value)}
            className="mt-1"
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