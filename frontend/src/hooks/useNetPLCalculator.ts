import { useState, useCallback, useEffect } from 'react';
import { SharedCalculatorState } from './useSharedCalculatorState';
import { NetPLCalculatorService, type NetPLCalculation } from '@/services/calculators/NetPLCalculatorService';
import { CalculatorValidation } from '@/utils/validation/calculatorValidation';

export interface NetPLState {
  buyPrice: string;
  quantity: string;
  sellPrice: string;
}

interface NetPLSnapshot {
  state: NetPLState;
  settings: SharedCalculatorState;
  result: NetPLCalculation;
}

export interface NetPLCalculatorHook {
  state: NetPLState;
  result: NetPLCalculation | null;
  updateField: (field: keyof NetPLState, value: string) => void;
  calculate: () => void;
}

const initialState: NetPLState = {
  buyPrice: "",
  quantity: "",
  sellPrice: ""
};

export const useNetPLCalculator = (sharedState: SharedCalculatorState): NetPLCalculatorHook => {
  const [state, setState] = useState<NetPLState>(initialState);
  const [snapshot, setSnapshot] = useState<NetPLSnapshot | null>(null);

  const updateField = useCallback((field: keyof NetPLState, value: string) => {
    setState(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const calculate = useCallback(() => {
    // Check if we have minimum inputs for calculation
    if (!CalculatorValidation.hasMinimumInputs({
      quantity: state.quantity,
      entryPrice: state.buyPrice
    })) {
      setSnapshot(null);
      return;
    }

    const entryPrice = parseFloat(state.buyPrice);
    const quantity = Number(state.quantity);
    const exitPrice = state.sellPrice.trim() === "" ? undefined : Number(state.sellPrice);

    if (!Number.isFinite(entryPrice) || !Number.isSafeInteger(quantity) || entryPrice <= 0 || quantity <= 0) {
      setSnapshot(null);
      return;
    }

    const calculationResult = NetPLCalculatorService.calculateNetPL({
      entryPrice,
      quantity,
      exitPrice,
      exchange: sharedState.exchange,
      broker: sharedState.selectedBroker,
      tradeType: sharedState.selectedTradeType,
      positionType: sharedState.positionType
    });

    setSnapshot(calculationResult ? { state, settings: sharedState, result: calculationResult } : null);
  }, [state, sharedState]);

  const result = snapshot?.state === state &&
    snapshot.settings.selectedBroker === sharedState.selectedBroker &&
    snapshot.settings.selectedTradeType === sharedState.selectedTradeType &&
    snapshot.settings.positionType === sharedState.positionType &&
    snapshot.settings.exchange === sharedState.exchange
    ? snapshot.result
    : null;

  // Hide a stale result during render and then discard it so switching back does not restore it.
  useEffect(() => {
    if (snapshot && !result) setSnapshot(null);
  }, [snapshot, result]);

  return {
    state,
    result,
    updateField,
    calculate
  };
};