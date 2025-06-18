import React from 'react';
import { SharedCalculatorState } from '@/hooks/useSharedCalculatorState';
import { useNetPLCalculator } from '@/hooks/useNetPLCalculator';
import { NetPLCalculatorPresenter } from './NetPLCalculatorPresenter';

interface NetPLCalculatorContainerProps {
  sharedState: SharedCalculatorState;
  onPositionTypeChange: (positionType: 'long' | 'short') => void;
  onBrokerChange: (broker: 'Dhan' | 'Groww') => void;
  onTradeTypeChange: (tradeType: 'equity-delivery' | 'equity-intraday') => void;
}

export const NetPLCalculatorContainer: React.FC<NetPLCalculatorContainerProps> = ({
  sharedState,
  onPositionTypeChange,
  onBrokerChange,
  onTradeTypeChange
}) => {
  const calculator = useNetPLCalculator(sharedState);

  return (
    <NetPLCalculatorPresenter
      {...calculator}
      sharedState={sharedState}
      onPositionTypeChange={onPositionTypeChange}
      onBrokerChange={onBrokerChange}
      onTradeTypeChange={onTradeTypeChange}
    />
  );
};