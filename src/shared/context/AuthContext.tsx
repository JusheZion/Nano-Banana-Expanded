import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/shared/lib/supabase';
import { AuthModal } from '@/components/auth/AuthModal';

type SignInResult = { error: AuthError | null };
type SignUpResult = { error: AuthError | null; needsEmailConfirmation?: boolean };

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  /** True after the initial `getSession()` completes (or immediately if Supabase is not configured). */
  ready: boolean;
  supabaseConfigured: boolean;
  openSignInModal: () => void;
  signInWithPassword: (email: string, password: string) => Promise<SignInResult>;
  signUpWithPassword: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

/** Safe for optional use outside strict tree (e.g. gradual rollout). */
export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const supabaseConfigured = isSupabaseConfigured() && Boolean(supabase);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      setSession(null);
      setReady(true);
      return;
    }

    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return;
      setSession(s);
      setUser(s?.user ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const openSignInModal = useCallback(() => setModalOpen(true), []);
  const closeSignInModal = useCallback(() => setModalOpen(false), []);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      if (!supabase) return { error: { message: 'Supabase is not configured' } as AuthError };
      const trimmed = email.trim();
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      return { error };
    },
    [],
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string): Promise<SignUpResult> => {
      if (!supabase) return { error: { message: 'Supabase is not configured' } as AuthError };
      const trimmed = email.trim();
      const redirect =
        typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname || '/'}` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: redirect ? { emailRedirectTo: redirect } : undefined,
      });
      if (error) return { error };
      if (data.user && !data.session) {
        return { error: null, needsEmailConfirmation: true };
      }
      return { error: null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setModalOpen(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      ready,
      supabaseConfigured,
      openSignInModal,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [
      user,
      session,
      ready,
      supabaseConfigured,
      openSignInModal,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {supabaseConfigured ? (
        <AuthModal open={modalOpen} onClose={closeSignInModal} />
      ) : null}
    </AuthContext.Provider>
  );
}
