import { useState, useEffect, useCallback } from 'react';
import { getUserTransactions, searchTransactions } from '@/services/api';
import type { Transaction } from '@/services/api';
import { toast } from '@/components/ui/use-toast';
import { checkApiConnection, formatApiError } from '@/lib/api-helpers';
import { useAuth } from '@/context/AuthContext';

export const useUserTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { refreshSession } = useAuth();

  const MAX_RETRIES = 3; // Limit the number of retries

  const fetchTransactions = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setError(null);
    
    // First check if the API is accessible
    const isConnected = await checkApiConnection();
    if (!isConnected) {
      setLoading(false);
      setError('API connection failed. Please check your connection and try again.');
      return;
    }
    
    try {
      console.log('Fetching user transactions...');
      const response = await getUserTransactions();
      
      if ('error' in response) {
        console.error('Error fetching transactions:', response);
        
        // If authentication failed, try to refresh the session
        if (response.detail === 'Your session has expired. Please log in again.' && retryCount < MAX_RETRIES) {
          console.log('Attempting to refresh session...');
          const newSession = await refreshSession();
          
          if (newSession) {
            console.log('Session refreshed, retrying transaction fetch...');
            // Retry fetching after successful refresh
            await fetchTransactions(retryCount + 1);
            return;
          }
        }
        
        throw new Error(formatApiError(response));
      }
      
      console.log(`Fetched ${response.length} transactions`);
      setTransactions(response);
      setFilteredTransactions(response);
    } catch (err) {
      console.error('Transaction fetch error:', err);
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
  }, [refreshSession]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredTransactions(transactions);
      return;
    }
    
    // Filter locally for better user experience
    const filtered = transactions.filter(
      transaction => transaction.title.toLowerCase().includes(query.toLowerCase())
    );
    
    setFilteredTransactions(filtered);
    
    // Optionally, you can also fetch from API if you need server-side search
    // try {
    //   const response = await searchTransactions(query);
    //   if ('error' in response) {
    //     throw new Error(response.error);
    //   }
    //   setFilteredTransactions(response);
    // } catch (err) {
    //   console.error('Search error:', err);
    // }
  }, [transactions]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions: filteredTransactions,
    loading,
    error,
    searchQuery,
    setSearchQuery: handleSearch,
    refreshTransactions: fetchTransactions
  };
}; 