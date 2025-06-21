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
      
      // Allow keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+A, etc.)
      const isKeyboardShortcut = (e.ctrlKey || e.metaKey) && 
        ['c', 'v', 'a', 'x', 'z'].includes(e.key.toLowerCase());
      
      // Allow decimal point if decimals are allowed and there isn't one already
      const decimalAllowed = allowDecimal && !value.includes('.') && e.key === '.';
      
      // Allow minus sign for negative numbers if at start position and min allows it
      const minusAllowed = e.key === '-' && e.currentTarget.selectionStart === 0 && 
                          !value.includes('-') && (min === undefined || min < 0);
      
      // Allow numeric keys
      const isNumeric = /^\d$/.test(e.key);
      
      // If not an allowed key, prevent default
      if (!isNumeric && !allowedKeys.includes(e.key) && !decimalAllowed && !minusAllowed && !isKeyboardShortcut) {
        e.preventDefault();
      }
    };
    
    // Handle copy event
    const handleCopy = (e: ClipboardEvent<HTMLInputElement>) => {
      // The default copy behavior works fine for input elements,
      // but we can add custom feedback or analytics here if needed
      // No need to preventDefault() as we want the default copy behavior
    };
    
    // Handle paste event
    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData('text');
      
      // Check if pasted content is a valid number according to our rules
      let isValid = true;
      let validationMessage = "";
      
      // Try to extract numeric value from pasted text (for user convenience)
      let processedValue = pastedText.trim();
      
      // Extract only the numeric parts (including decimal point and minus sign)
      if (allowDecimal) {
        // For decimal numbers, extract digits, decimal point, and minus sign
        processedValue = processedValue.replace(/[^\d.-]/g, '');
        
        // Ensure only one decimal point
        const parts = processedValue.split('.');
        if (parts.length > 2) {
          processedValue = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Ensure minus sign is only at the beginning
        if (processedValue.includes('-') && !processedValue.startsWith('-')) {
          processedValue = '-' + processedValue.replace(/-/g, '');
        } else if (processedValue.startsWith('-')) {
          processedValue = '-' + processedValue.substring(1).replace(/-/g, '');
        }
        
        // Check if the processed value is a valid decimal number
        if (!/^-?\d*\.?\d*$/.test(processedValue)) {
          isValid = false;
          validationMessage = "Only numbers and decimal point are allowed";
        }
      } else {
        // For integers, extract digits and optional minus sign
        processedValue = processedValue.replace(/[^\d-]/g, '');
        
        // Ensure minus sign is only at the beginning
        if (processedValue.includes('-') && !processedValue.startsWith('-')) {
          processedValue = '-' + processedValue.replace(/-/g, '');
        } else if (processedValue.startsWith('-')) {
          processedValue = '-' + processedValue.substring(1).replace(/-/g, '');
        }
        
        // Check if the processed value is a valid integer
        if (processedValue !== '' && processedValue !== '-' && !/^-?\d+$/.test(processedValue)) {
          isValid = false;
          validationMessage = "Only whole numbers are allowed";
        }
      }
      
      // If the value is empty after processing, consider it valid (empty input)
      if (processedValue === '') {
        isValid = true;
      }
      
      // Check for decimal places limit
      if (isValid && allowDecimal && maxDecimalPlaces !== undefined) {
        const parts = processedValue.split('.');
        if (parts.length > 1 && parts[1].length > maxDecimalPlaces) {
          // Truncate to max decimal places instead of rejecting
          processedValue = parts[0] + '.' + parts[1].substring(0, maxDecimalPlaces);
        }
      }
      
      // Check min/max constraints
      if (isValid && processedValue !== '' && processedValue !== '-' && processedValue !== '.') {
        const numValue = parseFloat(processedValue);
        if (!isNaN(numValue)) {
          if (min !== undefined && numValue < min) {
            processedValue = min.toString();
          }
          if (max !== undefined && numValue > max) {
            processedValue = max.toString();
          }
        }
      }
      
      // For all pastes, prevent default and manually update the value
      e.preventDefault();
      
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
      
      // Show error message if needed
      if (!isValid) {
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
          onCopy={handleCopy}
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