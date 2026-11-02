import { useCallback, useState } from 'react';
import { useOwnedTimeout } from '@/shared/hooks/useOwnedTimeout';

/** A single-owner status timer: newer messages replace older dismissals. */
export function useTransientStatus(durationMs: number) {
  const [status, setStatus] = useState<string | null>(null);
  const timeout = useOwnedTimeout();

  const flash = useCallback((message: string) => {
    setStatus(message);
    timeout.schedule(() => setStatus(null), durationMs);
  }, [durationMs, timeout]);

  return { status, flash } as const;
}
