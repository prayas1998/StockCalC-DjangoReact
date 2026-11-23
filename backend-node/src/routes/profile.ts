import { createClient, isAuthSessionMissingError, type User } from '@supabase/supabase-js';
import { Context } from 'hono';
import { z } from 'zod';
import config from '../config.js';
import { getAccessToken, requireAuth } from '../middleware/auth.js';
import { profileUpdateSchema, changePasswordSchema } from '../validators/schemas.js';
import { usernameFromEmail } from '../services/authIdentity.js';
import { supabaseAdmin, supabaseClient } from '../services/supabase.js';

const confirmedAccountSchema = z.object({ user_id: z.string().uuid().optional() });
const confirmedPasswordChangeSchema = changePasswordSchema.and(confirmedAccountSchema);
const deleteAccountSchema = confirmedAccountSchema.extend({ password: z.string().min(1) });

async function revokeSession(accessToken: string, session: 'temporary' | 'caller'): Promise<boolean> {
  try {
    const { error } = await supabaseClient.auth.admin.signOut(accessToken, 'local');
    if (!error || isAuthSessionMissingError(error)) return true;
    console.warn('Supabase rejected session cleanup', { session, code: error.code });
  } catch {
    console.warn('Supabase session cleanup failed', { session });
  }
  return false;
}

function accountChanged(c: Context) {
  return c.json({
    error: true,
    error_id: `account_${Date.now()}`,
    category: 'validation' as const,
    message: 'The signed-in account changed. Open the form again to continue.'
  }, 409);
}

async function verifyCurrentPassword(c: Context, userId: string, password: string) {
  const { data, error } = await supabaseClient.auth.getUser(getAccessToken(c));
  if (error || data.user?.id !== userId || !data.user.email) {
    return { result: 'unavailable' } as const;
  }

  // A password grant creates a session. Keep it isolated and revoke only that session.
  const verifier = createClient(config.supabase.url, config.supabase.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data: reauth, error: reauthError } = await verifier.auth.signInWithPassword({
    email: data.user.email,
    password
  });
  if (reauthError) {
    return { result: reauthError.code === 'invalid_credentials' ? 'incorrect' : 'unavailable' } as const;
  }
  if (!reauth.session) {
    return { result: 'unavailable' } as const;
  }
  if (reauth.user?.id !== userId || reauth.session.user.id !== userId) {
    await revokeSession(reauth.session.access_token, 'temporary');
    return { result: 'unavailable' } as const;
  }
  return { result: 'verified', accessToken: reauth.session.access_token } as const;
}

function passwordVerificationError(c: Context, result: 'incorrect' | 'unavailable') {
  return c.json({
    error: true,
    error_id: `reauth_${Date.now()}`,
    category: result === 'incorrect' ? 'validation' : 'server_error',
    message: result === 'incorrect' ? 'Current password is incorrect' : 'Could not verify current password'
  }, result === 'incorrect' ? 400 : 502);
}

async function updateAuthUser(accessToken: string, attributes: { data: Record<string, string> } | { current_password: string; password: string }) {
  // The installed SDK needs a refresh token for updates. The Auth REST API
  // accepts the request's access token and applies the provider's password policy.
  const response = await fetch(`${config.supabase.url.replace(/\/$/, '')}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      'apikey': config.supabase.anonKey,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Supabase-Api-Version': '2024-01-01'
    },
    body: JSON.stringify(attributes)
  });
  const data = await response.json().catch(() => null) as (User & { code?: unknown; error_code?: unknown }) | null;
  // Older Auth responses use the numeric HTTP status as `code`.
  const providerCode = typeof data?.code === 'string' ? data.code : data?.error_code;
  return {
    ok: response.ok,
    status: response.status,
    user: response.ok ? data : null,
    code: !response.ok && typeof providerCode === 'string' ? providerCode : undefined
  };
}

export const profileRoutes = [
  {
    method: 'GET' as const,
    path: '/api/profile/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      
      try {
        // Get user profile from Supabase auth
        const { data: authUser, error: authError } = await supabaseClient.auth.getUser(getAccessToken(c));
        
        if (authError || authUser.user?.id !== user.id) {
          return c.json({
            error: true,
            error_id: `prof_${Date.now()}`,
            category: 'authentication' as const,
            message: 'User not found'
          }, 404);
        }

        // Get additional profile metadata if stored elsewhere
        const profile = {
          id: authUser.user.id,
          email: authUser.user.email || '',
          first_name: authUser.user.user_metadata?.first_name || '',
          last_name: authUser.user.user_metadata?.last_name || '',
          username: usernameFromEmail(authUser.user.email),
          date_joined: authUser.user.created_at,
          last_login: authUser.user.last_sign_in_at || authUser.user.created_at
        };
        
        return c.json(profile, 200);
      } catch (error) {
        return c.json({
          error: true,
          error_id: `prof_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to retrieve profile'
        }, 500);
      }
    }
  },
  {
    method: 'PATCH' as const,
    path: '/api/profile/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      try {
        const validatedData = profileUpdateSchema.parse(await c.req.json());
        if (validatedData.username !== undefined || validatedData.email !== undefined) {
          return c.json({
            error: true,
            error_id: `prof_${Date.now()}`,
            category: 'validation' as const,
            message: 'Sign-in identifiers cannot be changed'
          }, 400);
        }
        const updatedFields = Object.keys(validatedData);

        if (updatedFields.length === 0) {
          return c.json({
            error: true,
            error_id: `prof_${Date.now()}`,
            category: 'validation' as const,
            message: 'No profile fields provided for update'
          }, 400);
        }

        const userMetadata: Record<string, string> = {};
        if (validatedData.first_name !== undefined) {
          userMetadata.first_name = validatedData.first_name;
        }
        if (validatedData.last_name !== undefined) {
          userMetadata.last_name = validatedData.last_name;
        }
        const response = await updateAuthUser(getAccessToken(c), { data: userMetadata });
        if (!response.ok) {
          return c.json({
            error: true,
            error_id: `prof_${Date.now()}`,
            category: 'validation' as const,
            message: 'Failed to update profile'
          }, 400);
        }

        const updatedUser = response.user;
        if (!updatedUser || updatedUser.id !== user.id) {
          return c.json({
            error: true,
            error_id: `prof_${Date.now()}`,
            category: 'server_error' as const,
            message: 'Failed to update profile'
          }, 502);
        }

        const profile = {
          id: updatedUser.id,
          email: updatedUser.email || '',
          first_name: updatedUser.user_metadata?.first_name || '',
          last_name: updatedUser.user_metadata?.last_name || '',
          username: usernameFromEmail(updatedUser.email),
          date_joined: updatedUser.created_at,
          last_login: updatedUser.last_sign_in_at || updatedUser.created_at
        };
        
        return c.json({
          message: 'Profile updated successfully',
          updated_fields: updatedFields,
          profile
        }, 200);
      } catch (error) {
        return c.json({
          error: true,
          error_id: `prof_${Date.now()}`,
          category: 'validation' as const,
          message: 'Invalid profile data provided'
        }, 400);
      }
    }
  },
  {
    method: 'POST' as const,
    path: '/api/profile/change-password/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const validatedData = confirmedPasswordChangeSchema.safeParse(await c.req.json().catch(() => null));
      if (!validatedData.success) {
        return c.json({
          error: true,
          error_id: `pwd_${Date.now()}`,
          category: 'validation' as const,
          message: 'Invalid password change data'
        }, 400);
      }

      const { user_id, current_password, new_password } = validatedData.data;
      if (user_id && user_id !== user.id) return accountChanged(c);

      try {
        const verification = await verifyCurrentPassword(c, user.id, current_password);
        if (verification.result !== 'verified') {
          return passwordVerificationError(c, verification.result);
        }

        // The password grant proves possession of the current password. Use the original
        // session for the write so Supabase can still enforce the caller's MFA assurance.
        const callerToken = getAccessToken(c);
        let temporarySessionRevoked: boolean;
        let response: Awaited<ReturnType<typeof updateAuthUser>>;
        try {
          response = await updateAuthUser(callerToken, { current_password, password: new_password });
        } finally {
          temporarySessionRevoked = await revokeSession(verification.accessToken, 'temporary');
        }
        if (!response.user || response.user.id !== user.id) {
          if (response.code === 'current_password_invalid') {
            return passwordVerificationError(c, 'incorrect');
          }
          if (response.code === 'insufficient_aal' || response.code === 'reauthentication_needed') {
            return c.json({
              error: true,
              error_id: `pwd_${Date.now()}`,
              category: 'authentication' as const,
              message: response.code === 'insufficient_aal'
                ? 'Complete multi-factor authentication before changing your password.'
                : 'Sign in again and complete any required verification before changing your password.'
            }, 403);
          }
          const providerFailure = response.ok || response.status >= 500;
          return c.json({
            error: true,
            error_id: `pwd_${Date.now()}`,
            category: providerFailure ? 'server_error' : 'validation',
            message: providerFailure ? 'Could not confirm the password change' : 'Failed to change password'
          }, providerFailure ? 502 : 400);
        }

        // GoTrue preserves the session used for the password change. Finish signing it
        // out so the browser can discard that session and ask for the new password.
        const callerSessionRevoked = await revokeSession(callerToken, 'caller');
        return c.json({
          password_changed: true,
          temporary_session_revoked: temporarySessionRevoked,
          caller_session_revoked: callerSessionRevoked,
          message: temporarySessionRevoked && callerSessionRevoked
            ? 'Password changed. Sign in with your new password.'
            : 'Password changed. Session cleanup could not be confirmed. Sign in with your new password and sign out all sessions.'
        }, 200);
      } catch (error) {
        return c.json({
          error: true,
          error_id: `pwd_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Could not confirm the password change'
        }, 500);
      }
    }
  },
  {
    method: 'DELETE' as const,
    path: '/api/profile/delete-account/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const validatedData = deleteAccountSchema.safeParse(await c.req.json().catch(() => null));
      if (!validatedData.success) {
        return c.json({
          error: true,
          error_id: `del_${Date.now()}`,
          category: 'validation' as const,
          message: 'Current password is required'
        }, 400);
      }

      const { user_id, password } = validatedData.data;
      if (user_id && user_id !== user.id) return accountChanged(c);

      try {
        const verification = await verifyCurrentPassword(c, user.id, password);
        if (verification.result !== 'verified') {
          return passwordVerificationError(c, verification.result);
        }
        if (!await revokeSession(verification.accessToken, 'temporary')) {
          return passwordVerificationError(c, 'unavailable');
        }

        const { data: cleanupReady, error: cleanupError } = await supabaseAdmin.rpc('account_delete_cascade_ready');
        if (cleanupError || cleanupReady !== true) {
          return c.json({
            error: true,
            error_id: `del_${Date.now()}`,
            category: 'server_error' as const,
            message: 'Account deletion is temporarily unavailable'
          }, 503);
        }

        // The account lifecycle migration cascades the hard delete to journal data.
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id, false);
        
        if (error) {
          return c.json({
            error: true,
            error_id: `del_${Date.now()}`,
            category: 'server_error' as const,
            message: 'Failed to delete account'
          }, 500);
        }
        
        return c.json({
          success: true,
          message: 'Account deleted successfully',
          user_id: user.id
        }, 200);
      } catch (error) {
        return c.json({
          error: true,
          error_id: `del_${Date.now()}`,
          category: 'server_error' as const,
          message: 'Failed to delete account'
        }, 500);
      }
    }
  }
];
