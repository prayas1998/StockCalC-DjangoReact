/**
 * Simple search hook - minimal implementation for journal search
 * Replaces complex search system with basic debounced API calls
 */

import { useState, useLayoutEffect, useCallback, useRef } from 'react';
import { getSearchSuggestions } from '@/services/journalApi';

interface SearchSuggestion extends Record<string, unknown> {
  id: string;
  text: string;
  type: 'company' | 'tag';
  score: number;
}

const isSearchSuggestion = (value: unknown): value is SearchSuggestion => {
  if (typeof value !== 'object' || value === null) return false;
  const suggestion = value as Record<string, unknown>;
  return typeof suggestion.id === 'string' &&
    typeof suggestion.text === 'string' &&
    (suggestion.type === 'company' || suggestion.type === 'tag') &&
    typeof suggestion.score === 'number';
};

interface UseSimpleSearchProps {
  searchQuery: string;
  minCharacters?: number;
}

export const useSimpleSearch = ({
  searchQuery,
  minCharacters = 2
}: UseSimpleSearchProps) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSelectedQuery, setLastSelectedQuery] = useState<string>('');
  const requestIdRef = useRef(0);

  // Fetch suggestions from backend
  const fetchSuggestions = useCallback(async (query: string) => {
    const requestId = ++requestIdRef.current;
    if (query.length < minCharacters) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await getSearchSuggestions(query.trim());
      if (requestId !== requestIdRef.current) return;
      if (Array.isArray(result)) {
        const validSuggestions = result.filter(isSearchSuggestion);
        setSuggestions(validSuggestions);
        setShowSuggestions(validSuggestions.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [minCharacters]);

  // Debounced search effect (200ms)
  useLayoutEffect(() => {
    requestIdRef.current++;
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setIsLoading(false);
    // Don't fetch suggestions if this query was just selected
    if (searchQuery === lastSelectedQuery) {
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchQuery, fetchSuggestions, lastSelectedQuery]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return null;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          const selectedSuggestion = suggestions[selectedIndex];
          setLastSelectedQuery(selectedSuggestion.text); // Track the selected text
          return selectedSuggestion;
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
    return null;
  }, [showSuggestions, suggestions, selectedIndex]);

  // Select suggestion
  const selectSuggestion = useCallback((index: number) => {
    if (index >= 0 && index < suggestions.length) {
      const selectedSuggestion = suggestions[index];
      setLastSelectedQuery(selectedSuggestion.text); // Track the selected text
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return selectedSuggestion;
    }
    return null;
  }, [suggestions]);

  // Hide suggestions
  const hideSuggestions = useCallback(() => {
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }, []);

  return {
    suggestions,
    selectedIndex,
    showSuggestions,
    isLoading,
    handleKeyDown,
    selectSuggestion,
    hideSuggestions
  };
};
