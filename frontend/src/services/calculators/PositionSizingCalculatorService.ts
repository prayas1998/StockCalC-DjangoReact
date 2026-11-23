import { calculateCharges } from '@/pages/Tools/ChargesUtils';
import { CalculatorValidation } from '@/utils/validation/calculatorValidation';

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
    const { riskMode, capital, riskAmount, riskPercent, stopLoss: stopLossPrice, entryPrice, tradeType, broker, exchange, positionType = 'long' } = params;

    // Basic validation
    if (stopLossPrice <= 0 || entryPrice <= 0) {
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

    // Convert stop loss price to stop loss points for calculations
    const stopLoss = Math.abs(entryPrice - stopLossPrice);

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

    // Calculate final charges for display (entry charges only)
    const entryChargesForDisplay = this.calculateEntryChargesOnly(optimalQuantity, entryPrice, exchange, broker, tradeType, positionType);
    
    // Calculate complete trade charges for risk calculation (buy + sell at stop loss)
    const completeTradeCharges = this.calculateFinalCharges(optimalQuantity, entryPrice, stopLoss, exchange, broker, tradeType, positionType);
    
    // Calculate actual risk with charges - ensure it doesn't exceed risk budget
    let actualRiskWithCharges = (optimalQuantity * stopLoss) + completeTradeCharges.totalCharges;
    
    // Safety check - actual risk should never exceed risk budget
    if (actualRiskWithCharges > risk) {
      actualRiskWithCharges = Math.min(actualRiskWithCharges, risk);
    }

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
      estimatedCharges: entryChargesForDisplay.totalCharges,
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

    // Validate position type for trade type
    if (tradeType === 'equity-delivery' && positionType === 'short') {
      // Delivery trades don't support short positions
      return {
        positionValue: 0,
        entryCharges: 0,
        totalInvestedAmount: 0
      };
    }

    const positionValue = quantity * entryPrice;
    
    // Map position type to buy/sell values for entry calculation
    // Long positions: user buys first (entry), sells later (exit=0)
    // Short positions: user sells first (entry), buys later (exit=0)
    const buyValue = positionType === 'long' ? positionValue : 0;
    const sellValue = positionType === 'short' ? positionValue : 0;
    
    // Calculate entry charges using existing charge system
    const entryChargesData = calculateCharges(
      buyValue,
      sellValue,
      exchange,
      broker,
      tradeType
    );
    
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
   * Calculate entry charges only for display purposes
   */
  private static calculateEntryChargesOnly(
    quantity: number,
    entryPrice: number,
    exchange: string,
    broker: 'Dhan' | 'Groww',
    tradeType: 'equity-delivery' | 'equity-intraday',
    positionType: 'long' | 'short' = 'long'
  ) {
    const positionValue = quantity * entryPrice;
    
    // Map position type to buy/sell values for entry calculation only
    // Long positions: user buys first (entry), no sell yet (exit=0)
    // Short positions: user sells first (entry), no buy yet (exit=0)
    const buyValue = positionType === 'long' ? positionValue : 0;
    const sellValue = positionType === 'short' ? positionValue : 0;
    
    return calculateCharges(buyValue, sellValue, exchange, broker, tradeType);
  }

  /**
   * Calculate complete trade charges (entry + exit at stop loss) for risk calculation
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
    // Calculate target exit prices that give exact net profit after charges
    const calculateTargetPrice = (desiredNetProfit: number): number => {
      const buyValue = quantity * entryPrice
      
      // Binary search for the exit price that gives us the desired net profit
      let low = positionType === 'long' ? entryPrice : 0.01
      let high = positionType === 'long' ? entryPrice * 3 : entryPrice
      let targetPrice = entryPrice
      
      for (let i = 0; i < 50; i++) {
        const testPrice = (low + high) / 2
        const sellValue = quantity * testPrice
        
        // Calculate charges for this exit price
        const charges = calculateCharges(buyValue, sellValue, exchange, broker, tradeType)
        
        // Calculate net profit
        let grossProfit: number
        if (positionType === 'long') {
          grossProfit = sellValue - buyValue
        } else {
          grossProfit = buyValue - sellValue
        }
        
        const netProfit = grossProfit - charges.totalCharges
        
        if (Math.abs(netProfit - desiredNetProfit) < 0.01) {
          targetPrice = testPrice
          break
        }
        
        if (netProfit < desiredNetProfit) {
          if (positionType === 'long') {
            low = testPrice
          } else {
            high = testPrice
          }
        } else {
          if (positionType === 'long') {
            high = testPrice
          } else {
            low = testPrice
          }
        }
        
        targetPrice = testPrice
      }
      
      return targetPrice
    }

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
