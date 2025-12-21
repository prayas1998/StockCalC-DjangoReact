import { Context } from 'hono';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../services/supabase';
import { verifyToken } from '../middleware/auth';

export const authRoutes = [
  {
    method: 'POST' as const,
    path: '/api/auth/logout/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const authHeader = c.req.header('Authorization');
      
      if (!authHeader?.startsWith('Bearer ')) {
        return c.json({
          error: true,
          error_id: `logout_${Date.now()}`,
          category: 'authentication' as const,
          message: 'No token provided'
        }, 400);
      }

      try {
        const token = authHeader.substring(7);
        
        // Revoke the current session/token via Supabase Admin
        const { error } = await supabaseAdmin.auth.admin.signOut(token);
        
        if (error) {
          // Token might be expired or invalid, but that's okay for logout
          console.warn('Logout warning:', error.message);
        }
        
        return c.json({
          message: 'Logout successful. Please clear your local tokens.'
        }, 200);
      } catch (error) {
        return c.json({
          error: true,
          error_id: `logout_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to process logout'
        }, 500);
      }
    }
  },
  {
    method: 'POST' as const,
    path: '/api/auth/revoke-all/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      
      try {
        // Revoke all sessions for the user via Supabase Admin
        const { error } = await supabaseAdmin.auth.admin.signOut(user.id);
        
        if (error) {
          return c.json({
            error: true,
            error_id: `revoke_${Date.now()}`,
            category: 'server_error' as const,
            message: error.message || 'Failed to revoke tokens'
          }, 500);
        }
        
        return c.json({
          message: 'All tokens revoked successfully.',
          user_id: user.id,
          timestamp: new Date().toISOString()
        }, 200);
      } catch (error) {
        return c.json({
          error: true,
          error_id: `revoke_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to revoke tokens'
        }, 500);
      }
    }
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
        const payload = verifyToken(token);
        
        // Get fresh user data from Supabase
        const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(payload.sub);
        
        if (error || !authUser.user) {
          return c.json({
            valid: false,
            error: 'User not found'
          }, 404);
        }
        
        return c.json({
          valid: true,
          user: {
            id: authUser.user.id,
            email: authUser.user.email,
            username: authUser.user.user_metadata?.username || '',
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
        const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(user.id);
        
        if (error || !authUser.user) {
          return c.json({
            error: true,
            error_id: `security_${Date.now()}`,
            category: 'server_error' as const,
            message: 'Failed to fetch security status'
          }, 500);
        }

        // Get session information - listUserSessions might not be available
        let activeSessions = 0;
        try {
          // Note: listUserSessions may not be available in all Supabase versions
          const { data: sessions } = await (supabaseAdmin.auth.admin as any).listUserSessions(user.id);
          activeSessions = sessions?.sessions?.length || 0;
        } catch (e) {
          console.warn('Session listing not available:', e);
          activeSessions = 0;
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
          active_sessions: activeSessions,
          security_flags: securityFlags,
          recommendations: [
            'Enable two-factor authentication for enhanced security',
            'Regularly review your active sessions',
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