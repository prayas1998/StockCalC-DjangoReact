import { Context } from 'hono';
import { requireAuth } from '../middleware/auth';
import { profileUpdateSchema, changePasswordSchema } from '../validators/schemas';
import { ProfileUpdateRequest, ChangePasswordRequest } from '../types';

export const profileRoutes = [
  {
    method: 'GET' as const,
    path: '/api/profile/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      
      // TODO: Implement actual profile retrieval from Supabase
      const mockProfile = {
        id: user.id,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        date_joined: '2024-01-01T00:00:00Z',
        last_login: '2024-12-01T00:00:00Z'
      };
      
      return c.json(mockProfile, 200);
    }
  },
  {
    method: 'PATCH' as const,
    path: '/api/profile/',
    handler: async (c: Context) => {
      const user = requireAuth(c);
      const body = await c.req.json();
      
      try {
        const validatedData = profileUpdateSchema.parse(body);
        
        // TODO: Implement actual profile update in Supabase
        // For now, return mock updated profile
        const updatedProfile = {
          id: user.id,
          email: validatedData.email || user.email,
          first_name: validatedData.first_name || user.first_name,
          last_name: validatedData.last_name || user.last_name,
          username: user.username || '',
          date_joined: '2024-01-01T00:00:00Z',
          last_login: '2024-12-01T00:00:00Z'
        };
        
        return c.json(updatedProfile, 200);
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
        
        // TODO: Redirect to Supabase client for password change
        return c.json({
          message: 'Please use the Supabase client to change your password.',
          note: 'Password changes should be handled client-side via Supabase auth.'
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
        // TODO: Implement actual account deletion via Supabase Admin
        return c.json({
          message: 'Account deletion requested. You will receive confirmation when complete.',
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