import { useEffect, useState } from 'react';

/**
 * Tracks a media query.
 *
 * Layout that only differs by CSS belongs in CSS; this is for the cases where
 * the *behaviour* changes — the dock being a column versus an overlay is a
 * different interaction, not a different width.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);
    sync();
    list.addEventListener('change', sync);
    // Deliberate belt-and-braces. An emulated or embedded viewport can change
    // size without firing either the media query's own change event or a window
    // resize — verified in the in-app preview pane, which fires neither — and
    // the layout would then stay stuck in whichever mode it loaded in.
    // Observing the root element catches those cases.
    window.addEventListener('resize', sync);
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(sync) : null;
    observer?.observe(document.documentElement);
    return () => {
      list.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
      observer?.disconnect();
    };
  }, [query]);

  return matches;
}
