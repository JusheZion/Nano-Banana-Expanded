/**
 * Invoke Writers' Room Edge Functions (writer-tools).
 */
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { parseWriterToolsResponse } from '@/shared/writer/schemas';
import type { WriterToolsRequest, WriterToolsResponse } from '@/shared/writer/types';

let refreshInFlight: Promise<
  { data: { session: { access_token?: string } | null } | null; error: { message: string } | null } | null
> | null = null;

async function refreshSessionDeduped() {
  if (!supabase) return null;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = supabase.auth.refreshSession().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function errorBodyFromFunctionsHttpError(
  err: FunctionsHttpError,
): Promise<{ json: unknown | null; text: string | null } | null> {
  const ctx = err.context;
  if (!ctx || typeof (ctx as Response).json !== 'function') return null;
  try {
    const res = ctx as Response;
    let json: unknown | null = null;
    let text: string | null = null;
    try {
      json = await res.clone().json();
    } catch {
      json = null;
    }
    try {
      text = await res.clone().text();
    } catch {
      text = null;
    }
    return { json, text };
  } catch {
    return null;
  }
}

/** Supabase documents 401 for missing/invalid JWT when verify_jwt is on; 403 may appear for forbidden; 402 is rare but we map it for clearer UX if a proxy or client reports it. */
function isAuthRelatedGatewayStatus(status: number | undefined): boolean {
  return status === 401 || status === 402 || status === 403;
}

function mergeHttpDetails(serverDetails: string | undefined, status: number | undefined): string | undefined {
  const http = status != null ? `HTTP ${status}` : undefined;
  const merged = [serverDetails, http].filter(Boolean).join(' · ');
  return merged || undefined;
}

const authHint =
  'Not signed in or session expired — Supabase Auth is required for writer-tools (JWT). Sign in and try again.';

function decodeJwtPayload(token: string): { iss?: string; role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '='));
    const payload = JSON.parse(json) as { iss?: string; role?: string; exp?: number };
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

function expectedAuthIssuer(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const origin = new URL(url.trim()).origin;
    return `${origin}/auth/v1`;
  } catch {
    return null;
  }
}

/**
 * Stale or wrong-project tokens sit in localStorage but the Edge gateway still returns 401.
 */
function validateAccessTokenForEdge(accessToken: string): { ok: true } | { ok: false; details: string } {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) {
    return { ok: false, details: 'Access token is not a valid JWT — sign out and sign in again.' };
  }
  if (payload.role === 'anon') {
    return {
      ok: false,
      details:
        'Stored token has role “anon” (not a signed-in user). Sign out, hard refresh, and sign in with email/password again.',
    };
  }
  const expectedIss = expectedAuthIssuer();
  if (expectedIss && typeof payload.iss === 'string' && payload.iss !== expectedIss) {
    return {
      ok: false,
      details: `JWT was issued for a different project (${payload.iss}) than VITE_SUPABASE_URL (${expectedIss}). Use one .env project or clear site data and sign in again.`,
    };
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now - 30) {
    return {
      ok: false,
      details: 'Access token is expired — session will be refreshed on the next attempt.',
    };
  }
  return { ok: true };
}

async function invokeWriterToolsWithToken(
  accessToken: string,
  body: WriterToolsRequest,
): Promise<{ data: unknown; error: unknown }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client missing') };
  }
  return supabase.functions.invoke('writer-tools', {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Edge Functions with verify_jwt need a **user** JWT. The JS client’s fetch helper
 * falls back to the anon key when getSession() has no access_token, which the
 * gateway rejects as 401 — so we always resolve a user token first and set
 * Authorization explicitly.
 */
export async function invokeWriterTools(body: WriterToolsRequest): Promise<WriterToolsResponse> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }

  const {
    data: { session: initialSession },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return {
      success: false,
      error: authHint,
      details: mergeHttpDetails(sessionError.message, undefined),
    };
  }

  if (!initialSession?.access_token) {
    return {
      success: false,
      error: authHint,
      details: 'No user access token — sign in with email and password',
    };
  }

  let accessToken = initialSession.access_token;

  const preCheck = validateAccessTokenForEdge(accessToken);
  if (!preCheck.ok && !preCheck.details.includes('expired')) {
    return { success: false, error: authHint, details: preCheck.details };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = decodeJwtPayload(accessToken)?.exp;
  const expInSec = typeof exp === 'number' ? exp - nowSec : null;
  const refreshBufferSec = 120;
  const shouldRefresh =
    !!initialSession.refresh_token && (!preCheck.ok || (typeof expInSec === 'number' && expInSec < refreshBufferSec));

  if (shouldRefresh) {
    const refreshedRes = await refreshSessionDeduped();
    const refreshed = refreshedRes?.data ?? null;
    const refreshErr = refreshedRes?.error ?? null;
    if (!refreshErr && refreshed?.session?.access_token) {
      accessToken = refreshed.session.access_token;
    }
  }

  const postRefreshCheck = validateAccessTokenForEdge(accessToken);
  if (!postRefreshCheck.ok) {
    return { success: false, error: authHint, details: postRefreshCheck.details };
  }

  // If the access token can't be used to read the user profile, the Edge gateway
  // will also reject it. Surface the auth error directly (more actionable than 401).
  const { error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr) {
    return {
      success: false,
      error: authHint,
      details: mergeHttpDetails(`Supabase getUser failed: ${userErr.message}`, 401),
    };
  }

  let { data, error } = await invokeWriterToolsWithToken(accessToken, body);

  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response | undefined;
    const status = res && typeof res.status === 'number' ? res.status : undefined;
    if (status === 401 && initialSession.refresh_token) {
      const retryRes = await refreshSessionDeduped();
      const retryRefresh = retryRes?.data ?? null;
      const retryRefErr = retryRes?.error ?? null;
      if (!retryRefErr && retryRefresh?.session?.access_token) {
        ({ data, error } = await invokeWriterToolsWithToken(retryRefresh.session.access_token, body));
      }
    }
  }

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response | undefined;
      const status = res && typeof res.status === 'number' ? res.status : undefined;
      const raw = await errorBodyFromFunctionsHttpError(error);
      const rawJson = raw?.json;
      if (rawJson && typeof rawJson === 'object' && rawJson !== null && 'error' in rawJson) {
        const o = rawJson as { error?: unknown; details?: unknown };
        const msg = typeof o.error === 'string' ? o.error : error.message;
        const serverDetails = typeof o.details === 'string' ? o.details : undefined;
        if (isAuthRelatedGatewayStatus(status)) {
          return {
            success: false,
            error: authHint,
            details: mergeHttpDetails(serverDetails, status),
          };
        }
        return {
          success: false,
          error: msg,
          details: mergeHttpDetails(serverDetails, status),
        };
      }
      if (isAuthRelatedGatewayStatus(status)) {
        return {
          success: false,
          error: authHint,
          details: mergeHttpDetails(undefined, status),
        };
      }
      return {
        success: false,
        error: error.message,
        details: mergeHttpDetails(undefined, status),
      };
    }
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
  try {
    return parseWriterToolsResponse(data) as WriterToolsResponse;
  } catch {
    return { success: false, error: 'Invalid response from writer-tools' };
  }
}
