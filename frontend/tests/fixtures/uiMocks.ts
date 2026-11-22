import React from 'react';

type MockResponse = { results?: Array<Record<string, unknown>> };
type DeferredCall = { args: unknown[]; resolve: (value: MockResponse) => void; reject: (reason?: Error) => void };
type SearchProps = {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onSuggestionSelect: (suggestion: { text: string; type: string }) => void;
};
type TradeProps = { searchQuery: string; searchResults: Array<Record<string, unknown>> | null };
type TestHarness = {
  calculations: DeferredCall[];
  searches: DeferredCall[];
  suggestions: Array<{ args: unknown[]; resolve: (value: unknown) => void }>;
  journalFilters: unknown;
  searchProps: SearchProps;
  tradeProps: TradeProps;
  formProps: { onTradeUpdated: () => Promise<void> };
};

const harness = () => (globalThis as typeof globalThis & { __uiTest: TestHarness }).__uiTest;

export const calculateCharges = (...args: unknown[]) => new Promise<MockResponse>((resolve, reject) => {
  harness().calculations.push({ args, resolve, reject });
});
export const searchJournalTrades = (...args: unknown[]) => new Promise<MockResponse>((resolve, reject) => {
  harness().searches.push({ args, resolve, reject });
});
export const getSearchSuggestions = (...args: unknown[]) => new Promise<unknown>(resolve => {
  harness().suggestions.push({ args, resolve });
});

export function useJournal(filters: unknown) {
  harness().journalFilters = filters;
  return { trades: [], isLoading: false, isError: false, fetchNextPage() {}, hasNextPage: false, isFetchingNextPage: false, deleteTrade: { mutateAsync: async () => ({}) } };
}
export function useTradeTags() { return { tags: [] }; }

type ChildrenProps = { children?: React.ReactNode };
export const Button = ({ children }: ChildrenProps) => React.createElement('button', null, children);
export const Tabs = ({ children }: ChildrenProps) => React.createElement('div', null, children);
export const TabsList = ({ children }: ChildrenProps) => React.createElement('div', null, children);
export const TabsTrigger = ({ children }: ChildrenProps) => React.createElement('button', null, children);
export const TabsContent = ({ children }: ChildrenProps) => React.createElement('section', null, children);

export const SearchAndFilters = (props: SearchProps) => {
  harness().searchProps = props;
  return React.createElement('div', null,
    React.createElement('input', { id: 'search-query', value: props.searchQuery, onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.onSearchQueryChange(event.target.value) }),
    React.createElement('button', { id: 'submit-search', onClick: props.onSearch }, 'Search'),
    React.createElement('button', { id: 'clear-search', onClick: props.onClearSearch }, 'Clear'),
    React.createElement('button', { id: 'select-suggestion', onClick: () => props.onSuggestionSelect({ text: 'Suggested', type: 'company' }) }, 'Suggestion'));
};
export const TradesList = (props: TradeProps) => {
  harness().tradeProps = props;
  return React.createElement('output', { id: 'trade-results' }, JSON.stringify({ query: props.searchQuery, results: props.searchResults }));
};
export const FilterDialog = () => null;
export const TradeFormDialog = (props: TestHarness['formProps']) => { harness().formProps = props; return null; };
export const JournalAnalytics = () => null;
export const TagManager = () => null;
export const isTagsArray = Array.isArray;
