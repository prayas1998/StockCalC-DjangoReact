import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { JournalFilters, TradeStatus, TradeType } from '@/types/journal';

export const useJournalFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<JournalFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeoutRef = useRef<number | null>(null);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const initialFilters: JournalFilters = {};
    
    // Parse status filter
    const status = searchParams.get('status') as TradeStatus | null;
    if (status) initialFilters.status = status;
    
    // Parse trade type filter
    const tradeType = searchParams.get('trade_type') as TradeType | null;
    if (tradeType) initialFilters.trade_type = tradeType;
    
    // Parse date filters
    const startDate = searchParams.get('start_date');
    if (startDate) initialFilters.start_date = startDate;
    
    const endDate = searchParams.get('end_date');
    if (endDate) initialFilters.end_date = endDate;
    
    // Parse tag IDs
    const tagIds = searchParams.get('tag_ids');
    if (tagIds) {
      initialFilters.tag_ids = tagIds.split(',').map(id => parseInt(id, 10));
    }
    
    // Parse profitability filter
    const isProfitable = searchParams.get('is_profitable');
    if (isProfitable !== null) {
      initialFilters.is_profitable = isProfitable === 'true';
    }
    
    // Parse search query
    const query = searchParams.get('query');
    if (query) setSearchQuery(query);
    
    setFilters(initialFilters);
  }, [searchParams]);

  // Update URL when filters change
  const syncFiltersToUrl = useCallback((newFilters: JournalFilters, query?: string) => {
    const params = new URLSearchParams();
    
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.trade_type) params.set('trade_type', newFilters.trade_type);
    if (newFilters.start_date) params.set('start_date', newFilters.start_date);
    if (newFilters.end_date) params.set('end_date', newFilters.end_date);
    if (newFilters.tag_ids?.length) params.set('tag_ids', newFilters.tag_ids.join(','));
    if (newFilters.is_profitable !== undefined) params.set('is_profitable', String(newFilters.is_profitable));
    if (query) params.set('query', query);
    
    setSearchParams(params);
  }, [setSearchParams]);

  // Handle search query with debounce
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    
    // For search suggestions, we don't want to debounce the URL update
    // since suggestions are shown immediately. Only debounce if query is empty
    // or if it's a complete search action
    if (query.length === 0) {
      const newFilters = { ...filters };
      syncFiltersToUrl(newFilters, query);
    } else {
      // Set a shorter timeout for URL sync when typing
      searchTimeoutRef.current = window.setTimeout(() => {
        const newFilters = { ...filters };
        syncFiltersToUrl(newFilters, query);
      }, 300); // Reduced debounce delay for better UX with suggestions
    }
  }, [filters, syncFiltersToUrl]);

  // Update a specific filter
  const updateFilter = useCallback(<K extends keyof JournalFilters>(key: K, value: JournalFilters[K]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    syncFiltersToUrl(newFilters, searchQuery);
  }, [filters, searchQuery, syncFiltersToUrl]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    filters,
    searchQuery,
    updateFilter,
    setSearchQuery: handleSearchChange,
    resetFilters
  };
};