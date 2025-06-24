/**
 * SearchAndFilters Component
 * Handles search input and filter controls
 */

import React, { memo } from 'react';
import { Search, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchAndFiltersProps {
  searchQuery: string;
  isSearching: boolean;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onOpenFilter: () => void;
}

export const SearchAndFilters = memo<SearchAndFiltersProps>(({
  searchQuery,
  isSearching,
  onSearchQueryChange,
  onSearch,
  onClearSearch,
  onOpenFilter,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <Input
          placeholder="Search trades..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pr-10"
          aria-label="Search trades"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Search
              className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              onClick={onSearch}
              aria-label="Search"
            />
          )}
        </div>
      </div>
      
      {searchQuery && (
        <Button 
          variant="outline" 
          onClick={onClearSearch}
          aria-label="Clear search"
        >
          Clear Search
        </Button>
      )}
      
      <Button 
        variant="outline" 
        onClick={onOpenFilter}
        aria-label="Open filters"
      >
        <Filter className="mr-2 h-4 w-4" /> Filter
      </Button>
    </div>
  );
});

SearchAndFilters.displayName = 'SearchAndFilters';