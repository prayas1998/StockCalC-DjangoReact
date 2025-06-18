import { useState } from 'react';

export interface SharedCalculatorState {
  selectedBroker: 'Dhan' | 'Groww';
  selectedTradeType: 'equity-delivery' | 'equity-intraday';
  positionType: 'long' | 'short';
  exchange: string;
}

export interface SharedCalculatorActions {
  setSelectedBroker: (broker: 'Dhan' | 'Groww') => void;
  setSelectedTradeType: (tradeType: 'equity-delivery' | 'equity-intraday') => void;
  setPositionType: (positionType: 'long' | 'short') => void;
}

export const useSharedCalculatorState = () => {
  const [selectedBroker, setSelectedBroker] = useState<'Dhan' | 'Groww'>('Dhan');
  const [selectedTradeType, setSelectedTradeType] = useState<'equity-delivery' | 'equity-intraday'>('equity-delivery');
  const [positionType, setPositionType] = useState<'long' | 'short'>('long');
  const exchange = "NSE"; // Fixed to NSE as in original

  const state: SharedCalculatorState = {
    selectedBroker,
    selectedTradeType,
    positionType,
    exchange
  };

  const actions: SharedCalculatorActions = {
    setSelectedBroker,
    setSelectedTradeType,
    setPositionType
  };

  return {
    ...state,
    ...actions
  };
};