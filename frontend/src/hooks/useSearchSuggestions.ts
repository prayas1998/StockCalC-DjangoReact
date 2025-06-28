/**
 * Custom hook for managing search suggestions
 * Provides search suggestions based on trade data with keyboard navigation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TradeJournal, TradeTags } from '@/types/journal';

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'company' | 'tag' | 'note';
  icon?: string;
}

interface UseSearchSuggestionsProps {
  trades: TradeJournal[];
  tags: TradeTags[];
  searchQuery: string;
  minCharacters?: number;
  maxSuggestions?: number;
}

export const useSearchSuggestions = ({
  trades,
  tags,
  searchQuery,
  minCharacters = 3,
  maxSuggestions = 8
}: UseSearchSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Generate suggestions based on trade data
  const generateSuggestions = useMemo(() => {
    try {
      if (searchQuery.length < minCharacters) {
        return [];
      }

      const query = searchQuery.toLowerCase().trim();
      if (!query) {
        return [];
      }

      const suggestionSet = new Set<string>();
      const suggestions: SearchSuggestion[] = [];

    // Add company name suggestions
    trades.forEach(trade => {
      const companyName = trade.company_name.toLowerCase();
      if (companyName.includes(query) && !suggestionSet.has(trade.company_name)) {
        suggestionSet.add(trade.company_name);
        suggestions.push({
          id: `company-${trade.company_name}`,
          text: trade.company_name,
          type: 'company'
        });
      }
    });

    // Add tag suggestions
    tags.forEach(tag => {
      const tagName = tag.name.toLowerCase();
      if (tagName.includes(query) && !suggestionSet.has(tag.name)) {
        suggestionSet.add(tag.name);
        suggestions.push({
          id: `tag-${tag.id}`,
          text: tag.name,
          type: 'tag'
        });
      }
    });

    // Add note suggestions (extract meaningful phrases from notes)
    trades.forEach(trade => {
      if (trade.personal_notes && trade.personal_notes.trim().length > 0) {
        const notes = trade.personal_notes.toLowerCase();
        if (notes.includes(query)) {
          // Extract sentences or phrases that contain the query
          const sentences = trade.personal_notes.split(/[.!?]+/).filter(sentence => 
            sentence.toLowerCase().includes(query) && sentence.trim().length > 0
          );
          
          sentences.slice(0, 2).forEach(sentence => { // Limit to 2 sentences per trade
            const trimmedSentence = sentence.trim();
            if (trimmedSentence.length > 10 && trimmedSentence.length <= 80 && !suggestionSet.has(trimmedSentence)) {
              suggestionSet.add(trimmedSentence);
              suggestions.push({
                id: `note-${trade.id}-${Date.now()}-${Math.random()}`,
                text: trimmedSentence,
                type: 'note'
              });
            }
          });
        }
      }
    });

    // Sort suggestions by relevance (exact matches first, then partial matches)
    return suggestions
      .sort((a, b) => {
        const aExact = a.text.toLowerCase().startsWith(query);
        const bExact = b.text.toLowerCase().startsWith(query);
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then by type priority: company > tag > note
        const typePriority = { company: 0, tag: 1, note: 2 };
        const aPriority = typePriority[a.type];
        const bPriority = typePriority[b.type];
        
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        // Finally by alphabetical order
        return a.text.localeCompare(b.text);
      })
      .slice(0, maxSuggestions);
    } catch (error) {
      console.error('Error generating search suggestions:', error);
      return [];
    }
  }, [trades, tags, searchQuery, minCharacters, maxSuggestions]);

  // Update suggestions when query changes
  useEffect(() => {
    const newSuggestions = generateSuggestions;
    setSuggestions(newSuggestions);
    setSelectedIndex(-1);
    setShowSuggestions(newSuggestions.length > 0 && searchQuery.length >= minCharacters);
  }, [generateSuggestions, searchQuery, minCharacters]);

  // Keyboard navigation handlers
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

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
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          event.preventDefault();
          return suggestions[selectedIndex];
        }
        break;
      
      case 'Escape':
        event.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
    
    return null;
  }, [showSuggestions, suggestions, selectedIndex]);

  // Select suggestion by index
  const selectSuggestion = useCallback((index: number) => {
    if (index >= 0 && index < suggestions.length) {
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return suggestions[index];
    }
    return null;
  }, [suggestions]);

  // Hide suggestions
  const hideSuggestions = useCallback(() => {
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }, []);

  // Show suggestions
  const showSuggestionsIfAvailable = useCallback(() => {
    if (suggestions.length > 0 && searchQuery.length >= minCharacters) {
      setShowSuggestions(true);
    }
  }, [suggestions.length, searchQuery.length, minCharacters]);

  return {
    suggestions,
    selectedIndex,
    showSuggestions,
    handleKeyDown,
    selectSuggestion,
    hideSuggestions,
    showSuggestionsIfAvailable,
    hasSuggestions: suggestions.length > 0
  };
};