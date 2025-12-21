// Type definitions for API requests and responses
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  date_joined: string | null;
  last_login: string | null;
}

export interface UserProfileResponse extends User {}

export interface ProfileUpdateRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// Calculation types (mirroring Django responses)
export interface Transaction {
  quantity: string;
  buyPrice: string;
  sellPrice: string;
}

export interface CalculationRequest {
  platform: string;
  exchange: string;
  tradeType: string;
  transactions: Transaction[];
  positionType: 'long' | 'short';
}

export interface CalculationResponse {
  transactions: Array<{
    quantity: string;
    buyValue: string;
    sellValue: string;
    averageBuyPrice: string;
  }>;
  charges: {
    totalCharges: string;
    brokerage: string;
    stt: string;
    exchangeCharges: string;
    stampDuty: string;
    sebiFee: string;
    ipft: string;
    gst: string;
    dpCharges: string;
    [key: string]: string;
  };
  summary: {
    totalQuantity: string;
    totalBuyValue: string;
    totalSellValue: string;
    averageBuyPrice: string;
    turnover: string;
    grossPnL: string;
    netPnL: string;
    breakevenPrice: string;
    [key: string]: string;
  };
}

export interface CalculationError {
  error: string;
  detail?: string;
}

// Journal types (mirroring Django models)
export interface TradeJournal {
  id: number;
  user_id: string;
  company_name: string;
  trade_type: 'EQUITY_DELIVERY' | 'EQUITY_INTRADAY';
  quantity: number;
  buy_price: number;
  sell_price?: number;
  stop_loss?: number;
  target_price?: number;
  entry_date: string;
  exit_date?: string;
  status: 'OPEN' | 'CLOSED_TARGET' | 'CLOSED_STOPLOSS' | 'CLOSED_MANUAL' | 'CANCELLED';
  personal_notes?: string;
  created_at: string;
  updated_at: string;
  tags: TradeTags[];
  direction: 'LONG' | 'SHORT';
  broker: 'Dhan' | 'Groww';
  exchange: 'NSE' | 'BSE';
  pnl?: number;
  pnl_percentage?: number;
}

export interface TradeTags {
  id: number;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TradeJournalCreate {
  company_name: string;
  trade_type: 'EQUITY_DELIVERY' | 'EQUITY_INTRADAY';
  quantity: number;
  buy_price: number;
  sell_price?: number;
  stop_loss?: number;
  target_price?: number;
  entry_date: string;
  exit_date?: string;
  status: 'OPEN' | 'CLOSED_TARGET' | 'CLOSED_STOPLOSS' | 'CLOSED_MANUAL' | 'CANCELLED';
  personal_notes?: string;
  tags?: number[];
  direction: 'LONG' | 'SHORT';
  broker: 'Dhan' | 'Groww';
  exchange: 'NSE' | 'BSE';
}

export interface TradeJournalUpdate {
  company_name?: string;
  trade_type?: 'EQUITY_DELIVERY' | 'EQUITY_INTRADAY';
  quantity?: number;
  buy_price?: number;
  sell_price?: number;
  stop_loss?: number;
  target_price?: number;
  entry_date?: string;
  exit_date?: string;
  status?: 'OPEN' | 'CLOSED_TARGET' | 'CLOSED_STOPLOSS' | 'CLOSED_MANUAL' | 'CANCELLED';
  personal_notes?: string;
  tags?: number[];
  direction?: 'LONG' | 'SHORT';
  broker?: 'Dhan' | 'Groww';
  exchange?: 'NSE' | 'BSE';
}

// Analytics types
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
  best_performing_stocks: Array<{
    company_name: string;
    total_pnl: number;
    trade_count: number;
  }>;
  worst_performing_stocks: Array<{
    company_name: string;
    total_pnl: number;
    trade_count: number;
  }>;
  monthly_performance: Array<{
    month: string;
    total_pnl: number;
    trade_count: number;
  }>;
  drawdown_series: Array<{
    cumulative_pnl: number;
    drawdown: number;
  }>;
  trade_type_distribution: Array<{
    trade_type: string;
    count: number;
  }>;
  status_distribution: Array<{
    status: string;
    count: number;
  }>;
  tag_performance: Array<{
    tag_name: string;
    tag_color: string;
    total_pnl: number;
    trade_count: number;
    win_rate: number;
    profitable_trades: number;
    losing_trades: number;
  }>;
}

// Error response types (mirroring Django error handling)
export interface ApiErrorResponse {
  error: boolean;
  error_id: string;
  category: 'authentication' | 'authorization' | 'validation' | 'not_found' | 'rate_limit' | 'database' | 'external_service' | 'server_error' | 'configuration';
  message: string;
  debug_info?: {
    error_type: string;
    error_message: string;
    traceback: string;
  };
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Request context (for logging and rate limiting)
export interface RequestContext {
  user?: {
    id: string;
    email: string;
  };
  ip: string;
  userAgent: string;
  method: string;
  path: string;
  timestamp: Date;
}