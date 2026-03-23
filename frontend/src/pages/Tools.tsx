"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Header from "@/components/ui/header"
import { useSharedCalculatorState } from "@/hooks/useSharedCalculatorState"
import { ProfitTargetCalculatorContainer } from "@/components/calculators/ProfitTargetCalculatorContainer"
import { NetPLCalculatorContainer } from "@/components/calculators/NetPLCalculatorContainer"
import { PositionSizingCalculatorContainer } from "@/components/calculators/PositionSizingCalculatorContainer"
import { BrokerTradeTypeSelector } from "@/components/shared/BrokerTradeTypeSelector"
import { TrendingUp } from "lucide-react"

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

        {/* P&L Calculators Section */}
        <div className="rounded-2xl border border-border/50 bg-white/50 dark:bg-card/50 backdrop-blur-sm overflow-hidden">

          {/* Settings strip — top zone of the unified container */}
          <div className="px-5 pt-4 pb-4 border-b border-border/50">
            {/* Title row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                    P&L Calculators
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-muted-foreground leading-tight">
                    Shared settings apply to both calculators
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-700/40">
                {exchange}
              </span>
            </div>

            {/* Selector */}
            <BrokerTradeTypeSelector
              selectedBroker={sharedState.selectedBroker}
              selectedTradeType={sharedState.selectedTradeType}
              onBrokerChange={sharedState.setSelectedBroker}
              onTradeTypeChange={sharedState.setSelectedTradeType}
              positionType={sharedState.positionType}
              onPositionTypeChange={sharedState.setPositionType}
            />
          </div>

          {/* Calculators grid */}
          <div className="p-4 sm:p-5">
            <div className="grid lg:grid-cols-2 gap-5">
              <ProfitTargetCalculatorContainer
                sharedState={sharedState}
                onPositionTypeChange={sharedState.setPositionType}
                onBrokerChange={sharedState.setSelectedBroker}
                onTradeTypeChange={sharedState.setSelectedTradeType}
              />
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
  )
}

export default Tools
