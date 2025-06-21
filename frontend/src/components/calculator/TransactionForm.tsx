import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import TransactionItem from "./TransactionItem";
import { Plus } from "lucide-react";
import type { TransactionFormProps } from "@/types/calculator";
import { useCalculatorContext } from "@/context/CalculatorContext";

const TransactionForm: React.FC<TransactionFormProps> = ({
  showTitle = true
}) => {
  const { transactions, addTransaction } = useCalculatorContext();

  // Calculate running totals and average buy prices for each transaction
  const transactionsWithAverages = useMemo(() => {
    return transactions.map((transaction, index) => {
      // Calculate running total shares and total cost up to this transaction
      let totalShares = 0;
      let totalCost = 0;
      for (let i = 0; i <= index; i++) {
        const qty = Number(transactions[i].quantity) || 0;
        const price = Number(transactions[i].buyPrice) || 0;
        totalShares += qty;
        totalCost += qty * price;
      }
      const averageBuyPrice = totalShares > 0 ? totalCost / totalShares : 0;
      
      return {
        transaction,
        index,
        averageBuyPrice,
        canRemove: transactions.length > 1
      };
    });
  }, [transactions]);

  const getCompanyName = () => {
    return transactions[0]?.companyName || "this company";
  };

  return (
    <div className="space-y-6">
      {transactionsWithAverages.map(({ transaction, index, averageBuyPrice, canRemove }) => (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          index={index}
          canRemove={canRemove}
          averageBuyPrice={averageBuyPrice}
        />
      ))}

      <Button
        onClick={addTransaction}
        variant="outline"
        className="flex items-center gap-2"
        aria-label="Add transaction"
      >
        <Plus className="h-4 w-4" />
        Add transaction for {getCompanyName()}
      </Button>
    </div>
  );
};

export default React.memo(TransactionForm);