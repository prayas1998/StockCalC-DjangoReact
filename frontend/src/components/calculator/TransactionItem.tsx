"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { NumericInput } from "@/components/ui/numeric-input"
import { Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { TransactionItemProps } from "@/types/calculator"
import { useCalculatorContext } from "@/context/CalculatorContext"
import { getFieldLabels } from "@/utils/transactionUtils"

const TransactionItem = React.memo(({ transaction, index, canRemove, averageBuyPrice }: TransactionItemProps) => {
  const { tradeType, positionType, updateTransaction, removeTransaction } = useCalculatorContext()

  // Determine if this is intraday trading
  const isIntraday = tradeType === "equity-intraday"

  // Get field labels based on trade type and position
  const { buyPriceLabel, sellPriceLabel, buyPricePlaceholder, sellPricePlaceholder } = getFieldLabels(
    isIntraday,
    positionType,
  )

  // Handle focus on numeric fields
  const handleFocus = (id: string, field: keyof typeof transaction) => {
    if (transaction[field] === "0") {
      updateTransaction(id, field, "")
    }
  }

  // Handle blur on numeric fields
  const handleBlur = (id: string, field: keyof typeof transaction, value: string) => {
    if (value === "") {
      updateTransaction(id, field, "0")
    }
  }

  return (
    <Card className="group relative border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <div className="p-3">
        {/* Header - Compact */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">#{index + 1}</span>
          </div>
          {canRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeTransaction(transaction.id)}
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remove transaction"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Input Fields - Compact Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Quantity */}
          <div className="space-y-1">
            <Label htmlFor={`quantity-${transaction.id}`} className="text-xs text-slate-500 dark:text-slate-400">
              Quantity
              {transaction.error?.includes("Quantity") && <span className="text-destructive ml-1">*</span>}
            </Label>
            <NumericInput
              id={`quantity-${transaction.id}`}
              min={0}
              allowDecimal={false}
              placeholder="0"
              value={transaction.quantity}
              onChange={(value) => updateTransaction(transaction.id, "quantity", value)}
              onFocus={() => handleFocus(transaction.id, "quantity")}
              onBlur={() => handleBlur(transaction.id, "quantity", transaction.quantity)}
              className={`h-8 text-sm ${
                transaction.error?.includes("Quantity") ? "border-destructive/50 focus:border-destructive" : ""
              }`}
            />
          </div>

          {/* Buy Price */}
          <div className="space-y-1">
            <Label htmlFor={`buyPrice-${transaction.id}`} className="text-xs text-slate-500 dark:text-slate-400">
              {buyPriceLabel}
              {transaction.error?.includes("buy price") && <span className="text-destructive ml-1">*</span>}
            </Label>
            <NumericInput
              id={`buyPrice-${transaction.id}`}
              min={0}
              allowDecimal={true}
              maxDecimalPlaces={2}
              placeholder="0.00"
              value={transaction.buyPrice}
              onChange={(value) => updateTransaction(transaction.id, "buyPrice", value)}
              onFocus={() => handleFocus(transaction.id, "buyPrice")}
              onBlur={() => handleBlur(transaction.id, "buyPrice", transaction.buyPrice)}
              className={`h-8 text-sm ${
                transaction.error?.includes("buy price") ? "border-destructive/50 focus:border-destructive" : ""
              }`}
            />
          </div>

          {/* Sell Price */}
          <div className="space-y-1">
            <Label htmlFor={`sellPrice-${transaction.id}`} className="text-xs text-slate-500 dark:text-slate-400">
              {sellPriceLabel}
              {transaction.error?.includes("sell price") && <span className="text-destructive ml-1">*</span>}
            </Label>
            <NumericInput
              id={`sellPrice-${transaction.id}`}
              min={0}
              allowDecimal={true}
              maxDecimalPlaces={2}
              placeholder="0.00"
              value={transaction.sellPrice}
              onChange={(value) => updateTransaction(transaction.id, "sellPrice", value)}
              onFocus={() => handleFocus(transaction.id, "sellPrice")}
              onBlur={() => handleBlur(transaction.id, "sellPrice", transaction.sellPrice)}
              className={`h-8 text-sm ${
                transaction.error?.includes("sell price") ? "border-destructive/50 focus:border-destructive" : ""
              }`}
            />
          </div>

          {/* Average Price - Simplified */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500 dark:text-slate-400">
              {isIntraday ? "Avg. Entry" : "Avg. Buy"}
            </Label>
            <div className="h-8 px-2 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {formatCurrency(averageBuyPrice)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
})

TransactionItem.displayName = "TransactionItem"

export default TransactionItem
