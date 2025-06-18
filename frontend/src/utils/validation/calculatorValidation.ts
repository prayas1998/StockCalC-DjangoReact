export interface ValidationResult {
  isValid: boolean;
  errors: string[];
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

    // Validate entry price
    if (!inputs.entryPrice.trim()) {
      errors.push('Entry price is required');
    } else {
      const price = parseFloat(inputs.entryPrice);
      if (isNaN(price) || price <= 0) {
        errors.push('Entry price must be a positive number');
      }
    }

    // Validate stop loss
    if (!inputs.stopLoss.trim()) {
      errors.push('Stop loss is required');
    } else {
      const sl = parseFloat(inputs.stopLoss);
      if (isNaN(sl) || sl <= 0) {
        errors.push('Stop loss must be a positive number');
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
      errors
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
}