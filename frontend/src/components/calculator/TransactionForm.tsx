"use client"

import React, { useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import TransactionItem from "./TransactionItem"
import { Plus, Calculator } from "lucide-react"
import type { TransactionFormProps } from "@/types/calculator"
import { useCalculatorContext } from "@/context/CalculatorContext"
import { ClearButton } from "@/components/shared/ClearButton"
import { useCalculation } from "@/hooks/useCalculation"
import { formatCurrency } from "@/lib/utils"

const TransactionForm: React.FC<TransactionFormProps> = ({ showTitle = true, onCalculationStateChange }) => {
  const { transactions, addTransaction, setTransactions, platform, exchange, tradeType, positionType } =
    useCalculatorContext()
  const { handleManualCalculation, clearCalculation, calculationState, settingsChanged, settingsChangeMessage } = useCalculation()

  // Pass calculation state changes to parent
  useEffect(() => {
    if (onCalculationStateChange) {
      onCalculationStateChange(calculationState)
    }
  }, [calculationState, onCalculationStateChange])

  // Calculate running totals and average buy prices for each transaction
  const transactionsWithAverages = useMemo(() => {
    return transactions.map((transaction, index) => {
      // Calculate running total shares and total cost up to this transaction
      // Only include transactions with buy price > 0 in the average calculation
      let totalShares = 0
      let totalCost = 0

      for (let i = 0; i <= index; i++) {
        const currentTransaction = transactions[i]
        const qty = Number(currentTransaction.quantity) || 0
        const price = Number(currentTransaction.buyPrice) || 0

        // Only include this transaction in average calculation if:
        // 1. Buy price > 0 (valid price)
        // 2. Quantity > 0 (valid quantity)
        if (price > 0 && qty > 0) {
          totalShares += qty
          totalCost += qty * price
        }
      }

      // Calculate average with proper rounding to avoid floating point issues
      const averageBuyPrice = totalShares > 0 ? Math.round((totalCost / totalShares) * 100) / 100 : 0

      return {
        transaction,
        index,
        averageBuyPrice,
        canRemove: transactions.length > 1,
      }
    })
  }, [transactions])

  // Function to clear all transactions
  const handleClearAll = () => {
    clearCalculation()
    setTransactions([{ id: "1", companyName: "", quantity: "0", buyPrice: "0", sellPrice: "0" }])
  }

  // Get breakeven price and scope from calculation state
  const getBreakeven = () => {
    if (!calculationState.result?.summary) return { price: null, mode: null as string | null }

    const summary = calculationState.result.summary as Record<string, string | number>
    const mode = String(summary.breakevenMode || "full")
    if (mode === "unavailable") return { price: null, mode }
    // Check all possible variations of the property name
    const possibleNames = ["breakevenPrice", "breakeven_price", "BreakevenPrice"]

    for (const name of possibleNames) {
      if (name in summary) {
        const price = Number(summary[name]) || 0
        return { price: price > 0 ? price : null, mode }
      }
    }

    // If we still can't find it, try to find any key containing 'breakeven'
    const key = Object.keys(summary).find(
      (k) => k.toLowerCase().includes("breakeven") || k.toLowerCase().includes("break_even"),
    )

    if (key) {
      const price = Number(summary[key]) || 0
      return { price: price > 0 ? price : null, mode }
    }

    // Fallback calculation if breakeven price is not provided
    if (summary.totalBuyValue && summary.totalQuantity && calculationState.result?.charges?.totalCharges) {
      try {
        const buyValue = Number(summary.totalBuyValue)
        const charges = Number(calculationState.result.charges.totalCharges || 0)
        const quantity = Number(summary.totalQuantity)

        if (quantity > 0) {
          const calculatedBreakeven = (buyValue + charges) / quantity
          return { price: Number(calculatedBreakeven.toFixed(2)), mode }
        }
      } catch (error) {
        console.error("Error calculating fallback breakeven price:", error)
      }
    }

    return { price: null, mode: "unavailable" }
  }

  const breakeven = getBreakeven()
  const hasCalculationResult = calculationState.result !== null
  const breakevenScope = breakeven.mode === "unavailable" ? "Unavailable" : breakeven.mode === "remaining" ? "Remaining position" : "Full position"

  return (
    <div className="space-y-3">
      {/* Header - Simplified */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Transaction Details</h3>
        <ClearButton onClear={handleClearAll} className="h-8 px-3 text-xs" />
      </div>

      {/* Transaction Items */}
      <div className="space-y-2">
        {transactionsWithAverages.map(({ transaction, index, averageBuyPrice, canRemove }) => (
          <TransactionItem
            key={transaction.id}
            transaction={transaction}
            index={index}
            canRemove={canRemove}
            averageBuyPrice={averageBuyPrice}
          />
        ))}
      </div>

      {/* Action Buttons and Breakeven Price */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2 items-center">
          <Button
            onClick={addTransaction}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 h-9 text-xs bg-transparent"
            aria-label="Add transaction"
          >
            <Plus className="h-3 w-3" />
            Add Transaction
          </Button>

          <Button
            onClick={handleManualCalculation}
            size="sm"
            className="flex items-center gap-2 h-9 text-xs"
            aria-label="Calculate charges"
          >
            <Calculator className="h-3 w-3" />
            Calculate
          </Button>

          {/* Settings Change Message */}
          {settingsChanged && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                {settingsChangeMessage}
              </span>
            </div>
          )}
        </div>

        {/* Enhanced Breakeven Price */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 rounded-md border border-primary/20">
          <span className="text-xs font-medium text-primary">
            {hasCalculationResult ? `Breakeven · ${breakevenScope} (₹0.01 tick):` : "Breakeven:"}
          </span>
          <span className="text-sm font-semibold text-primary">
            {!hasCalculationResult ? "—" : breakeven.price === null ? "Unavailable" : formatCurrency(breakeven.price)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default React.memo(TransactionForm)
