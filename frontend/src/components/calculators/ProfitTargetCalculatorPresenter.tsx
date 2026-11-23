"use client"

import type React from "react"
import { Label } from "@/components/ui/label"
import { NumericInput } from "@/components/ui/numeric-input"
import { CalculatorCard } from "@/components/shared/CalculatorCard"
import { ResultsPanel } from "@/components/shared/ResultsPanel"
import { ClearButton } from "@/components/shared/ClearButton"
import { formatCurrency } from "@/pages/Tools/ChargesUtils"
import type { ProfitTargetCalculatorHook } from "@/hooks/useProfitTargetCalculator"
import type { SharedCalculatorState } from "@/hooks/useSharedCalculatorState"
import { Button } from "@/components/ui/button"
import { Calculator, Target } from "lucide-react"
import {
  computeNetCashflow,
  deriveBuySellLegCharges,
  deriveDirectionalBuySellValues,
} from "@/utils/cashflow"

interface ProfitTargetCalculatorPresenterProps extends ProfitTargetCalculatorHook {
  sharedState: SharedCalculatorState
  onPositionTypeChange: (positionType: "long" | "short") => void
  onBrokerChange: (broker: "Dhan" | "Groww") => void
  onTradeTypeChange: (tradeType: "equity-delivery" | "equity-intraday") => void
}

export const ProfitTargetCalculatorPresenter: React.FC<ProfitTargetCalculatorPresenterProps> = ({
  state,
  result,
  updateField,
  calculate,
  sharedState,
  onPositionTypeChange,
  onBrokerChange,
  onTradeTypeChange,
}) => {
  const isIntradayShort =
    sharedState.selectedTradeType === "equity-intraday" &&
    sharedState.positionType === "short"
  const quantity = Number.parseInt(state.quantity || "0", 10)
  const entryPrice = Number.parseFloat(state.buyPrice || "0")
  const tradeEntryValue = Number.isFinite(quantity) && Number.isFinite(entryPrice) ? quantity * entryPrice : 0
  const tradeExitValue =
    Number.isFinite(quantity) && result ? quantity * result.sellingPrice : 0
  const { buyValue, sellValue } = deriveDirectionalBuySellValues({
    tradeEntryValue,
    tradeExitValue,
    tradeType: sharedState.selectedTradeType,
    positionType: sharedState.positionType,
    broker: sharedState.selectedBroker,
  })
  const { buySideCharges, sellSideCharges } = deriveBuySellLegCharges({
    buyValue,
    sellValue,
    exchange: sharedState.exchange,
    broker: sharedState.selectedBroker,
    tradeType: sharedState.selectedTradeType,
    totalCharges: result?.charges.totalCharges,
  })
  const { netPayable, netReceivable } = computeNetCashflow({
    buyValue,
    sellValue,
    buySideCharges,
    sellSideCharges,
  })

  const shortTargetWarning = (() => {
    if (!result || !isIntradayShort) return null

    const profitPct = Number.parseFloat(state.profitPercentage)
    const quantity = Number.parseInt(state.quantity)
    const entryPrice = Number.parseFloat(state.buyPrice)

    if (!Number.isFinite(profitPct) || !Number.isFinite(quantity) || !Number.isFinite(entryPrice) || profitPct <= 0) {
      return null
    }

    const cappedPct = Math.min(profitPct, 100)
    const targetNetProfit = entryPrice * quantity * (cappedPct / 100)

    const tolerance = 0.01
    const isAtMinimumPrice = result.sellingPrice <= 0.05 + 1e-9

    if (isAtMinimumPrice && result.netProfit + tolerance < targetNetProfit) {
      return "Target net profit isn't reachable for short positions after charges. Showing the maximum achievable result at ₹0.05."
    }

    if (profitPct > 100) {
      return "Short position profit targets are capped at 100%."
    }

    return null
  })()

  return (
    <CalculatorCard
      title="Profit Target Calculator"
      description="Calculate the required exit price to achieve your target profit percentage after all charges."
      icon={Target}
    >
      {/* Compact Header with Clear Button */}
      <div className="flex items-center justify-end mb-4">
        <ClearButton
          onClear={() => {
            updateField("quantity", "")
            updateField("buyPrice", "")
            updateField("profitPercentage", "")
          }}
        />
      </div>

      {/* Enhanced Form Fields */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="quantity"
            className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2"
          >
            <span>Quantity</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">(shares)</span>
          </Label>
          <NumericInput
            id="quantity"
            placeholder="Enter quantity"
            value={state.quantity}
            onChange={(value) => updateField("quantity", value)}
            className="h-11 text-base bg-white/50 dark:bg-slate-800/50 border-slate-300/50 dark:border-slate-600/50 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 transition-all duration-200"
            allowDecimal={false}
            min={1}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="buyPrice"
            className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2"
          >
            <span>Entry Price Per Share</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">(₹)</span>
          </Label>
          <NumericInput
            id="buyPrice"
            placeholder="Enter entry price"
            value={state.buyPrice}
            onChange={(value) => updateField("buyPrice", value)}
            className="h-11 text-base bg-white/50 dark:bg-slate-800/50 border-slate-300/50 dark:border-slate-600/50 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 transition-all duration-200"
            allowDecimal={true}
            min={0.01}
            maxDecimalPlaces={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="profitPercentage"
            className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2"
          >
            <span>Target Profit Percentage</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">(%)</span>
          </Label>
          <NumericInput
            id="profitPercentage"
            placeholder="Enter percentage (e.g. 5 for 5%)"
            value={state.profitPercentage}
            onChange={(value) => updateField("profitPercentage", value)}
            className="h-11 text-base bg-white/50 dark:bg-slate-800/50 border-slate-300/50 dark:border-slate-600/50 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 transition-all duration-200"
            allowDecimal={true}
            min={0}
            max={isIntradayShort ? 100 : undefined}
            maxDecimalPlaces={2}
          />
        </div>
      </div>

      {/* Enhanced Calculate Button */}
      <div className="mt-6">
        <Button
          onClick={calculate}
          className="w-full h-11 text-base font-medium bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 transform hover:scale-[1.01]"
          aria-label="Calculate Profit Target"
        >
          <Calculator className="h-4 w-4 mr-2" />
          Calculate Target Price
        </Button>
      </div>

      {shortTargetWarning && (
        <div className="mt-6 p-3 bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/50 rounded-xl text-sm text-amber-800 dark:text-amber-200">
          {shortTargetWarning}
        </div>
      )}

      {result && (
        <ResultsPanel
          title="Target Analysis"
          results={[
            {
              label: "Required Exit Price",
              value: formatCurrency(result.sellingPrice),
              className: "text-emerald-600 dark:text-emerald-400 font-semibold text-lg",
            },
            {
              label: "Gross Profit",
              value: formatCurrency(result.grossProfit),
              className: "text-slate-700 dark:text-slate-300",
            },
            {
              label: "Total Charges",
              value: formatCurrency(result.charges.totalCharges),
              className: "text-slate-600 dark:text-slate-400",
            },
            {
              label: "Net Payable",
              value: formatCurrency(netPayable),
              className: "text-slate-600 dark:text-slate-400",
            },
            {
              label: "Net Receivable",
              value: formatCurrency(netReceivable),
              className: "text-slate-600 dark:text-slate-400",
            },
            {
              label: "Net Profit",
              value: formatCurrency(result.netProfit),
              className: "font-semibold text-lg",
              style: { color: result.netProfit > 0 ? "#16a34a" : "#dc2626" },
            },
          ]}
          charges={result.charges}
          exchange={sharedState.exchange}
          breakevenPrice={result.breakevenPrice}
        />
      )}
    </CalculatorCard>
  )
}
