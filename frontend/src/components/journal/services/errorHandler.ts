/**
 * Centralized error handling service for journal operations
 */

import { toast } from 'sonner';
import type { CalculationError } from '@/types/api';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  context?: string;
}

/**
 * Format API error for display
 */
export function formatApiError(error: CalculationError): string {
  if (error.detail) {
    return error.detail;
  }
  return error.error || 'An unexpected error occurred';
}

/**
 * Handle API errors with consistent formatting and logging
 */
export function handleApiError(
  error: CalculationError | Error | unknown,
  options: ErrorHandlerOptions = {}
): string {
  const {
    showToast = true,
    fallbackMessage = 'An unexpected error occurred',
    context = 'Operation'
  } = options;

  let errorMessage: string;

  if (error && typeof error === 'object' && 'error' in error) {
    // API error
    errorMessage = formatApiError(error as CalculationError);
  } else if (error instanceof Error) {
    // JavaScript error
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    // String error
    errorMessage = error;
  } else {
    // Unknown error
    errorMessage = fallbackMessage;
  }

  // Log error for debugging
  console.error(`${context} failed:`, error);

  // Show toast notification if requested
  if (showToast) {
    toast.error(`${context} failed: ${errorMessage}`);
  }

  return errorMessage;
}

/**
 * Handle authentication errors specifically
 */
export function handleAuthError(error: CalculationError): boolean {
  if (error.detail === 'Your session has expired. Please log in again.') {
    toast.error('Session expired. Please log in again.');
    // Clear any stored auth tokens
    localStorage.removeItem('auth_token');
    return true;
  }
  return false;
}

/**
 * Handle network errors
 */
export function handleNetworkError(error: unknown): string {
  console.error('Network error:', error);
  
  const message = 'Network error. Please check your connection and try again.';
  toast.error(message);
  
  return message;
}

/**
 * Handle validation errors
 */
export function handleValidationError(
  field: string,
  value: any,
  rules: ValidationRule[]
): string | null {
  for (const rule of rules) {
    const error = rule.validate(value);
    if (error) {
      return `${field}: ${error}`;
    }
  }
  return null;
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  validate: (value: any) => string | null;
}

/**
 * Common validation rules
 */
export const ValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return message;
      }
      return null;
    }
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (typeof value === 'string' && value.length < min) {
        return message || `Must be at least ${min} characters`;
      }
      return null;
    }
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (typeof value === 'string' && value.length > max) {
        return message || `Must be no more than ${max} characters`;
      }
      return null;
    }
  }),

  positiveNumber: (message = 'Must be a positive number'): ValidationRule => ({
    validate: (value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        return message;
      }
      return null;
    }
  }),

  hexColor: (message = 'Must be a valid hex color'): ValidationRule => ({
    validate: (value) => {
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (typeof value === 'string' && !hexRegex.test(value)) {
        return message;
      }
      return null;
    }
  })
};