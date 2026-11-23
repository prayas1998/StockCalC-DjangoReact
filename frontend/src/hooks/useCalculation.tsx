import { useState, useCallback, useEffect, useRef } from "react";
import { calculateCharges } from "@/services/api";
import type { CalculationState, Transaction } from "@/types/calculator";
import { useCalculatorContext } from "@/context/CalculatorContext";
import { formatTransactionsForApi } from "@/utils/transactionUtils";

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

  // Track previous settings to detect changes (ref — no re-render needed)
  const previousSettingsRef = useRef({
    broker: platform,
    tradeType: tradeType,
    positionType: positionType,
    exchange: exchange
  });
  const [changedSettings, setChangedSettings] = useState<string[]>([]);

  // Use refs to track the latest values and prevent stale closures
  const latestValuesRef = useRef({
    platform,
    exchange,
    tradeType,
    transactions,
    positionType
  });

  // Update refs whenever values change
  useEffect(() => {
    latestValuesRef.current = {
      platform,
      exchange,
      tradeType,
      transactions,
      positionType
    };
  }, [platform, exchange, tradeType, transactions, positionType]);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced validation function with detailed error messages
  const validateTransactions = useCallback((transactions: Transaction[]): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    transactions.forEach((t, index) => {
      const qty = Number(t.quantity);
      const buyPrice = Number(t.buyPrice);
      const sellPrice = Number(t.sellPrice);
      
      if (qty <= 0) {
        errors.push(`Transaction ${index + 1}: Please enter a valid quantity greater than 0`);
      }
      
      if (buyPrice <= 0 && sellPrice <= 0) {
        errors.push(`Transaction ${index + 1}: Please enter either a buy price or sell price greater than 0`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  const handleCalculateCharges = useCallback(async (forceImmediate = false) => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const performCalculation = async () => {
      // Use the latest values from ref to avoid stale closures
      const { 
        platform: currentPlatform, 
        exchange: currentExchange, 
        tradeType: currentTradeType, 
        transactions: currentTransactions, 
        positionType: currentPositionType 
      } = latestValuesRef.current;

      setCalculationState({
        error: null,
        result: null,
      });

      try {
        const validation = validateTransactions(currentTransactions);

        if (!validation.isValid) {
          const errorMessage = validation.errors.length === 1 
            ? validation.errors[0]
            : `Please fix the following issues:\n\n${validation.errors.map(err => `${err}`).join('\n')}`;
          throw new Error(errorMessage);
        }

        // Format transactions for API using utility function with current values
        const formattedTransactions = formatTransactionsForApi(
          currentTransactions, 
          currentTradeType, 
          currentPositionType
        );

        const result = await calculateCharges(
          currentPlatform.toLowerCase(),
          currentExchange,
          currentTradeType,
          formattedTransactions,
          currentPositionType
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
    };

    if (forceImmediate) {
      await performCalculation();
    } else {
      // Debounce the calculation to prevent rapid API calls
      debounceTimerRef.current = setTimeout(performCalculation, 300);
    }
  }, [validateTransactions]);

  // Clear changed settings flag when user calculates
  const clearChangedSettingsFlag = useCallback(() => {
    setChangedSettings([]);
  }, []);

  // Manual calculation function for button click
  const handleManualCalculation = useCallback(async () => {
    clearChangedSettingsFlag();
    await handleCalculateCharges(true);
  }, [handleCalculateCharges, clearChangedSettingsFlag]);

  // Helper function to check if there's meaningful transaction data
  const hasValidTransactionData = useCallback(() => {
    return transactions.some(t => 
      (t.quantity && Number(t.quantity) > 0) || 
      (t.buyPrice && Number(t.buyPrice) > 0) || 
      (t.sellPrice && Number(t.sellPrice) > 0)
    );
  }, [transactions]);

  // Detect settings changes and clear results
  useEffect(() => {
    const prev = previousSettingsRef.current;
    const changes: string[] = [];

    if (prev.broker !== platform) changes.push('Broker');
    if (prev.tradeType !== tradeType) changes.push('Trade type');
    if (prev.positionType !== positionType) changes.push('Position');
    if (prev.exchange !== exchange) changes.push('Exchange');

    if (changes.length > 0) {
      setCalculationState({ error: null, result: null });

      if (hasValidTransactionData()) {
        setChangedSettings(changes);
      }

      previousSettingsRef.current = { broker: platform, tradeType, positionType, exchange };

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }
  }, [platform, tradeType, positionType, exchange, hasValidTransactionData]);

  // Cancel any pending debounced calculation when inputs become invalid
  useEffect(() => {
    const validation = validateTransactions(transactions);

    if (!validation.isValid || transactions.length === 0) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      // Leave existing results visible — they remain valid for the previous inputs.
      // Results are only cleared on settings changes or a fresh Calculate press.
    }
  }, [exchange, tradeType, transactions, positionType, validateTransactions]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);


  // Generate dynamic message based on changed settings
  const getSettingsChangeMessage = useCallback(() => {
    if (changedSettings.length === 0) return '';
    
    let message = '';
    if (changedSettings.length === 1) {
      message = `${changedSettings[0]} changed`;
    } else if (changedSettings.length === 2) {
      message = `${changedSettings[0]} and ${changedSettings[1]} changed`;
    } else {
      const lastSetting = changedSettings[changedSettings.length - 1];
      const otherSettings = changedSettings.slice(0, -1).join(', ');
      message = `${otherSettings} and ${lastSetting} changed`;
    }
    
    return `${message} - Please click Calculate to refresh results`;
  }, [changedSettings]);

  return {
    calculationState,
    handleCalculateCharges,
    handleManualCalculation,
    settingsChanged: changedSettings.length > 0,
    settingsChangeMessage: getSettingsChangeMessage()
  };
};