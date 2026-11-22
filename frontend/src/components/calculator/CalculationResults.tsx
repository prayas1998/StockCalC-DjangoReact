import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import type { CalculationResultsProps } from "@/types/calculator";
import { useNavigate } from "react-router-dom";
import {
  computeNetCashflow,
  deriveBuySellLegCharges,
} from "@/utils/cashflow";

const formatPct = (value: number, decimals = 2) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;

const CalculationResults = ({
  calculationState,
  formatCurrency,
  exchange,
  tradeType,
  positionType,
  broker,
}: CalculationResultsProps) => {
  const navigate = useNavigate();
  const summary = calculationState.result?.summary;
  const charges = calculationState.result?.charges;
  const openQuantity = Number(summary?.openQuantity ?? 0);
  const openPosition = summary?.openSide === (positionType === "short" ? "sell" : "buy");
  const combinedExchangeFee = charges?.exchangeAndIpft != null;
  const grossPnL = Number(summary?.grossPnL ?? 0);
  const netPnL = Number(summary?.netPnL ?? 0);
  const totalCharges = Number(charges?.totalCharges ?? 0);
  const totalBuyValue = Number(summary?.totalBuyValue ?? 0);
  const totalSellValue = Number(summary?.totalSellValue ?? 0);
  const turnover = Number(summary?.turnover ?? 0);
  const { buySideCharges, sellSideCharges } = deriveBuySellLegCharges({
    buyValue: totalBuyValue,
    sellValue: totalSellValue,
    exchange,
    broker,
    tradeType,
    totalCharges,
  });
  const estimatedCashflow = computeNetCashflow({
    buyValue: totalBuyValue,
    sellValue: totalSellValue,
    buySideCharges,
    sellSideCharges,
  });

  const netPayable = Number(summary?.netPayable ?? estimatedCashflow.netPayable);
  const netReceivable = Number(summary?.netReceivable ?? estimatedCashflow.netReceivable);

  // Percentage metrics (only when results are present)
  const hasResults = calculationState.result !== null;
  const netPnLPct = hasResults && netPayable > 0 && openQuantity === 0 && positionType === "long"
    ? (netPnL / netPayable) * 100
    : null;
  const chargesPct = hasResults && turnover > 0
    ? (totalCharges / turnover) * 100
    : null;

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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Turnover */}
        <Card className="p-3 border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            TURNOVER
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(turnover)}
          </div>
        </Card>

        {/* Net P&L */}
        <Card className="p-3 border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {summary?.matchedQuantity === undefined ? "NET P&L" : "REALIZED NET P&L"}
            </span>
            <netStatus.icon className="h-3 w-3 text-slate-400" />
          </div>
          <div className={`text-lg font-semibold ${netStatus.color}`}>
            {formatCurrency(netPnL)}
          </div>
          {netPnLPct !== null && (
            <div className={`text-xs font-medium mt-0.5 ${netStatus.color}`}>
              {formatPct(netPnLPct)} on invested capital
            </div>
          )}
        </Card>

        {/* Total Charges */}
        <Card className="p-3 border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            CHARGES
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(totalCharges)}
          </div>
          {chargesPct !== null && (
            <div className="text-xs font-medium mt-0.5 text-slate-500 dark:text-slate-400">
              {formatPct(chargesPct, 3)} of turnover
            </div>
          )}
        </Card>

        {/* Gross P&L */}
        <Card className="p-3 border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {summary?.matchedQuantity === undefined ? "GROSS P&L" : "REALIZED GROSS P&L"}
            </span>
            <grossStatus.icon className="h-3 w-3 text-slate-400" />
          </div>
          <div className={`text-lg font-semibold ${grossStatus.color}`}>
            {formatCurrency(grossPnL)}
          </div>
        </Card>

        {/* Net Payable */}
        <Card className="p-3 border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            NET PAYABLE
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(netPayable)}
          </div>
        </Card>

        {/* Net Receivable */}
        <Card className="p-3 border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            NET RECEIVABLE
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(netReceivable)}
          </div>
        </Card>
      </div>

      {openQuantity > 0 && (
        <Card className="p-3 border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {openPosition ? "Open position" : "Unmatched exit"} · {openQuantity} shares
          </div>
          <div className="mt-1 text-sm font-semibold tabular-nums">
            Cash flow {formatCurrency(summary?.openCashFlow)}
          </div>
        </Card>
      )}

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
            {formatCurrency(charges?.brokerage ?? 0)}
          </span>
        </div>

        {/* Other Charges - Compact Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
          {[
            { key: "stt", label: "STT" },
            combinedExchangeFee
              ? { key: "exchangeAndIpft", label: "Exchange + IPFT" }
              : { key: "exchangeCharges", label: "Exchange" },
            { key: "sebiFee", label: "SEBI" },
            { key: "gst", label: "GST" },
            { key: "stampDuty", label: "Stamp" },
            { key: "dpCharges", label: "DP" },
            ...(exchange === "NSE" && !combinedExchangeFee ? [{ key: "ipft", label: "IPFT" }] : []),
          ].map(({ key, label }) => (
            <div key={key} className="flex justify-between items-center py-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {label}
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {formatCurrency(charges?.[key] ?? 0)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {exchange === "BSE" ? "BSE standard-group rates only." : "NSE fee schedule effective 1 March 2026."}
          {" Enter rows for one stock" + (tradeType === "equity-intraday" ? " and one trading day." : ".")}
          {tradeType === "equity-delivery" && (broker === "Groww"
            ? " Each sell row represents one order and uses the standard depository rate. Combine fills from the same order."
            : " Each sell row represents one debit instruction. Combine fills from the same instruction.")}
        </p>
      </Card>

      {/* Journal Link */}
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
