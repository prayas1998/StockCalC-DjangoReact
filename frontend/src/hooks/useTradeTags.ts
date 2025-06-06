import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { checkApiConnection, formatApiError } from '@/lib/api-helpers';
import { getTradeTags, createTradeTag } from '@/services/journalApi';
import type { TradeTags } from '@/types/journal';

// Regex for validating hex color codes
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const useTradeTags = () => {
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

  // Fetch all tags
  const {
    data: tags,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['tradeTags'],
    queryFn: async () => {
      const isConnected = await checkConnection();
      if (!isConnected) {
        throw new Error('API connection failed. Please check your connection and try again.');
      }

      const response = await getTradeTags();

      if ('error' in response) {
        if (response.detail === 'Your session has expired. Please log in again.') {
          const newSession = await refreshSession();
          if (newSession) {
            // Session refreshed, retry the query
            return getTradeTags();
          }
        }
        throw new Error(formatApiError(response));
      }

      return response;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: MAX_RETRIES
  });

  // Validate tag data
  const validateTag = useCallback((name: string, color: string): { valid: boolean; error?: string } => {
    if (!name.trim()) {
      return { valid: false, error: 'Tag name cannot be empty' };
    }

    if (name.length > 50) {
      return { valid: false, error: 'Tag name must be less than 50 characters' };
    }

    if (!HEX_COLOR_REGEX.test(color)) {
      return { valid: false, error: 'Invalid color format. Use hex format (e.g., #FF5733)' };
    }

    return { valid: true };
  }, []);

  // Create a new tag
  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      // Validate tag data
      const validation = validateTag(name, color);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const isConnected = await checkConnection();
      if (!isConnected) {
        throw new Error('API connection failed. Please check your connection and try again.');
      }

      return createTradeTag({ name, color });
    },
    onSuccess: () => {
      toast.success('Tag created successfully');
      queryClient.invalidateQueries({ queryKey: ['tradeTags'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create tag: ${error.message}`);
    }
  });

  // Manual refresh function
  const refreshTags = useCallback(() => {
    setApiConnectionFailed(false);
    refetch();
  }, [refetch]);

  return {
    tags: tags || [],
    isLoading,
    isError,
    error,
    createTag,
    validateTag,
    refreshTags,
    apiConnectionFailed
  };
};