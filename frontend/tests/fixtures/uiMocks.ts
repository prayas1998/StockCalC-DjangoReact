import React from 'react';
import type { TradeStatus } from '../../src/types/journal';

type MockResponse = { results?: Array<Record<string, unknown>> };
type DeferredCall = { args: unknown[]; resolve: (value: MockResponse) => void; reject: (reason?: Error) => void };
type SearchProps = {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onSuggestionSelect: (suggestion: { text: string; type: string }) => void;
  onOpenFilter: () => void;
};
type TradeProps = { searchQuery: string; searchResults: Array<Record<string, unknown>> | null };
type FilterProps = {
  open: boolean;
  selectedStatuses: TradeStatus[];
  onStatusChange: (statuses: TradeStatus[]) => void;
};
type TestHarness = {
  calculations: DeferredCall[];
  searches: DeferredCall[];
  suggestions: Array<{ args: unknown[]; resolve: (value: unknown) => void }>;
  journalFilters: unknown;
  searchProps: SearchProps;
  tradeProps: TradeProps;
  filterProps: FilterProps;
  baseTrades?: Array<Record<string, unknown>>;
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
  return { trades: harness().baseTrades || [], isLoading: false, isError: false, fetchNextPage() {}, hasNextPage: false, isFetchingNextPage: false, deleteTrade: { mutateAsync: async () => ({}) } };
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
    React.createElement('button', { id: 'open-filter-dialog', onClick: props.onOpenFilter }, 'Filters'),
    React.createElement('button', { id: 'select-suggestion', onClick: () => props.onSuggestionSelect({ text: 'Suggested', type: 'company' }) }, 'Suggestion'));
};
export const TradesList = (props: TradeProps) => {
  harness().tradeProps = props;
  return React.createElement('output', { id: 'trade-results' }, JSON.stringify({ query: props.searchQuery, results: props.searchResults }));
};
export const TradeCard = ({ trade }: { trade: { id: number; company_name?: string } }) =>
  React.createElement('article', { 'data-testid': 'trade-card', 'data-trade-id': trade.id }, trade.company_name || String(trade.id));
export const useInView = () => ({ ref: () => {} });
export const FilterDialog = (props: FilterProps) => {
  harness().filterProps = props;
  if (!props.open) return null;
  return React.createElement('div', null,
    React.createElement('button', { id: 'select-open-status', onClick: () => props.onStatusChange(['OPEN']) }, 'Open'),
    React.createElement('button', { id: 'select-closed-status', onClick: () => props.onStatusChange(['CLOSED_MANUAL']) }, 'Closed'));
};
export const TradeFormDialog = (props: TestHarness['formProps']) => { harness().formProps = props; return null; };
export const JournalAnalytics = () => null;
export const TagManager = () => null;
export const isTagsArray = Array.isArray;
