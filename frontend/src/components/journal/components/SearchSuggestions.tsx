/**
 * SearchSuggestions Component
 * Displays search suggestions with keyboard navigation support
 */

import React, { memo } from 'react';
import { Building2, Tag, ArrowUp, ArrowDown } from 'lucide-react';
// Simple search suggestion interface
interface SearchSuggestion {
  id: string;
  text: string;
  type: 'company' | 'tag';
  score: number;
}
import { cn } from '@/lib/utils';

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  selectedIndex: number;
  onSuggestionClick: (index: number) => void;
  className?: string;
  searchQuery?: string;
}

const getIconForType = (type: SearchSuggestion['type']) => {
  switch (type) {
    case 'company':
      return <Building2 className="h-4 w-4 text-blue-500" />;
    case 'tag':
      return <Tag className="h-4 w-4 text-green-500" />;
    default:
      return null;
  }
};

const getTypeLabel = (type: SearchSuggestion['type']) => {
  switch (type) {
    case 'company':
      return 'Company';
    case 'tag':
      return 'Tag';
    default:
      return '';
  }
};

// Simple text highlighting function
const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (regex.test(part)) {
      return <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark>;
    }
    return part;
  });
};

export const SearchSuggestions = memo<SearchSuggestionsProps>(({
  suggestions,
  selectedIndex,
  onSuggestionClick,
  className,
  searchQuery = ''
}) => {
  // Scroll selected item into view - moved before early return
  React.useEffect(() => {
    if (suggestions.length > 0 && selectedIndex >= 0) {
      const selectedElement = document.querySelector(`[data-suggestion-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex, suggestions.length]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div 
      className={cn(
        "absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-80 overflow-y-auto",
        className
      )}
      role="listbox"
      aria-label="Search suggestions"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'hsl(var(--border)) transparent'
      }}
    >
      {suggestions.map((suggestion, index) => {
        const isSelected = selectedIndex === index;
        const isFirstAndNoSelection = selectedIndex === -1 && index === 0;
        
        return (
          <div
            key={suggestion.id}
            className={cn(
              "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors duration-150",
              "hover:bg-muted/50",
              isSelected && "bg-primary/10 border-l-2 border-primary",
              isFirstAndNoSelection && "bg-muted/30 border-l-2 border-muted-foreground/30"
            )}
            onClick={() => onSuggestionClick(index)}
            role="option"
            aria-selected={isSelected}
            data-suggestion-index={index}
          >
          {/* Icon */}
          <div className="flex-shrink-0">
            {getIconForType(suggestion.type)}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground break-words">
                {highlightMatch(suggestion.text, searchQuery)}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {getTypeLabel(suggestion.type)}
                </span>
                {(suggestion as SearchSuggestion & { trade_count?: number }).trade_count && (suggestion as SearchSuggestion & { trade_count?: number }).trade_count! > 1 && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded">
                    {(suggestion as SearchSuggestion & { trade_count?: number }).trade_count} trades
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        );
      })}
      
      {/* Footer with keyboard hint */}
      <div className="px-3 py-2 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>Use</span>
            <ArrowUp className="h-3 w-3" />
            <ArrowDown className="h-3 w-3" />
            <span>to navigate, Enter to select {selectedIndex === -1 ? 'first' : 'highlighted'}</span>
          </div>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
});

SearchSuggestions.displayName = 'SearchSuggestions';