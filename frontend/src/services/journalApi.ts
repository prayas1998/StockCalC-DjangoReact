// services/journalApi.ts - Main journal API exports
// Re-exports from specialized API modules for backward compatibility

// Trade operations
export {
  getJournalTrades,
  getJournalTrade,
  createJournalTrade,
  updateJournalTrade,
  deleteJournalTrade
} from './tradeApi';

// Tag operations
export {
  getTradeTags,
  createTradeTag,
  updateTradeTag,
  deleteTradeTag
} from './tagApi';

// Analytics operations
export {
  getJournalAnalytics,
  getTagAnalytics
} from './analyticsApi';

// Search operations
export {
  searchJournalTrades,
  getSearchSuggestions
} from './searchApi';