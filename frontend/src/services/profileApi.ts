import { api } from './api';
import { supabase } from '../lib/supabase';
import { handleApiError, handleAuthenticationError } from '../utils/frontendErrorHandler';

export interface ProfileData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  date_joined: string | null;
  last_login: string | null;
}

export interface ProfileUpdateData {
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
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

  /**
   * Update user profile information
   */
  async updateProfile(data: ProfileUpdateData): Promise<{ message: string; updated_fields: string[]; profile: ProfileData }> {
    try {
      const response = await api.patch('/profile/', data);
      return response.data;
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } })?.response?.status === 401 || (error as { response?: { status?: number } })?.response?.status === 403) {
        handleAuthenticationError(error, { operation: 'updateProfile' });
      } else {
        handleApiError(error, { operation: 'updateProfile' });
      }
      throw error;
    }
  },

  /**
   * Change user password
   */
  async changePassword(data: PasswordChangeData): Promise<{ message: string }> {
    try {
      // First check if backend supports password change
      const response = await api.post('/profile/change-password/', data);
      
      // If backend returns action to use Supabase client, handle it on frontend
      if (response.data.action === 'use_supabase_client') {
        // Import Supabase client dynamically to avoid circular imports
        const { supabase } = await import('../lib/supabase');
        
        // Use Supabase to change password
        const { error } = await supabase.auth.updateUser({
          password: data.new_password
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        return { message: 'Password changed successfully' };
      }
      
      return response.data;
    } catch (error: unknown) {
      console.error('Profile API - Change password error:', error);
      throw error;
    }
  },

  /**
   * Delete user account with complete backend handling.
   * Backend handles both Django data cleanup and Supabase user deletion.
   */
  async deleteAccount(password: string): Promise<{ message: string; cleanup_summary?: Record<string, unknown>; success: boolean; support_needed?: boolean }> {
    try {
      // Call backend to handle complete account deletion
      const response = await api.delete('/profile/delete-account/', {
        data: { password }
      });
      
      // Backend handles everything - just return the response
      return {
        message: response.data.message,
        cleanup_summary: response.data.cleanup_summary,
        success: response.data.success,
        support_needed: response.data.support_needed
      };
      
    } catch (error: unknown) {
      console.error('Profile API - Delete account error:', error);
      
      // Handle specific error responses
      if ((error as { response?: { status?: number } })?.response?.status === 401) {
        throw new Error('Please log in again to delete your account');
      } else if ((error as { response?: { status?: number } })?.response?.status === 403) {
        throw new Error('You do not have permission to delete this account');
      } else if ((error as { response?: { status?: number } })?.response?.status === 500) {
        // Server error during deletion
        const errorData = (error as { response?: { data?: { support_needed?: boolean; message?: string } } })?.response?.data;
        if (errorData?.support_needed) {
          throw new Error(errorData.message || 'Account deletion partially failed. Please contact support.');
        }
        throw new Error('Server error during account deletion. Please try again or contact support.');
      } else if ((error as { response?: { data?: { message?: string } } })?.response?.data?.message) {
        throw new Error((error as { response: { data: { message: string } } }).response.data.message);
      } else if ((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail) {
        throw new Error((error as { response: { data: { detail: string } } }).response.data.detail);
      } else {
        throw new Error('Failed to delete account. Please try again or contact support.');
      }
    }
  }
};