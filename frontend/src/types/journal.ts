// types/journal.ts

/**
 * TypeScript type definitions for the trading journal feature
 */

// Enums

/**
 * Types of trades supported by the journal
 */
export enum TradeType {
  EQUITY_DELIVERY = "EQUITY_DELIVERY",
  EQUITY_INTRADAY = "EQUITY_INTRADAY"
}

/**
 * Stock exchanges supported by the journal
 */
export enum Exchange {
  NSE = "NSE",
  BSE = "BSE"
}

/**
 * Possible statuses for a trade
 */
export enum TradeStatus {
  OPEN = "OPEN",
  CLOSED_TARGET = "CLOSED_TARGET",
  CLOSED_STOPLOSS = "CLOSED_STOPLOSS",
  CLOSED_MANUAL = "CLOSED_MANUAL",
  CANCELLED = "CANCELLED"
}

/**
 * Direction of the trade: Long (buy first) or Short (sell first)
 */
export enum TradeDirection {
  LONG = "LONG",
  SHORT = "SHORT"
}

// Interfaces

/**
 * Interface for trade tags
 */
export interface TradeTags {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

/**
 * Interface for trade journal entries
 */
export interface TradeJournal {
  id: number;
  company_name: string;
  trade_type: TradeType;
  quantity: number;
  buy_price: number;
  sell_price?: number;
  stop_loss?: number;
  target_price?: number;
  entry_date: string;
  exit_date?: string;
  status: TradeStatus;
  personal_notes?: string;
  created_at: string;
  updated_at: string;
  tags: TradeTags[];
  pnl?: number;
  unrealized_pnl?: number;
  risk_reward_ratio?: number;
  is_profitable?: boolean;
  direction: TradeDirection;
  broker: string;
  exchange: string;
}

/**
 * Interface for creating a new trade journal entry
 */
export interface TradeJournalCreate {
  company_name: string;
  trade_type: TradeType;
  quantity: number;
  buy_price: number;
  sell_price?: number;
  stop_loss?: number;
  target_price?: number;
  entry_date: string;
  exit_date?: string;
  status: TradeStatus;
  personal_notes?: string;
  tags?: number[];
  direction: TradeDirection;
  broker: string;
  exchange: string;
}

/**
 * Interface for updating an existing trade journal entry
 */
export interface TradeJournalUpdate {
  company_name?: string;
  trade_type?: TradeType;
  quantity?: number;
  buy_price?: number;
  sell_price?: number;
  stop_loss?: number;
  target_price?: number;
  entry_date?: string;
  exit_date?: string;
  status?: TradeStatus;
  personal_notes?: string;
  tags?: number[];
  direction?: TradeDirection;
  broker?: string;
  exchange?: string;
}

/**
 * Interface for journal analytics data
 */
export interface JournalAnalytics {
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl_per_trade: number;
  profit_factor: number;
  max_drawdown: number;
  largest_win: number;
  largest_loss: number;
  avg_win: number;
  avg_loss: number;
  expectancy: number;
  avg_risk_reward: number;
  profitable_trades: number;
  losing_trades: number;
  best_performing_stocks: {
    company_name: string;
    total_pnl: number;
    trade_count: number;
  }[];
  worst_performing_stocks: {
    company_name: string;
    total_pnl: number;
    trade_count: number;
  }[];
  monthly_performance: {
    month: string;
    total_pnl: number;
    trade_count: number;
  }[];
  drawdown_series: {
    cumulative_pnl: number;
    drawdown: number;
  }[];
  trade_type_distribution: {
    trade_type: string;
    count: number;
  }[];
  status_distribution: {
    status: string;
    count: number;
  }[];
}

// Utility Types

/**
 * Type for form data when creating or editing a trade
 */
export interface TradeFormData extends Omit<TradeJournalCreate, 'tags'> {
  tags: TradeTags[];
}

/**
 * Type for filtering journal entries
 */
export interface JournalFilters {
  status?: TradeStatus | TradeStatus[];
  trade_type?: TradeType | TradeType[];
  start_date?: string;
  end_date?: string;
  tags?: number[];
  is_profitable?: boolean;
  page?: number;
  page_size?: number;
}

/**
 * Type for API responses containing trade journal entries
 */
export interface TradeJournalResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TradeJournal[];
}