import React, { useState } from 'react';
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
  const [positionType, setPositionType] = useState<'long' | 'short'>('long');

  return (
    <PositionSizingCalculatorPresenter
      state={calculator.state}
      result={calculator.result}
      error={calculator.error}
      targetAnalysis={calculator.targetAnalysis}
      updateField={calculator.updateField}
      calculate={calculator.calculate}
      selectedBroker={selectedBroker}
      selectedTradeType={selectedTradeType}
      positionType={positionType}
      LEVERAGE={LEVERAGE}
      onBrokerChange={onBrokerChange}
      onTradeTypeChange={onTradeTypeChange}
      onPositionTypeChange={setPositionType}
    />
  );
};