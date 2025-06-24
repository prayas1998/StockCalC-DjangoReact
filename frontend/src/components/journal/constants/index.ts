/**
 * Journal-related constants and configuration
 */

// Chart colors for consistent theming
export const CHART_COLORS = [
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
] as const;

// Predefined tag colors for quick selection
export const PREDEFINED_TAG_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#6b7280', // Gray
] as const;

// Pagination and query configuration
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  MAX_RETRIES: 3,
} as const;

// Search configuration
export const SEARCH_CONFIG = {
  DEBOUNCE_DELAY: 500, // milliseconds
  MIN_QUERY_LENGTH: 2,
} as const;

// Validation constants
export const VALIDATION_LIMITS = {
  TAG_NAME_MAX_LENGTH: 50,
  COMPANY_NAME_MAX_LENGTH: 100,
  NOTES_MAX_LENGTH: 1000,
} as const;

// Status badge colors mapping
export const STATUS_COLORS = {
  OPEN: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  CLOSED_TARGET: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  CLOSED_STOPLOSS: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
  CLOSED_MANUAL: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
  CANCELLED: 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20',
} as const;

// Performance thresholds for analytics
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT_PROFIT_FACTOR: 1.5,
  GOOD_PROFIT_FACTOR: 1.0,
  EXCELLENT_WIN_RATE: 70,
  GOOD_WIN_RATE: 50,
} as const;