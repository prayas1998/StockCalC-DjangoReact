/**
 * Simple search hook - minimal implementation for journal search
 * Replaces complex search system with basic debounced API calls
 */

import { useState, useEffect, useCallback } from 'react';
import { getSearchSuggestions } from '@/services/journalApi';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'company' | 'tag';
  score: number;
}

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

  // Fetch suggestions from backend
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < minCharacters) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await getSearchSuggestions(query.trim());
      if (Array.isArray(result)) {
        setSuggestions(result);
        setShowSuggestions(result.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, [minCharacters]);

  // Debounced search effect (200ms)
  useEffect(() => {
    // Don't fetch suggestions if this query was just selected
    if (searchQuery === lastSelectedQuery) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 200);

    return () => clearTimeout(timeoutId);
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