// Search-specific API functions
import { API_ENDPOINTS, createUrlWithParams } from '../config';
import { addAuthHeader, getAuthToken } from './api';
import { TradeJournalResponse } from '../types/journal';
import { CalculationError } from '../types/api';

/**
 * Search journal trades by query string with optional filters
 */
export const searchJournalTrades = async (
  query: string, 
  filters?: Record<string, string | number | boolean | (string | number | boolean)[]>
): Promise<TradeJournalResponse | CalculationError> => {
  // Normalize query: trim whitespace
  const normalizedQuery = query.trim();
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return {
        error: 'Authentication required',
        detail: 'Please log in to search your journal entries',
      };
    }
    
    // Build query parameters including filters - use same format as regular journal API
    const queryParams: Record<string, string | number | boolean | (string | number | boolean)[]> = { 
      query: normalizedQuery 
    };
    
    // Add filters to query parameters if provided - keep arrays as arrays
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (Array.isArray(value) && value.length > 0) {
          // Keep arrays as arrays - createUrlWithParams will handle multiple parameters
          queryParams[key] = value;
        } else if (value !== undefined && value !== null && value !== '') {
          queryParams[key] = value;
        }
      });
    }
    
    const url = createUrlWithParams(API_ENDPOINTS.JOURNAL_SEARCH, queryParams);
    
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
 * Get search suggestions with simple 3-tier scoring
 */
export const getSearchSuggestions = async (query: string): Promise<Array<Record<string, unknown>> | CalculationError> => {
  // Normalize query: trim whitespace
  const normalizedQuery = query.trim();
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return {
        error: 'Authentication required',
        detail: 'Please log in to get search suggestions',
      };
    }
    
    const url = createUrlWithParams(API_ENDPOINTS.JOURNAL_SUGGESTIONS, { query: normalizedQuery });
    
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