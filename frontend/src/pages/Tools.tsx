"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Header from "@/components/ui/header"
import { useSharedCalculatorState } from "@/hooks/useSharedCalculatorState"
import { ProfitTargetCalculatorContainer } from "@/components/calculators/ProfitTargetCalculatorContainer"
import { NetPLCalculatorContainer } from "@/components/calculators/NetPLCalculatorContainer"
import { PositionSizingCalculatorContainer } from "@/components/calculators/PositionSizingCalculatorContainer"
import { BrokerTradeTypeSelector } from "@/components/shared/BrokerTradeTypeSelector"
import { TrendingUp, Settings } from "lucide-react"

const Tools = () => {
  const navigate = useNavigate()
  // Shared state for P&L calculators
  const sharedState = useSharedCalculatorState()

  // Independent state for Position Sizing Calculator
  const [positionSizingBroker, setPositionSizingBroker] = useState<"Dhan" | "Groww">("Dhan")
  const [positionSizingTradeType, setPositionSizingTradeType] = useState<"equity-delivery" | "equity-intraday">(
    "equity-delivery",
  )

  const LEVERAGE = 5
  const exchange = "NSE" // Fixed to NSE as in original

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#060a12] dark:via-[#080d18] dark:to-[#060a12]">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Position Sizing Calculator - with independent state */}
        <div className="mb-16">
          <PositionSizingCalculatorContainer
            selectedBroker={positionSizingBroker}
            selectedTradeType={positionSizingTradeType}
            exchange={exchange}
            LEVERAGE={LEVERAGE}
            onBrokerChange={setPositionSizingBroker}
            onTradeTypeChange={setPositionSizingTradeType}
          />
        </div>

        {/* P&L Calculators Section - Enhanced Design */}
        <div className="space-y-6">
          {/* Section Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                P&L Calculators
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                Calculate profit and loss scenarios with precision
              </p>
            </div>
          </div>

          {/* Compact Settings Panel */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-border/60 shadow-lg overflow-hidden">
              {/* Compact Settings Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-slate-50/80 to-white/80 dark:from-card dark:to-muted/80 border-b border-slate-200/50 dark:border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/25">
                      <Settings className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Settings</h3>
                    </div>
                  </div>

                  {/* Exchange Badge */}
                  <div className="px-2.5 py-1 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-lg border border-emerald-200/50 dark:border-emerald-700/50">
                    {sharedState.exchange}
                  </div>
                </div>
              </div>

              {/* Compact Settings Content */}
              <div className="p-4">
                <BrokerTradeTypeSelector
                  selectedBroker={sharedState.selectedBroker}
                  selectedTradeType={sharedState.selectedTradeType}
                  onBrokerChange={sharedState.setSelectedBroker}
                  onTradeTypeChange={sharedState.setSelectedTradeType}
                  positionType={sharedState.positionType}
                  onPositionTypeChange={sharedState.setPositionType}
                />
              </div>
            </div>
          </div>

          {/* Enhanced P&L Calculators Grid */}
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="group">
                <div className="transform transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-slate-200/25 dark:hover:shadow-[rgba(59,130,246,0.1)]">
                  <ProfitTargetCalculatorContainer
                    sharedState={sharedState}
                    onPositionTypeChange={sharedState.setPositionType}
                    onBrokerChange={sharedState.setSelectedBroker}
                    onTradeTypeChange={sharedState.setSelectedTradeType}
                  />
                </div>
              </div>

              <div className="group">
                <div className="transform transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-slate-200/25 dark:hover:shadow-[rgba(59,130,246,0.1)]">
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
      </div>
    </div>
  )
}

export default Tools
