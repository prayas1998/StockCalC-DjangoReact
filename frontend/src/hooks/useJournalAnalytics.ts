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

    // Calculate win rate percentage
    const winRatePercentage = 'win_rate' in analytics ? analytics.win_rate * 100 : 0;

    // Calculate average risk-reward ratio (placeholder as it's not in the interface)
    const avgRiskReward = 0; // This would need to be added to the backend API

    // Calculate profit factor (placeholder as it's not in the interface)
    const profitFactor = 'total_pnl' in analytics && analytics.total_pnl > 0 ? analytics.total_pnl / Math.abs(analytics.total_pnl - analytics.total_pnl) : 0;

    return {
      winRatePercentage: parseFloat(winRatePercentage.toFixed(2)),
      avgRiskReward: parseFloat(avgRiskReward.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
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