import React from 'react';
import { LockKeyhole, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';
import { ACCENT_GOLD_GRADIENT, PRIMARY_BG_FLAT } from '@/shared/theme/Phase12DesignTokens';

type ProtectedPortalGateProps = {
  children: React.ReactNode;
};

export function ProtectedPortalGate({ children }: ProtectedPortalGateProps) {
  const { user, ready, supabaseConfigured, openSignInModal } = useAuth();

  if (supabaseConfigured && ready && user) {
    return <>{children}</>;
  }

  const title = !supabaseConfigured
    ? 'Supabase auth is not configured'
    : !ready
      ? 'Checking account'
      : 'Sign in to continue';
  const detail = !supabaseConfigured
    ? 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server to protect this workspace with Supabase Auth.'
    : !ready
      ? 'We are checking your Supabase session before opening this workspace.'
      : 'This workspace is protected so your Supabase-backed data and AI tools stay tied to your account.';

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <section
        className="w-full max-w-lg rounded-2xl border border-white/15 bg-black/35 p-6 text-center shadow-2xl shadow-black/25 backdrop-blur-xl"
        style={{ backgroundColor: `${PRIMARY_BG_FLAT}E6` }}
        aria-live="polite"
      >
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-black shadow-lg"
          style={{ background: ACCENT_GOLD_GRADIENT }}
        >
          <LockKeyhole className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/70">{detail}</p>
        {supabaseConfigured && ready ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => openSignInModal({ initialMode: 'signin' })}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-black shadow-md"
              style={{ background: ACCENT_GOLD_GRADIENT }}
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Sign in
            </button>
            <button
              type="button"
              onClick={() => openSignInModal({ initialMode: 'signup' })}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              Create account
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
