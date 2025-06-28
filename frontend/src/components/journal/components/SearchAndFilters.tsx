"use client"

/**
 * SearchAndFilters Component
 * Handles search input and filter controls with modern design
 */

import type React from "react"
import { memo } from "react"
import { Search, Loader2, Sliders, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SearchAndFiltersProps {
  searchQuery: string
  isSearching: boolean
  onSearchQueryChange: (query: string) => void
  onSearch: () => void
  onClearSearch: () => void
  onOpenFilter: () => void
  activeFiltersCount?: number
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
  }) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        onSearch()
      }
    }

    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search trades by symbol, notes, or tags..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pr-10 h-10 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
            aria-label="Search trades"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Search
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors duration-200"
                onClick={onSearch}
                aria-label="Search"
              />
            )}
          </div>
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
