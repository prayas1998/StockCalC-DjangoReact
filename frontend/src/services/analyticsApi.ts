// Analytics-specific API functions
import { API_ENDPOINTS, getApiUrl } from '../config';
import { addAuthHeader } from './api';
import { JournalAnalytics } from '../types/journal';
import { CalculationError } from '../types/api';

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
 * Get analytics for a specific tag
 */
export const getTagAnalytics = async (tagName: string): Promise<Record<string, unknown> | CalculationError> => {
  try {
    const options = await addAuthHeader({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const url = `${getApiUrl('/api/journal/tag_analytics/')}?tag_name=${encodeURIComponent(tagName)}`;
    const response = await fetch(url, options);
    
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