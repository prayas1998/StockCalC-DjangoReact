import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrokerType, TradeType, PositionType } from '@/context/CalculatorContext';

interface BrokerTradeTypeSelectorProps {
  selectedBroker: BrokerType;
  selectedTradeType: TradeType;
  onBrokerChange: (broker: BrokerType) => void;
  onTradeTypeChange: (tradeType: TradeType) => void;
  positionType?: PositionType;
  onPositionTypeChange?: (positionType: PositionType) => void;
  compact?: boolean;
}

export const BrokerTradeTypeSelector: React.FC<BrokerTradeTypeSelectorProps> = ({
  selectedBroker,
  selectedTradeType,
  onBrokerChange,
  onTradeTypeChange,
  positionType = 'long',
  onPositionTypeChange,
  compact = false
}) => {
  if (compact) {
    // Compact version for individual calculators
    return (
      <div className="flex flex-wrap gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-md border-l-4 border-primary">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">Broker:</Label>
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
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">Type:</Label>
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
        {selectedTradeType === 'equity-intraday' && onPositionTypeChange && (
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">Position:</Label>
            <Select value={positionType} onValueChange={onPositionTypeChange}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="long">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span>Long</span>
                  </div>
                </SelectItem>
                <SelectItem value="short">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                    <span>Short</span>
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
    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md border-l-4 border-primary">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      {/* Broker Selector */}
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium text-gray-500 dark:text-gray-300 whitespace-nowrap">Broker:</Label>
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
        <Label className="text-xs font-medium text-gray-500 dark:text-gray-300 whitespace-nowrap">Type:</Label>
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
      
      {/* Position Type (shown for Intraday) */}
      {selectedTradeType === 'equity-intraday' && onPositionTypeChange && (
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-300 whitespace-nowrap">Position:</Label>
          <Select 
            value={positionType || 'long'} 
            onValueChange={onPositionTypeChange || (() => {})}
          >
            <SelectTrigger className="w-[110px] h-8 text-sm">
              <SelectValue>
                {positionType === 'short' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                    <span>Short</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span>Long</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
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
            </SelectContent>
          </Select>
        </div>
      )}
      
      </div>
    </div>
  );
};
