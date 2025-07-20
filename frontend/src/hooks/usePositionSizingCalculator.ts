import { useState, useCallback } from 'react';
import { PositionSizingCalculatorService, CalculationError, TargetPriceAnalysis } from '@/services/calculators/PositionSizingCalculatorService';
import { CalculatorValidation } from '@/utils/validation/calculatorValidation';

export interface PositionSizingState {
  riskMode: 'amount' | 'percent';
  capital: string;
  riskAmount: string;
  riskPercent: string;
  stopLoss: string; // Now represents stop loss price instead of points
  entryPrice: string;
  tradeType: 'equity-delivery' | 'equity-intraday';
}

export interface PositionSizingResult {
  quantity: number;
  positionValue: number;
  entryCharges: number;
  totalInvestedAmount: number;
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
  error: CalculationError | null;
  targetAnalysis: TargetPriceAnalysis | null;
  updateField: (field: keyof PositionSizingState, value: string | 'amount' | 'percent' | 'equity-delivery' | 'equity-intraday') => void;
  calculate: (positionType?: 'long' | 'short') => void;
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
  const [error, setError] = useState<CalculationError | null>(null);
  const [targetAnalysis, setTargetAnalysis] = useState<TargetPriceAnalysis | null>(null);

  const updateField = useCallback((field: keyof PositionSizingState, value: string | 'amount' | 'percent' | 'equity-delivery' | 'equity-intraday') => {
    setState(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const calculate = useCallback((positionType: 'long' | 'short' = 'long') => {
    // Use functional state update to ensure we get the latest state
    setState(currentState => {
      // Clear previous errors
      setError(null);
      
      // Check if we have minimum inputs for calculation
      if (!CalculatorValidation.hasMinimumPositionSizingInputs(currentState)) {
        setResult(null);
        return currentState; // Return current state unchanged
      }

      const capital = parseFloat(currentState.capital);
      const riskAmount = parseFloat(currentState.riskAmount);
      const riskPercent = parseFloat(currentState.riskPercent);
      const stopLoss = parseFloat(currentState.stopLoss);
      const entryPrice = parseFloat(currentState.entryPrice);

      const calculationResult = PositionSizingCalculatorService.calculatePositionSize({
        riskMode: currentState.riskMode,
        capital,
        riskAmount,
        riskPercent,
        stopLoss,
        entryPrice,
        tradeType: currentState.tradeType,
        broker,
        exchange,
        positionType
      });

      // Check if result is an error
      if ('type' in calculationResult) {
        setError(calculationResult);
        setResult(calculationResult.result);
        setTargetAnalysis(null);
      } else {
        setResult(calculationResult);
        setError(null);
        
        // Calculate target prices if we have a valid result
        if (calculationResult.quantity > 0 && !isNaN(entryPrice)) {
          const targetPrices = PositionSizingCalculatorService.calculateTargetPrices(
            calculationResult.quantity,
            entryPrice,
            calculationResult.actualRiskAmount,
            broker,
            exchange,
            currentState.tradeType,
            positionType
          );
          setTargetAnalysis(targetPrices);
        } else {
          setTargetAnalysis(null);
        }
      }
      
      return currentState; // Return current state unchanged
    });
  }, [broker, exchange]);

  // Note: Real-time calculation is handled by the presenter component
  // to ensure position type is passed correctly

  return {
    state,
    result,
    error,
    targetAnalysis,
    updateField,
    calculate
  };
};