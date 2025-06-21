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
  const token = localStorage.getItem('auth_token');
  
  if (token) {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        const expiryTime = payload.exp * 1000;
        
        if (expiryTime > Date.now()) {
          return token;
        }
      }
    } catch (error) {
      // Token parsing failed, will refresh
    }
  }
  
  // Token is expired or invalid, refresh the session
  const { data } = await supabase.auth.getSession();
  
  if (data?.session?.access_token) {
    localStorage.setItem('auth_token', data.session.access_token);
    return data.session.access_token;
  }
  
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

export const saveTransactions = async (
  title: string,
  platform: string,
  exchange: string,
  tradeType: string,
  transactions: Array<{
    quantity: string;
    buyPrice: string;
    sellPrice: string;
  }>,
  positionType: 'long' | 'short' = 'long'
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
        positionType,
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
    
    if (!token) {
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
    
    if (!response.ok) {
      const errorText = await response.text();
      
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
    
    return await response.json();
  } catch (error) {
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
    
    const response = await fetch(url.toString(), options);
    
    if (!response.ok) {
      const errorText = await response.text();
      
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
    
    return await response.json();
  } catch (error) {
    return {
      error: 'Network error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Delete a transaction group by ID
export const deleteTransaction = async (id: number): Promise<{ status: string; message: string } | CalculationError> => {
  try {
    const options = await addAuthHeader({
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const response = await fetch(getApiUrl(`${API_ENDPOINTS.TRANSACTION_GROUPS}${id}/`), options);
    if (!response.ok) {
      return {
        error: `HTTP error! status: ${response.status}`,
        detail: await response.text(),
      };
    }
    // If response is 204 No Content, return a default success object
    if (response.status === 204) {
      return { status: 'success', message: 'Transaction deleted successfully' };
    }
    // Otherwise, try to parse JSON (for 200/202 with body)
    const text = await response.text();
    if (!text) {
      return { status: 'success', message: 'Transaction deleted successfully' };
    }
    return JSON.parse(text);
  } catch (error) {
    return {
      error: 'Network error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};