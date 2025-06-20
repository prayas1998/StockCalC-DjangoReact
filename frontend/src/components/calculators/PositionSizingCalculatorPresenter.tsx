"use client"

import type React from "react"
import { useMemo, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { NumericInput } from "@/components/ui/numeric-input"
import { Calculator, CheckCircle, TrendingUp, TrendingDown, Zap, RotateCcw } from "lucide-react"
import { CalculatorCard } from "@/components/shared/CalculatorCard"
import { BrokerTradeTypeSelector } from "@/components/shared/BrokerTradeTypeSelector"
import { formatCurrency } from "@/pages/Tools/ChargesUtils"
import { calculateBreakevenPrice } from "@/pages/Tools/BreakEven"
import type { PositionSizingCalculatorHook } from "@/hooks/usePositionSizingCalculator"

interface PositionSizingCalculatorPresenterProps extends PositionSizingCalculatorHook {
  selectedBroker: "Dhan" | "Groww"
  selectedTradeType: "equity-delivery" | "equity-intraday"
  LEVERAGE: number
  onBrokerChange: (broker: "Dhan" | "Groww") => void
  onTradeTypeChange: (tradeType: "equity-delivery" | "equity-intraday") => void
}

export const PositionSizingCalculatorPresenter: React.FC<PositionSizingCalculatorPresenterProps> = ({
  state,
  result,
  updateField,
  calculate,
  selectedBroker,
  selectedTradeType,
  LEVERAGE,
  onBrokerChange,
  onTradeTypeChange,
}) => {
  // Calculate result using the hook's calculate function
  useEffect(() => {
    calculate()
  }, [state, selectedBroker, selectedTradeType, calculate])

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
      {/* Compact Broker/Trade Type Selector */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-3 rounded-lg border border-gray-200">
        <BrokerTradeTypeSelector
          selectedBroker={selectedBroker}
          selectedTradeType={selectedTradeType}
          onBrokerChange={onBrokerChange}
          onTradeTypeChange={onTradeTypeChange}
          showRiskMode={true}
          riskMode={state.riskMode}
          onRiskModeChange={(val) => updateField("riskMode", val)}
          positionType="long"
          onPositionTypeChange={() => {}}
          compact={true}
        />
      </div>

      {/* Combined Input Fields - Flexible Layout */}
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-orange-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">Configure your position parameters</div>
          <button
            onClick={() => {
              updateField("capital", "")
              updateField("riskAmount", "")
              updateField("riskPercent", "")
              updateField("entryPrice", "")
              updateField("stopLoss", "")
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Clear all fields"
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </button>
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
              Stop Loss
            </Label>
            <NumericInput
              id="stopLoss"
              placeholder="Stop loss"
              value={state.stopLoss}
              onChange={(value) => updateField("stopLoss", value)}
              className="mt-1 h-8 text-sm border-orange-300 focus:border-orange-500 focus:ring-orange-200"
              allowDecimal={true}
              min={0.01}
              maxDecimalPlaces={2}
            />
          </div>
        </div>
      </div>

      {positionSizingResult && (
        <div className="mt-4">
          {/* Compact Results Section */}
          <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Header with status indicators */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-gray-600" />
                <h3 className="font-medium text-gray-800">Position Analysis</h3>
              </div>
              <div className="flex items-center gap-2">
                {positionSizingResult.chargesConsidered && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    <CheckCircle className="h-3 w-3" />
                    <span>Charges included</span>
                  </div>
                )}
                {state.tradeType === "equity-intraday" && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    <Zap className="h-3 w-3" />
                    <span>Leverage: {LEVERAGE}x</span>
                  </div>
                )}
              </div>
            </div>

            {/* Compact 4x2 Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-bold text-gray-800">{positionSizingResult.quantity.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Actual Risk:</span>
                <span className="font-bold text-red-600">{formatCurrency(positionSizingResult.actualRiskAmount)}</span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-gray-600">Long BreakEven:</span>
                </div>
                <span className="font-bold text-green-600">
                  {breakevenPrices ? formatCurrency(breakevenPrices.longBreakeven) : "-"}
                </span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-gray-600">Short BreakEven:</span>
                </div>
                <span className="font-bold text-red-600">
                  {breakevenPrices ? formatCurrency(breakevenPrices.shortBreakeven) : "-"}
                </span>
              </div>
            </div>

            {/* Secondary metrics in a more compact row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-500">Position Value:</span>
                <span className="font-medium text-gray-700">{formatCurrency(positionSizingResult.positionValue)}</span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-500">Capital Used:</span>
                <span className="font-medium text-gray-700">{formatCurrency(positionSizingResult.capitalUsed)}</span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-500">Risk Budget:</span>
                <span className="font-medium text-gray-700">{formatCurrency(positionSizingResult.riskBudget)}</span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-500">Est. Charges:</span>
                <span className="font-medium text-amber-600">
                  {formatCurrency(positionSizingResult.estimatedCharges)}
                </span>
              </div>
            </div>

            {/* Buying power if available */}
            {positionSizingResult.hasCapital && (
              <div className="mt-2 text-center text-xs text-gray-600">
                Buying Power: <span className="font-medium">{formatCurrency(positionSizingResult.buyingPower)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </CalculatorCard>
  )
}
