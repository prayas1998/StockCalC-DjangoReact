/**
 * Application Configuration
 */

// Base API URL from environment or default to localhost
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_PREFIX = '/api';

// Determine if we're in a production environment
export const isProduction = 
  window.location.hostname.includes('onrender.com') || 
  window.location.hostname.includes('netlify.app') ||
  import.meta.env.PROD === true;

// API path configuration based on environment
// const API_PREFIX = isProduction ? '' : '/api';

// API endpoints
export const API_ENDPOINTS = {
  HEALTH_CHECK: `${API_PREFIX}/health-check/`,
  CALCULATE: `${API_PREFIX}/calculate/`,
  SAVE_CALCULATION: `${API_PREFIX}/save-calculation/`,
  TRANSACTION_GROUPS: `${API_PREFIX}/transaction-groups/`,
  TRANSACTIONS: `${API_PREFIX}/transactions/`,
  JOURNAL: `${API_PREFIX}/journal/`,
  JOURNAL_TAGS: `${API_PREFIX}/tags/`,
  JOURNAL_ANALYTICS: `${API_PREFIX}/journal/analytics/`,
  JOURNAL_SEARCH: `${API_PREFIX}/journal/search/`,
};

// Format a full API URL
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = API_BASE_URL.endsWith('/') 
    ? API_BASE_URL.slice(0, -1) 
    : API_BASE_URL;
    
  return `${baseUrl}${endpoint}`;
};

// Create a URL with query parameters
export const createUrlWithParams = (
  endpoint: string, 
  params: Record<string, string | number | boolean>
): string => {
  const url = new URL(getApiUrl(endpoint));
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  
  return url.toString();
};