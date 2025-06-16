// services/journalApi.ts

import { API_ENDPOINTS, getApiUrl, createUrlWithParams } from '../config';
import { addAuthHeader, getAuthToken } from './api';
import { 
  TradeJournal, 
  TradeTags, 
  TradeJournalCreate, 
  TradeJournalUpdate, 
  JournalAnalytics, 
  JournalFilters,
  TradeJournalResponse
} from '../types/journal';
import { CalculationError } from '../types/api';

/**
 * Get a list of journal trades with optional filtering
 */
export const getJournalTrades = async (
  filters?: JournalFilters
): Promise<TradeJournalResponse | CalculationError> => {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return {
        error: 'Authentication required',
        detail: 'Please log in to view your journal entries',
      };
    }
    
    let url = getApiUrl(API_ENDPOINTS.JOURNAL);
    
    // Add filters as query parameters if provided
    if (filters) {
      url = createUrlWithParams(API_ENDPOINTS.JOURNAL, filters as Record<string, string | number | boolean>);
    }
    
    const options = await addAuthHeader({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const response = await fetch(url, options);
    
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

/**
 * Get a single journal trade by ID
 */
export const getJournalTrade = async (id: string): Promise<TradeJournal | CalculationError> => {
  try {
    const options = await addAuthHeader({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const response = await fetch(getApiUrl(`${API_ENDPOINTS.JOURNAL}${id}/`), options);
    
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

/**
 * Create a new journal trade
 */
export const createJournalTrade = async (
  trade: TradeJournalCreate
): Promise<TradeJournal | CalculationError> => {
  try {
    const options = await addAuthHeader({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trade),
    });
    
    const response = await fetch(getApiUrl(API_ENDPOINTS.JOURNAL), options);
    
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

/**
 * Update an existing journal trade
 */
export const updateJournalTrade = async (
  id: string,
  trade: TradeJournalUpdate
): Promise<TradeJournal | CalculationError> => {
  try {
    const options = await addAuthHeader({
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trade),
    });
    
    const response = await fetch(getApiUrl(`${API_ENDPOINTS.JOURNAL}${id}/`), options);
    
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

/**
 * Delete a journal trade
 */
export const deleteJournalTrade = async (id: string): Promise<{ status: string; message: string } | CalculationError> => {
  try {
    const options = await addAuthHeader({
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const response = await fetch(getApiUrl(`${API_ENDPOINTS.JOURNAL}${id}/`), options);
    
    if (!response.ok) {
      return {
        error: `HTTP error! status: ${response.status}`,
        detail: await response.text(),
      };
    }
    
    // If response is 204 No Content, return a default success object
    if (response.status === 204) {
      return { status: 'success', message: 'Trade deleted successfully' };
    }
    
    // Otherwise, try to parse JSON (for 200/202 with body)
    const text = await response.text();
    if (!text) {
      return { status: 'success', message: 'Trade deleted successfully' };
    }
    
    return JSON.parse(text);
  } catch (error) {
    return {
      error: 'Network error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Search journal trades by query string
 */
export const searchJournalTrades = async (query: string): Promise<TradeJournalResponse | CalculationError> => {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return {
        error: 'Authentication required',
        detail: 'Please log in to search your journal entries',
      };
    }
    
    const url = createUrlWithParams(API_ENDPOINTS.JOURNAL_SEARCH, { query });
    
    const options = await addAuthHeader({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const response = await fetch(url, options);
    
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

/**
 * Get journal analytics data
 */
export const getJournalAnalytics = async (): Promise<JournalAnalytics | CalculationError> => {
  try {
    const options = await addAuthHeader({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const response = await fetch(getApiUrl(API_ENDPOINTS.JOURNAL_ANALYTICS), options);
    
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

/**
 * Get all trade tags for the current user
 */
export const getTradeTags = async (): Promise<TradeTags[] | CalculationError> => {
  try {
    const options = await addAuthHeader({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const response = await fetch(getApiUrl(API_ENDPOINTS.JOURNAL_TAGS), options);
    
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

/**
 * Create a new trade tag
 */
export const createTradeTag = async (
  tag: { name: string; color: string }
): Promise<TradeTags | CalculationError> => {
  try {
    const options = await addAuthHeader({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tag),
    });
    
    const response = await fetch(getApiUrl(API_ENDPOINTS.JOURNAL_TAGS), options);
    
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

/**
 * Update an existing trade tag
 */
export const updateTradeTag = async (
  id: number,
  tag: { name: string; color: string }
): Promise<TradeTags | CalculationError> => {
  try {
    const options = await addAuthHeader({
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tag),
    });
    
    const response = await fetch(getApiUrl(`${API_ENDPOINTS.JOURNAL_TAGS}${id}/`), options);
    
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

/**
 * Delete a trade tag by ID
 */
export const deleteTradeTag = async (id: number): Promise<{ status: string; message: string } | CalculationError> => {
  try {
    const options = await addAuthHeader({
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const response = await fetch(getApiUrl(`${API_ENDPOINTS.JOURNAL_TAGS}${id}/`), options);
    if (!response.ok) {
      return {
        error: `HTTP error! status: ${response.status}`,
        detail: await response.text(),
      };
    }
    // If response is 204 No Content, return a default success object
    if (response.status === 204) {
      return { status: 'success', message: 'Tag deleted successfully' };
    }
    // Otherwise, try to parse JSON (for 200/202 with body)
    const text = await response.text();
    if (!text) {
      return { status: 'success', message: 'Tag deleted successfully' };
    }
    return JSON.parse(text);
  } catch (error) {
    return {
      error: 'Network error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};