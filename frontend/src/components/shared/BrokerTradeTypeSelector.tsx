import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrokerType, TradeType, PositionType } from '@/context/CalculatorContext';

interface BrokerTradeTypeSelectorProps {
  selectedBroker: BrokerType;
  selectedTradeType: TradeType;
  onBrokerChange: (broker: BrokerType) => void;
  onTradeTypeChange: (tradeType: TradeType) => void;
  showRiskMode?: boolean;
  riskMode?: 'amount' | 'percent';
  onRiskModeChange?: (riskMode: 'amount' | 'percent') => void;
  positionType?: PositionType;
  onPositionTypeChange?: (positionType: PositionType) => void;
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
  positionType = 'long',
  onPositionTypeChange,
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

  // Original version for shared selector (not compact)
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      {/* Broker Selector */}
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium text-gray-500 whitespace-nowrap">Broker:</Label>
        <Select value={selectedBroker} onValueChange={onBrokerChange}>
          <SelectTrigger className="w-[100px] h-8 text-sm">
            <SelectValue>
              {selectedBroker === 'Dhan' ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Dhan</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Groww</span>
                </div>
              )}
            </SelectValue>
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
      
      {/* Trade Type Selector */}
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium text-gray-500 whitespace-nowrap">Type:</Label>
        <Select value={selectedTradeType} onValueChange={onTradeTypeChange}>
          <SelectTrigger className="w-[120px] h-8 text-sm">
            <SelectValue>
              {selectedTradeType === 'equity-delivery' ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Delivery</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Intraday</span>
                </div>
              )}
            </SelectValue>
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
      
      {/* Position Type (only shown for Dhan + Intraday) */}
      {selectedTradeType === 'equity-intraday' && selectedBroker === 'Dhan' && (
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-gray-500 whitespace-nowrap">Position:</Label>
          <Select 
            value={showRiskMode ? (riskMode || 'amount') : (positionType || 'long')} 
            onValueChange={showRiskMode ? (onRiskModeChange || (() => {})) : (onPositionTypeChange || (() => {}))}
          >
            <SelectTrigger className="w-[110px] h-8 text-sm">
              <SelectValue>
                {showRiskMode ? (
                  riskMode === 'percent' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                      <span>Percentage</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span>Fixed Amount</span>
                    </div>
                  )
                ) : (
                  positionType === 'short' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                      <span>Short</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span>Long</span>
                    </div>
                  )
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {showRiskMode ? (
                <>
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
                </>
              ) : (
                <>
                  <SelectItem value="long">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span>Long</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="short">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                      <span>Short</span>
                    </div>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Warning for Groww + Intraday */}
      {selectedTradeType === 'equity-intraday' && selectedBroker === 'Groww' && (
        <div className="w-full mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-xs rounded flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500 mr-1.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <strong className="font-medium">Note:</strong> Equity Intraday calculations are only supported for Dhan broker.
          </div>
        </div>
      )}
    </div>
  );
};