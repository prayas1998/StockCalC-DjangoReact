/**
 * Utility functions for journal components
 */

import { TradeStatus, TradeJournal, JournalAnalytics } from '@/types/journal';
import type { CalculationError } from '@/types/api';
import { STATUS_COLORS, PERFORMANCE_THRESHOLDS } from '../constants';

// Re-export utilities from other modules
export * from './security';
export * from './analytics';

/**
 * Type guard to check if data is valid JournalAnalytics
 */
export function isJournalAnalytics(
  data: JournalAnalytics | CalculationError | undefined
): data is JournalAnalytics {
  return !!data && !('error' in data) && typeof data === 'object';
}

/**
 * Type guard to check if data is a tags array
 */
export function isTagsArray(tags: unknown): tags is unknown[] {
  return Array.isArray(tags);
}

/**
 * Get status badge color class
 */
export function getStatusColor(status: TradeStatus): string {
  return STATUS_COLORS[status] || STATUS_COLORS.CANCELLED;
}


/**
 * Format trade status for display
 */
export function formatTradeStatus(status: TradeStatus): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get performance badge variant based on profit factor
 */
export function getProfitFactorBadge(profitFactor: number): {
  variant: string;
  label: string;
  icon: string;
} {
  if (profitFactor > PERFORMANCE_THRESHOLDS.EXCELLENT_PROFIT_FACTOR) {
    return {
      variant: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
      label: 'Excellent',
      icon: 'TrendingUp'
    };
  } else if (profitFactor > PERFORMANCE_THRESHOLDS.GOOD_PROFIT_FACTOR) {
    return {
      variant: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
      label: 'Good',
      icon: 'TrendingUp'
    };
  } else {
    return {
      variant: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
      label: 'Poor',
      icon: 'TrendingDown'
    };
  }
}

/**
 * Get win rate badge variant
 */
export function getWinRateBadge(winRate: number): {
  variant: string;
  label: string;
} {
  if (winRate >= PERFORMANCE_THRESHOLDS.EXCELLENT_WIN_RATE) {
    return {
      variant: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
      label: 'Excellent'
    };
  } else if (winRate >= PERFORMANCE_THRESHOLDS.GOOD_WIN_RATE) {
    return {
      variant: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
      label: 'Good'
    };
  } else {
    return {
      variant: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
      label: 'Needs Improvement'
    };
  }
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return HEX_COLOR_REGEX.test(color);
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Safe number parsing with fallback
 */
export function safeParseNumber(value: string | number, fallback: number = 0): number {
  if (typeof value === 'number') return isNaN(value) ? fallback : value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Format percentage with proper decimal places
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Check if trade is profitable
 */
export function isTradeProfit(trade: TradeJournal): boolean {
  return (trade.pnl || 0) > 0;
}

/**
 * Calculate profit/loss percentage for a trade
 */
export function calculatePnLPercentage(trade: TradeJournal): number | null {
  if (!trade.pnl || trade.status === 'OPEN') {
    return null;
  }
  
  // Calculate the investment amount (entry price * quantity)
  const investmentAmount = trade.buy_price * trade.quantity;
  
  if (investmentAmount === 0) {
    return null;
  }
  
  // Calculate percentage: (P&L / Investment Amount) * 100
  return (trade.pnl / investmentAmount) * 100;
}

/**
 * Get trade type and direction display text
 */
export function getTradeTypeDisplayText(tradeType: string, direction: string): string {
  if (tradeType === 'EQUITY_DELIVERY') {
    return 'Delivery';
  } else if (tradeType === 'EQUITY_INTRADAY') {
    return direction === 'LONG' ? 'Intraday-Long' : 'Intraday-Short';
  }
  // Fallback for unknown trade types
  return `${tradeType.replace('_', ' ')}-${direction}`;
}

/**
 * Calculate days between two dates
 */
export function calculateTradeDuration(entryDate: string, exitDate?: string): number {
  const entry = new Date(entryDate);
  const exit = exitDate ? new Date(exitDate) : new Date();
  const diffTime = Math.abs(exit.getTime() - entry.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get dynamic exit price based on trade status with descriptive label
 */
export function getExitPriceWithLabel(trade: TradeJournal): { price: number; label: string } | null {
  switch (trade.status) {
    case TradeStatus.CLOSED_TARGET:
      return trade.target_price ? { 
        price: trade.target_price, 
        label: 'Target' 
      } : null;
      
    case TradeStatus.CLOSED_STOPLOSS:
      return trade.stop_loss ? { 
        price: trade.stop_loss, 
        label: 'StopLoss' 
      } : null;
      
    case TradeStatus.CLOSED_MANUAL:
      // For CLOSED_MANUAL, the exit price depends on trade direction:
      // - LONG trades: Exit price is stored in sell_price (sell to close)
      // - SHORT trades: Exit price is stored in buy_price (buy to close)
      if (trade.direction === 'SHORT') {
        return trade.buy_price ? { 
          price: trade.buy_price, 
          label: 'Manual' 
        } : null;
      } else {
        return trade.sell_price ? { 
          price: trade.sell_price, 
          label: 'Manual' 
        } : null;
      }
      
    case TradeStatus.OPEN:
    case TradeStatus.CANCELLED:
    default:
      return null;
  }
}

/**
 * Format exit price with label for display
 */
export function formatExitPriceDisplay(trade: TradeJournal): string {
  const exitPriceData = getExitPriceWithLabel(trade);
  if (!exitPriceData) {
    return '--';
  }
  
  // Safely convert to number and format
  const priceNumber = typeof exitPriceData.price === 'string' 
    ? parseFloat(exitPriceData.price) 
    : exitPriceData.price;
    
  if (isNaN(priceNumber)) {
    return '--';
  }
  
  const formattedPrice = priceNumber.toFixed(2);
  return `₹${formattedPrice} (${exitPriceData.label})`;
}