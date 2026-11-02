import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface OwnedTimeout {
  schedule: (callback: () => void, delayMs: number) => void;
  clear: () => void;
}

/**
 * Owns one replaceable timeout for a mounted React subtree.
 * Scheduling a new callback cancels the previous callback, and unmount always cancels the owner.
 */
export function useOwnedTimeout(): OwnedTimeout {
  const timeoutRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timeoutRef.current === null) return;
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const schedule = useCallback((callback: () => void, delayMs: number) => {
    clear();
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      callback();
    }, delayMs);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return useMemo(() => ({ schedule, clear } as const), [clear, schedule]);
}
