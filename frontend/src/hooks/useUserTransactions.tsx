import { useState, useEffect, useCallback } from 'react';
import { getUserTransactions } from '@/services/api';
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

  const MAX_RETRIES = 3;

  const fetchTransactions = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setError(null);
    
    const isConnected = await checkApiConnection();
    if (!isConnected) {
      setLoading(false);
      setError('API connection failed. Please check your connection and try again.');
      return;
    }
    
    try {
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
  }, [refreshSession]);

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