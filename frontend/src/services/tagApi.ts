// Tag-specific API functions
import { API_ENDPOINTS, getApiUrl } from '../config';
import { addAuthHeader } from './api';
import { TradeTags } from '../types/journal';
import { CalculationError } from '../types/api';

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