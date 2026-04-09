import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { resolveArcsGenerationsDisplayUrl } from '@/shared/lib/arcsGenerationsUrls';

/**
 * Resolves `arcs-generations` public-style URLs to signed URLs for <img src>.
 * Pass-through for non-storage URLs, data/blob URLs, and already-signed URLs.
 */
export function useArcsResolvedSrc(src: string): string {
  const [out, setOut] = useState(src);

  useEffect(() => {
    let cancelled = false;
    setOut(src);

    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    void (async () => {
      const resolved = await resolveArcsGenerationsDisplayUrl(supabase, src);
      if (!cancelled) setOut(resolved);
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return out;
}
