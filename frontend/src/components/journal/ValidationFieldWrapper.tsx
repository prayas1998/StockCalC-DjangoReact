import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationFieldWrapperProps {
  children: React.ReactNode;
  error?: string;
  fieldName?: string;
}

export const ValidationFieldWrapper: React.FC<ValidationFieldWrapperProps> = ({ 
  children, 
  error, 
  fieldName 
}) => {
  if (!error) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip open={!!error}>
        <TooltipTrigger asChild>
          <div className="relative" data-error-field={fieldName}>
            {children}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
              <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-red-50 border-red-200 text-red-800 max-w-xs z-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};