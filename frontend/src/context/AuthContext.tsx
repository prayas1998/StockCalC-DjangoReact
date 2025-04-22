import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  signUp: (email: string, password: string, firstName: string, lastName?: string) => Promise<{ error: any | null }>;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
  refreshSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Helper to check token expiration
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    return expiryTime < Date.now();
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

  // Function to refresh the session
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
        
        // Store the token in localStorage for the API service
        localStorage.setItem('auth_token', data.session.access_token);
        
        return data.session;
      }
      
      return null;
    } catch (error) {
      console.error('Unexpected error during session refresh:', error);
      return null;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Store the token in localStorage for the API service
      if (session?.access_token) {
        localStorage.setItem('auth_token', session.access_token);
      } else {
        localStorage.removeItem('auth_token');
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Update token in localStorage on auth state change
      if (session?.access_token) {
        localStorage.setItem('auth_token', session.access_token);
        
        // Check if token is about to expire and refresh if needed
        if (isTokenExpired(session.access_token)) {
          console.log('Token expired on auth state change, refreshing...');
          const refreshedSession = await refreshSession();
          if (!refreshedSession) {
            console.log('Failed to refresh session, redirecting to login...');
          }
        }
      } else {
        localStorage.removeItem('auth_token');
      }
      
      setLoading(false);
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
      // Check for duplicate email error
      if (error.message && error.message.includes("already")) {
        toast({
          variant: 'destructive',
          title: 'Email already registered',
          description: 'This email is already registered. Please sign in instead.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error creating account',
          description: error.message || 'An unknown error occurred',
        });
      }
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Store the token after successful sign in
      if (data.session?.access_token) {
        localStorage.setItem('auth_token', data.session.access_token);
      }
      
      toast({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.',
      });
      
      return { error: null };
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message || 'An unknown error occurred',
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Remove the token when signing out
      localStorage.removeItem('auth_token');
      
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

  const value = {
    session,
    user,
    signUp,
    signIn,
    signOut,
    loading,
    refreshSession,
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