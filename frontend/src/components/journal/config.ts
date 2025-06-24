/**
 * Journal Module Configuration
 * Centralized configuration for journal-related features
 */

export const JOURNAL_CONFIG = {
  // Feature flags
  features: {
    enableAdvancedAnalytics: true,
    enableExport: true,
    enableImport: false, // Future feature
    enableNotifications: true,
    enableRealTimeUpdates: false, // Future feature
    enableBulkOperations: true,
  },

  // UI Configuration
  ui: {
    defaultPageSize: 10,
    maxPageSize: 50,
    enableInfiniteScroll: true,
    enableVirtualization: false, // For very large datasets
    compactMode: false,
    showAdvancedFilters: true,
  },

  // Performance Configuration
  performance: {
    enableMemoization: true,
    enableLazyLoading: true,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3,
    debounceDelay: 500,
  },

  // Analytics Configuration
  analytics: {
    enableRealTimeCalculations: true,
    maxDataPoints: 1000,
    defaultTimeRange: '1Y', // 1 year
    enableComparisons: true,
    enableBenchmarking: false, // Future feature
  },

  // Security Configuration
  security: {
    enableInputSanitization: true,
    enableRateLimiting: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    enableAuditLog: false, // Future feature
  },

  // Validation Configuration
  validation: {
    maxTradeValue: 10000000, // 1 crore
    maxQuantity: 1000000, // 10 lakh shares
    maxNoteLength: 1000,
    maxTagNameLength: 50,
    minPrice: 0.01,
    maxPrice: 1000000,
  },

  // Export Configuration
  export: {
    formats: ['CSV', 'PDF', 'Excel'],
    maxRecords: 10000,
    includeCharts: true,
    includeAnalytics: true,
  },

  // Notification Configuration
  notifications: {
    enableToasts: true,
    enableBrowserNotifications: false,
    enableEmailNotifications: false, // Future feature
    toastDuration: 5000, // 5 seconds
  },
} as const;

// Environment-specific overrides
export function getJournalConfig() {
  const config = { ...JOURNAL_CONFIG };

  // Development overrides
  if (process.env.NODE_ENV === 'development') {
    config.performance.cacheTimeout = 1000; // 1 second for faster development
    config.security.enableRateLimiting = false;
  }

  // Production overrides
  if (process.env.NODE_ENV === 'production') {
    config.features.enableAdvancedAnalytics = true;
    config.security.enableAuditLog = true;
  }

  return config;
}

// Type definitions for configuration
export type JournalConfig = typeof JOURNAL_CONFIG;
export type JournalFeatures = typeof JOURNAL_CONFIG.features;
export type JournalUIConfig = typeof JOURNAL_CONFIG.ui;
export type JournalPerformanceConfig = typeof JOURNAL_CONFIG.performance;