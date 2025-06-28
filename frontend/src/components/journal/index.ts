/**
 * Journal Components Index
 * Centralized exports for all journal-related components, hooks, and utilities
 */

// Main Components
export { JournalAnalytics } from './JournalAnalytics';
export { TagManager } from './TagManager';
export { TradeCard } from './TradeCard';
export { TradeForm } from './TradeForm';
export { TradeFormDialog } from './TradeFormDialog';

// Sub Components
export { TradesList } from './components/TradesList';
export { SearchAndFilters } from './components/SearchAndFilters';
export { SearchSuggestions } from './components/SearchSuggestions';
export { FilterDialog } from './components/FilterDialog';
export { JournalErrorBoundary } from './components/JournalErrorBoundary';

// Hooks
export { useJournalState } from './hooks/useJournalState';
export { useOptimizedJournal } from './hooks/useOptimizedJournal';

// Utilities
export * from './utils';

// Constants
export * from './constants';

// Services
export * from './services/errorHandler';