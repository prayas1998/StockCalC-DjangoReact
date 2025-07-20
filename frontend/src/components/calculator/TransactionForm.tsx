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
  const { handleManualCalculation, calculationState, settingsChanged, settingsChangeMessage } = useCalculation()

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

  const getCompanyName = () => {
    return "this stock"
  }

  // Function to clear all transactions
  const handleClearAll = () => {
    setTransactions([{ id: "1", companyName: "", quantity: "0", buyPrice: "0", sellPrice: "0" }])
  }

  // Get breakeven price from calculation state
  const getBreakevenPrice = () => {
    if (!calculationState.result?.summary) return 0

    const summary = calculationState.result.summary as Record<string, any>
    // Check all possible variations of the property name
    const possibleNames = ["breakevenPrice", "breakeven_price", "breakevenPrice", "breakeven_price", "BreakevenPrice"]

    for (const name of possibleNames) {
      if (name in summary) {
        return Number(summary[name]) || 0
      }
    }

    // If we still can't find it, try to find any key containing 'breakeven'
    const key = Object.keys(summary).find(
      (k) => k.toLowerCase().includes("breakeven") || k.toLowerCase().includes("break_even"),
    )

    if (key) {
      return Number(summary[key]) || 0
    }

    // Fallback calculation if breakeven price is not provided
    if (summary.totalBuyValue && summary.totalQuantity && calculationState.result?.charges?.totalCharges) {
      try {
        const buyValue = Number.parseFloat(summary.totalBuyValue)
        const charges = Number.parseFloat(calculationState.result.charges.totalCharges || "0")
        const quantity = Number.parseFloat(summary.totalQuantity)

        if (quantity > 0) {
          const calculatedBreakeven = (buyValue + charges) / quantity
          return Number(calculatedBreakeven.toFixed(2))
        }
      } catch (error) {
        console.error("Error calculating fallback breakeven price:", error)
      }
    }

    return 0
  }

  const breakEvenPrice = getBreakevenPrice()

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
          <span className="text-xs font-medium text-primary">Breakeven:</span>
          <span className="text-sm font-semibold text-primary">{formatCurrency(breakEvenPrice)}</span>
        </div>
      </div>
    </div>
  )
}

export default React.memo(TransactionForm)
