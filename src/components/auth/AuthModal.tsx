import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';
import { ACCENT_GOLD_GRADIENT } from '@/shared/theme/Phase12DesignTokens';

type Props = {
  open: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
};

export function AuthModal({ open, onClose, initialMode = 'signin' }: Props) {
  const { signInWithPassword, signUpWithPassword, user } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setError(null);
  }, [open, mode]);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  useEffect(() => {
    if (user && open) onClose();
  }, [user, open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email.trim() || password.length < 6) {
      setError('Enter email and a password (at least 6 characters).');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await signInWithPassword(email, password);
        if (err) {
          setError(err.message);
          return;
        }
        onClose();
      } else {
        const { error: err, needsEmailConfirmation } = await signUpWithPassword(email, password);
        if (err) {
          setError(err.message);
          return;
        }
        if (needsEmailConfirmation) {
          setMessage('Check your email to confirm the address, then sign in.');
          setMode('signin');
          setPassword('');
          return;
        }
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/95 text-white shadow-2xl shadow-black/40 p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="auth-modal-title" className="text-lg font-bold tracking-tight">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </h2>
            <p className="text-xs text-white/60 mt-1 leading-snug">
              Supabase Auth — required for Edge Functions that verify JWT (e.g. writer-tools).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            aria-label="Close"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-white/80">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35"
              placeholder="you@example.com"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-white/80">
            Password
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35"
              placeholder="••••••••"
            />
          </label>

          {error ? (
            <p className="text-xs text-red-300 bg-red-950/50 rounded-lg px-3 py-2">{error}</p>
          ) : null}
          {message ? (
            <p className="text-xs text-amber-100/90 bg-amber-900/40 rounded-lg px-3 py-2">{message}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg py-2.5 text-sm font-bold text-black shadow-md disabled:opacity-45"
            style={{ background: ACCENT_GOLD_GRADIENT }}
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <p className="text-[11px] text-white/50 text-center">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button
                type="button"
                className="font-bold text-amber-200/90 underline underline-offset-2 hover:text-amber-100"
                onClick={() => setMode('signup')}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="font-bold text-amber-200/90 underline underline-offset-2 hover:text-amber-100"
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
