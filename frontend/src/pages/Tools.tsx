import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/ui/header";
import { Label } from "@/components/ui/label";
import { useSharedCalculatorState } from "@/hooks/useSharedCalculatorState";
import { ProfitTargetCalculatorContainer } from "@/components/calculators/ProfitTargetCalculatorContainer";
import { NetPLCalculatorContainer } from "@/components/calculators/NetPLCalculatorContainer";
import { PositionSizingCalculatorContainer } from "@/components/calculators/PositionSizingCalculatorContainer";
import { BrokerTradeTypeSelector } from "@/components/shared/BrokerTradeTypeSelector";

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
              {/* Use the shared BrokerTradeTypeSelector component */}
              <BrokerTradeTypeSelector
                selectedBroker={sharedState.selectedBroker}
                selectedTradeType={sharedState.selectedTradeType}
                onBrokerChange={sharedState.setSelectedBroker}
                onTradeTypeChange={sharedState.setSelectedTradeType}
                compact={false}
              />
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