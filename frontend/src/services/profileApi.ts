import { getApiUrl } from '../config';
import type { SessionIdentity } from '../lib/authSession';
import { supabase } from '../lib/supabase';
import { api } from './api';
import { handleApiError, handleAuthenticationError } from '../utils/frontendErrorHandler';

export interface ProfileData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  date_joined: string | null;
  last_login: string | null;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordChangeResponse {
  message: string;
  password_changed?: boolean;
  caller_session_revoked?: boolean;
  temporary_session_revoked?: boolean;
  action?: string;
}

async function accountRequest<T>(userId: string, path: string, method: string, body: object = {}): Promise<{ data: T; caller: SessionIdentity }> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || session?.user.id !== userId) {
    throw new Error('The signed-in account changed. Open the form again to continue.');
  }

  // Use the captured account token for this request without replay on another session.
  const response = await fetch(getApiUrl(`/api${path}`), {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, user_id: userId })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error(data?.message || 'The account request could not be completed.');
  }
  return { data, caller: { userId, accessToken: session.access_token } };
}

export const profileApi = {
  /**
   * Get current user profile information
   */
  async getProfile(): Promise<ProfileData> {
    try {
      const response = await api.get('/profile/');
      return response.data;
    } catch (error: unknown) {
      // Handle authentication errors specially
      if ((error as { response?: { status?: number } })?.response?.status === 401 || (error as { response?: { status?: number } })?.response?.status === 403) {
        handleAuthenticationError(error, { operation: 'getProfile' });
      } else {
        handleApiError(error, { operation: 'getProfile' });
      }
      throw error;
    }
  },

  async getSecurityStatus(): Promise<{ active_sessions: number | null }> {
    const { data } = await api.get('/auth/security-status/');
    return data;
  },

  revokeAllSessions(userId: string) {
    return accountRequest<{ message: string }>(userId, '/auth/revoke-all/', 'POST');
  },

  changePassword(userId: string, data: PasswordChangeData) {
    return accountRequest<PasswordChangeResponse>(userId, '/profile/change-password/', 'POST', data);
  },

  deleteAccount(userId: string, password: string) {
    return accountRequest<{ message: string; success: boolean }>(userId, '/profile/delete-account/', 'DELETE', { password });
  }
};
