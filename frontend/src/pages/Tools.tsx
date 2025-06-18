import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/ui/header";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSharedCalculatorState } from "@/hooks/useSharedCalculatorState";
import { ProfitTargetCalculatorContainer } from "@/components/calculators/ProfitTargetCalculatorContainer";
import { NetPLCalculatorContainer } from "@/components/calculators/NetPLCalculatorContainer";
import { PositionSizingCalculatorContainer } from "@/components/calculators/PositionSizingCalculatorContainer";

const Tools = () => {
  const navigate = useNavigate();
  const sharedState = useSharedCalculatorState();
  const LEVERAGE = 5;


  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Position Sizing Calculator */}
        <PositionSizingCalculatorContainer
          selectedBroker={sharedState.selectedBroker}
          selectedTradeType={sharedState.selectedTradeType}
          exchange={sharedState.exchange}
          LEVERAGE={LEVERAGE}
          onBrokerChange={sharedState.setSelectedBroker}
          onTradeTypeChange={sharedState.setSelectedTradeType}
        />

        {/* P&L Calculators Section - with improved spacing */}
        <div className="mt-16 mb-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">P&L Calculators</h2>
            <p className="text-sm text-gray-600 mt-1">Calculate profit and loss with different scenarios</p>
          </div>
          
          {/* Shared Broker Selector for P&L Calculators - more compact and elegant design */}
          <div className="mb-6 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center mr-4">
                <div className="h-4 w-1 bg-primary rounded-full mr-2"></div>
                <h3 className="text-sm font-medium text-gray-700">Settings</h3>
              </div>
              
              {/* Exchange Badge - moved to header */}
              <div className="ml-auto">
                <div className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                  Exchange: {sharedState.exchange}
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {/* Broker Selector */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-gray-500 whitespace-nowrap">Broker:</Label>
                  <Select value={sharedState.selectedBroker} onValueChange={sharedState.setSelectedBroker}>
                    <SelectTrigger className="w-[100px] h-8 text-sm">
                      <SelectValue placeholder="Select" />
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
                  <Select value={sharedState.selectedTradeType} onValueChange={sharedState.setSelectedTradeType}>
                    <SelectTrigger className="w-[100px] h-8 text-sm">
                      <SelectValue placeholder="Select" />
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
                {sharedState.selectedTradeType === 'equity-intraday' && sharedState.selectedBroker === 'Dhan' && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium text-gray-500 whitespace-nowrap">Position:</Label>
                    <Select value={sharedState.positionType} onValueChange={sharedState.setPositionType}>
                      <SelectTrigger className="w-[110px] h-8 text-sm">
                        <SelectValue />
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
              
              {/* Warning for Groww + Intraday */}
              {sharedState.selectedTradeType === 'equity-intraday' && sharedState.selectedBroker === 'Groww' && (
                <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-xs rounded flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500 mr-1.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <strong className="font-medium">Note:</strong> Equity Intraday calculations are only supported for Dhan broker.
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* P&L Calculators Grid - enhanced layout */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="transition-all duration-200 hover:shadow-md">
              <ProfitTargetCalculatorContainer
                sharedState={sharedState}
                onPositionTypeChange={sharedState.setPositionType}
                onBrokerChange={sharedState.setSelectedBroker}
                onTradeTypeChange={sharedState.setSelectedTradeType}
              />
            </div>
            <div className="transition-all duration-200 hover:shadow-md">
              <NetPLCalculatorContainer
                sharedState={sharedState}
                onPositionTypeChange={sharedState.setPositionType}
                onBrokerChange={sharedState.setSelectedBroker}
                onTradeTypeChange={sharedState.setSelectedTradeType}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tools;