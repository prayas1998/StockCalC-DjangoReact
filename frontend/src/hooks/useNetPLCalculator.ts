import { useState, useCallback, useEffect } from 'react';
import { Charges } from '@/pages/Tools/ChargesUtils';
import { SharedCalculatorState } from './useSharedCalculatorState';
import { NetPLCalculatorService } from '@/services/calculators/NetPLCalculatorService';
import { CalculatorValidation } from '@/utils/validation/calculatorValidation';

export interface NetPLState {
  buyPrice: string;
  quantity: string;
  sellPrice: string;
}

export interface NetPLResult {
  grossProfit: number;
  netProfit: number;
  profitPercentage: number;
  isProfit: boolean;
  charges: Charges;
  breakevenPrice: number;
}

export interface NetPLCalculatorHook {
  state: NetPLState;
  result: NetPLResult | null;
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
  const [result, setResult] = useState<NetPLResult | null>(null);

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
      setResult(null);
      return;
    }

    const entryPrice = parseFloat(state.buyPrice);
    const quantity = parseInt(state.quantity);
    const exitPrice = state.sellPrice ? parseFloat(state.sellPrice) : undefined;

    if (isNaN(entryPrice) || isNaN(quantity) || entryPrice <= 0 || quantity <= 0) {
      setResult(null);
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

    setResult(calculationResult);
  }, [state, sharedState]);

  // Clear results when broker/trade type changes or when form inputs change
  // This ensures results are cleared when user switches broker but form values are preserved
  useEffect(() => {
    setResult(null);
  }, [state.buyPrice, state.quantity, state.sellPrice, sharedState.selectedBroker, sharedState.selectedTradeType, sharedState.positionType, sharedState.exchange]);

  return {
    state,
    result,
    updateField,
    calculate
  };
};