import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User, AuthError, isAuthSessionMissingError } from '@supabase/supabase-js';
import { authSessionStorageKey, supabase } from '../lib/supabase';
import { forgetRevokedSession, readStoredSession, type SessionIdentity } from '../lib/authSession';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { setAuthToken, removeAuthToken } from '../lib/tokenStorage';
import { isValidUsername, normalizeUsername, resolveIdentifierToEmail, usernameFromEmail, usernameToInternalEmail } from '../lib/authIdentity';

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  signUp: (username: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (identifier: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<boolean>;
  clearRevokedSession: (revoked: SessionIdentity) => Promise<boolean>;
  loading: boolean;
  refreshSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const usernameConfirmationMessage = 'Your account requires email confirmation. Contact support to activate your username account.';

const refreshSession = async (): Promise<Session | null> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return error ? null : data.session;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const previousUserId = useRef<string>();
  const queryClient = useQueryClient();

  const syncSession = useCallback((nextSession: Session | null, clearCache = false) => {
    const userId = nextSession?.user.id;
    if (previousUserId.current !== userId || clearCache) queryClient.clear();
    previousUserId.current = userId;
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    if (nextSession?.access_token) {
      setAuthToken(nextSession.access_token);
    } else {
      removeAuthToken();
    }
    setLoading(false);
  }, [queryClient]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (nextSession?.access_token !== readStoredSession(authSessionStorageKey)?.access_token) return;
      syncSession(nextSession, event === 'SIGNED_IN' || event === 'SIGNED_OUT');
    });
    const onStorage = (event: StorageEvent) => {
      if (event.key === authSessionStorageKey && event.newValue === null && !localStorage.getItem(authSessionStorageKey)) {
        syncSession(null, true);
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  }, [syncSession]);

  const clearRevokedSession = (revoked: SessionIdentity) => forgetRevokedSession(authSessionStorageKey, revoked, () => {
    syncSession(null, true);
  });

  const signUp = async (username: string, password: string) => {
    try {
      const normalizedUsername = normalizeUsername(username);
      if (!isValidUsername(normalizedUsername)) {
        throw new AuthError('Username must be 3-30 characters using lowercase letters, numbers, or underscores.');
      }

      const { data, error } = await supabase.auth.signUp({
        email: usernameToInternalEmail(normalizedUsername),
        password,
      });

      if (error) {
        if (/confirmation email/i.test(error.message)) {
          throw new AuthError(usernameConfirmationMessage);
        }
        throw error;
      }
      if (!data.session) {
        throw new AuthError(usernameConfirmationMessage);
      }
      
      toast({
        title: 'Account created successfully',
        description: 'You can now sign in with your username and password.',
      });
      
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      
      // Check for duplicate username conflicts surfaced as email conflicts.
      if (authError.message && authError.message.toLowerCase().includes("already")) {
        toast({
          variant: 'destructive',
          title: 'Username already taken',
          description: 'Please choose a different username.',
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

  const signIn = async (identifier: string, password: string) => {
    try {
      const email = resolveIdentifierToEmail(identifier);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.code === 'email_not_confirmed' && usernameFromEmail(email)) {
          throw new AuthError(usernameConfirmationMessage);
        }
        throw error;
      }

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
      if (session) {
        const { error } = await supabase.auth.admin.signOut(session.access_token, 'local');
        if (error && !isAuthSessionMissingError(error)) throw error;
        const cleared = await clearRevokedSession({ userId: session.user.id, accessToken: session.access_token });
        if (!cleared) return true;
      }
      toast({
        title: 'Signed out',
        description: 'You have been successfully logged out.',
      });
      return true;
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error signing out',
        description: 'Unable to sign out. Please try again.',
      });
      return false;
    }
  };

  const value = {
    session,
    user,
    signUp,
    signIn,
    signOut,
    clearRevokedSession,
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
