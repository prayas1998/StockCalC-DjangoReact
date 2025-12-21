import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import config from '../config';
import { RequestContext } from '../types';

// JWT verification function
export function verifyToken(token: string): any {
  try {
    const decoded = jwt.verify(token, config.supabase.jwtSecret, { algorithms: ['HS256'] });
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Supabase client for admin operations
const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

interface JWTPayload {
  sub: string; // user ID
  email: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
  iat: number;
  exp: number;
  role?: string;
}

export const authMiddleware = async (c: any, next: any) => {
  try {
    // Skip auth for health check
    if (c.req.path === '/api/health-check/') {
      await next();
      return;
    }
    
    // Extract token from Authorization header
    const authHeader = c.req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Continue without auth for routes that might not require it
      // Individual routes will check authentication
      await next();
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer '
    
    // Verify JWT token
    const payload = jwt.verify(token, config.supabase.jwtSecret) as JWTPayload;
    
    if (!payload || !payload.sub || !payload.email) {
      return c.json({
        error: true,
        error_id: `auth_${Date.now()}`,
        category: 'authentication',
        message: 'Invalid authentication token. Please log in again.'
      }, 401);
    }
    
    // Create user object (mirroring Django SupabaseUser)
    const user = {
      id: payload.sub,
      email: payload.email,
      first_name: payload.user_metadata?.first_name || '',
      last_name: payload.user_metadata?.last_name || '',
      username: payload.email.split('@')[0],
      is_authenticated: true,
      is_active: true,
      is_anonymous: false,
      is_staff: false,
      is_superuser: false
    };
    
    // Attach user to context
    c.set('user', user);
    c.set('userId', payload.sub);
    
    await next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return c.json({
        error: true,
        error_id: `auth_${Date.now()}`,
        category: 'authentication',
        message: 'Your session has expired. Please log in again.'
      }, 401);
    } else if (error instanceof jwt.JsonWebTokenError) {
      return c.json({
        error: true,
        error_id: `auth_${Date.now()}`,
        category: 'authentication',
        message: 'Invalid authentication token. Please log in again.'
      }, 401);
    } else {
      console.error('Auth middleware error:', error);
      return c.json({
        error: true,
        error_id: `auth_${Date.now()}`,
        category: 'server_error',
        message: 'Authentication failed'
      }, 500);
    }
  }
};

// Helper to check if user is authenticated
export const requireAuth = (c: any) => {
  const user = c.get('user');
  if (!user || !user.is_authenticated) {
    throw new Error('Authentication required');
  }
  return user;
};

// Export Supabase admin client for privileged operations
export { supabaseAdmin };