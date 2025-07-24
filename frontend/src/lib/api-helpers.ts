/**
 * API Helper utilities
 * This file contains utility functions for API-related operations
 */

import { toast } from "@/components/ui/use-toast";
import { API_ENDPOINTS, getApiUrl } from "@/config";

// Keep track of whether a connection error toast has been shown
let connectionErrorToastShown = false;

/**
 * Verifies the API connection and reports any issues
 * @param {boolean} showToast - Whether to show a toast notification on error (default: true)
 * @returns {Promise<boolean>} True if the connection was successful
 */
export const checkApiConnection = async (showToast = true): Promise<boolean> => {
  try {
    
    const response = await fetch(getApiUrl(API_ENDPOINTS.HEALTH_CHECK), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      // Reset the flag when connection is successful
      connectionErrorToastShown = false;
      return true;
    } else {
      
      // Show a helpful toast with debugging information, but only if requested and not shown recently
      if (showToast && !connectionErrorToastShown) {
        connectionErrorToastShown = true;
        
        toast({
          title: "API Connection Issue",
          description: `Unable to connect to the API (${response.status}). Please check your network connection and API server status.`,
          variant: "destructive",
        });
      }
      
      return false;
    }
  } catch (error) {
    
    // Show a toast only if requested and not shown recently
    if (showToast && !connectionErrorToastShown) {
      connectionErrorToastShown = true;
      
      toast({
        title: "API Connection Error",
        description: "Unable to reach the API server. Please check your connection or try again later.",
        variant: "destructive",
      });
    }
    
    return false;
  }
};

/**
 * Resets the connection error toast shown flag
 * Call this when you want to enable showing the toast again
 */
export const resetConnectionErrorToast = (): void => {
  connectionErrorToastShown = false;
};

/**
 * Formats an error message for display
 */
export const formatApiError = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.detail) {
    return error.detail;
  }
  
  return 'An unknown error occurred';
}; 