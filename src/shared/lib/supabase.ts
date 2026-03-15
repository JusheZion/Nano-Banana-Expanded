/**
 * Supabase client for ARCS Character and Asset persistence.
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in env.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  url && anonKey
    ? createClient(url, anonKey)
    : (null as ReturnType<typeof createClient> | null);

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}
