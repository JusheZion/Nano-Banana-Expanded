import { useCallback, useEffect, useRef, useState } from 'react';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load data';
}

/** Owns one async value so stale, cancelled, or unmounted requests cannot publish state. */
export function useLatestAsyncValue<T>(load: () => Promise<T>, initialValue: T, enabled = true) {
  const requestIdRef = useRef(0);
  const mountedRef = useRef(false);
  const [value, setValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = useCallback(() => {
    requestIdRef.current += 1;
    if (mountedRef.current) setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const next = await load();
      if (mountedRef.current && requestIdRef.current === requestId) setValue(next);
    } catch (loadError) {
      if (mountedRef.current && requestIdRef.current === requestId) {
        setError(errorMessage(loadError));
      }
    } finally {
      if (mountedRef.current && requestIdRef.current === requestId) setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (enabled) void refresh();
    else cancel();
    return cancel;
  }, [cancel, enabled, refresh]);

  return { value, loading, error, refresh };
}
