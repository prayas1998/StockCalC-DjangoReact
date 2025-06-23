import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RiskModeSelectorProps {
  riskMode: 'amount' | 'percent';
  onRiskModeChange: (riskMode: 'amount' | 'percent') => void;
  compact?: boolean;
}

export const RiskModeSelector: React.FC<RiskModeSelectorProps> = ({
  riskMode,
  onRiskModeChange,
  compact = false
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">Risk Mode:</Label>
        <Select value={riskMode} onValueChange={onRiskModeChange}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="amount">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                <span>Fixed Amount</span>
              </div>
            </SelectItem>
            <SelectItem value="percent">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                <span>Percentage</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs font-medium text-gray-500 dark:text-gray-300 whitespace-nowrap">Risk Mode:</Label>
      <Select value={riskMode} onValueChange={onRiskModeChange}>
        <SelectTrigger className="w-[140px] h-8 text-sm">
          <SelectValue>
            {riskMode === 'amount' ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Fixed Amount</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                <span>Percentage</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="amount">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Fixed Amount</span>
            </div>
          </SelectItem>
          <SelectItem value="percent">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
              <span>Percentage</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};