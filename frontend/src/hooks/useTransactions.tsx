import { useState } from "react";
import type { Transaction } from "@/types/calculator";

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "1", companyName: "", quantity: "0", buyPrice: "0", sellPrice: "0" },
  ]);

  const validateTransaction = (transaction: Transaction): Transaction => {
    const qty = Number(transaction.quantity);
    const buyPrice = Number(transaction.buyPrice);
    const sellPrice = Number(transaction.sellPrice);

    if (!transaction.quantity || qty <= 0) {
      return { ...transaction, error: "Quantity is required." };
    }
    
    if ((buyPrice <= 0 && sellPrice <= 0) || (transaction.buyPrice === "" && transaction.sellPrice === "")) {
      return { ...transaction, error: "Enter a buy price or a sell price." };
    }

    return { ...transaction, error: undefined };
  };

  const validateTransactions = (transactions: Transaction[]): Transaction[] => {
    return transactions.map(validateTransaction);
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

  const updateTransaction = (
    id: string,
    field: keyof Transaction,
    value: string
  ) => {
    setTransactions(
      transactions.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const getCompanyName = (): string => {
    return transactions[0]?.companyName || "this company";
  };

  const hasValidationErrors = transactions.some(t => 
    !t.quantity || Number(t.quantity) <= 0 || 
    ((Number(t.buyPrice) <= 0 || t.buyPrice === "") && 
     (Number(t.sellPrice) <= 0 || t.sellPrice === ""))
  );

  return {
    transactions,
    setTransactions,
    validateTransaction,
    validateTransactions,
    addTransaction,
    removeTransaction,
    updateTransaction,
    getCompanyName,
    hasValidationErrors
  };
};