import { Button } from "@/components/ui/button";
import TransactionItem from "./TransactionItem";
import { Plus } from "lucide-react";
import SaveTransactionButton from "./SaveTransactionButton";
import type { TransactionFormProps } from "@/types/calculator";

const TransactionForm = ({
  transactions,
  setTransactions,
  platform,
  exchange,
  tradeType,
}: TransactionFormProps) => {
  const updateTransaction = (
    id: string,
    field: keyof typeof transactions[0],
    value: string
  ) => {
    setTransactions(
      transactions.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const addTransaction = () => {
    setTransactions([
      ...transactions,
      {
        id: Math.random().toString(),
        quantity: "0",
        buyPrice: "0",
        sellPrice: "0",
      },
    ]);
  };

  const removeTransaction = (id: string) => {
    if (transactions.length > 1) {
      setTransactions(transactions.filter((t) => t.id !== id));
    }
  };

  const getCompanyName = () => {
    return transactions[0]?.companyName || "this company";
  };

  return (
    <div className="space-y-6">
      {transactions.map((transaction, index) => (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          index={index}
          updateTransaction={updateTransaction}
          removeTransaction={removeTransaction}
          canRemove={transactions.length > 1}
          averageBuyPrice={undefined}
          perTransactionCharges={undefined}
        />
      ))}

      <Button
        onClick={addTransaction}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add transaction for {getCompanyName()}
      </Button>
    </div>
  );
};

export default TransactionForm; 