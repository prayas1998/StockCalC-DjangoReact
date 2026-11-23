/**
 * Database schema types matching the exact Supabase database structure
 * Generated from Django models and migrations for TradeSmart app
 */

// Base types
export type UUID = string;

// Enums matching Django model choices
export type TradeType = 'EQUITY_DELIVERY' | 'EQUITY_INTRADAY';
export type TradeStatus = 'OPEN' | 'CLOSED_TARGET' | 'CLOSED_STOPLOSS' | 'CLOSED_MANUAL' | 'CANCELLED';
export type Broker = 'Dhan' | 'Groww';
export type Exchange = 'NSE' | 'BSE';
export type Direction = 'LONG' | 'SHORT';

// Database table interfaces
export interface TradeTags {
  id: number;
  name: string;
  color: string;
  user_id: UUID | null;
  created_at: string; // ISO datetime string
}

export interface TradeJournal {
  id: number;
  user_id: UUID | null;
  company_name: string;
  trade_type: TradeType;
  quantity: number;
  buy_price: number | null; // Decimal(10, 2)
  sell_price: number | null; // Decimal(10, 2)
  stop_loss: number | null; // Decimal(10, 2)
  target_price: number | null; // Decimal(10, 2)
  entry_date: string; // ISO date string
  exit_date: string | null; // ISO date string
  status: TradeStatus;
  personal_notes: string;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  direction: Direction;
  broker: Broker;
  exchange: Exchange;
}

export interface TradeJournalTags {
  id: number;
  trade: number; // Foreign key to TradeJournal.id
  tag: number; // Foreign key to TradeTags.id
}

// Joined types for convenience
export interface TradeJournalWithTags extends TradeJournal {
  tags: TradeTags[];
}

export interface TradeJournalWithTagIds extends TradeJournal {
  tag_ids: number[];
}

// Database table names
export const TABLES = {
  TRADE_TAGS: 'journal_tradetags',
  TRADE_JOURNAL: 'journal_tradejournal',
  TRADE_JOURNAL_TAGS: 'journal_tradejournaltags',
} as const;

// Common database field names
export const FIELDS = {
  ID: 'id',
  USER_ID: 'user_id',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
} as const;