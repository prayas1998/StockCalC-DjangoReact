import { useState, useCallback, useEffect } from "react";
import { calculateCharges, saveTransactions } from "@/services/api";
import type { CalculationState, Transaction } from "@/types/calculator";
import { toast } from "@/components/ui/use-toast";
import { checkApiConnection, formatApiError } from "@/lib/api-helpers";

export const useCalculation = (
  platform: string,
  exchange: string,
  tradeType: string,
  transactions: Transaction[],
  positionType: 'long' | 'short' = 'long'
) => {
  const [calculationState, setCalculationState] = useState<CalculationState>({
    error: null,
    result: null,
  });

  const [isSaving, setIsSaving] = useState(false);

  const validateTransactions = (transactions: Transaction[]): boolean => {
    return transactions.every(t => {
      const qty = Number(t.quantity);
      const buyPrice = Number(t.buyPrice);
      const sellPrice = Number(t.sellPrice);
      
      return (
        qty > 0 && 
        (buyPrice > 0 || sellPrice > 0)
      );
    });
  };

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

      const formattedTransactions = transactions.map((t) => ({
        quantity: t.quantity,
        buyPrice: t.buyPrice || "0",
        sellPrice: t.sellPrice || "0",
      }));

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
  }, [platform, exchange, tradeType, transactions, positionType]);

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
  }, [exchange, tradeType, transactions, positionType, handleCalculateCharges]);

  const handleSaveTransactions = async (user: any, setAuthDialogOpen: (open: boolean) => void) => {
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
      const formattedTransactions = transactions.map((t) => ({
        quantity: t.quantity,
        buyPrice: t.buyPrice || "0",
        sellPrice: t.sellPrice || "0",
      }));

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
  };

  return {
    calculationState,
    handleCalculateCharges,
    handleSaveTransactions,
    isSaving
  };
};