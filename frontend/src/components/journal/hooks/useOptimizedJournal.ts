/**
 * Optimized journal hook with memoization and performance improvements
 */

import { useMemo, useCallback } from 'react';
import { useJournal } from '@/hooks/useJournal';
import { useTradeTags } from '@/hooks/useTradeTags';
import { TradeJournal, JournalFilters } from '@/types/journal';
import { debounce } from '../utils';
import { SEARCH_CONFIG } from '../constants';

interface UseOptimizedJournalProps {
  filters?: JournalFilters;
  searchQuery?: string;
}

export function useOptimizedJournal({ 
  filters, 
  searchQuery 
}: UseOptimizedJournalProps = {}) {
  // Get journal data
  const journalQuery = useJournal(filters);
  const tagsQuery = useTradeTags();

  // Memoize filtered trades based on search query
  const filteredTrades = useMemo(() => {
    if (!searchQuery || searchQuery.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      return journalQuery.trades;
    }

    const query = searchQuery.toLowerCase();
    return journalQuery.trades.filter((trade) =>
      trade.company_name.toLowerCase().includes(query) ||
      (trade.personal_notes && trade.personal_notes.toLowerCase().includes(query)) ||
      trade.tags.some(tag => tag.name.toLowerCase().includes(query))
    );
  }, [journalQuery.trades, searchQuery]);

  // Memoize trade statistics
  const tradeStats = useMemo(() => {
    const trades = filteredTrades;
    
    if (!trades.length) {
      return {
        totalTrades: 0,
        profitableTrades: 0,
        losingTrades: 0,
        totalPnL: 0,
        avgPnL: 0,
        winRate: 0,
      };
    }

    const profitableTrades = trades.filter(trade => (trade.pnl || 0) > 0);
    const losingTrades = trades.filter(trade => (trade.pnl || 0) < 0);
    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);

    return {
      totalTrades: trades.length,
      profitableTrades: profitableTrades.length,
      losingTrades: losingTrades.length,
      totalPnL,
      avgPnL: totalPnL / trades.length,
      winRate: (profitableTrades.length / trades.length) * 100,
    };
  }, [filteredTrades]);

  // Memoize tag options for forms
  const tagOptions = useMemo(() => {
    if (!Array.isArray(tagsQuery.tags)) return [];
    
    return tagsQuery.tags.map(tag => ({
      value: tag.id,
      label: tag.name,
      color: tag.color,
    }));
  }, [tagsQuery.tags]);

  // Debounced search function
  const debouncedSearch = useCallback(
    (query: string, callback: (results: TradeJournal[]) => void) => {
      const debouncedFn = debounce(() => {
        if (!query || query.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
          callback(journalQuery.trades);
          return;
        }

        const searchQuery = query.toLowerCase();
        const results = journalQuery.trades.filter((trade) =>
          trade.company_name.toLowerCase().includes(searchQuery) ||
          (trade.personal_notes && trade.personal_notes.toLowerCase().includes(searchQuery)) ||
          trade.tags.some(tag => tag.name.toLowerCase().includes(searchQuery))
        );
        
        callback(results);
      }, SEARCH_CONFIG.DEBOUNCE_DELAY);
      
      debouncedFn();
    },
    [journalQuery.trades]
  );

  // Optimized delete handler with optimistic updates
  const optimizedDeleteTrade = useCallback(async (tradeId: number) => {
    await journalQuery.deleteTrade.mutateAsync(tradeId);
  }, [journalQuery.deleteTrade]);

  return {
    // Data
    trades: filteredTrades,
    allTrades: journalQuery.trades,
    tags: tagsQuery.tags,
    tagOptions,
    tradeStats,
    
    // Loading states
    isLoading: journalQuery.isLoading,
    isError: journalQuery.isError,
    isTagsLoading: tagsQuery.isLoading,
    
    // Pagination
    hasNextPage: journalQuery.hasNextPage,
    isFetchingNextPage: journalQuery.isFetchingNextPage,
    fetchNextPage: journalQuery.fetchNextPage,
    
    // Mutations
    createTrade: journalQuery.createTrade,
    updateTrade: journalQuery.updateTrade,
    deleteTrade: optimizedDeleteTrade,
    createTag: tagsQuery.createTag,
    updateTag: tagsQuery.updateTag,
    deleteTag: tagsQuery.deleteTag,
    
    // Utilities
    debouncedSearch,
    refreshTrades: journalQuery.refreshTrades,
    refreshTags: tagsQuery.refreshTags,
  };
}