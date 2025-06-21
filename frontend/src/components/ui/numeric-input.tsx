import React, { ChangeEvent, KeyboardEvent, forwardRef, ClipboardEvent, useState } from 'react';
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  allowDecimal?: boolean;
  min?: number;
  max?: number;
  maxDecimalPlaces?: number;
}

const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  ({ 
    value, 
    onChange, 
    allowDecimal = true, 
    min, 
    max, 
    maxDecimalPlaces,
    className,
    ...props 
  }, ref) => {
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    
    // Handle key press to prevent non-numeric input
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, arrows, home, end
      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
      
      // Allow decimal point if decimals are allowed and there isn't one already
      const decimalAllowed = allowDecimal && !value.includes('.') && e.key === '.';
      
      // Allow minus sign for negative numbers if at start position and min allows it
      const minusAllowed = e.key === '-' && e.currentTarget.selectionStart === 0 && 
                          !value.includes('-') && (min === undefined || min < 0);
      
      // Allow numeric keys
      const isNumeric = /^\d$/.test(e.key);
      
      // If not an allowed key, prevent default
      if (!isNumeric && !allowedKeys.includes(e.key) && !decimalAllowed && !minusAllowed) {
        e.preventDefault();
      }
    };
    
    // Handle paste event
    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData('text');
      
      // Check if pasted content is a valid number according to our rules
      let isValid = true;
      let validationMessage = "";
      
      // Check for non-numeric characters (allow empty string)
      if (pastedText === '') {
        // Allow empty paste - will be handled as empty string
        isValid = true;
      } else if (allowDecimal) {
        // For decimal numbers, allow numbers with optional decimal point and optional negative sign
        // This regex allows for: empty string, just a decimal point, just a minus sign, or valid decimal number
        if (!/^-?\d*\.?\d*$/.test(pastedText.trim())) {
          isValid = false;
          validationMessage = "Only numbers and decimal point are allowed";
        }
      } else {
        // For integers, only allow digits with optional negative sign
        if (!/^-?\d+$/.test(pastedText.trim())) {
          isValid = false;
          validationMessage = "Only whole numbers are allowed";
        }
      }
      
      // Check for decimal places limit
      if (isValid && allowDecimal && maxDecimalPlaces !== undefined) {
        const parts = pastedText.split('.');
        if (parts.length > 1 && parts[1].length > maxDecimalPlaces) {
          isValid = false;
          validationMessage = `Maximum ${maxDecimalPlaces} decimal places allowed`;
        }
      }
      
      // Check min/max constraints
      if (isValid && pastedText !== '' && pastedText !== '-' && pastedText !== '.') {
        const numValue = parseFloat(pastedText);
        if (!isNaN(numValue)) {
          if (min !== undefined && numValue < min) {
            isValid = false;
            validationMessage = `Value must be at least ${min}`;
          }
          if (max !== undefined && numValue > max) {
            isValid = false;
            validationMessage = `Value must be at most ${max}`;
          }
        }
      }
      
      if (isValid) {
        // For valid pastes, prevent default and manually update the value
        e.preventDefault();
        
        // Format the pasted text to handle special cases
        let processedValue = pastedText.trim();
        
        // If the value starts with a decimal point, add a leading zero
        if (allowDecimal && processedValue.startsWith('.')) {
          processedValue = '0' + processedValue;
        }
        
        // Create a synthetic event to pass to handleChange
        const syntheticEvent = {
          target: {
            value: processedValue
          }
        } as ChangeEvent<HTMLInputElement>;
        
        // Process the pasted value through our normal change handler
        handleChange(syntheticEvent);
      } else {
        // For invalid pastes, show error and prevent default paste behavior
        e.preventDefault();
        setErrorMessage(validationMessage);
        setShowError(true);
        
        // Hide error after 3 seconds
        setTimeout(() => {
          setShowError(false);
        }, 3000);
      }
    };

    // Handle input change
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;
      
      // Handle empty input
      if (newValue === '') {
        onChange('');
        return;
      }
      
      // Handle minus sign
      const isNegative = newValue.startsWith('-');
      
      // Remove any non-numeric characters except decimal point and minus sign
      if (allowDecimal) {
        newValue = newValue.replace(/[^\d.-]/g, '');
      } else {
        newValue = newValue.replace(/[^\d-]/g, '');
      }
      
      // Ensure only one decimal point
      if (allowDecimal) {
        const parts = newValue.split('.');
        if (parts.length > 2) {
          newValue = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Limit decimal places if specified
        if (maxDecimalPlaces !== undefined && parts.length === 2 && parts[1].length > maxDecimalPlaces) {
          newValue = parts[0] + '.' + parts[1].substring(0, maxDecimalPlaces);
        }
      }
      
      // Ensure minus sign is only at the beginning
      if (isNegative && !newValue.startsWith('-')) {
        newValue = '-' + newValue.replace(/-/g, '');
      } else if (!isNegative) {
        newValue = newValue.replace(/-/g, '');
      }
      
      // Check if the value is a valid number
      const numValue = parseFloat(newValue);
      if (isNaN(numValue)) {
        if (newValue === '-' || newValue === '.') {
          // Allow single minus or decimal as they might be typing
          onChange(newValue);
        } else {
          // Invalid number
          onChange('');
        }
        return;
      }
      
      // Apply min/max constraints if provided
      if (min !== undefined && numValue < min) {
        newValue = min.toString();
      }
      if (max !== undefined && numValue > max) {
        newValue = max.toString();
      }
      
      onChange(newValue);
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          inputMode={allowDecimal ? "decimal" : "numeric"}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={cn(className)}
          {...props}
        />
        {showError && (
          <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-xs p-1 rounded border border-red-200 dark:border-red-800">
            {errorMessage}
          </div>
        )}
      </div>
    );
  }
);

NumericInput.displayName = "NumericInput";

export { NumericInput };