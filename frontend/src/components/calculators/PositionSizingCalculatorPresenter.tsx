"use client"

import type React from "react"
import { useMemo, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { NumericInput } from "@/components/ui/numeric-input"
import { Calculator, CheckCircle, Zap, AlertCircle, Target } from "lucide-react"
import { ClearButton } from "@/components/shared/ClearButton"
import { CalculatorCard } from "@/components/shared/CalculatorCard"
import { BrokerTradeTypeSelector } from "@/components/shared/BrokerTradeTypeSelector"
import { RiskModeSelector } from "@/components/shared/RiskModeSelector"
import { formatCurrency } from "@/pages/Tools/ChargesUtils"
import { calculateBreakevenPrice } from "@/pages/Tools/BreakEven"
import type { PositionSizingCalculatorHook } from "@/hooks/usePositionSizingCalculator"
import type { CalculationError } from "@/services/calculators/PositionSizingCalculatorService"

interface PositionSizingCalculatorPresenterProps {
  state: PositionSizingCalculatorHook["state"]
  result: PositionSizingCalculatorHook["result"]
  error: CalculationError | null
  targetAnalysis: PositionSizingCalculatorHook["targetAnalysis"]
  updateField: PositionSizingCalculatorHook["updateField"]
  calculate: PositionSizingCalculatorHook["calculate"]
  selectedBroker: "Dhan" | "Groww"
  selectedTradeType: "equity-delivery" | "equity-intraday"
  positionType: "long" | "short"
  LEVERAGE: number
  onBrokerChange: (broker: "Dhan" | "Groww") => void
  onTradeTypeChange: (tradeType: "equity-delivery" | "equity-intraday") => void
  onPositionTypeChange: (positionType: "long" | "short") => void
}

export const PositionSizingCalculatorPresenter: React.FC<PositionSizingCalculatorPresenterProps> = ({
  state,
  result,
  error,
  targetAnalysis,
  updateField,
  calculate,
  selectedBroker,
  selectedTradeType,
  positionType,
  LEVERAGE,
  onBrokerChange,
  onTradeTypeChange,
  onPositionTypeChange,
}) => {
  // Calculate result using the hook's calculate function
  useEffect(() => {
    calculate(positionType)
  }, [state, selectedBroker, selectedTradeType, positionType, calculate])

  // Update the internal trade type when external settings change
  useEffect(() => {
    updateField("tradeType", selectedTradeType)
  }, [selectedTradeType, updateField])

  const positionSizingResult = useMemo(() => {
    if (!result) return null
    return result
  }, [result])

  // Calculate breakeven prices for both long and short positions
  const breakevenPrices = useMemo(() => {
    if (!positionSizingResult || !state.entryPrice || positionSizingResult.quantity <= 0) return null

    const entryPrice = Number.parseFloat(state.entryPrice)
    if (isNaN(entryPrice)) return null

    try {
      const longBreakeven = calculateBreakevenPrice(
        positionSizingResult.quantity,
        entryPrice,
        "NSE", // Make this configurable if needed
        selectedBroker,
        selectedTradeType,
        "long",
      )

      const shortBreakeven = calculateBreakevenPrice(
        positionSizingResult.quantity,
        entryPrice,
        "NSE", // Make this configurable if needed
        selectedBroker,
        selectedTradeType,
        "short",
      )

      return { longBreakeven, shortBreakeven }
    } catch (error) {
      console.error("Error calculating breakeven prices:", error)
      return null
    }
  }, [positionSizingResult, state.entryPrice, selectedBroker, selectedTradeType])

  return (
    <CalculatorCard
      title="Position Sizing Calculator"
      description="Calculate optimal position size based on your risk tolerance and stop loss."
    >
      {/* Compact Broker/Trade Type Selector and Risk Mode Selector */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 py-4 px-3 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <BrokerTradeTypeSelector
            selectedBroker={selectedBroker}
            selectedTradeType={selectedTradeType}
            onBrokerChange={onBrokerChange}
            onTradeTypeChange={onTradeTypeChange}
            positionType={positionType}
            onPositionTypeChange={onPositionTypeChange}
            compact={true}
          />
          <RiskModeSelector
            riskMode={state.riskMode}
            onRiskModeChange={(val) => updateField("riskMode", val)}
            compact={true}
          />
        </div>
      </div>

      {/* Combined Input Fields - Flexible Layout */}
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-orange-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-orange-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">Configure your position parameters</div>
          <ClearButton
            onClear={() => {
              updateField("capital", "")
              updateField("riskAmount", "")
              updateField("riskPercent", "")
              updateField("entryPrice", "")
              updateField("stopLoss", "")
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Risk Configuration Fields */}
          {state.riskMode === "percent" && (
            <div>
              <Label htmlFor="capital" className="text-blue-700 font-medium text-xs">
                Total Capital
              </Label>
              <NumericInput
                id="capital"
                placeholder="Enter capital"
                value={state.capital}
                onChange={(value) => updateField("capital", value)}
                className="mt-1 h-8 text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-200"
                allowDecimal={true}
                min={1}
                maxDecimalPlaces={2}
              />
            </div>
          )}

          <div>
            <Label
              htmlFor={state.riskMode === "amount" ? "riskAmount" : "riskPercent"}
              className="text-blue-700 font-medium text-xs"
            >
              {state.riskMode === "amount" ? "Risk Amount" : "Risk %"}
            </Label>
            <NumericInput
              id={state.riskMode === "amount" ? "riskAmount" : "riskPercent"}
              placeholder={state.riskMode === "amount" ? "Risk amount" : "Risk %"}
              value={state.riskMode === "amount" ? state.riskAmount : state.riskPercent}
              onChange={(value) => updateField(state.riskMode === "amount" ? "riskAmount" : "riskPercent", value)}
              className="mt-1 h-8 text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-200"
              allowDecimal={true}
              min={0.01}
              maxDecimalPlaces={state.riskMode === "amount" ? 2 : 2}
              max={state.riskMode === "percent" ? 100 : undefined}
            />
          </div>

          {/* Trade Setup Fields */}
          <div>
            <Label htmlFor="entryPrice" className="text-orange-700 font-medium text-xs">
              Entry Price
            </Label>
            <NumericInput
              id="entryPrice"
              placeholder="Entry price"
              value={state.entryPrice}
              onChange={(value) => updateField("entryPrice", value)}
              className="mt-1 h-8 text-sm border-orange-300 focus:border-orange-500 focus:ring-orange-200"
              allowDecimal={true}
              min={0.01}
              maxDecimalPlaces={2}
            />
          </div>

          <div>
            <Label htmlFor="stopLoss" className="text-orange-700 font-medium text-xs">
              Stop Loss Price
            </Label>
            <NumericInput
              id="stopLoss"
              placeholder="Stop loss price"
              value={state.stopLoss}
              onChange={(value) => updateField("stopLoss", value)}
              className="mt-1 h-8 text-sm border-orange-300 focus:border-orange-500 focus:ring-orange-200"
              allowDecimal={true}
              min={0.01}
              maxDecimalPlaces={2}
            />
            {/* Show calculated stop loss points for reference */}
            {state.entryPrice && state.stopLoss && (
              <div className="text-xs text-gray-500 mt-1">
                Stop loss points:{" "}
                {formatCurrency(Math.abs(Number.parseFloat(state.entryPrice) - Number.parseFloat(state.stopLoss)))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-red-700 mb-1">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span className="font-medium">{error.message}</span>
          </div>
          {error.suggestions && error.suggestions.length > 0 && (
            <ul className="text-sm text-red-600 pl-6 mt-1">
              {error.suggestions.map((suggestion, i) => (
                <li key={i} className="list-disc">
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
          {error.minimumRequirements?.risk && (
            <div className="text-sm text-red-600 mt-1">
              Minimum risk required: {formatCurrency(error.minimumRequirements.risk)}
            </div>
          )}
        </div>
      )}

      {positionSizingResult && !error && (
        <div className="mt-4">
          {/* Enhanced Results Section */}
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            {/* Header with status indicators */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                <h3 className="font-medium text-gray-800 dark:text-gray-100">Position Analysis</h3>
              </div>
              <div className="flex items-center gap-2">
                {positionSizingResult.chargesConsidered && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                    <CheckCircle className="h-3 w-3" />
                    <span>Charges included</span>
                  </div>
                )}
                {state.tradeType === "equity-intraday" && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                    <Zap className="h-3 w-3" />
                    <span>Leverage: {LEVERAGE}x</span>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Metrics Grid - Enhanced with Breakeven Price */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-3">
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <span className="text-gray-600 dark:text-gray-300">Quantity:</span>
                <span className="font-bold text-gray-800 dark:text-gray-100">
                  {positionSizingResult.quantity.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <span className="text-gray-600 dark:text-gray-300">Actual Risk:</span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(positionSizingResult.actualRiskAmount)}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <span className="text-gray-600 dark:text-gray-300">Breakeven Price:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {breakevenPrices
                    ? formatCurrency(
                        positionType === "long" ? breakevenPrices.longBreakeven : breakevenPrices.shortBreakeven,
                      )
                    : "-"}
                </span>
              </div>
            </div>

            {/* Total Invested Amount - Only show for Delivery trades */}
            {selectedTradeType === 'equity-delivery' && (
              <div className="mb-3">
                {/* Total Invested Amount - Most Prominent */}
                <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg border-l-4 border-slate-400">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">Total Invested Amount:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                    {formatCurrency(positionSizingResult.totalInvestedAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Enhanced Target Exit Prices Section */}
            {targetAnalysis && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Exit Prices based on Risk Reward</span>
                </div>

                {/* 1:2 Target - Most Prominent */}
                <div className="mb-2">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <span className="text-green-700 dark:text-green-300 font-semibold">1:2 Target</span>
                      {/* <span className="text-xs text-green-600 dark:text-green-400">(Recommended)</span> */}
                    </div>
                    <span className="font-bold text-green-800 dark:text-green-200 text-lg">
                      {formatCurrency(targetAnalysis.targetPrices.ratio1to2)}
                    </span>
                  </div>
                </div>

                {/* 1:1 and 1:3 Targets - Secondary */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">1:1 Target</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      {formatCurrency(targetAnalysis.targetPrices.ratio1to1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">1:3 Target</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      {formatCurrency(targetAnalysis.targetPrices.ratio1to3)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Secondary metrics in a more compact row */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <span className="text-gray-500 dark:text-gray-400">Risk Budget:</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {formatCurrency(positionSizingResult.riskBudget)}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <span className="text-gray-500 dark:text-gray-400">Est. Charges:</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {formatCurrency(positionSizingResult.estimatedCharges)}
                </span>
              </div>
            </div>

            {/* Buying power if available */}
            {positionSizingResult.hasCapital && (
              <div className="mt-2 text-center text-xs text-gray-600 dark:text-gray-300">
                Buying Power: <span className="font-medium">{formatCurrency(positionSizingResult.buyingPower)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </CalculatorCard>
  )
}
