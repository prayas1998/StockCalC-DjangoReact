# Search Suggestions Feature

## Overview
The search suggestions feature enhances the journal search functionality by providing intelligent suggestions as users type in the search bar.

## Features
- **Trigger after 3 characters**: Suggestions appear when the user types 3 or more characters
- **Keyboard navigation**: Use arrow keys (up/down) to navigate through suggestions
- **Enter to select**: Press Enter to select the highlighted suggestion
- **Escape to close**: Press Escape to close the suggestions dropdown
- **Click to select**: Click on any suggestion to select it

## Suggestion Types
1. **Company Names**: Suggests company names from existing trades
2. **Tags**: Suggests tag names that match the search query
3. **Notes**: Suggests relevant phrases from trade notes

## Implementation Details

### Components
- `SearchSuggestions`: Displays the suggestions dropdown with keyboard navigation
- `useSearchSuggestions`: Hook that manages suggestion logic and keyboard navigation

### Key Features
- **Smart sorting**: Exact matches appear first, followed by partial matches
- **Type prioritization**: Company names > Tags > Notes
- **Performance optimized**: Uses memoization and limits suggestions
- **Accessibility**: Full ARIA support for screen readers
- **Responsive design**: Works on all screen sizes

### Usage
The search suggestions are automatically integrated into the SearchAndFilters component when trades and tags data are provided.

```tsx
<SearchAndFilters
  searchQuery={searchQuery}
  isSearching={isSearching}
  onSearchQueryChange={setSearchQuery}
  onSearch={handleSearch}
  onClearSearch={clearSearch}
  onOpenFilter={openFilterDialog}
  trades={trades}
  tags={tags}
/>
```

## Keyboard Shortcuts
- Up/Down arrows: Navigate through suggestions
- Enter: Select highlighted suggestion or perform search
- Escape: Close suggestions dropdown
- Tab: Move focus away from search input (closes suggestions)

## Accessibility
- Full ARIA support with proper roles and attributes
- Keyboard navigation support
- Screen reader friendly
- High contrast support
- Focus management