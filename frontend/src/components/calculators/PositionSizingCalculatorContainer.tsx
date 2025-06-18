import React from 'react';
import { usePositionSizingCalculator } from '@/hooks/usePositionSizingCalculator';
import { PositionSizingCalculatorPresenter } from './PositionSizingCalculatorPresenter';

interface PositionSizingCalculatorContainerProps {
  selectedBroker: 'Dhan' | 'Groww';
  selectedTradeType: 'equity-delivery' | 'equity-intraday';
  exchange: string;
  LEVERAGE: number;
  onBrokerChange: (broker: 'Dhan' | 'Groww') => void;
  onTradeTypeChange: (tradeType: 'equity-delivery' | 'equity-intraday') => void;
}

export const PositionSizingCalculatorContainer: React.FC<PositionSizingCalculatorContainerProps> = ({
  selectedBroker,
  selectedTradeType,
  exchange,
  LEVERAGE,
  onBrokerChange,
  onTradeTypeChange
}) => {
  const calculator = usePositionSizingCalculator(selectedBroker, exchange);

  return (
    <PositionSizingCalculatorPresenter
      {...calculator}
      selectedBroker={selectedBroker}
      selectedTradeType={selectedTradeType}
      LEVERAGE={LEVERAGE}
      onBrokerChange={onBrokerChange}
      onTradeTypeChange={onTradeTypeChange}
    />
  );
};