import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { checkApiConnection, formatApiError } from '@/lib/api-helpers';
import { getJournalAnalytics } from '@/services/journalApi';
import type { JournalAnalytics } from '@/types/journal';

export const useJournalAnalytics = () => {
  const [apiConnectionFailed, setApiConnectionFailed] = useState(false);
  const { refreshSession } = useAuth();
  const MAX_RETRIES = 3;

  // Function to check API connection before making requests
  const checkConnection = useCallback(async (showToast = true) => {
    const isConnected = await checkApiConnection(showToast);
    setApiConnectionFailed(!isConnected);
    return isConnected;
  }, []);

  // Fetch analytics data
  const {
    data: analytics,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['journalAnalytics'],
    queryFn: async () => {
      const isConnected = await checkConnection();
      if (!isConnected) {
        throw new Error('API connection failed. Please check your connection and try again.');
      }

      const response = await getJournalAnalytics();

      if ('error' in response) {
        if (response.detail === 'Your session has expired. Please log in again.') {
          const newSession = await refreshSession();
          if (newSession) {
            // Session refreshed, retry the query
            return getJournalAnalytics();
          }
        }
        throw new Error(formatApiError(response));
      }

      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: MAX_RETRIES
  });

  // Calculate additional derived metrics
  const derivedMetrics = useCallback(() => {
    if (!analytics) return null;

    // Calculate win rate percentage (backend returns decimal, convert to percentage)
    const winRatePercentage = 'win_rate' in analytics ? analytics.win_rate * 100 : 0;

    return {
      winRatePercentage: parseFloat(winRatePercentage.toFixed(2)),
      avgRiskReward: parseFloat((analytics.avg_risk_reward || 0).toFixed(2)),
      profitFactor: parseFloat((analytics.profit_factor || 0).toFixed(2)),
      maxDrawdown: parseFloat((analytics.max_drawdown || 0).toFixed(2)),
      expectancy: parseFloat((analytics.expectancy || 0).toFixed(2)),
      largestWin: parseFloat((analytics.largest_win || 0).toFixed(2)),
      largestLoss: parseFloat((analytics.largest_loss || 0).toFixed(2)),
      avgWin: parseFloat((analytics.avg_win || 0).toFixed(2)),
      avgLoss: parseFloat((analytics.avg_loss || 0).toFixed(2)),
    };
  }, [analytics]);

  // Manual refresh function
  const refreshAnalytics = useCallback(() => {
    setApiConnectionFailed(false);
    refetch();
  }, [refetch]);

  return {
    analytics,
    derivedMetrics: derivedMetrics(),
    isLoading,
    isError,
    error,
    refreshAnalytics,
    apiConnectionFailed
  };
};