import { Context } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { profileUpdateSchema, changePasswordSchema } from '../validators/schemas.js';
import { ProfileUpdateRequest } from '../types/index.js';
import { supabaseAdmin } from '../services/supabase.js';

export const profileRoutes = [
  {
    method: 'GET' as const,
    path: '/api/profile/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      
      try {
        // Get user profile from Supabase auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(user.id);
        
        if (authError || !authUser.user) {
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
          username: authUser.user.user_metadata?.username || '',
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
      const body = await c.req.json();
      
      try {
        const validatedData = profileUpdateSchema.parse(body) as ProfileUpdateRequest;
        const updatedFields = Object.keys(validatedData).filter((key) => {
          const value = validatedData[key as keyof ProfileUpdateRequest];
          return value !== undefined;
        });

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
        if (validatedData.username !== undefined) {
          userMetadata.username = validatedData.username;
        }

        const updatePayload: {
          email?: string;
          user_metadata?: Record<string, string>;
        } = {};
        if (validatedData.email !== undefined) {
          updatePayload.email = validatedData.email;
        }
        if (Object.keys(userMetadata).length > 0) {
          updatePayload.user_metadata = userMetadata;
        }

        const { data: updatedUser, error } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          updatePayload
        );
        
        if (error) {
          return c.json({
            error: true,
            error_id: `prof_${Date.now()}`,
            category: 'validation' as const,
            message: error.message || 'Failed to update profile'
          }, 400);
        }

        if (!updatedUser.user) {
          return c.json({
            error: true,
            error_id: `prof_${Date.now()}`,
            category: 'server_error' as const,
            message: 'Failed to update profile'
          }, 500);
        }

        const profile = {
          id: updatedUser.user.id,
          email: updatedUser.user.email || '',
          first_name: updatedUser.user.user_metadata?.first_name || '',
          last_name: updatedUser.user.user_metadata?.last_name || '',
          username: updatedUser.user.user_metadata?.username || '',
          date_joined: updatedUser.user.created_at,
          last_login: updatedUser.user.last_sign_in_at || updatedUser.user.created_at
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
      const body = await c.req.json();
      
      try {
        const validatedData = changePasswordSchema.parse(body);
        
        // Change password via Supabase Admin
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { password: validatedData.new_password }
        );
        
        if (error) {
          return c.json({
            error: true,
            error_id: `pwd_${Date.now()}`,
            category: 'validation' as const,
            message: error.message || 'Failed to change password'
          }, 400);
        }
        
        return c.json({
          message: 'Password changed successfully'
        }, 200);
      } catch (error) {
        return c.json({
          error: true,
          error_id: `pwd_${Date.now()}`,
          category: 'validation' as const,
          message: 'Invalid password change data'
        }, 400);
      }
    }
  },
  {
    method: 'DELETE' as const,
    path: '/api/profile/delete-account/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      
      try {
        // Delete user via Supabase Admin (this also deletes all their data due to RLS)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        
        if (error) {
          return c.json({
            error: true,
            error_id: `del_${Date.now()}`,
            category: 'server_error' as const,
            message: error.message || 'Failed to delete account'
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
