import React from 'react';
import { SharedCalculatorState } from '@/hooks/useSharedCalculatorState';
import { useProfitTargetCalculator } from '@/hooks/useProfitTargetCalculator';
import { ProfitTargetCalculatorPresenter } from './ProfitTargetCalculatorPresenter';

interface ProfitTargetCalculatorContainerProps {
  sharedState: SharedCalculatorState;
  onPositionTypeChange: (positionType: 'long' | 'short') => void;
  onBrokerChange: (broker: 'Dhan' | 'Groww') => void;
  onTradeTypeChange: (tradeType: 'equity-delivery' | 'equity-intraday') => void;
}

export const ProfitTargetCalculatorContainer: React.FC<ProfitTargetCalculatorContainerProps> = ({
  sharedState,
  onPositionTypeChange,
  onBrokerChange,
  onTradeTypeChange
}) => {
  const calculator = useProfitTargetCalculator(sharedState);

  return (
    <ProfitTargetCalculatorPresenter
      {...calculator}
      sharedState={sharedState}
      onPositionTypeChange={onPositionTypeChange}
      onBrokerChange={onBrokerChange}
      onTradeTypeChange={onTradeTypeChange}
    />
  );
};