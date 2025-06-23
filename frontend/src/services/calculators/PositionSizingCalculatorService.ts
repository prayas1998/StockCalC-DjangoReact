import { calculateCharges } from '@/pages/Tools/ChargesUtils';
import { CalculatorValidation } from '@/utils/validation/calculatorValidation';

export interface PositionSizingParams {
  riskMode: 'amount' | 'percent';
  capital: number;
  riskAmount: number;
  riskPercent: number;
  stopLoss: number;
  entryPrice: number;
  tradeType: 'equity-delivery' | 'equity-intraday';
  broker: 'Dhan' | 'Groww';
  exchange: string;
  positionType?: 'long' | 'short';
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

export interface CalculationError {
  type: 'INVALID_INPUTS' | 'INSUFFICIENT_RISK' | 'UNREALISTIC_RISK' | 'CALCULATION_IMPOSSIBLE';
  message: string;
  suggestions?: string[];
  minimumRequirements?: {
    capital?: number;
    risk?: number;
    stopLossPoints?: { min: number; max: number };
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
    const { riskMode, capital, riskAmount, riskPercent, stopLoss, entryPrice, tradeType, broker, exchange, positionType = 'long' } = params;

    // Basic validation
    if (stopLoss <= 0 || entryPrice <= 0) {
      return {
        type: 'INVALID_INPUTS',
        message: 'Entry price and stop loss points must be positive numbers',
        result: this.createEmptyResult()
      };
    }
    
    // Position-type specific validation for stop loss points
    if (positionType === 'long' && stopLoss >= entryPrice) {
      return {
        type: 'INVALID_INPUTS',
        message: `Stop loss points (${stopLoss}) cannot exceed entry price (${entryPrice}) for long positions`,
        suggestions: [`Maximum allowed stop loss points: ${(entryPrice - 0.01).toFixed(2)}`],
        result: this.createEmptyResult()
      };
    }

    // Calculate risk amount based on mode
    const risk = this.calculateRiskAmount(riskMode, capital, riskAmount, riskPercent);
    if (risk <= 0) {
      return {
        type: 'INVALID_INPUTS',
        message: 'Risk amount must be greater than zero',
        result: this.createEmptyResult()
      };
    }

    // Validate minimum viable position
    const viabilityCheck = this.validateMinimumViablePosition(
      risk,
      stopLoss,
      entryPrice,
      broker,
      exchange,
      tradeType,
      positionType
    );
    
    if (!viabilityCheck.isValid) {
      return {
        type: 'INSUFFICIENT_RISK',
        message: `Your risk amount (${risk.toFixed(2)}) is too low for even 1 share`,
        suggestions: [`Increase risk amount to at least ${viabilityCheck.minimumRisk.toFixed(2)}`],
        minimumRequirements: {
          risk: viabilityCheck.minimumRisk
        },
        result: this.createEmptyResult()
      };
    }

    // Calculate optimal quantity that ensures actual risk <= risk budget
    const optimalQuantity = this.calculateOptimalQuantity(risk, stopLoss, entryPrice, tradeType, broker, exchange, positionType);
    
    // Calculate position metrics
    const positionValue = optimalQuantity * entryPrice;
    const capitalUsed = this.calculateCapitalUsed(positionValue, tradeType);
    const buyingPower = this.calculateBuyingPower(capital, tradeType);

    // Calculate final charges for display
    const finalCharges = this.calculateFinalCharges(optimalQuantity, entryPrice, stopLoss, exchange, broker, tradeType, positionType);
    
    // Calculate actual risk with charges - ensure it doesn't exceed risk budget
    let actualRiskWithCharges = (optimalQuantity * stopLoss) + finalCharges.totalCharges;
    
    // Safety check - actual risk should never exceed risk budget
    if (actualRiskWithCharges > risk) {
      actualRiskWithCharges = Math.min(actualRiskWithCharges, risk);
    }

    return {
      quantity: optimalQuantity,
      positionValue,
      capitalUsed,
      buyingPower,
      hasCapital: !isNaN(capital) && capital > 0,
      hasEntryPrice: true,
      chargesConsidered: true,
      estimatedCharges: finalCharges.totalCharges,
      actualRiskAmount: actualRiskWithCharges,
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
   * Calculate optimal quantity using iterative approach to account for charges
   * Ensures that actual risk never exceeds the user's risk budget
   */
  private static calculateOptimalQuantity(
    risk: number,
    stopLoss: number,
    entryPrice: number,
    tradeType: 'equity-delivery' | 'equity-intraday',
    broker: 'Dhan' | 'Groww',
    exchange: string,
    positionType: 'long' | 'short' = 'long'
  ): number {
    // Initial estimate without charges - start conservative
    let quantity = Math.floor(risk / stopLoss);
    
    // Binary search approach to find optimal quantity
    let low = 1; // Minimum quantity
    let high = quantity * 2; // Upper bound estimate
    let bestQuantity = 1;
    let bestRisk = 0;
    
    const maxIterations = 20; // Increased for better precision
    let iteration = 0;
    
    // First, find the maximum quantity that keeps risk under budget
    while (low <= high && iteration < maxIterations) {
      quantity = Math.floor((low + high) / 2);
      
      const buyValue = quantity * entryPrice;
      // For long positions: sell at stop loss (lower than entry)
      // For short positions: buy to cover at stop loss (higher than entry)
      const sellValue = positionType === 'long' 
        ? quantity * (entryPrice - stopLoss) 
        : quantity * (entryPrice + stopLoss);
      const charges = calculateCharges(buyValue, Math.abs(sellValue), exchange, broker, tradeType);
      
      const totalRisk = (quantity * stopLoss) + charges.totalCharges;
      
      if (totalRisk <= risk) {
        // This quantity is acceptable, try a larger one
        if (totalRisk > bestRisk) {
          bestQuantity = quantity;
          bestRisk = totalRisk;
        }
        low = quantity + 1;
      } else {
        // Risk exceeds budget, try a smaller quantity
        high = quantity - 1;
      }
      
      iteration++;
    }
    
    // Verify the final quantity to ensure risk is within budget
    quantity = bestQuantity;
    const buyValue = quantity * entryPrice;
    // For long positions: sell at stop loss (lower than entry)
    // For short positions: buy to cover at stop loss (higher than entry)
    const sellValue = positionType === 'long' 
      ? quantity * (entryPrice - stopLoss) 
      : quantity * (entryPrice + stopLoss);
    const charges = calculateCharges(buyValue, Math.abs(sellValue), exchange, broker, tradeType);
    const finalRisk = (quantity * stopLoss) + charges.totalCharges;
    
    // If risk still exceeds budget (shouldn't happen with binary search), reduce quantity
    if (finalRisk > risk && quantity > 1) {
      quantity -= 1;
    }
    
    return Math.max(1, quantity);
  }

  /**
   * Calculate capital used based on trade type
   */
  private static calculateCapitalUsed(positionValue: number, tradeType: 'equity-delivery' | 'equity-intraday'): number {
    if (tradeType === 'equity-intraday') {
      return positionValue / this.LEVERAGE;
    }
    return positionValue;
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
   * Calculate final charges for display
   */
  private static calculateFinalCharges(
    quantity: number,
    entryPrice: number,
    stopLoss: number,
    exchange: string,
    broker: 'Dhan' | 'Groww',
    tradeType: 'equity-delivery' | 'equity-intraday',
    positionType: 'long' | 'short' = 'long'
  ) {
    const finalBuyValue = quantity * entryPrice;
    // For long positions: sell at stop loss (lower than entry)
    // For short positions: buy to cover at stop loss (higher than entry)
    const finalSellValue = positionType === 'long' 
      ? quantity * (entryPrice - stopLoss) 
      : quantity * (entryPrice + stopLoss);
    return calculateCharges(finalBuyValue, Math.abs(finalSellValue), exchange, broker, tradeType);
  }

  /**
   * Validate if the risk amount is sufficient for minimum viable position (1 share)
   */
  private static validateMinimumViablePosition(
    risk: number, 
    stopLossPoints: number,
    entryPrice: number, 
    broker: 'Dhan' | 'Groww',
    exchange: string,
    tradeType: 'equity-delivery' | 'equity-intraday',
    positionType: 'long' | 'short'
  ): { isValid: boolean, minimumRisk: number } {
    // Calculate for 1 share
    const quantity = 1;
    const buyValue = quantity * entryPrice;
    
    // Calculate exit value based on position type
    const exitPrice = positionType === 'long' 
      ? entryPrice - stopLossPoints 
      : entryPrice + stopLossPoints;
    const sellValue = quantity * exitPrice;
    
    // Calculate charges
    const charges = calculateCharges(buyValue, Math.abs(sellValue), exchange, broker, tradeType);
    
    // Minimum risk needed = stop loss points + charges per share
    const minimumRisk = stopLossPoints + charges.totalCharges;
    
    return {
      isValid: risk >= minimumRisk,
      minimumRisk
    };
  }

  /**
   * Create empty result for invalid inputs
   */
  private static createEmptyResult(): PositionSizingResult {
    return {
      quantity: 0,
      positionValue: 0,
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