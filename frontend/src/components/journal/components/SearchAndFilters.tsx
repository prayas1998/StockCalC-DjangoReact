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
import { useSimpleSearch } from "@/hooks/useSimpleSearch"
import type { TradeJournal, TradeTags } from "@/types/journal"

interface SearchAndFiltersProps {
  searchQuery: string
  isSearching: boolean
  onSearchQueryChange: (query: string) => void
  onSearch: () => void
  onClearSearch: () => void
  onSuggestionSelect?: (suggestion: { text: string; type: string }) => void
  onOpenFilter: () => void
  activeFiltersCount?: number
  trades?: TradeJournal[]
  tags?: TradeTags[]
  filteredTradesCount?: number
}

export const SearchAndFilters = memo<SearchAndFiltersProps>(
  ({
    searchQuery,
    isSearching,
    onSearchQueryChange,
    onSearch,
    onClearSearch,
    onSuggestionSelect,
    onOpenFilter,
    activeFiltersCount = 0,
    trades = [],
    tags = [],
    filteredTradesCount,
  }) => {
    const inputRef = useRef<HTMLInputElement>(null)

    // Initialize refactored search suggestions hook
    const {
      suggestions,
      selectedIndex,
      showSuggestions,
      isLoading: isLoadingSuggestions,
      handleKeyDown: handleSuggestionKeyDown,
      selectSuggestion,
      hideSuggestions,
    } = useSimpleSearch({
      searchQuery,
      minCharacters: 2,
    })

    // Simple keyboard handling
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const selectedSuggestion = handleSuggestionKeyDown(e)

      if (selectedSuggestion) {
        // Suggestion selected via keyboard
        if (onSuggestionSelect) {
          onSuggestionSelect({ text: selectedSuggestion.text, type: selectedSuggestion.type })
        } else {
          onSearchQueryChange(selectedSuggestion.text)
          onSearch()
        }
        return
      }

      // Enter key for direct search
      if (e.key === "Enter" && !showSuggestions) {
        onSearch()
      }
    }

    // Simple suggestion click handler
    const handleSuggestionClick = (index: number) => {
      const suggestion = selectSuggestion(index)
      if (suggestion && onSuggestionSelect) {
        onSuggestionSelect({ text: suggestion.text, type: suggestion.type })
      }
    }

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchQueryChange(e.target.value)
    }

    // Set up keyboard event listener for the document
    useEffect(() => {
      const handleDocumentKeyDown = (e: KeyboardEvent) => {
        if (showSuggestions && e.key === "Escape") {
          hideSuggestions()
        }
      }

      document.addEventListener("keydown", handleDocumentKeyDown)
      return () => {
        document.removeEventListener("keydown", handleDocumentKeyDown)
      }
    }, [showSuggestions, hideSuggestions])

    return (
      <div className="space-y-3">
        {/* Filtered trades count display */}
        {activeFiltersCount > 0 && filteredTradesCount !== undefined && (
          <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {filteredTradesCount === 1
                  ? `1 trade matches your filters`
                  : `${filteredTradesCount} trades match your filters`}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {activeFiltersCount} {activeFiltersCount === 1 ? "filter" : "filters"} active
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              placeholder="Search trades by symbol, notes, or tags..."
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {}} // Simplified - no complex focus handling
              className="pr-10 h-10 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
              aria-label="Search trades"
              aria-expanded={showSuggestions}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              role="combobox"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isSearching || isLoadingSuggestions ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Search
                  className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors duration-200"
                  onClick={() => {
                    hideSuggestions()
                    onSearch()
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
                searchQuery={searchQuery}
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
      </div>
    )
  },
)

SearchAndFilters.displayName = "SearchAndFilters"
