/**
 * Security utilities for journal operations
 */

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize trade data before submission
 */
export function sanitizeTradeData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'number') {
      // Ensure numbers are finite and not NaN
      sanitized[key] = isFinite(value) ? value : 0;
    } else if (Array.isArray(value)) {
      // Sanitize array elements if they're strings
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate numeric input ranges for security
 */
export function validateNumericRange(
  value: number,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): boolean {
  return isFinite(value) && value >= min && value <= max;
}

/**
 * Validate trade quantity to prevent unrealistic values
 */
export function validateTradeQuantity(quantity: number): boolean {
  return validateNumericRange(quantity, 1, 1000000); // Max 1 million shares
}

/**
 * Validate price values to prevent unrealistic values
 */
export function validatePrice(price: number): boolean {
  return validateNumericRange(price, 0.01, 1000000); // Min 1 paisa, max 10 lakh
}

/**
 * Validate date to ensure it's not in the future beyond reasonable limits
 */
export function validateTradeDate(date: string): boolean {
  const tradeDate = new Date(date);
  const now = new Date();
  const maxFutureDate = new Date();
  maxFutureDate.setDate(now.getDate() + 1); // Allow 1 day in future for timezone differences
  
  const minPastDate = new Date('2000-01-01'); // Reasonable minimum date
  
  return tradeDate >= minPastDate && tradeDate <= maxFutureDate;
}

/**
 * Rate limiting for API calls (client-side)
 */
class RateLimiter {
  private calls: number[] = [];
  private readonly maxCalls: number;
  private readonly timeWindow: number;

  constructor(maxCalls: number = 10, timeWindowMs: number = 60000) {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindowMs;
  }

  canMakeCall(): boolean {
    const now = Date.now();
    
    // Remove calls outside the time window
    this.calls = this.calls.filter(callTime => now - callTime < this.timeWindow);
    
    // Check if we can make another call
    if (this.calls.length < this.maxCalls) {
      this.calls.push(now);
      return true;
    }
    
    return false;
  }

  getRemainingCalls(): number {
    const now = Date.now();
    this.calls = this.calls.filter(callTime => now - callTime < this.timeWindow);
    return Math.max(0, this.maxCalls - this.calls.length);
  }
}

// Create rate limiters for different operations
export const apiRateLimiter = new RateLimiter(30, 60000); // 30 calls per minute
export const searchRateLimiter = new RateLimiter(10, 10000); // 10 searches per 10 seconds

/**
 * Validate file upload (if needed for future features)
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  return { valid: true };
}

/**
 * Generate secure random ID for client-side operations
 */
export function generateSecureId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate URL to prevent SSRF attacks (for future API endpoints)
 */
export function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Prevent localhost and private IP ranges
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)
    ) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}