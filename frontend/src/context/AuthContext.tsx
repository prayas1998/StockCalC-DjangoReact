import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { setAuthToken, removeAuthToken } from '../lib/tokenStorage';

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  signUp: (email: string, password: string, firstName: string, lastName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
  refreshSession: () => Promise<Session | null>;
  updateUserProfile: (updates: { email?: string; first_name?: string; last_name?: string }, showToast?: boolean) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

/**
 * Checks if a JWT token is expired or about to expire
 * @param token JWT token to check
 * @param bufferSeconds Seconds before actual expiration to consider token as expired
 * @returns boolean indicating if token is expired or about to expire
 */
const isTokenExpiring = (token: string, bufferSeconds = 300): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    // Consider token expired if it's within buffer period
    return expiryTime < (Date.now() + bufferSeconds * 1000);
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Assume expired if we can't parse it
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * Refreshes the authentication session
   * @returns Refreshed session or null if refresh failed
   */
  const refreshSession = async (): Promise<Session | null> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        return null;
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setAuthToken(data.session.access_token);
        return data.session;
      }
      
      return null;
    } catch (error) {
      console.error('Unexpected error during session refresh:', error);
      return null;
    }
  };

  // Update token in storage and handle session state
  const updateSessionState = async (newSession: Session | null, clearCache: boolean = false) => {
    const previousUserId = user?.id;
    const newUserId = newSession?.user?.id;
    
    setSession(newSession);
    setUser(newSession?.user ?? null);
    
    if (newSession?.access_token) {
      setAuthToken(newSession.access_token);
    } else {
      removeAuthToken();
    }
    
    // Clear query cache if user changed or explicitly requested
    if (clearCache || (previousUserId && newUserId && previousUserId !== newUserId) || (!newUserId && previousUserId)) {
      queryClient.clear();
      console.log('Query cache cleared due to user change');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await updateSessionState(session);
      
      // Proactively refresh if token is about to expire
      if (session?.access_token && isTokenExpiring(session.access_token)) {
        await refreshSession();
      }
    };
    
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Clear cache on sign out or sign in events
      const shouldClearCache = event === 'SIGNED_OUT' || event === 'SIGNED_IN';
      await updateSessionState(session, shouldClearCache);
      
      // Check if token is about to expire and refresh if needed
      if (session?.access_token && isTokenExpiring(session.access_token)) {
        const refreshedSession = await refreshSession();
        if (!refreshedSession) {
          // Handle failed refresh by logging out
          toast({
            variant: 'destructive',
            title: 'Session expired',
            description: 'Your session has expired. Please log in again.',
          });
          await signOut();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName || '',
          },
        },
      });

      if (error) throw error;
      
      toast({
        title: 'Account created successfully',
        description: 'Please check your email to verify your account before signing in.',
      });
      
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      
      // Check for duplicate email error
      if (authError.message && authError.message.toLowerCase().includes("already")) {
        toast({
          variant: 'destructive',
          title: 'Email already registered',
          description: 'This email is already registered. Please sign in instead.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error creating account',
          description: authError.message || 'An unknown error occurred',
        });
      }
      return { error: authError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.',
      });
      
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: authError.message || 'An unknown error occurred',
      });
      return { error: authError };
    }
  };

  const signOut = async () => {
    try {
      // Clear query cache before signing out
      queryClient.clear();
      
      await supabase.auth.signOut();
      removeAuthToken();
      
      toast({
        title: 'Signed out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error signing out',
        description: 'An unknown error occurred',
      });
    }
  };

  const updateUserProfile = async (updates: { email?: string; first_name?: string; last_name?: string }, showToast: boolean = true) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: updates.email,
        data: {
          first_name: updates.first_name,
          last_name: updates.last_name,
        },
      });

      if (error) throw error;
      
      if (showToast) {
        toast({
          title: 'Profile updated',
          description: 'Your profile has been successfully updated.',
        });
      }
      
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      
      if (showToast) {
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: authError.message || 'An unknown error occurred',
        });
      }
      return { error: authError };
    }
  };

  const value = {
    session,
    user,
    signUp,
    signIn,
    signOut,
    loading,
    refreshSession,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
