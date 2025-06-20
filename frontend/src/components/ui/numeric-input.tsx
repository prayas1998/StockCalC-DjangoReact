import React, { ChangeEvent, KeyboardEvent, forwardRef } from 'react';
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
      <Input
        ref={ref}
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={cn(className)}
        {...props}
      />
    );
  }
);

NumericInput.displayName = "NumericInput";

export { NumericInput };