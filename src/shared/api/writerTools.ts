/**
 * Invoke Writers' Room Edge Functions (writer-tools).
 */
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { parseWriterToolsResponse } from '@/shared/writer/schemas';
import type { WriterToolsRequest, WriterToolsResponse } from '@/shared/writer/types';

async function errorBodyFromFunctionsHttpError(err: FunctionsHttpError): Promise<unknown | null> {
  const ctx = err.context;
  if (!ctx || typeof (ctx as Response).json !== 'function') return null;
  try {
    return await (ctx as Response).clone().json();
  } catch {
    return null;
  }
}

export async function invokeWriterTools(body: WriterToolsRequest): Promise<WriterToolsResponse> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }
  const { data, error } = await supabase.functions.invoke('writer-tools', { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response | undefined;
      const status = res && typeof res.status === 'number' ? res.status : undefined;
      const raw = await errorBodyFromFunctionsHttpError(error);
      if (raw && typeof raw === 'object' && raw !== null && 'error' in raw) {
        const o = raw as { error?: unknown; details?: unknown };
        const msg = typeof o.error === 'string' ? o.error : error.message;
        const details = typeof o.details === 'string' ? o.details : undefined;
        if (status === 401 || status === 403) {
          return {
            success: false,
            error:
              'Not signed in or session expired — Supabase Auth is required for writer-tools (JWT). Sign in and try again.',
            ...(details ? { details } : {}),
          };
        }
        return { success: false, error: msg, ...(details ? { details } : {}) };
      }
      if (status === 401 || status === 403) {
        return {
          success: false,
          error:
            'Not signed in or session expired — Supabase Auth is required for writer-tools (JWT). Sign in and try again.',
        };
      }
    }
    return { success: false, error: error.message };
  }
  try {
    return parseWriterToolsResponse(data) as WriterToolsResponse;
  } catch {
    return { success: false, error: 'Invalid response from writer-tools' };
  }
}
