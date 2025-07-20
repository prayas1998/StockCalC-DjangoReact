import { useState, useCallback } from 'react';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

export const useFormValidationErrors = () => {
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const setFieldError = useCallback((field: string, message: string) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: message
    }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  const setErrorsFromResponse = useCallback((errorMessage: string) => {
    try {
      // Try to parse JSON directly first
      let errorData;
      try {
        errorData = JSON.parse(errorMessage);
      } catch {
        // If direct parsing fails, try to extract JSON from the message
        const jsonMatch = errorMessage.match(/\{.*\}/);
        if (jsonMatch) {
          errorData = JSON.parse(jsonMatch[0]);
        } else {
          return false;
        }
      }
      
      const newErrors: ValidationErrors = {};
      
      Object.entries(errorData).forEach(([field, messages]) => {
        const errorMessages = Array.isArray(messages) ? messages : [messages];
        newErrors[field] = errorMessages.join(', ');
      });
      
      setValidationErrors(newErrors);
      
      // Scroll to first error field after a short delay to ensure DOM is updated
      setTimeout(() => {
        const firstErrorField = Object.keys(newErrors)[0];
        if (firstErrorField) {
          scrollToErrorField(firstErrorField);
        }
      }, 100);
      
      return true; // Indicates validation errors were found
    } catch (parseError) {
      // Failed to parse validation errors
    }
    return false; // No validation errors found
  }, []);

  const scrollToErrorField = useCallback((fieldName: string) => {
    // Map backend field names to form field names
    const fieldNameMap: { [key: string]: string } = {
      'target_price': 'target_price',
      'stop_loss': 'sl',
      'buy_price': 'entry_price',
      'sell_price': 'exit_price',
      'company_name': 'company_name',
      'quantity': 'quantity',
      'entry_date': 'entry_date',
      'exit_date': 'exit_date',
      'status': 'status',
      'personal_notes': 'personal_notes',
      'broker': 'broker',
      'exchange': 'exchange'
    };

    const formFieldName = fieldNameMap[fieldName] || fieldName;
    
    // Try multiple selectors to find the field
    const selectors = [
      `[data-field="${formFieldName}"]`,
      `[data-error-field="${fieldName}"]`,
      `[name="${formFieldName}"]`,
      `input[name="${formFieldName}"]`,
      `select[name="${formFieldName}"]`,
      `textarea[name="${formFieldName}"]`,
      `#${formFieldName}`,
      `.field-${formFieldName}`
    ];

    let element: HTMLElement | null = null;
    
    for (const selector of selectors) {
      element = document.querySelector(selector);
      if (element) break;
    }

    if (element) {
      // Scroll to the element with some offset for better visibility
      const elementRect = element.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;
      const middle = absoluteElementTop - (window.innerHeight / 2);
      
      window.scrollTo({
        top: Math.max(0, middle),
        behavior: 'smooth'
      });

      // Focus the element after scrolling
      setTimeout(() => {
        if (element && typeof element.focus === 'function') {
          element.focus();
        }
      }, 500);
    }
  }, []);

  const hasErrors = Object.keys(validationErrors).length > 0;

  return {
    validationErrors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    setErrorsFromResponse,
    scrollToErrorField,
    hasErrors
  };
};