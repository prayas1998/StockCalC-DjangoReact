import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { TransactionItemProps } from "@/types/calculator";
import { useCalculatorContext } from "@/context/CalculatorContext";
import { getFieldLabels } from "@/utils/transactionUtils";

const TransactionItem = React.memo(({
  transaction,
  index,
  canRemove,
  averageBuyPrice,
}: TransactionItemProps) => {
  const { 
    tradeType, 
    positionType, 
    updateTransaction, 
    removeTransaction 
  } = useCalculatorContext();
  
  // Determine if this is intraday trading
  const isIntraday = tradeType === 'equity-intraday';
  
  // Get field labels based on trade type and position
  const { 
    buyPriceLabel, 
    sellPriceLabel, 
    buyPricePlaceholder, 
    sellPricePlaceholder 
  } = getFieldLabels(isIntraday, positionType);

  // Handle focus on numeric fields
  const handleFocus = (id: string, field: keyof typeof transaction) => {
    if (transaction[field] === "0") {
      updateTransaction(id, field, "");
    }
  };

  // Handle blur on numeric fields
  const handleBlur = (id: string, field: keyof typeof transaction, value: string) => {
    if (value === "") {
      updateTransaction(id, field, "0");
    }
  };

  return (
    <Card key={transaction.id} className="p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">Transaction {index + 1}</h4>
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeTransaction(transaction.id)}
              aria-label="Remove transaction"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {index === 0 && (
            <div className="md:col-span-5">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Enter company name"
                value={transaction.companyName || ""}
                onChange={(e) =>
                  updateTransaction(
                    transaction.id,
                    "companyName",
                    e.target.value
                  )
                }
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label 
              htmlFor={`quantity-${transaction.id}`} 
              className="flex justify-between mb-2"
            >
              <span>Quantity</span>
              {transaction.error && transaction.error.includes("Quantity") && (
                <span 
                  className="text-xs text-destructive"
                  role="alert"
                  id={`quantity-error-${transaction.id}`}
                >
                  {transaction.error}
                </span>
              )}
            </Label>
            <NumericInput
              id={`quantity-${transaction.id}`}
              min={0}
              allowDecimal={false}
              placeholder="Quantity"
              value={transaction.quantity}
              onChange={(value) => updateTransaction(transaction.id, "quantity", value)}
              onFocus={() => handleFocus(transaction.id, "quantity")}
              onBlur={() => handleBlur(transaction.id, "quantity", transaction.quantity)}
              aria-invalid={!!transaction.error && transaction.error.includes("Quantity")}
              aria-describedby={transaction.error?.includes("Quantity") ? `quantity-error-${transaction.id}` : undefined}
              className={transaction.error?.includes("Quantity") ? "border-destructive" : ""}
            />
          </div>
          
          <div>
            <Label 
              htmlFor={`buyPrice-${transaction.id}`} 
              className="flex justify-between mb-1"
            >
              <span>{buyPriceLabel}</span>
              {transaction.error && transaction.error.includes("buy price") && (
                <span 
                  className="text-xs text-destructive"
                  role="alert"
                  id={`buyPrice-error-${transaction.id}`}
                >
                  {transaction.error}
                </span>
              )}
            </Label>
            <NumericInput
              id={`buyPrice-${transaction.id}`}
              min={0}
              allowDecimal={true}
              maxDecimalPlaces={2}
              placeholder={buyPricePlaceholder}
              value={transaction.buyPrice}
              onChange={(value) => updateTransaction(transaction.id, "buyPrice", value)}
              onFocus={() => handleFocus(transaction.id, "buyPrice")}
              onBlur={() => handleBlur(transaction.id, "buyPrice", transaction.buyPrice)}
              aria-invalid={!!transaction.error && transaction.error.includes("buy price")}
              aria-describedby={transaction.error?.includes("buy price") ? `buyPrice-error-${transaction.id}` : undefined}
              className={transaction.error?.includes("buy price") ? "border-destructive" : ""}
            />
          </div>
          
          <div>
            <Label 
              htmlFor={`sellPrice-${transaction.id}`} 
              className="flex justify-between mb-1"
            >
              <span>{sellPriceLabel}</span>
              {transaction.error && transaction.error.includes("sell price") && (
                <span 
                  className="text-xs text-destructive"
                  role="alert"
                  id={`sellPrice-error-${transaction.id}`}
                >
                  {transaction.error}
                </span>
              )}
            </Label>
            <NumericInput
              id={`sellPrice-${transaction.id}`}
              min={0}
              allowDecimal={true}
              maxDecimalPlaces={2}
              placeholder={sellPricePlaceholder}
              value={transaction.sellPrice}
              onChange={(value) => updateTransaction(transaction.id, "sellPrice", value)}
              onFocus={() => handleFocus(transaction.id, "sellPrice")}
              onBlur={() => handleBlur(transaction.id, "sellPrice", transaction.sellPrice)}
              aria-invalid={!!transaction.error && transaction.error.includes("sell price")}
              aria-describedby={transaction.error?.includes("sell price") ? `sellPrice-error-${transaction.id}` : undefined}
              className={transaction.error?.includes("sell price") ? "border-destructive" : ""}
            />
          </div>
          
          <div className="flex flex-col justify-end text-sm text-muted-foreground space-y-1">
            <div>
              {isIntraday ? 'Avg. Entry Price: ' : 'Avg. Buy Price: '}
              {formatCurrency(averageBuyPrice)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

TransactionItem.displayName = "TransactionItem";

export default TransactionItem;