import { calculatePositionCharges } from '@/pages/Tools/ChargesUtils';
import { calculateBreakevenPrice } from '@/pages/Tools/BreakEven';

export interface PositionSizingParams {
  riskMode: 'amount' | 'percent';
  capital: number;
  riskAmount: number;
  riskPercent: number;
  stopLoss: number; // Now represents stop loss price instead of points
  entryPrice: number;
  tradeType: 'equity-delivery' | 'equity-intraday';
  broker: 'Dhan' | 'Groww';
  exchange: string;
  positionType?: 'long' | 'short';
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

export interface TargetPriceAnalysis {
  actualRisk: number;
  targetPrices: {
    ratio1to1: number;
    ratio1to2: number;
    ratio1to3: number;
  };
}

export interface CalculationError {
  type: 'INVALID_INPUTS' | 'INSUFFICIENT_RISK' | 'UNREALISTIC_RISK' | 'CALCULATION_IMPOSSIBLE';
  message: string;
  suggestions?: string[];
  minimumRequirements?: {
    capital?: number;
    risk?: number;
    stopLossPrice?: { min: number; max: number };
  };
  result: PositionSizingResult;
}

export class PositionSizingCalculatorService {
  private static readonly LEVERAGE = 5;

  /**
   * Calculate optimal position size based on risk parameters
   * Ensures that actual risk never exceeds the user's risk budget
   */
  static calculatePositionSize(params: PositionSizingParams): PositionSizingResult | CalculationError {
    const { riskMode, capital, riskAmount, riskPercent, stopLoss: stopLossPrice, entryPrice, tradeType, broker, exchange } = params;
    const positionType = tradeType === 'equity-intraday' ? params.positionType ?? 'long' : 'long';

    // Basic validation
    if (!Number.isFinite(stopLossPrice) || !Number.isFinite(entryPrice) || stopLossPrice <= 0 || entryPrice <= 0) {
      return {
        type: 'INVALID_INPUTS',
        message: 'Entry price and stop loss price must be positive numbers',
        result: this.createEmptyResult()
      };
    }
    
    // Position-type specific validation for stop loss price
    if (positionType === 'long' && stopLossPrice >= entryPrice) {
      return {
        type: 'INVALID_INPUTS',
        message: `Stop loss price (${stopLossPrice}) must be lower than entry price (${entryPrice}) for long positions`,
        suggestions: [`Maximum allowed stop loss price: ${(entryPrice - 0.01).toFixed(2)}`],
        result: this.createEmptyResult()
      };
    }
    
    if (positionType === 'short' && stopLossPrice <= entryPrice) {
      return {
        type: 'INVALID_INPUTS',
        message: `Stop loss price (${stopLossPrice}) must be higher than entry price (${entryPrice}) for short positions`,
        suggestions: [`Minimum allowed stop loss price: ${(entryPrice + 0.01).toFixed(2)}`],
        result: this.createEmptyResult()
      };
    }

    const stopDistancePaise = Math.abs(Math.round(entryPrice * 100) - Math.round(stopLossPrice * 100));
    if (stopDistancePaise === 0) {
      return {
        type: 'INVALID_INPUTS',
        message: 'Entry and stop loss prices must differ by at least ₹0.01',
        result: this.createEmptyResult()
      };
    }

    const riskAtQuantity = (quantity: number) => {
      const fees = calculatePositionCharges(quantity, entryPrice, stopLossPrice, exchange, broker, tradeType, positionType);
      return (quantity * stopDistancePaise + Math.round(fees.totalCharges * 100)) / 100;
    };

    // Calculate risk amount based on mode
    const risk = this.calculateRiskAmount(riskMode, capital, riskAmount, riskPercent);
    if (!Number.isFinite(risk) || risk <= 0) {
      return {
        type: 'INVALID_INPUTS',
        message: 'Risk amount must be greater than zero',
        result: this.createEmptyResult()
      };
    }

    const minimumRisk = riskAtQuantity(1);
    if (risk < minimumRisk) {
      return {
        type: 'INSUFFICIENT_RISK',
        message: `Your risk amount (${risk.toFixed(2)}) is too low for even 1 share`,
        suggestions: [`Increase risk amount to at least ${minimumRisk.toFixed(2)}`],
        minimumRequirements: { risk: minimumRisk },
        result: this.createEmptyResult()
      };
    }

    let low = 1;
    let high = Math.min(Number.MAX_SAFE_INTEGER, Math.ceil((risk * 100) / stopDistancePaise));
    while (low < high) {
      const quantity = low + Math.ceil((high - low) / 2);
      if (riskAtQuantity(quantity) <= risk) low = quantity;
      else high = quantity - 1;
    }
    const optimalQuantity = low;

    // Calculate position metrics
    const positionValue = optimalQuantity * entryPrice;
    
    // Calculate invested amount including entry charges
    const investedAmountData = this.calculateInvestedAmount(
      optimalQuantity,
      entryPrice,
      broker,
      exchange,
      tradeType,
      positionType
    );
    
    const capitalUsed = this.calculateCapitalUsed(investedAmountData.totalInvestedAmount, tradeType);
    const buyingPower = this.calculateBuyingPower(capital, tradeType);

    return {
      quantity: optimalQuantity,
      positionValue,
      entryCharges: investedAmountData.entryCharges,
      totalInvestedAmount: investedAmountData.totalInvestedAmount,
      capitalUsed,
      buyingPower,
      hasCapital: !isNaN(capital) && capital > 0,
      hasEntryPrice: true,
      chargesConsidered: true,
      estimatedCharges: investedAmountData.entryCharges,
      actualRiskAmount: riskAtQuantity(optimalQuantity),
      riskBudget: risk
    };
  }

  /**
   * Calculate risk amount based on selected mode
   */
  private static calculateRiskAmount(
    riskMode: 'amount' | 'percent',
    capital: number,
    riskAmount: number,
    riskPercent: number
  ): number {
    if (riskMode === 'percent') {
      if (isNaN(capital) || capital <= 0 || isNaN(riskPercent) || riskPercent <= 0) {
        return 0;
      }
      return capital * (riskPercent / 100);
    } else {
      if (isNaN(riskAmount) || riskAmount <= 0) {
        return 0;
      }
      return riskAmount;
    }
  }

  /**
   * Calculate invested amount including entry charges using existing charge calculation system
   */
  private static calculateInvestedAmount(
    quantity: number,
    entryPrice: number,
    broker: 'Dhan' | 'Groww',
    exchange: string,
    tradeType: 'equity-delivery' | 'equity-intraday',
    positionType: 'long' | 'short' = 'long'
  ): { positionValue: number; entryCharges: number; totalInvestedAmount: number } {
    // Validation
    if (quantity <= 0 || entryPrice <= 0) {
      return {
        positionValue: 0,
        entryCharges: 0,
        totalInvestedAmount: 0
      };
    }

    const positionValue = quantity * entryPrice;
    const entryChargesData = calculatePositionCharges(quantity, entryPrice, 0, exchange, broker, tradeType, positionType);

    const totalInvestedAmount = positionValue + entryChargesData.totalCharges;
    
    return {
      positionValue,
      entryCharges: entryChargesData.totalCharges,
      totalInvestedAmount
    };
  }

  /**
   * Calculate capital used based on trade type (now uses total invested amount)
   */
  private static calculateCapitalUsed(totalInvestedAmount: number, tradeType: 'equity-delivery' | 'equity-intraday'): number {
    if (tradeType === 'equity-intraday') {
      return totalInvestedAmount / this.LEVERAGE;
    }
    return totalInvestedAmount;
  }

  /**
   * Calculate buying power based on capital and trade type
   */
  private static calculateBuyingPower(capital: number, tradeType: 'equity-delivery' | 'equity-intraday'): number {
    if (isNaN(capital) || capital <= 0) {
      return 0;
    }
    
    if (tradeType === 'equity-intraday') {
      return capital * this.LEVERAGE;
    }
    return capital;
  }

  /**
   * Calculate target exit prices based on risk-reward ratios with proper charge consideration
   */
  static calculateTargetPrices(
    quantity: number,
    entryPrice: number,
    actualRisk: number,
    broker: 'Dhan' | 'Groww',
    exchange: string,
    tradeType: 'equity-delivery' | 'equity-intraday',
    positionType: 'long' | 'short' = 'long'
  ): TargetPriceAnalysis {
    const calculateTargetPrice = (desiredNetProfit: number): number =>
      calculateBreakevenPrice(quantity, entryPrice, exchange, broker, tradeType, positionType, desiredNetProfit);

    const targetPrices = {
      ratio1to1: calculateTargetPrice(actualRisk),
      ratio1to2: calculateTargetPrice(actualRisk * 2),
      ratio1to3: calculateTargetPrice(actualRisk * 3)
    }

    return {
      actualRisk,
      targetPrices
    }
  }

  /**
   * Create empty result for invalid inputs
   */
  private static createEmptyResult(): PositionSizingResult {
    return {
      quantity: 0,
      positionValue: 0,
      entryCharges: 0,
      totalInvestedAmount: 0,
      capitalUsed: 0,
      buyingPower: 0,
      hasCapital: false,
      hasEntryPrice: false,
      chargesConsidered: false,
      estimatedCharges: 0,
      actualRiskAmount: 0,
      riskBudget: 0
    };
  }
}
