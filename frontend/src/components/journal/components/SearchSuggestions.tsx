/**
 * SearchSuggestions Component
 * Displays search suggestions with keyboard navigation support
 */

import React, { memo } from 'react';
import { Building2, Tag, FileText, ArrowUp, ArrowDown } from 'lucide-react';
import { SearchSuggestion } from '@/hooks/useSearchSuggestions';
import { cn } from '@/lib/utils';

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  selectedIndex: number;
  onSuggestionClick: (index: number) => void;
  className?: string;
}

const getIconForType = (type: SearchSuggestion['type']) => {
  switch (type) {
    case 'company':
      return <Building2 className="h-4 w-4 text-blue-500" />;
    case 'tag':
      return <Tag className="h-4 w-4 text-green-500" />;
    case 'note':
      return <FileText className="h-4 w-4 text-orange-500" />;
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
    case 'note':
      return 'Note';
    default:
      return '';
  }
};

export const SearchSuggestions = memo<SearchSuggestionsProps>(({
  suggestions,
  selectedIndex,
  onSuggestionClick,
  className
}) => {
  if (suggestions.length === 0) {
    return null;
  }

  // Scroll selected item into view
  React.useEffect(() => {
    if (selectedIndex >= 0) {
      const selectedElement = document.querySelector(`[data-suggestion-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  return (
    <div 
      className={cn(
        "absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-64 overflow-y-auto",
        className
      )}
      role="listbox"
      aria-label="Search suggestions"
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
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                {suggestion.text}
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {getTypeLabel(suggestion.type)}
              </span>
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