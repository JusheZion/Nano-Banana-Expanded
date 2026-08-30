import { useCallback, useEffect, useRef, useState } from 'react';

/** A single-owner status timer: newer messages replace older dismissals. */
export function useTransientStatus(durationMs: number) {
  const [status, setStatus] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const flash = useCallback((message: string) => {
    clearTimer();
    setStatus(message);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setStatus(null);
    }, durationMs);
  }, [clearTimer, durationMs]);

  useEffect(() => clearTimer, [clearTimer]);

  return { status, flash } as const;
}
