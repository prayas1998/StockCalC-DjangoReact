import { useState, useCallback, useEffect } from 'react';
import { Charges } from '@/pages/Tools/ChargesUtils';
import { SharedCalculatorState } from './useSharedCalculatorState';
import { ProfitTargetCalculatorService } from '@/services/calculators/ProfitTargetCalculatorService';
import { CalculatorValidation } from '@/utils/validation/calculatorValidation';

export interface ProfitTargetState {
  buyPrice: string;
  quantity: string;
  profitPercentage: string;
}

export interface ProfitTargetResult {
  sellingPrice: number;
  grossProfit: number;
  netProfit: number;
  charges: Charges;
  breakevenPrice: number;
}

export interface ProfitTargetCalculatorHook {
  state: ProfitTargetState;
  result: ProfitTargetResult | null;
  updateField: (field: keyof ProfitTargetState, value: string) => void;
  calculate: () => void;
}

const initialState: ProfitTargetState = {
  buyPrice: "",
  quantity: "",
  profitPercentage: ""
};

export const useProfitTargetCalculator = (sharedState: SharedCalculatorState): ProfitTargetCalculatorHook => {
  const [state, setState] = useState<ProfitTargetState>(initialState);
  const [result, setResult] = useState<ProfitTargetResult | null>(null);

  const updateField = useCallback((field: keyof ProfitTargetState, value: string) => {
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
    const profitPercentage = state.profitPercentage ? parseFloat(state.profitPercentage) : undefined;

    if (isNaN(entryPrice) || isNaN(quantity) || entryPrice <= 0 || quantity <= 0) {
      setResult(null);
      return;
    }

    const calculationResult = ProfitTargetCalculatorService.calculateTargetPrice({
      entryPrice,
      quantity,
      profitPercentage,
      exchange: sharedState.exchange,
      broker: sharedState.selectedBroker,
      tradeType: sharedState.selectedTradeType,
      positionType: sharedState.positionType
    });

    setResult(calculationResult);
  }, [state, sharedState]);

  // Manual calculation - removed real-time effect
  // Clear results when inputs change
  useEffect(() => {
    setResult(null);
  }, [state.buyPrice, state.quantity, state.profitPercentage, sharedState.selectedBroker, sharedState.selectedTradeType, sharedState.positionType, sharedState.exchange]);

  return {
    state,
    result,
    updateField,
    calculate
  };
};