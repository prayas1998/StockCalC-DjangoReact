import { Context, Next } from 'hono';
import config from '../config';
import { ApiErrorResponse, RequestContext } from '../types';

// Rate limiting implementation (simplified in-memory store)
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  isAllowed(key: string, limit: string, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Clean old requests
    const validRequests = requests.filter(time => now - time < windowMs);
    this.requests.set(key, validRequests);
    
    // Check limit
    return validRequests.length < parseInt(limit);
  }
}

const rateLimiter = new RateLimiter();

export const rateLimitMiddleware = async (c: Context, next: Next) => {
  const key = `rate_limit_${c.get('user')?.id || c.get('ip')}`;
  const path = c.req.path;
  
  // Determine rate limit category
  let rateLimit = '500/hour'; // default
  if (path.includes('/auth/')) {
    rateLimit = c.get('user') ? config.rateLimiting.auth.user : config.rateLimiting.auth.anon;
  } else if (path.includes('/calculate/') || path.includes('/journal/') || path.includes('/profile/')) {
    rateLimit = c.get('user') ? config.rateLimiting.dataOperations.user : config.rateLimiting.dataOperations.anon;
  } else {
    rateLimit = c.get('user') ? config.rateLimiting.general.user : config.rateLimiting.general.anon;
  }
  
  const [limit, window] = rateLimit.split('/');
  const windowMs = parseInt(window) * 60 * 1000; // Convert minutes to ms
  
  if (!rateLimiter.isAllowed(key, limit, windowMs)) {
    const retryAfter = Math.ceil(windowMs / 1000);
    return c.json({
      error: true,
      error_id: `rl_${Date.now()}`,
      category: 'rate_limit',
      message: `Too many requests. Rate limit: ${limit}`,
      retry_after: retryAfter,
      throttle_type: 'RateLimitMiddleware',
      endpoint_type: 'api',
      timestamp: Date.now()
    }, 429);
  }
  
  await next();
};