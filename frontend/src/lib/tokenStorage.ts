/**
 * Simplified token storage utilities
 * Uses localStorage with CSP protection for security
 */

const TOKEN_KEY = 'auth_token';

/**
 * Set authentication token in localStorage
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Get authentication token from localStorage
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove authentication token from localStorage
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Check if token exists in localStorage
 */
export const hasAuthToken = (): boolean => {
  return localStorage.getItem(TOKEN_KEY) !== null;
};

/**
 * Parse JWT token payload
 */
export const parseTokenPayload = (token: string): Record<string, unknown> | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    console.error('Error parsing token payload:', error);
    return null;
  }
};

/**
 * Check if token is expired or about to expire
 */
export const isTokenExpiring = (token: string, bufferSeconds = 300): boolean => {
  const payload = parseTokenPayload(token);
  if (!payload) return true;
  
  const expiryTime = payload.exp * 1000; // Convert to milliseconds
  return expiryTime < (Date.now() + bufferSeconds * 1000);
};