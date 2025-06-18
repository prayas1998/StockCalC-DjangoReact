import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BrokerTradeTypeSelectorProps {
  selectedBroker: 'Dhan' | 'Groww';
  selectedTradeType: 'equity-delivery' | 'equity-intraday';
  onBrokerChange: (broker: 'Dhan' | 'Groww') => void;
  onTradeTypeChange: (tradeType: 'equity-delivery' | 'equity-intraday') => void;
  showRiskMode?: boolean;
  riskMode?: 'amount' | 'percent';
  onRiskModeChange?: (riskMode: 'amount' | 'percent') => void;
  compact?: boolean;
}

export const BrokerTradeTypeSelector: React.FC<BrokerTradeTypeSelectorProps> = ({
  selectedBroker,
  selectedTradeType,
  onBrokerChange,
  onTradeTypeChange,
  showRiskMode = false,
  riskMode,
  onRiskModeChange,
  compact = false
}) => {
  if (compact) {
    // Compact version for individual calculators
    return (
      <div className="flex flex-wrap gap-4 mb-6 p-3 bg-slate-50 rounded-md border-l-4 border-primary">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Broker:</Label>
          <Select value={selectedBroker} onValueChange={onBrokerChange}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Dhan">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Dhan</span>
                </div>
              </SelectItem>
              <SelectItem value="Groww">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Groww</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type:</Label>
          <Select value={selectedTradeType} onValueChange={onTradeTypeChange}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equity-delivery">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>Delivery</span>
                </div>
              </SelectItem>
              <SelectItem value="equity-intraday">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span>Intraday</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showRiskMode && riskMode && onRiskModeChange && (
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Risk Mode:</Label>
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
        )}
      </div>
    );
  }

  // Original version for shared selector (if needed)
  return (
    <>
      {/* Show warning and disable calculators if Groww + Intraday selected */}
      {selectedTradeType === 'equity-intraday' && selectedBroker === 'Groww' && (
        <div className="mb-8 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded">
          <strong>Note:</strong> Equity Intraday calculations are only supported for Dhan broker at this time.
        </div>
      )}

      {/* Shared Settings Header */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">P&L Calculators</span>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium text-gray-600 min-w-[50px]">Broker:</Label>
              <Select value={selectedBroker} onValueChange={onBrokerChange}>
                <SelectTrigger className="w-[120px] h-9 text-sm">
                  <SelectValue placeholder="Select broker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dhan">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Dhan</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Groww">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Groww</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium text-gray-600 min-w-[35px]">Type:</Label>
              <Select value={selectedTradeType} onValueChange={onTradeTypeChange}>
                <SelectTrigger className="w-[140px] h-9 text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equity-delivery">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Delivery</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="equity-intraday">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Intraday</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};