/**
 * TradesList Component
 * Handles the display of trades with infinite scroll and loading states
 */

import React, { memo } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';
import { TradeCard } from '../TradeCard';
import { TradeJournal } from '@/types/journal';

interface TradesListProps {
  trades: TradeJournal[];
  searchResults: TradeJournal[] | null;
  searchQuery: string;
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onEditTrade: (trade: TradeJournal) => void;
  onDeleteTrade: (tradeId: number) => void;
  onFetchNextPage: () => void;
}

export const TradesList = memo<TradesListProps>(({
  trades,
  searchResults,
  searchQuery,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onEditTrade,
  onDeleteTrade,
  onFetchNextPage,
}) => {
  // Infinite scroll sentinel
  const { ref } = useInView({
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage && !searchQuery) {
        onFetchNextPage();
      }
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Failed to load trades. Please try again later.
      </div>
    );
  }

  // Determine which list to show
  const displayTrades = searchQuery && searchResults !== null ? searchResults : trades;

  // Empty state
  if (!displayTrades || displayTrades.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        {searchQuery 
          ? 'No trades found matching your search criteria.'
          : 'No trades found. Add your first trade to get started!'
        }
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayTrades.map((trade) => (
        <TradeCard
          key={trade.id}
          trade={trade}
          onEdit={onEditTrade}
          onDelete={onDeleteTrade}
        />
      ))}
      
      {/* Infinite scroll sentinel */}
      {!searchQuery && (hasNextPage || isFetchingNextPage) && (
        <div ref={ref} className="flex justify-center items-center py-4">
          {isFetchingNextPage && (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  );
});

TradesList.displayName = 'TradesList';