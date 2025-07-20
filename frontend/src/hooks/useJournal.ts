import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { checkApiConnection, formatApiError, resetConnectionErrorToast } from '@/lib/api-helpers';
import {
  getJournalTrades,
  getJournalTrade,
  createJournalTrade,
  updateJournalTrade,
  deleteJournalTrade,
  searchJournalTrades
} from '@/services/journalApi';
import type { TradeJournal, TradeJournalCreate, TradeJournalUpdate, JournalFilters, TradeJournalResponse } from '@/types/journal';

export const useJournal = (filters?: JournalFilters) => {
  const [apiConnectionFailed, setApiConnectionFailed] = useState(false);
  const { refreshSession } = useAuth();
  const queryClient = useQueryClient();
  const MAX_RETRIES = 3;

  // Function to check API connection before making requests
  const checkConnection = useCallback(async (showToast = true) => {
    const isConnected = await checkApiConnection(showToast);
    setApiConnectionFailed(!isConnected);
    return isConnected;
  }, []);

  // Fetch trades with pagination and infinite scrolling
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['journalTrades', filters],
    queryFn: async ({ pageParam = 1 }) => {
      
      const isConnected = await checkConnection();
      if (!isConnected) {
        throw new Error('API connection failed. Please check your connection and try again.');
      }

      const response = await getJournalTrades({
        ...filters,
        page: pageParam,
        page_size: 10 // Default page size
      });
      

      if ('error' in response) {
        if (response.detail === 'Your session has expired. Please log in again.') {
          const newSession = await refreshSession();
          if (newSession) {
            // Session refreshed, retry the query
            return getJournalTrades({
              ...filters,
              page: pageParam,
              page_size: 10
            });
          }
        }
        throw new Error(formatApiError(response));
      }

      return response;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || 'error' in lastPage) return undefined;
      // Extract page number from the 'next' URL if it exists
      if (lastPage.next) {
        const url = new URL(lastPage.next);
        const nextPage = url.searchParams.get('page');
        return nextPage ? parseInt(nextPage) : undefined;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: MAX_RETRIES
  });

  // Extract all trades from paginated results
  const trades = data?.pages.flatMap(page => {
    if (!page || 'error' in page) return [];
    return page.results;
  }) || [];

  // Create a new trade
  const createTrade = useMutation({
    mutationFn: async (newTrade: TradeJournalCreate) => {
      const isConnected = await checkConnection();
      if (!isConnected) {
        throw new Error('API connection failed. Please check your connection and try again.');
      }
      const result = await createJournalTrade(newTrade);
      if ('error' in result) {
        throw new Error(result.detail || result.error);
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Trade added successfully');
      queryClient.invalidateQueries({ queryKey: ['journalTrades'] });
      queryClient.invalidateQueries({ queryKey: ['journalAnalytics'] }); // Invalidate analytics on trade changes
    },
    onError: (error: any) => {
      // Don't show toast for validation errors - let form handle field-level errors
      // Only show toast for non-validation errors
      if (!error.message || !error.message.includes('{')) {
        toast.error(`Failed to add trade: ${error.message || 'Unknown error occurred'}`);
      }
    }
  });

  // Update an existing trade
  const updateTrade = useMutation({
    mutationFn: async ({ id, trade }: { id: number, trade: TradeJournalUpdate }) => {
      const isConnected = await checkConnection();
      if (!isConnected) {
        throw new Error('API connection failed. Please check your connection and try again.');
      }
      const result = await updateJournalTrade(id.toString(), trade);
      if ('error' in result) {
        throw new Error(result.detail || result.error);
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Trade updated successfully');
      queryClient.invalidateQueries({ queryKey: ['journalTrades'] });
      queryClient.invalidateQueries({ queryKey: ['journalAnalytics'] });
    },
    onError: (error: any) => {
      // Don't show toast for validation errors - let form handle field-level errors
      // Only show toast for non-validation errors
      if (!error.message || !error.message.includes('{')) {
        toast.error(`Failed to update trade: ${error.message || 'Unknown error occurred'}`);
      }
    }
  });

  // Delete a trade
  const deleteTrade = useMutation({
    mutationFn: async (id: number) => {
      const isConnected = await checkConnection();
      if (!isConnected) {
        throw new Error('API connection failed. Please check your connection and try again.');
      }
      return deleteJournalTrade(id.toString());
    },
    onSuccess: () => {
      toast.success('Trade deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['journalTrades'] });
      queryClient.invalidateQueries({ queryKey: ['journalAnalytics'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete trade: ${error.message}`);
    }
  });

  // Manual refresh function that resets the API connection failed state
  const manualRefresh = useCallback(() => {
    setApiConnectionFailed(false);
    resetConnectionErrorToast(); // Reset the toast flag to show toast on next API call
    refetch();
  }, [refetch]);

  return {
    trades,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    createTrade,
    updateTrade,
    deleteTrade,
    refreshTrades: manualRefresh,
    apiConnectionFailed
  };
};