import type React from "react"
import { formatCurrency, type Charges } from "@/pages/Tools/ChargesUtils"
import { BarChart3, TrendingUp, Info } from "lucide-react"

interface ResultsPanelProps {
  title: string
  results: Array<{
    label: string
    value: string
    className?: string
    style?: React.CSSProperties
  }>
  charges: Charges
  exchange: string
  breakevenPrice?: number
  showChargesBreakdown?: boolean
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  title,
  results,
  charges,
  exchange,
  breakevenPrice,
  showChargesBreakdown = true,
}) => {
  return (
    <div className="mt-6 bg-gradient-to-br from-slate-50/80 to-white/80 dark:from-slate-800/80 dark:to-slate-700/80 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
      {/* Compact Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-100/50 to-slate-50/50 dark:from-slate-700/50 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-600/50">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-300 dark:to-slate-400 shadow-sm">
            <BarChart3 className="w-3 h-3 text-white dark:text-slate-800" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
      </div>

      {/* Compact Results Content */}
      <div className="p-4 space-y-3">
        {/* Main Results */}
        <div className="space-y-2">
          {results.map((result, index) => (
            <div
              key={index}
              className={`flex justify-between items-center py-1.5 ${result.className || ""}`}
              style={result.style}
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{result.label}:</span>
              <span className="font-semibold">{result.value}</span>
            </div>
          ))}
        </div>

        {/* Breakeven Price Display */}
        {typeof breakevenPrice === "number" && (
          <div className="mt-3 p-2.5 bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Breakeven:</span>
              </div>
              <span className="font-semibold text-amber-800 dark:text-amber-200">{formatCurrency(breakevenPrice)}</span>
            </div>
          </div>
        )}

        {/* Compact Charges Breakdown */}
        {showChargesBreakdown && (
          <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-600/50">
            <div className="flex items-center space-x-1.5 mb-2">
              <Info className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Charges Breakdown</div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 dark:text-slate-400">Brokerage:</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(charges.brokerage)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 dark:text-slate-400">STT:</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(charges.stt)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 dark:text-slate-400">Exchange:</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(charges.exchangeCharges)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 dark:text-slate-400">GST:</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(charges.gst)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 dark:text-slate-400">Stamp Duty:</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(charges.stampDuty)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 dark:text-slate-400">SEBI Fee:</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(charges.sebiCharges)}
                </span>
              </div>
              {exchange === "NSE" && (
                <div className="flex justify-between items-center col-span-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400">IPFT:</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {formatCurrency(charges.ipft)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
