import { useState, useCallback, useEffect, useMemo } from "react";
import { calculateCharges, saveTransactions } from "@/services/api";
import type { CalculationState, Transaction } from "@/types/calculator";
import { toast } from "@/components/ui/use-toast";
import { checkApiConnection, formatApiError } from "@/lib/api-helpers";
import { formatTransactionsForApi, validateTransaction } from "@/utils/transactionUtils";
import { useCalculatorContext } from "@/context/CalculatorContext";

export const useCalculation = () => {
  const { 
    platform, 
    exchange, 
    tradeType, 
    transactions, 
    positionType 
  } = useCalculatorContext();
  
  const [calculationState, setCalculationState] = useState<CalculationState>({
    error: null,
    result: null,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Memoized validation function
  const validateTransactions = useCallback((transactions: Transaction[]): boolean => {
    return transactions.every(validateTransaction);
  }, []);

  const handleCalculateCharges = useCallback(async () => {
    setCalculationState({
      error: null,
      result: null,
    });

    try {
      const hasErrors = !validateTransactions(transactions);

      if (hasErrors) {
        throw new Error("Please fix validation errors before calculating.");
      }

      // Format transactions for API using our utility function
      const formattedTransactions = formatTransactionsForApi(
        transactions, 
        tradeType, 
        positionType
      );

      const result = await calculateCharges(
        platform.toLowerCase(),
        exchange,
        tradeType,
        formattedTransactions,
        positionType
      );

      if ("error" in result) {
        throw new Error(`${result.error}: ${result.detail || ""}`);
      }

      setCalculationState({
        error: null,
        result,
      });
    } catch (error) {
      setCalculationState({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        result: null,
      });
    }
  }, [platform, exchange, tradeType, transactions, positionType, validateTransactions]);

  // Trigger calculation when inputs change
  useEffect(() => {
    const validTransactions = validateTransactions(transactions);

    if (validTransactions && transactions.length > 0) {
      handleCalculateCharges();
    } else {
      // Reset to default values when inputs are invalid
      setCalculationState({
        error: null,
        result: null,
      });
    }
  }, [exchange, tradeType, transactions, positionType, handleCalculateCharges, validateTransactions]);

  const handleSaveTransactions = useCallback(async (user: any, setAuthDialogOpen: (open: boolean) => void) => {
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }

    // Check if company name is provided
    if (!transactions[0]?.companyName?.trim()) {
      toast({
        title: "Error",
        description: "Please enter a company name to save transactions",
        variant: "destructive",
      });
      return;
    }

    // Validate transactions before saving
    const hasErrors = !validateTransactions(transactions);

    if (hasErrors) {
      toast({
        title: "Error",
        description: "Please fix validation errors before saving",
        variant: "destructive",
      });
      return;
    }

    // First check API connectivity
    const isConnected = await checkApiConnection();
    if (!isConnected) {
      // The checkApiConnection function already shows a toast with the error
      return;
    }

    setIsSaving(true);
    try {
      // Format transactions for API using our utility function
      const formattedTransactions = formatTransactionsForApi(
        transactions, 
        tradeType, 
        positionType
      );

      const result = await saveTransactions(
        transactions[0].companyName || "Untitled Transaction",
        platform.toLowerCase(),
        exchange,
        tradeType,
        formattedTransactions,
        positionType
      );

      if ("error" in result) {
        throw new Error(formatApiError(result));
      }

      toast({
        title: "Success",
        description: "Transaction saved successfully",
      });

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save transaction",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [platform, exchange, tradeType, transactions, positionType, validateTransactions]);

  return {
    calculationState,
    handleCalculateCharges,
    handleSaveTransactions,
    isSaving
  };
};