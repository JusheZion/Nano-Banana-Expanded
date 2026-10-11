import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase';
import { demoPrompts } from './data/demoData';
import { fetchPrompts } from './lib/promptRepository';
import type { PromptRecord } from './lib/types';

type PromptLibraryState = {
  prompts: PromptRecord[];
  setPrompts: Dispatch<SetStateAction<PromptRecord[]>>;
  selectedId: string;
  setSelectedId: Dispatch<SetStateAction<string>>;
  status: string;
  setStatus: Dispatch<SetStateAction<string>>;
  isBusy: boolean;
  setIsBusy: Dispatch<SetStateAction<boolean>>;
  isDatabaseReady: boolean;
  refresh: () => Promise<void>;
};

const DEMO_STATUS = 'Demo library loaded. Sign in to persist Prompt Library records.';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Database sync failed.';
}

/**
 * Owns Prompt Library's account-scoped records and refresh lifecycle.
 *
 * A refresh may outlive the account that started it. Request generations ensure
 * only the latest request for the current account can publish records, status,
 * selection, or loading state.
 */
export function usePromptLibraryState(user: User | null): PromptLibraryState {
  const requestGenerationRef = useRef(0);
  const [prompts, setPrompts] = useState<PromptRecord[]>(demoPrompts);
  const [selectedId, setSelectedId] = useState(demoPrompts[1]?.id ?? demoPrompts[0]?.id ?? '');
  const [status, setStatus] = useState(
    'Prompt Library ready. Sign in to persist ARCS prompt intelligence.',
  );
  const [isBusy, setIsBusy] = useState(false);
  const isDatabaseReady = Boolean(supabase && user);

  const refresh = useCallback(async () => {
    if (!supabase || !user) return;
    const requestGeneration = requestGenerationRef.current + 1;
    requestGenerationRef.current = requestGeneration;
    setIsBusy(true);
    try {
      const databasePrompts = await fetchPrompts(supabase, user);
      if (requestGenerationRef.current !== requestGeneration) return;
      setPrompts(databasePrompts);
      setSelectedId(databasePrompts[0]?.id ?? '');
      setStatus(
        databasePrompts.length
          ? 'Database library synced.'
          : 'Database connected. Create your first prompt.',
      );
    } catch (error) {
      if (requestGenerationRef.current !== requestGeneration) return;
      setStatus(getErrorMessage(error));
    } finally {
      if (requestGenerationRef.current === requestGeneration) setIsBusy(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isDatabaseReady) {
      requestGenerationRef.current += 1;
      setPrompts(demoPrompts);
      setSelectedId(demoPrompts[1]?.id ?? demoPrompts[0]?.id ?? '');
      setStatus(DEMO_STATUS);
      setIsBusy(false);
      return;
    }

    void refresh();
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [isDatabaseReady, refresh, user?.id]);

  useEffect(
    () => () => {
      requestGenerationRef.current += 1;
    },
    [],
  );

  return {
    prompts,
    setPrompts,
    selectedId,
    setSelectedId,
    status,
    setStatus,
    isBusy,
    setIsBusy,
    isDatabaseReady,
    refresh,
  };
}
