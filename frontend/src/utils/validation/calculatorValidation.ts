export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  suggestions?: string[];
}

export interface CommonInputs {
  quantity: string;
  entryPrice: string;
}

export interface ProfitTargetInputs extends CommonInputs {
  profitPercentage: string;
}

export interface NetPLInputs extends CommonInputs {
  exitPrice: string;
}

export interface PositionSizingInputs {
  riskMode: 'amount' | 'percent';
  capital: string;
  riskAmount: string;
  riskPercent: string;
  stopLoss: string;
  entryPrice: string;
  positionType?: 'long' | 'short';
}

export class CalculatorValidation {
  /**
   * Validate common inputs used across calculators
   */
  static validateCommonInputs(inputs: CommonInputs): ValidationResult {
    const errors: string[] = [];

    // Validate quantity
    if (!inputs.quantity.trim()) {
      errors.push('Quantity is required');
    } else {
      const qty = parseInt(inputs.quantity);
      if (isNaN(qty) || qty <= 0) {
        errors.push('Quantity must be a positive number');
      }
    }

    // Validate entry price
    if (!inputs.entryPrice.trim()) {
      errors.push('Entry price is required');
    } else {
      const price = parseFloat(inputs.entryPrice);
      if (isNaN(price) || price <= 0) {
        errors.push('Entry price must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate profit target calculator inputs
   */
  static validateProfitTargetInputs(inputs: ProfitTargetInputs): ValidationResult {
    const commonValidation = this.validateCommonInputs(inputs);
    const errors = [...commonValidation.errors];

    // Validate profit percentage (optional)
    if (inputs.profitPercentage.trim()) {
      const percentage = parseFloat(inputs.profitPercentage);
      if (isNaN(percentage) || percentage <= 0) {
        errors.push('Profit percentage must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate net P&L calculator inputs
   */
  static validateNetPLInputs(inputs: NetPLInputs): ValidationResult {
    const commonValidation = this.validateCommonInputs(inputs);
    const errors = [...commonValidation.errors];

    // Validate exit price (optional)
    if (inputs.exitPrice.trim()) {
      const price = parseFloat(inputs.exitPrice);
      if (isNaN(price) || price <= 0) {
        errors.push('Exit price must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate position sizing calculator inputs
   */
  static validatePositionSizingInputs(inputs: PositionSizingInputs): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Validate entry price
    if (!inputs.entryPrice.trim()) {
      errors.push('Entry price is required');
    } else {
      const price = parseFloat(inputs.entryPrice);
      if (isNaN(price) || price <= 0) {
        errors.push('Entry price must be a positive number');
      }
    }

    // Validate stop loss price
    if (!inputs.stopLoss.trim()) {
      errors.push('Stop loss price is required');
    } else {
      const stopLossPrice = parseFloat(inputs.stopLoss);
      if (isNaN(stopLossPrice) || stopLossPrice <= 0) {
        errors.push('Stop loss price must be a positive number');
      } else {
        // Additional validation for stop loss price based on position type
        const entryPrice = parseFloat(inputs.entryPrice);
        if (!isNaN(entryPrice) && entryPrice > 0) {
          const positionType = inputs.positionType || 'long';
          
          // For long positions, stop loss price must be lower than entry price
          if (positionType === 'long' && stopLossPrice >= entryPrice) {
            errors.push(`Stop loss price (${stopLossPrice}) must be lower than entry price (${entryPrice}) for long positions`);
            suggestions.push(`Maximum allowed stop loss price: ${(entryPrice - 0.01).toFixed(2)}`);
          }
          
          // For short positions, stop loss price must be higher than entry price
          if (positionType === 'short' && stopLossPrice <= entryPrice) {
            errors.push(`Stop loss price (${stopLossPrice}) must be higher than entry price (${entryPrice}) for short positions`);
            suggestions.push(`Minimum allowed stop loss price: ${(entryPrice + 0.01).toFixed(2)}`);
          }
          
          // Calculate stop loss points for reasonable thresholds
          const stopLossPoints = Math.abs(entryPrice - stopLossPrice);
          const minReasonablePoints = entryPrice * 0.001; // 0.1% of entry price
          const maxReasonablePoints = entryPrice * 0.1;  // 10% of entry price
          
          if (stopLossPoints < minReasonablePoints) {
            errors.push(`Stop loss is too tight (${stopLossPoints.toFixed(2)} points) for effective risk management`);
            const suggestedPrice = positionType === 'long' 
              ? entryPrice - minReasonablePoints 
              : entryPrice + minReasonablePoints;
            suggestions.push(`Consider stop loss price around ${suggestedPrice.toFixed(2)}`);
          } else if (stopLossPoints > maxReasonablePoints) {
            errors.push(`Stop loss is too wide (${stopLossPoints.toFixed(2)} points) for effective risk management`);
            const suggestedPrice = positionType === 'long' 
              ? entryPrice - maxReasonablePoints 
              : entryPrice + maxReasonablePoints;
            suggestions.push(`Consider stop loss price around ${suggestedPrice.toFixed(2)}`);
          }
        }
      }
    }

    // Validate risk inputs based on mode
    if (inputs.riskMode === 'amount') {
      if (!inputs.riskAmount.trim()) {
        errors.push('Risk amount is required');
      } else {
        const amount = parseFloat(inputs.riskAmount);
        if (isNaN(amount) || amount <= 0) {
          errors.push('Risk amount must be a positive number');
        }
      }
    } else {
      // Validate capital for percentage mode
      if (!inputs.capital.trim()) {
        errors.push('Capital is required for percentage risk mode');
      } else {
        const capital = parseFloat(inputs.capital);
        if (isNaN(capital) || capital <= 0) {
          errors.push('Capital must be a positive number');
        }
      }

      if (!inputs.riskPercent.trim()) {
        errors.push('Risk percentage is required');
      } else {
        const percent = parseFloat(inputs.riskPercent);
        if (isNaN(percent) || percent <= 0 || percent > 100) {
          errors.push('Risk percentage must be between 0 and 100');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * Check if inputs are sufficient for calculation (less strict than full validation)
   */
  static hasMinimumInputs(inputs: Partial<CommonInputs>): boolean {
    return !!(inputs.quantity?.trim() && inputs.entryPrice?.trim());
  }

  /**
   * Check if position sizing has minimum inputs
   */
  static hasMinimumPositionSizingInputs(inputs: Partial<PositionSizingInputs>): boolean {
    const hasBasicInputs = !!(inputs.entryPrice?.trim() && inputs.stopLoss?.trim());
    
    if (inputs.riskMode === 'amount') {
      return hasBasicInputs && !!inputs.riskAmount?.trim();
    } else {
      return hasBasicInputs && !!(inputs.capital?.trim() && inputs.riskPercent?.trim());
    }
  }

  /**
   * Validate stop loss price specifically
   */
  static validateStopLossPrice(
    entryPrice: number, 
    stopLossPrice: number, 
    positionType: 'long' | 'short' = 'long'
  ): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    if (stopLossPrice <= 0) {
      errors.push('Stop loss price must be greater than zero');
      return { isValid: false, errors };
    }
    
    // Position-type specific validation
    if (positionType === 'long' && stopLossPrice >= entryPrice) {
      errors.push(`Stop loss price (${stopLossPrice}) must be lower than entry price (${entryPrice}) for long positions`);
      suggestions.push(`Maximum allowed stop loss price: ${(entryPrice - 0.01).toFixed(2)}`);
    }
    
    if (positionType === 'short' && stopLossPrice <= entryPrice) {
      errors.push(`Stop loss price (${stopLossPrice}) must be higher than entry price (${entryPrice}) for short positions`);
      suggestions.push(`Minimum allowed stop loss price: ${(entryPrice + 0.01).toFixed(2)}`);
    }
    
    // Calculate stop loss points for reasonable thresholds
    const stopLossPoints = Math.abs(entryPrice - stopLossPrice);
    const minReasonablePoints = entryPrice * 0.001; // 0.1% of entry price
    const maxReasonablePoints = entryPrice * 0.1;  // 10% of entry price
    
    if (stopLossPoints < minReasonablePoints) {
      errors.push(`Stop loss is too tight (${stopLossPoints.toFixed(2)} points) for effective risk management`);
      const suggestedPrice = positionType === 'long' 
        ? entryPrice - minReasonablePoints 
        : entryPrice + minReasonablePoints;
      suggestions.push(`Consider stop loss price around ${suggestedPrice.toFixed(2)}`);
    } else if (stopLossPoints > maxReasonablePoints) {
      errors.push(`Stop loss is too wide (${stopLossPoints.toFixed(2)} points) for effective risk management`);
      const suggestedPrice = positionType === 'long' 
        ? entryPrice - maxReasonablePoints 
        : entryPrice + maxReasonablePoints;
      suggestions.push(`Consider stop loss price around ${suggestedPrice.toFixed(2)}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }
}