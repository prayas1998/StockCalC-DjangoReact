"use client"

/**
 * SearchAndFilters Component
 * Handles search input and filter controls with modern design
 */

import type React from "react"
import { memo, useRef, useEffect } from "react"
import { Search, Loader2, Sliders, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchSuggestions } from "./SearchSuggestions"
import { useSearchSuggestions, SearchSuggestion } from "@/hooks/useSearchSuggestions"
import { TradeJournal, TradeTags } from "@/types/journal"

interface SearchAndFiltersProps {
  searchQuery: string
  isSearching: boolean
  onSearchQueryChange: (query: string) => void
  onSearch: () => void
  onClearSearch: () => void
  onOpenFilter: () => void
  activeFiltersCount?: number
  trades?: TradeJournal[]
  tags?: TradeTags[]
}

export const SearchAndFilters = memo<SearchAndFiltersProps>(
  ({
    searchQuery,
    isSearching,
    onSearchQueryChange,
    onSearch,
    onClearSearch,
    onOpenFilter,
    activeFiltersCount = 0,
    trades = [],
    tags = [],
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Initialize search suggestions hook
    const {
      suggestions,
      selectedIndex,
      showSuggestions,
      handleKeyDown: handleSuggestionKeyDown,
      selectSuggestion,
      hideSuggestions,
      showSuggestionsIfAvailable,
    } = useSearchSuggestions({
      trades,
      tags,
      searchQuery,
      minCharacters: 3,
      maxSuggestions: 8
    });

    // Handle keyboard events for both search and suggestions
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Let suggestions handle navigation keys if they're visible
      if (showSuggestions && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
        const selectedSuggestion = handleSuggestionKeyDown(e.nativeEvent as KeyboardEvent);
        if (selectedSuggestion) {
          onSearchQueryChange(selectedSuggestion.text);
          onSearch();
        }
        return;
      }
      
      // Handle regular Enter key for search
      if (e.key === "Enter") {
        hideSuggestions();
        onSearch();
      }
    };

    // Handle suggestion selection
    const handleSuggestionClick = (index: number) => {
      const suggestion = selectSuggestion(index);
      if (suggestion) {
        onSearchQueryChange(suggestion.text);
        onSearch();
        inputRef.current?.focus();
      }
    };

    // Handle input focus to show suggestions
    const handleInputFocus = () => {
      showSuggestionsIfAvailable();
    };

    // Handle input blur to hide suggestions (with delay for clicks)
    const handleInputBlur = () => {
      // Delay hiding to allow for suggestion clicks
      setTimeout(() => {
        hideSuggestions();
      }, 200);
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchQueryChange(e.target.value);
    };

    // Set up keyboard event listener for the document
    useEffect(() => {
      const handleDocumentKeyDown = (e: KeyboardEvent) => {
        if (showSuggestions && e.key === 'Escape') {
          hideSuggestions();
        }
      };

      document.addEventListener('keydown', handleDocumentKeyDown);
      return () => {
        document.removeEventListener('keydown', handleDocumentKeyDown);
      };
    }, [showSuggestions, hideSuggestions]);

    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            placeholder="Search trades by symbol, notes, or tags..."
            value={searchQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className="pr-10 h-10 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
            aria-label="Search trades"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            role="combobox"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Search
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors duration-200"
                onClick={() => {
                  hideSuggestions();
                  onSearch();
                }}
                aria-label="Search"
              />
            )}
          </div>
          
          {/* Search Suggestions */}
          {showSuggestions && (
            <SearchSuggestions
              suggestions={suggestions}
              selectedIndex={selectedIndex}
              onSuggestionClick={handleSuggestionClick}
            />
          )}
        </div>

        <div className="flex gap-2">
          {searchQuery && (
            <Button
              variant="outline"
              onClick={onClearSearch}
              className="h-10 px-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-200 bg-transparent"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onOpenFilter}
            className={`h-10 px-4 relative transition-all duration-200 ${
              activeFiltersCount > 0
                ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                : "hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
            }`}
            aria-label="Open filters"
          >
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              <span className="font-medium">Filters</span>
              {activeFiltersCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {activeFiltersCount > 9 ? "9+" : activeFiltersCount}
                </div>
              )}
            </div>
          </Button>
        </div>
      </div>
    )
  },
)

SearchAndFilters.displayName = "SearchAndFilters"
