import React from 'react';
import { RotateCcw } from 'lucide-react';

interface ClearButtonProps {
  onClear: () => void;
  className?: string;
}

export const ClearButton: React.FC<ClearButtonProps> = ({ 
  onClear, 
  className = "" 
}) => {
  return (
    <button
      onClick={onClear}
      className={`flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors ${className}`}
      title="Clear all fields"
    >
      <RotateCcw className="h-3 w-3" />
      Clear
    </button>
  );
};