// services/api.ts

import { CalculationError } from '../types/api';
import { API_ENDPOINTS, getApiUrl } from '../config';
import { supabase } from '../lib/supabase';

export interface CalculationResponse {
  transactions: {
    quantity: string;
    buyValue: string;
    sellValue: string;
    averageBuyPrice: string;
  }[];
  charges: {
    totalCharges: number;
    brokerage: number;
    [key: string]: number;
  };
  summary: {
    turnover: number;
    grossPnL: number;
    netPnL: number;
  };
}

export interface SaveTransactionResponse {
  status: string;
  message: string;
  group_id: number;
}

export interface Transaction {
  id: number;
  title: string;
  platform: string;
  exchange: string;
  trade_type: string;
  created_at: string;
  average_buy_price: string;
  total_quantity: string;
  net_pnl: string;
  transactions: Array<{
    id: number;
    quantity: string;
    buy_price: string;
    sell_price: string;
    buy_value: string;
    sell_value: string;
    net_pnl: string;
  }>;
}

// Helper function to get the current token and refresh if needed
export const getAuthToken = async (): Promise<string | null> => {
  // First try to get from localStorage
  const token = localStorage.getItem('auth_token');
  
  // If we have a token, verify it's not expired
  if (token) {
    // Check if token is expired by decoding it
    // JWT tokens have three parts separated by dots
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      // The payload is the second part, base64 encoded
      const payload = JSON.parse(atob(tokenParts[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      
      // If token is not expired, return it
      if (expiryTime > Date.now()) {
        return token;
      }
      
      console.log('Token expired, refreshing...');
    } catch (error) {
      console.error('Error parsing token:', error);
    }
  }
  
  // Token is expired or invalid, refresh the session
  console.log('Getting fresh session from Supabase');
  const { data } = await supabase.auth.getSession();
  
  if (data?.session?.access_token) {
    // Store the new token and return it
    localStorage.setItem('auth_token', data.session.access_token);
    return data.session.access_token;
  }
  
  // No valid session, clear token and return null
  localStorage.removeItem('auth_token');
  return null;
};

// Add Authorization header to fetch options if token exists
export const addAuthHeader = async (options: RequestInit = {}): Promise<RequestInit> => {
  const token = await getAuthToken();
  
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

export const calculateCharges = async (
  platform: string,
  exchange: string,
  tradeType: string,
  transactions: Array<{
    quantity: string;
    buyPrice: string;
    sellPrice: string;
  }>
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

export const saveTransactions = async (
  title: string,
  platform: string,
  exchange: string,
  tradeType: string,
  transactions: Array<{
    quantity: string;
    buyPrice: string;
    sellPrice: string;
  }>
): Promise<SaveTransactionResponse | CalculationError> => {
  try {
    const options = await addAuthHeader({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        platform,
        exchange,
        tradeType,
        transactions,
      }),
    });
    
    const response = await fetch(getApiUrl(API_ENDPOINTS.SAVE_CALCULATION), options);

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

export const getUserTransactions = async (): Promise<Transaction[] | CalculationError> => {
  try {
    const token = await getAuthToken();
    const url = getApiUrl(API_ENDPOINTS.TRANSACTION_GROUPS);
    
    console.log('Fetching user transactions from:', url);
    console.log('Auth token available:', !!token);
    
    if (!token) {
      console.error('No authentication token found');
      return {
        error: 'Authentication required',
        detail: 'Please log in to view your transactions',
      };
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Clear the token if it's invalid
        localStorage.removeItem('auth_token');
        
        return {
          error: 'Authentication failed',
          detail: 'Your session has expired. Please log in again.',
        };
      }
      
      return {
        error: `HTTP error! status: ${response.status}`,
        detail: errorText || 'Unknown error',
      };
    }
    
    const data = await response.json();
    console.log('Fetched transactions count:', data.length);
    
    return data;
  } catch (error) {
    console.error('Network error in getUserTransactions:', error);
    return {
      error: 'Network error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const searchTransactions = async (query: string): Promise<Transaction[] | CalculationError> => {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      console.error('No authentication token found');
      return {
        error: 'Authentication required',
        detail: 'Please log in to search your transactions',
      };
    }
    
    const url = new URL(getApiUrl(API_ENDPOINTS.TRANSACTION_GROUPS));
    url.searchParams.append('search', query);
    
    const options = await addAuthHeader({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Searching transactions at:', url.toString());
    
    const response = await fetch(url.toString(), options);
    
    console.log('Search response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Search error response:', errorText);
      
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('auth_token');
        return {
          error: 'Authentication failed',
          detail: 'Your session has expired. Please log in again.',
        };
      }
      
      return {
        error: `HTTP error! status: ${response.status}`,
        detail: errorText || 'Unknown error',
      };
    }
    
    const data = await response.json();
    console.log(`Found ${data.length} transactions matching "${query}"`);
    
    return data;
  } catch (error) {
    console.error('Network error in searchTransactions:', error);
    return {
      error: 'Network error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};