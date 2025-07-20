// services/api.ts

import { CalculationError } from '../types/api';
import { API_ENDPOINTS, getApiUrl } from '../config';
import { supabase } from '../lib/supabase';
import { getAuthToken as getStoredToken, setAuthToken, removeAuthToken } from '../lib/tokenStorage';
import { handleApiError, handleAuthenticationError, handleNetworkError } from '../utils/frontendErrorHandler';
import axios from 'axios';

export interface CalculationResponse {
  transactions: {
    quantity: string;
    buyValue: string;
    sellValue: string;
    averageBuyPrice: string;
  }[];
  charges: {
    totalCharges: string;
    brokerage: string;
    stt: string;
    exchangeCharges: string;
    stampDuty: string;
    sebiFee: string;
    ipft: string;
    gst: string;
    dpCharges: string;
    [key: string]: string;
  };
  summary: {
    totalQuantity: string;
    totalBuyValue: string;
    totalSellValue: string;
    averageBuyPrice: string;
    turnover: string;
    grossPnL: string;
    netPnL: string;
    breakevenPrice: string;
    [key: string]: string; // Allow for any additional properties
  };
}


// Helper function to get the current token
export const getAuthToken = (): string | null => {
  return getStoredToken();
};

// Add Authorization header to fetch options if token exists
export const addAuthHeader = (options: RequestInit = {}): RequestInit => {
  const token = getAuthToken();
  
  if (!token) {
    return options;
  }
  
  return {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  };
};

// Create axios instance for API calls
export const api = axios.create({
  baseURL: getApiUrl('/api'),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Simple mutex and queue for token refresh
let isRefreshing = false;
let failedQueue: Array<{resolve: Function, reject: Function, config: any}> = [];

// Development logging helper
const logTokenRefresh = (event: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.log(`[TokenRefresh] ${event}:`, data);
  }
};

// Listen for token refresh events from other tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'token_refresh_event' && event.newValue) {
    logTokenRefresh('Token refreshed in another tab');
    // Reset refresh state if another tab completed refresh
    if (isRefreshing) {
      isRefreshing = false;
      // Process any queued requests with current token
      if (failedQueue.length > 0) {
        const token = getAuthToken();
        failedQueue.forEach(({ resolve, config }) => {
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          resolve(api.request(config));
        });
        failedQueue = [];
        logTokenRefresh('Processed queue from other tab refresh', { processedCount: failedQueue.length });
      }
    }
  }
});

// Add response interceptor to handle errors with race condition protection
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors with mutex protection
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue the request if refresh is already in progress
        logTokenRefresh('Request queued', { url: originalRequest.url, queueLength: failedQueue.length + 1 });
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      isRefreshing = true;
      logTokenRefresh('Refresh started', { url: originalRequest.url, queueLength: failedQueue.length });

      try {
        // Attempt token refresh
        const { data } = await supabase.auth.getSession();
        
        if (data?.session?.access_token) {
          setAuthToken(data.session.access_token);
          const newToken = getAuthToken();
          
          // Notify other tabs about token refresh
          localStorage.setItem('token_refresh_event', Date.now().toString());
          
          logTokenRefresh('Refresh successful', { queueLength: failedQueue.length });
          
          // Update original request
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }

          // Process queued requests
          failedQueue.forEach(({ resolve, config }) => {
            if (newToken) {
              config.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(api.request(config));
          });
          failedQueue = [];

          return api.request(originalRequest);
        } else {
          logTokenRefresh('Refresh failed - no token received');
          
          // Refresh failed - reject queued requests
          failedQueue.forEach(({ reject }) => reject(error));
          failedQueue = [];
          
          removeAuthToken();
          window.location.href = '/';
          return Promise.reject(error);
        }
      } catch (refreshError) {
        logTokenRefresh('Refresh failed - error', { error: refreshError instanceof Error ? refreshError.message : 'Unknown error' });
        
        // Refresh failed - reject queued requests
        failedQueue.forEach(({ reject }) => reject(refreshError));
        failedQueue = [];
        
        handleAuthenticationError(refreshError, {
          originalError: error,
          requestUrl: originalRequest.url,
          requestMethod: originalRequest.method
        });
        
        removeAuthToken();
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        logTokenRefresh('Refresh completed');
      }
    }

    // Handle other errors
    if (error.response?.status >= 400) {
      handleApiError(error, {
        requestUrl: originalRequest?.url,
        requestMethod: originalRequest?.method,
        statusCode: error.response.status
      });
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      handleNetworkError(error, {
        requestUrl: originalRequest?.url,
        requestMethod: originalRequest?.method
      });
    }

    return Promise.reject(error);
  }
);

export const calculateCharges = async (
  platform: string,
  exchange: string,
  tradeType: string,
  transactions: Array<{
    quantity: string;
    buyPrice: string;
    sellPrice: string;
  }>,
  positionType: 'long' | 'short' = 'long'
): Promise<CalculationResponse | CalculationError> => {
  try {
    const response = await fetch(getApiUrl(API_ENDPOINTS.CALCULATE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform,
        exchange,
        tradeType,
        transactions,
        positionType,
      }),
    });

    if (!response.ok) {
      return {
        error: `HTTP error! status: ${response.status}`,
        detail: await response.text(),
      };
    }

    return await response.json();
  } catch (error) {
    return {
      error: 'Network error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};




