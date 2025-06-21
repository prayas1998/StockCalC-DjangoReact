import type { CalculationResponse } from "../services/api";
import { PositionType, TradeType, Exchange, BrokerType } from "@/context/CalculatorContext";

export interface Transaction {
  id: string;
  companyName?: string;
  quantity: string;
  buyPrice: string;
  sellPrice: string;
  error?: string;
}

export interface CalculationState {
  error: string | null;
  result: CalculationResponse | null;
}

export interface TransactionFormProps {
  showTitle?: boolean;
}

export interface TransactionItemProps {
  transaction: Transaction;
  index: number;
  canRemove: boolean;
  averageBuyPrice: number;
}

export interface CalculatorOptionsProps {
  exchange: string;
  setExchange: (exchange: string) => void;
  tradeType: string;
  setTradeType: (tradeType: string) => void;
  instrumentType: string;
  setInstrumentType: (instrumentType: string) => void;
}

export interface CalculationResultsProps {
  calculationState: CalculationState;
  formatCurrency: (value: string | number | undefined) => string;
  exchange: string;
}

export interface SaveTransactionButtonProps {
  user: any;
  transactions: Transaction[];
  platform: string;
  exchange: string;
  tradeType: string;
  setAuthDialogOpen: (open: boolean) => void;
  handleSaveTransactions: (user: any, setAuthDialogOpen: (open: boolean) => void) => void;
  isSaving: boolean;
} 