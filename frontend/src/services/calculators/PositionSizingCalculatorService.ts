import { calculateCharges } from '@/pages/Tools/ChargesUtils';

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

export class PositionSizingCalculatorService {
  private static readonly LEVERAGE = 5;

  /**
   * Calculate optimal position size based on risk parameters
   */
  static calculatePositionSize(params: PositionSizingParams): PositionSizingResult | null {
    const { riskMode, capital, riskAmount, riskPercent, stopLoss, entryPrice, tradeType, broker, exchange } = params;

    // Validate required inputs
    if (stopLoss <= 0 || entryPrice <= 0) {
      return this.createEmptyResult();
    }

    // Calculate risk amount based on mode
    const risk = this.calculateRiskAmount(riskMode, capital, riskAmount, riskPercent);
    if (risk <= 0) {
      return this.createEmptyResult();
    }

    // Calculate optimal quantity
    const optimalQuantity = this.calculateOptimalQuantity(risk, stopLoss, entryPrice, tradeType, broker, exchange);
    
    // Calculate position metrics
    const positionValue = optimalQuantity * entryPrice;
    const capitalUsed = this.calculateCapitalUsed(positionValue, tradeType);
    const buyingPower = this.calculateBuyingPower(capital, tradeType);

    // Calculate final charges for display
    const finalCharges = this.calculateFinalCharges(optimalQuantity, entryPrice, stopLoss, exchange, broker, tradeType);
    const actualRiskWithCharges = (optimalQuantity * stopLoss) + finalCharges.totalCharges;

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
   */
  private static calculateOptimalQuantity(
    risk: number,
    stopLoss: number,
    entryPrice: number,
    tradeType: 'equity-delivery' | 'equity-intraday',
    broker: 'Dhan' | 'Groww',
    exchange: string
  ): number {
    // Initial estimate without charges
    let quantity = Math.floor(risk / stopLoss);
    
    // Iteratively adjust for charges
    const maxIterations = 10;
    let iteration = 0;
    
    while (iteration < maxIterations) {
      const buyValue = quantity * entryPrice;
      const sellValue = quantity * (entryPrice - stopLoss);
      const charges = calculateCharges(buyValue, Math.abs(sellValue), exchange, broker, tradeType);
      
      const totalRisk = (quantity * stopLoss) + charges.totalCharges;
      
      if (Math.abs(totalRisk - risk) < 1) {
        break; // Close enough
      }
      
      if (totalRisk > risk) {
        quantity = Math.max(1, quantity - 1);
      } else {
        quantity += 1;
      }
      
      iteration++;
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
    tradeType: 'equity-delivery' | 'equity-intraday'
  ) {
    const finalBuyValue = quantity * entryPrice;
    const finalSellValue = quantity * (entryPrice - stopLoss);
    return calculateCharges(finalBuyValue, Math.abs(finalSellValue), exchange, broker, tradeType);
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