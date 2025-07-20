import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Transaction } from '@/types/calculator';

export type PositionType = 'long' | 'short';
export type TradeType = 'equity-delivery' | 'equity-intraday';
export type Exchange = 'NSE' | 'BSE';
export type BrokerType = 'Dhan' | 'Groww';

interface CalculatorContextType {
  positionType: PositionType;
  setPositionType: (type: PositionType) => void;
  tradeType: TradeType;
  setTradeType: (type: TradeType) => void;
  exchange: Exchange;
  setExchange: (exchange: Exchange) => void;
  platform: BrokerType;
  setPlatform: (platform: BrokerType) => void;
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: () => void;
  updateTransaction: (id: string, field: keyof Transaction, value: string) => void;
  removeTransaction: (id: string) => void;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

export const CalculatorProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [positionType, setPositionType] = useState<PositionType>('long');
  const [tradeType, setTradeType] = useState<TradeType>('equity-delivery');
  const [exchange, setExchange] = useState<Exchange>('NSE');
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "1", companyName: "", quantity: "0", buyPrice: "0", sellPrice: "0" }
  ]);
  
  const [platform, setPlatformInternal] = useState<BrokerType>(() => {
    const path = window.location.pathname.slice(1).toLowerCase();
    if (["groww", "dhan", "rise", "others"].includes(path)) {
      const capitalized = path.charAt(0).toUpperCase() + path.slice(1);
      return capitalized as BrokerType;
    }
    return "Groww";
  });
  
  // Custom setPlatform that preserves transaction values when broker changes
  const setPlatform = useCallback((newPlatform: BrokerType) => {
    setPlatformInternal(newPlatform);
    // Don't reset transactions when platform changes - preserve user input
    // Only clear results, not the form data
  }, [setPlatformInternal]);

  const updateTransaction = useCallback((
    id: string,
    field: keyof Transaction,
    value: string
  ) => {
    setTransactions(prev => 
      prev.map((t) => {
        if (t.id === id) {
          // Create a new object to ensure React detects the change
          const updatedTransaction = { ...t, [field]: value };
          // Clear any existing errors when user starts typing
          if (updatedTransaction.error) {
            delete updatedTransaction.error;
          }
          return updatedTransaction;
        }
        return t;
      })
    );
  }, []);

  const addTransaction = useCallback(() => {
    setTransactions(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        companyName: prev[0]?.companyName || "",
        quantity: "0",
        buyPrice: "0",
        sellPrice: "0",
      },
    ]);
  }, [setTransactions]);

  const removeTransaction = useCallback((id: string) => {
    setTransactions(prev => {
      if (prev.length > 1) {
        return prev.filter((t) => t.id !== id);
      }
      return prev;
    });
  }, [setTransactions]);

  return (
    <CalculatorContext.Provider value={{
      positionType, setPositionType,
      tradeType, setTradeType,
      exchange, setExchange,
      platform, setPlatform,
      transactions, setTransactions,
      addTransaction,
      updateTransaction,
      removeTransaction
    }}>
      {children}
    </CalculatorContext.Provider>
  );
};

export const useCalculatorContext = () => {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error('useCalculatorContext must be used within a CalculatorProvider');
  }
  return context;
};