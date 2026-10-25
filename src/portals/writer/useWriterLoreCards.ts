import { useCallback } from 'react';
import {
  listWriterLoreCardsResult,
  type WriterLoreCardRow,
} from '@/shared/api/arcsWriterRoom';
import { useScopedAsyncResource } from '@/shared/hooks/useScopedAsyncResource';

const EMPTY_LORE_CARDS: WriterLoreCardRow[] = [];

export function useWriterLoreCards(seriesId: string | null) {
  const load = useCallback(async (currentSeriesId: string) => {
    const result = await listWriterLoreCardsResult(currentSeriesId);
    if (!result.ok) throw new Error(result.error);
    return result.rows;
  }, []);
  const resource = useScopedAsyncResource({
    scope: seriesId,
    initialValue: EMPTY_LORE_CARDS,
    load,
    fallbackError: 'Could not load Story Canon cards.',
  });
  return {
    cards: resource.value,
    loading: resource.loading,
    error: resource.error,
    refresh: resource.refresh,
  };
}
