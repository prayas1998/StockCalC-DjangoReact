import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { JournalFilters } from '@/types/journal';
import { filtersFromParams, filtersToParams } from '@/utils/journalFilterUrlState';

export const useJournalFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<JournalFilters>(() => filtersFromParams(searchParams));
  const [searchQuery, setSearchQueryState] = useState(() => searchParams.get('query') || '');
  const searchTimeoutRef = useRef<number | null>(null);
  const expectedParamsRef = useRef<string | null>(null);
  const filtersRef = useRef(filters);
  const searchQueryRef = useRef(searchQuery);

  const syncFiltersToUrl = useCallback((newFilters: JournalFilters, query: string) => {
    const params = filtersToParams(newFilters, query);
    expectedParamsRef.current = params.toString();
    setSearchParams(params);
  }, [setSearchParams]);

  // Own URL writes already match local state. Apply only initial or browser navigation changes.
  useLayoutEffect(() => {
    const paramsString = searchParams.toString();
    if (expectedParamsRef.current === paramsString) {
      expectedParamsRef.current = null;
      return;
    }
    if (searchTimeoutRef.current !== null) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    const nextFilters = filtersFromParams(searchParams);
    const nextQuery = searchParams.get('query') || '';
    filtersRef.current = nextFilters;
    searchQueryRef.current = nextQuery;
    setFilters(nextFilters);
    setSearchQueryState(nextQuery);
  }, [searchParams]);

  const handleSearchChange = useCallback((query: string) => {
    searchQueryRef.current = query;
    setSearchQueryState(query);
    if (searchTimeoutRef.current !== null) window.clearTimeout(searchTimeoutRef.current);
    if (!query) {
      syncFiltersToUrl(filtersRef.current, query);
      return;
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      searchTimeoutRef.current = null;
      syncFiltersToUrl(filtersRef.current, searchQueryRef.current);
    }, 300);
  }, [syncFiltersToUrl]);

  const updateFilter = useCallback(<K extends keyof JournalFilters>(key: K, value: JournalFilters[K]) => {
    const newFilters = { ...filtersRef.current, [key]: value };
    filtersRef.current = newFilters;
    setFilters(newFilters);
    if (searchTimeoutRef.current !== null) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    syncFiltersToUrl(newFilters, searchQueryRef.current);
  }, [syncFiltersToUrl]);

  const resetFilters = useCallback(() => {
    filtersRef.current = {};
    searchQueryRef.current = '';
    if (searchTimeoutRef.current !== null) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setFilters({});
    setSearchQueryState('');
    expectedParamsRef.current = '';
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  useEffect(() => () => {
    if (searchTimeoutRef.current !== null) window.clearTimeout(searchTimeoutRef.current);
  }, []);

  return { filters, searchQuery, updateFilter, setSearchQuery: handleSearchChange, resetFilters };
};
