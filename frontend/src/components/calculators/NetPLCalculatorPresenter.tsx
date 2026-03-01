"use client"

import type React from "react"
import { Label } from "@/components/ui/label"
import { NumericInput } from "@/components/ui/numeric-input"
import { CalculatorCard } from "@/components/shared/CalculatorCard"
import { ResultsPanel } from "@/components/shared/ResultsPanel"
import { ClearButton } from "@/components/shared/ClearButton"
import { formatCurrency } from "@/pages/Tools/ChargesUtils"
import type { NetPLCalculatorHook } from "@/hooks/useNetPLCalculator"
import type { SharedCalculatorState } from "@/hooks/useSharedCalculatorState"
import { Button } from "@/components/ui/button"
import { Calculator, TrendingUp, TrendingDown } from "lucide-react"
import {
  computeNetCashflow,
  deriveBuySellLegCharges,
  deriveDirectionalBuySellValues,
} from "@/utils/cashflow"

interface NetPLCalculatorPresenterProps extends NetPLCalculatorHook {
  sharedState: SharedCalculatorState
  onPositionTypeChange: (positionType: "long" | "short") => void
  onBrokerChange: (broker: "Dhan" | "Groww") => void
  onTradeTypeChange: (tradeType: "equity-delivery" | "equity-intraday") => void
}

export const NetPLCalculatorPresenter: React.FC<NetPLCalculatorPresenterProps> = ({
  state,
  result,
  updateField,
  calculate,
  sharedState,
  onPositionTypeChange,
  onBrokerChange,
  onTradeTypeChange,
}) => {
  const isDisabled = sharedState.selectedTradeType === "equity-intraday" && sharedState.selectedBroker === "Groww"
  const quantity = Number.parseInt(state.quantity || "0", 10)
  const entryPrice = Number.parseFloat(state.buyPrice || "0")
  const exitPriceInput = Number.parseFloat(state.sellPrice || "0")
  const effectiveExitPrice = exitPriceInput > 0 ? exitPriceInput : (result?.breakevenPrice ?? 0)
  const tradeEntryValue = Number.isFinite(quantity) && Number.isFinite(entryPrice) ? quantity * entryPrice : 0
  const tradeExitValue = Number.isFinite(quantity) && Number.isFinite(effectiveExitPrice) ? quantity * effectiveExitPrice : 0
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

  return (
    <CalculatorCard
      title="Net P&L Calculator"
      description="Calculate your net profit or loss after all charges based on your entry and exit prices."
      disabled={isDisabled}
      icon={result?.isProfit ? TrendingUp : TrendingDown}
    >
      {/* Compact Header with Clear Button */}
      <div className="flex items-center justify-end mb-4">
        <ClearButton
          onClear={() => {
            updateField("quantity", "")
            updateField("buyPrice", "")
            updateField("sellPrice", "")
          }}
        />
      </div>

      {/* Enhanced Form Fields */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="profitQuantity"
            className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2"
          >
            <span>Quantity</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">(shares)</span>
          </Label>
          <NumericInput
            id="profitQuantity"
            placeholder="Enter quantity"
            value={state.quantity}
            onChange={(value) => updateField("quantity", value)}
            className="h-11 text-base bg-white/50 dark:bg-slate-800/50 border-slate-300/50 dark:border-slate-600/50 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
            allowDecimal={false}
            min={1}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="profitBuyPrice"
            className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2"
          >
            <span>Entry Price Per Share</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">(₹)</span>
          </Label>
          <NumericInput
            id="profitBuyPrice"
            placeholder="Enter entry price"
            value={state.buyPrice}
            onChange={(value) => updateField("buyPrice", value)}
            className="h-11 text-base bg-white/50 dark:bg-slate-800/50 border-slate-300/50 dark:border-slate-600/50 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
            allowDecimal={true}
            min={0.01}
            maxDecimalPlaces={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="sellPrice"
            className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2"
          >
            <span>Exit Price Per Share</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">(₹)</span>
          </Label>
          <NumericInput
            id="sellPrice"
            placeholder="Enter exit price"
            value={state.sellPrice}
            onChange={(value) => updateField("sellPrice", value)}
            className="h-11 text-base bg-white/50 dark:bg-slate-800/50 border-slate-300/50 dark:border-slate-600/50 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
            allowDecimal={true}
            min={0.01}
            maxDecimalPlaces={2}
          />
        </div>
      </div>

      {/* Enhanced Calculate Button */}
      <div className="mt-6">
        <Button
          onClick={calculate}
          className="w-full h-11 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 transform hover:scale-[1.01]"
          aria-label="Calculate Net P&L"
        >
          <Calculator className="h-4 w-4 mr-2" />
          Calculate P&L
        </Button>
      </div>

      {result && (
        <ResultsPanel
          title="P&L Analysis"
          results={[
            {
              label: "Gross",
              value: formatCurrency(Math.abs(result.grossProfit)),
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
              label:
                Math.abs(result.netProfit) < 0.01 ? "Net (Breakeven)" : result.isProfit ? "Net Profit" : "Net Loss",
              value: `${formatCurrency(Math.abs(result.netProfit))} (${result.profitPercentage.toFixed(2)}%)`,
              className: `font-semibold text-lg ${Math.abs(result.netProfit) < 0.01 ? "text-slate-500 dark:text-slate-400" : result.isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`,
              style: { color: Math.abs(result.netProfit) < 0.01 ? "#6b7280" : result.isProfit ? "#16a34a" : "#dc2626" },
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
