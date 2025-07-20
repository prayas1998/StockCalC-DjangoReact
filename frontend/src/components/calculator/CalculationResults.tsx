import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import type { CalculationResultsProps } from "@/types/calculator";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const CalculationResults = ({
  calculationState,
  formatCurrency,
  exchange,
}: CalculationResultsProps) => {
  const navigate = useNavigate();
  const grossPnL = Number(calculationState.result?.summary.grossPnL ?? 0);
  const netPnL = Number(calculationState.result?.summary.netPnL ?? 0);
  const totalCharges = Number(
    calculationState.result?.charges.totalCharges ?? 0
  );
  const turnover = Number(calculationState.result?.summary.turnover || 0);

  // Determine P&L status
  const getPnLStatus = (value: number) => {
    if (value > 0)
      return { color: "text-green-600 dark:text-green-400", icon: TrendingUp };
    if (value < 0)
      return { color: "text-red-600 dark:text-red-400", icon: TrendingDown };
    return { color: "text-slate-600 dark:text-slate-400", icon: DollarSign };
  };

  const grossStatus = getPnLStatus(grossPnL);
  const netStatus = getPnLStatus(netPnL);

  return (
    <div className="mt-4 space-y-3">
      {calculationState.error && (
        <Card className="p-3 border-destructive/20 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive">
            <span className="text-sm font-medium">Calculation Error</span>
          </div>
          <div className="text-sm text-destructive/80 mt-1 whitespace-pre-line">
            {calculationState.error}
          </div>
        </Card>
      )}

      {/* Main Results - Compact Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Turnover */}
        <Card className="p-3 border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            TURNOVER
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(turnover)}
          </div>
        </Card>

        {/* Gross P&L */}
        <Card className="p-3 border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              GROSS P&L
            </span>
            <grossStatus.icon className="h-3 w-3 text-slate-400" />
          </div>
          <div className={`text-lg font-semibold ${grossStatus.color}`}>
            {formatCurrency(grossPnL)}
          </div>
        </Card>

        {/* Total Charges */}
        <Card className="p-3 border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            CHARGES
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(totalCharges)}
          </div>
        </Card>

        {/* Net P&L */}
        <Card className="p-3 border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              NET P&L
            </span>
            <netStatus.icon className="h-3 w-3 text-slate-400" />
          </div>
          <div className={`text-lg font-semibold ${netStatus.color}`}>
            {formatCurrency(netPnL)}
          </div>
        </Card>
      </div>

      {/* Charges Breakdown - Simplified */}
      <Card className="p-3 border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Charge Breakdown
        </h3>

        {/* Brokerage - Prominent */}
        <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Brokerage
          </span>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {formatCurrency(calculationState.result?.charges.brokerage ?? 0)}
          </span>
        </div>

        {/* Other Charges - Compact Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
          {[
            { key: "stt", label: "STT" },
            { key: "exchangeCharges", label: "Exchange" },
            { key: "sebiFee", label: "SEBI" },
            { key: "gst", label: "GST" },
            { key: "stampDuty", label: "Stamp" },
            { key: "dpCharges", label: "DP" },
            ...(exchange === "NSE" ? [{ key: "ipft", label: "IPFT" }] : []),
          ].map(({ key, label }) => (
            <div key={key} className="flex justify-between items-center py-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {label}
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {formatCurrency(
                  calculationState.result?.charges[
                    key as keyof typeof calculationState.result.charges
                  ] ?? 0
                )}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Journal Link - Enhanced */}
      {/* <div className="text-center py-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Visit <span className="font-medium text-slate-800 dark:text-slate-200">Journal page</span> to save trades
          </span>
        </div>
      </div> */}
      <div className="text-center py-2">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Visit <span 
            onClick={() => navigate("/journal")}
            className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
          >
            Journal page
          </span> to save trades
        </span>
      </div>
    </div>
    </div>
  );
};

export default CalculationResults;
