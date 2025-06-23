import { useState, useCallback, useEffect } from 'react';
import { PositionSizingCalculatorService } from '@/services/calculators/PositionSizingCalculatorService';
import { CalculatorValidation } from '@/utils/validation/calculatorValidation';

export interface PositionSizingState {
  riskMode: 'amount' | 'percent';
  capital: string;
  riskAmount: string;
  riskPercent: string;
  stopLoss: string;
  entryPrice: string;
  tradeType: 'equity-delivery' | 'equity-intraday';
}

export interface PositionSizingResult {
  quantity: number;
  positionValue: number;
  capitalUsed: number;
  buyingPower: number;
  hasCapital: boolean;
  hasEntryPrice: boolean;
  chargesConsidered: boolean;
  estimatedCharges: number;
  actualRiskAmount: number;
  riskBudget: number;
}

export interface PositionSizingCalculatorHook {
  state: PositionSizingState;
  result: PositionSizingResult | null;
  updateField: (field: keyof PositionSizingState, value: string | 'amount' | 'percent' | 'equity-delivery' | 'equity-intraday') => void;
  calculate: () => void;
}

const initialState: PositionSizingState = {
  riskMode: 'amount',
  capital: "",
  riskAmount: "",
  riskPercent: "",
  stopLoss: "",
  entryPrice: "",
  tradeType: 'equity-delivery'
};

export const usePositionSizingCalculator = (broker: 'Dhan' | 'Groww', exchange: string): PositionSizingCalculatorHook => {
  const [state, setState] = useState<PositionSizingState>(initialState);
  const [result, setResult] = useState<PositionSizingResult | null>(null);

  const updateField = useCallback((field: keyof PositionSizingState, value: string | 'amount' | 'percent' | 'equity-delivery' | 'equity-intraday') => {
    setState(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const calculate = useCallback(() => {
    // Check if we have minimum inputs for calculation
    if (!CalculatorValidation.hasMinimumPositionSizingInputs(state)) {
      setResult(null);
      return;
    }

    const capital = parseFloat(state.capital);
    const riskAmount = parseFloat(state.riskAmount);
    const riskPercent = parseFloat(state.riskPercent);
    const stopLoss = parseFloat(state.stopLoss);
    const entryPrice = parseFloat(state.entryPrice);

    const calculationResult = PositionSizingCalculatorService.calculatePositionSize({
      riskMode: state.riskMode,
      capital,
      riskAmount,
      riskPercent,
      stopLoss,
      entryPrice,
      tradeType: state.tradeType,
      broker,
      exchange,
      positionType: 'long' // Default to long, will be overridden by the component's positionType
    });

    setResult(calculationResult);
  }, [state, broker, exchange]);

  // Real-time calculation effect
  useEffect(() => {
    calculate();
  }, [calculate]);

  return {
    state,
    result,
    updateField,
    calculate
  };
};