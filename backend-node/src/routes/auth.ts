import { Context } from 'hono';
import { z } from 'zod';
import { getAccessToken, requireAuth, TokenVerificationError, verifyToken, type VerifiedToken } from '../middleware/auth.js';
import { usernameFromEmail } from '../services/authIdentity.js';
import { supabaseClient } from '../services/supabase.js';

async function revokeSessions(c: Context, scope: 'local' | 'global') {
  const user = requireAuth(c);
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({
      error: true,
      error_id: `revoke_${Date.now()}`,
      category: 'authentication' as const,
      message: 'No token provided'
    }, 400);
  }

  if (scope === 'global') {
    const body = await c.req.text();
    if (body) {
      const input = z.object({ user_id: z.string().uuid().optional() });
      const target = input.safeParse(await c.req.json().catch(() => null));
      if (!target.success || (target.data.user_id && target.data.user_id !== user.id)) {
        return c.json({
          error: true,
          error_id: `revoke_${Date.now()}`,
          category: 'validation' as const,
          message: 'Confirm the signed-in account before revoking its sessions.'
        }, 409);
      }
    }
  }

  try {
    const { error } = await supabaseClient.auth.admin.signOut(authHeader.slice(7), scope);
    if (!error) {
      return scope === 'local'
        ? c.json({ message: 'Logout successful. Please clear your local tokens.' }, 200)
        : c.json({
          message: 'All sessions signed out. Existing access tokens expire on their original schedule.',
          user_id: user.id,
          timestamp: new Date().toISOString()
        }, 200);
    }
    console.warn('Supabase rejected session revocation', { scope, code: error.code });
  } catch {
    console.warn('Supabase session revocation failed', { scope });
  }

  return c.json({
    error: true,
    error_id: `revoke_${Date.now()}`,
    category: 'server_error' as const,
    message: scope === 'local' ? 'Failed to sign out' : 'Failed to revoke sessions'
  }, 502);
}

export const authRoutes = [
  {
    method: 'POST' as const,
    path: '/api/auth/logout/',
    handler: (c: Context) => revokeSessions(c, 'local')
  },
  {
    method: 'POST' as const,
    path: '/api/auth/revoke-all/',
    handler: (c: Context) => revokeSessions(c, 'global')
  },
  {
    method: 'GET' as const,
    path: '/api/auth/introspect/',
    handler: async (c: Context) => {
      const authHeader = c.req.header('Authorization');
      
      if (!authHeader?.startsWith('Bearer ')) {
        return c.json({
          valid: false,
          error: 'No token provided'
        }, 400);
      }

      try {
        const token = authHeader.substring(7);
        const verified = c.get('verifiedAuth') as VerifiedToken | undefined;
        const { payload, user } = verified ?? await verifyToken(token);
        
        return c.json({
          valid: true,
          user: {
            id: user.id,
            email: user.email,
            username: usernameFromEmail(user.email),
            is_authenticated: true,
            is_active: true // Supabase doesn't have banned_for_reason in the base user object
          },
          token_info: {
            issued_at: new Date(payload.iat * 1000).toISOString(),
            expires_at: new Date(payload.exp * 1000).toISOString(),
            issuer: 'supabase'
          }
        }, 200);
      } catch (error) {
        if (error instanceof TokenVerificationError && error.reason === 'unavailable') {
          return c.json({
            valid: false,
            error: 'Authentication service unavailable'
          }, 503);
        }
        if (error instanceof TokenVerificationError && error.reason === 'not_found') {
          return c.json({
            valid: false,
            error: 'User not found'
          }, 404);
        }
        return c.json({
          valid: false,
          error: 'Invalid token'
        }, 401);
      }
    }
  },
  {
    method: 'GET' as const,
    path: '/api/auth/security-status/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      
      try {
        // Get user details including authentication factors
        const { data: authUser, error } = await supabaseClient.auth.getUser(getAccessToken(c));
        
        if (error || authUser.user?.id !== user.id) {
          return c.json({
            error: true,
            error_id: `security_${Date.now()}`,
            category: 'server_error' as const,
            message: 'Failed to fetch security status'
          }, 500);
        }

        const securityFlags: string[] = [];
        if (!authUser.user.email_confirmed_at) {
          securityFlags.push('email_not_verified');
        }
        // Note: banned_for_reason is not a standard Supabase property
        
        return c.json({
          user_id: user.id,
          email: authUser.user.email,
          last_login: authUser.user.last_sign_in_at || authUser.user.created_at,
          email_verified: !!authUser.user.email_confirmed_at,
          // The Auth Admin SDK does not expose session enumeration.
          active_sessions: null,
          security_flags: securityFlags,
          recommendations: [
            'Enable two-factor authentication for enhanced security',
            ...(!authUser.user.email_confirmed_at ? ['Verify your email address'] : [])
          ]
        }, 200);
      } catch (error) {
        return c.json({
          error: true,
          error_id: `security_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to fetch security status'
        }, 500);
      }
    }
  }
];
