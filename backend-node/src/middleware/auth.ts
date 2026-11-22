import jwt from 'jsonwebtoken';
import type { User } from '@supabase/supabase-js';
import { rateLimitMiddleware, rememberVerifiedToken, releasePreAuthUserReservation } from './rateLimit.js';
import { supabaseClient } from '../services/supabase.js';

type VerificationFailure = 'invalid' | 'not_found' | 'unavailable';

export class TokenVerificationError extends Error {
  constructor(readonly reason: VerificationFailure) {
    super(reason);
  }
}

interface JWTPayload {
  sub: string;
  email?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
  iat: number;
  exp: number;
  role?: string;
}

export interface VerifiedToken {
  payload: JWTPayload;
  user: User;
}

function decodeTokenShape(token: string): JWTPayload {
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    throw new TokenVerificationError('invalid');
  }

  let decoded;
  try {
    decoded = jwt.decode(token);
  } catch {
    throw new TokenVerificationError('invalid');
  }
  const now = Math.floor(Date.now() / 1000);
  if (
    !decoded || typeof decoded === 'string' ||
    typeof decoded.sub !== 'string' ||
    typeof decoded.iat !== 'number' || !Number.isFinite(decoded.iat) ||
    typeof decoded.exp !== 'number' || !Number.isFinite(decoded.exp) ||
    decoded.exp <= now || decoded.iat > now + 60
  ) {
    throw new TokenVerificationError('invalid');
  }

  return decoded as JWTPayload;
}

function authFailure(error: unknown): TokenVerificationError {
  const providerError = error as { code?: string; status?: number };
  if (providerError?.status === 404 || providerError?.code === 'user_not_found') {
    return new TokenVerificationError('not_found');
  }
  if ([400, 401, 403].includes(providerError?.status ?? 0) || providerError?.code === 'bad_jwt') {
    return new TokenVerificationError('invalid');
  }
  return new TokenVerificationError('unavailable');
}

export async function verifyToken(token: string): Promise<VerifiedToken> {
  const decoded = decodeTokenShape(token);
  let result;
  try {
    result = await supabaseClient.auth.getUser(token);
  } catch (error) {
    throw authFailure(error);
  }

  if (result.error) throw authFailure(result.error);
  if (!result.data.user) throw new TokenVerificationError('not_found');

  // Local claims only screen token shape; Supabase remains the source of verification.
  if (decoded.sub !== result.data.user.id) {
    throw new TokenVerificationError('invalid');
  }

  return { payload: decoded as JWTPayload, user: result.data.user };
}

async function rejectVerificationFailure(c: any, reason: VerificationFailure) {
  const rateLimitResponse = await rateLimitMiddleware(c, async () => {});
  if (rateLimitResponse) return rateLimitResponse;

  if (c.req.path === '/api/auth/introspect/') {
    if (reason === 'unavailable') {
      return c.json({ valid: false, error: 'Authentication service unavailable' }, 503);
    }
    if (reason === 'not_found') {
      return c.json({ valid: false, error: 'User not found' }, 404);
    }
    return c.json({ valid: false, error: 'Invalid token' }, 401);
  }

  const unavailable = reason === 'unavailable';
  return c.json({
    error: true,
    error_id: `auth_${Date.now()}`,
    category: unavailable ? 'server_error' : 'authentication',
    message: unavailable
      ? 'Authentication service is temporarily unavailable'
      : 'Invalid authentication token. Please log in again.'
  }, unavailable ? 503 : 401);
}

export const authMiddleware = async (c: any, next: any) => {
  try {
    // Skip auth for health check
    if (c.req.path === '/api/health-check/') {
      await next();
      return;
    }
    
    // Extract token from Authorization header
    const authHeader = c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Continue without auth for routes that might not require it
      // Individual routes will check authentication
      await next();
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer '
    
    // Verify JWT token
    const { payload, user: authUser } = await verifyToken(token);
    
    const email = authUser.email || payload.email;
    if (!payload.sub || !email) {
      return rejectVerificationFailure(c, 'invalid');
    }
    rememberVerifiedToken(token, authUser.id, payload.exp * 1000);
    
    // Create user object (mirroring Django SupabaseUser)
    const user = {
      id: authUser.id,
      email,
      first_name: payload.user_metadata?.first_name || '',
      last_name: payload.user_metadata?.last_name || '',
      username: email.split('@')[0],
      is_authenticated: true,
      is_active: true,
      is_anonymous: false,
      is_staff: false,
      is_superuser: false
    };
    
    // Attach user and token to context
    c.set('user', user);
    c.set('userId', payload.sub);
    c.set('accessToken', token);
    c.set('verifiedAuth', { payload, user: authUser } satisfies VerifiedToken);
    
    await next();
  } catch (error) {
    if (error instanceof TokenVerificationError) {
      return rejectVerificationFailure(c, error.reason);
    } else {
      console.error('Auth middleware error:', error);
      return c.json({
        error: true,
        error_id: `auth_${Date.now()}`,
        category: 'server_error',
        message: 'Authentication failed'
      }, 500);
    }
  } finally {
    releasePreAuthUserReservation(c);
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

// Helper to get the access token for authenticated requests
export const getAccessToken = (c: any) => {
  const token = c.get('accessToken');
  if (!token) {
    throw new Error('Access token not found');
  }
  return token;
};

// Export Supabase admin client for privileged operations
export { supabaseAdmin } from '../services/supabase.js';
