import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { TransactionItemProps } from "@/types/calculator";

const TransactionItem = ({
  transaction,
  index,
  updateTransaction,
  removeTransaction,
  canRemove,
  averageBuyPrice,
  tradeType = 'equity-delivery',
}: TransactionItemProps) => {
  // Determine if this is intraday trading
  const isIntraday = tradeType === 'equity-intraday';
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
                value={transaction.companyName}
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
            <Label htmlFor={`quantity-${transaction.id}`} className="flex justify-between mb-2">
              <span>Quantity</span>
              {transaction.error && transaction.error.includes("Quantity") && (
                <span className="text-xs text-destructive">{transaction.error}</span>
              )}
            </Label>
            <Input
              id={`quantity-${transaction.id}`}
              type="number"
              min="0"
              placeholder="Quantity"
              value={transaction.quantity}
              onFocus={() => {
                if (transaction.quantity === "0") {
                  updateTransaction(
                    transaction.id,
                    "quantity",
                    ""
                  );
                }
              }}
              onChange={(e) =>
                updateTransaction(
                  transaction.id,
                  "quantity",
                  e.target.value
                )
              }
              onBlur={(e) => {
                if (e.target.value === "") {
                  updateTransaction(
                    transaction.id,
                    "quantity",
                    "0"
                  );
                }
              }}
              onKeyDown={(e) => {
                if (["e", "E", "+", "-"].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className={transaction.error && transaction.error.includes("Quantity") ? "border-destructive" : ""}
            />
          </div>
          <div>
            <Label htmlFor={`buyPrice-${transaction.id}`} className="flex justify-between mb-1">
              <span>{isIntraday ? 'Entry Price' : 'Buy Price'}</span>
              {transaction.error && transaction.error.includes("buy price") && (
                <span className="text-xs text-destructive">{transaction.error}</span>
              )}
            </Label>
            <Input
              id={`buyPrice-${transaction.id}`}
              type="number"
              min="0"
              placeholder="Buy Price"
              value={transaction.buyPrice}
              onFocus={() => {
                if (transaction.buyPrice === "0") {
                  updateTransaction(
                    transaction.id,
                    "buyPrice",
                    ""
                  );
                }
              }}
              onChange={(e) =>
                updateTransaction(
                  transaction.id,
                  "buyPrice",
                  e.target.value
                )
              }
              onBlur={(e) => {
                if (e.target.value === "") {
                  updateTransaction(
                    transaction.id,
                    "buyPrice",
                    "0"
                  );
                }
              }}
              onKeyDown={(e) => {
                if (["e", "E", "+", "-"].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className={transaction.error && transaction.error.includes("buy price") ? "border-destructive" : ""}
            />
          </div>
          <div>
            <Label htmlFor={`sellPrice-${transaction.id}`} className="flex justify-between mb-1">
              <span>{isIntraday ? 'Exit Price' : 'Sell Price'}</span>
              {transaction.error && transaction.error.includes("sell price") && (
                <span className="text-xs text-destructive">{transaction.error}</span>
              )}
            </Label>
            <Input
              id={`sellPrice-${transaction.id}`}
              type="number"
              min="0"
              placeholder="Sell Price"
              value={transaction.sellPrice}
              onFocus={() => {
                if (transaction.sellPrice === "0") {
                  updateTransaction(
                    transaction.id,
                    "sellPrice",
                    ""
                  );
                }
              }}
              onChange={(e) =>
                updateTransaction(
                  transaction.id,
                  "sellPrice",
                  e.target.value
                )
              }
              onBlur={(e) => {
                if (e.target.value === "") {
                  updateTransaction(
                    transaction.id,
                    "sellPrice",
                    "0"
                  );
                }
              }}
              onKeyDown={(e) => {
                if (["e", "E", "+", "-"].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className={transaction.error && transaction.error.includes("sell price") ? "border-destructive" : ""}
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
};

export default TransactionItem; 