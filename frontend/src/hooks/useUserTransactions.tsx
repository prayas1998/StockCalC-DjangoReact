import { useState, useEffect, useCallback, useRef } from 'react';
import { getUserTransactions, deleteTransaction } from '@/services/api';
import type { Transaction } from '@/services/api';
import { toast } from '@/components/ui/use-toast';
import { checkApiConnection, formatApiError, resetConnectionErrorToast } from '@/lib/api-helpers';
import { useAuth } from '@/context/AuthContext';

export const useUserTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { refreshSession } = useAuth();
  const [apiConnectionFailed, setApiConnectionFailed] = useState(false);
  const refreshTimeoutRef = useRef<number | null>(null);

  const MAX_RETRIES = 3;

  const fetchTransactions = useCallback(async (retryCount = 0, showToast = true) => {
    // Clear any existing refresh timeout
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    // If we've already detected an API connection failure, don't try again
    if (apiConnectionFailed) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const isConnected = await checkApiConnection(showToast);
      if (!isConnected) {
        setLoading(false);
        setError('API connection failed. Please check your connection and try again.');
        setApiConnectionFailed(true);
        return;
      }
      
      const response = await getUserTransactions();
      
      if ('error' in response) {
        if (response.detail === 'Your session has expired. Please log in again.' && retryCount < MAX_RETRIES) {
          const newSession = await refreshSession();
          
          if (newSession) {
            await fetchTransactions(retryCount + 1);
            return;
          }
        }
        
        throw new Error(formatApiError(response));
      }
      
      setTransactions(response);
      setFilteredTransactions(response);
      setApiConnectionFailed(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transactions';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [refreshSession, apiConnectionFailed]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredTransactions(transactions);
      return;
    }
    
    const filtered = transactions.filter(
      transaction => transaction.title.toLowerCase().includes(query.toLowerCase())
    );
    
    setFilteredTransactions(filtered);
  }, [transactions]);

  // Manual refresh function that resets the API connection failed state
  const manualRefresh = useCallback(() => {
    setApiConnectionFailed(false);
    resetConnectionErrorToast(); // Reset the toast flag to show toast on next API call
    fetchTransactions(0, true); // Force showing toast on manual refresh
  }, [fetchTransactions]);

  useEffect(() => {
    fetchTransactions(0, true); // Show toast on initial load

    // Clean up timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [fetchTransactions]);

  // Delete a transaction group
  const deleteUserTransaction = async (id: number) => {
    setLoading(true);
    try {
      const result = await deleteTransaction(id);
      if ('error' in result) {
        throw new Error(result.detail || 'Failed to delete transaction');
      }
      toast({
        title: 'Success',
        description: 'Transaction deleted successfully',
      });
      await fetchTransactions();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    transactions: filteredTransactions,
    loading,
    error,
    searchQuery,
    setSearchQuery: handleSearch,
    refreshTransactions: manualRefresh,
    deleteUserTransaction,
    apiConnectionFailed,
  };
};