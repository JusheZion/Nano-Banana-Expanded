import { useCallback, useEffect, useRef, useState } from 'react';
import {
  discardWriterPacingRevisionSet,
  getWriterPacingRevisionSet,
  listWriterPacingRevisionSets,
  updateWriterPacingRevisionChange,
} from '@/shared/api/writerPacingRevisionSets';
import { invokeWriterTools } from '@/shared/api/writerTools';
import {
  pacingRevisionSetSchema,
  type PacingRevisionDecisionPatch,
  type PacingRevisionSet,
} from '@/shared/writer/pacingRevisionSchemas';
import { runPacingRevisionQueue } from './writerPacingRevisionQueue';

type PageRef = { id: string; page_number: number };

export function useWriterPacingRevisionSet(issueId: string | null, pages: PageRef[]) {
  const [activeSet, setActiveSet] = useState<PacingRevisionSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef(false);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const refresh = useCallback(async (setId?: string) => {
    if (!issueId) { setActiveSet(null); return; }
    setLoading(true);
    const result = setId
      ? await getWriterPacingRevisionSet(setId)
      : await listWriterPacingRevisionSets(issueId);
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    setError(null);
    setActiveSet('set' in result ? result.set : result.sets[0] ?? null);
  }, [issueId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const generatePagesForSet = useCallback(async (set: PacingRevisionSet, pageNumbers?: number[]) => {
    const requested = new Set(pageNumbers ?? set.items.flatMap((item) => item.affected_page_numbers));
    const pageByNumber = new Map(pagesRef.current.map((page) => [page.page_number, page]));
    stopRef.current = false;
    setGenerating(true);
    const result = await runPacingRevisionQueue({
      pages: [...requested].filter((page) => pageByNumber.has(page)),
      shouldStop: () => stopRef.current,
      runPage: async (pageNumber) => {
        const response = await invokeWriterTools({
          mode: 'pacing_revision_page_preview',
          revision_set_id: set.id,
          page_id: pageByNumber.get(pageNumber)!.id,
        });
        return response.success
          ? { ok: true as const, page: pageNumber }
          : { ok: false as const, page: pageNumber, reason: [response.error, response.details].filter(Boolean).join(': ') };
      },
      onCheckpoint: async () => { await refresh(set.id); },
    });
    setGenerating(false);
    await refresh(set.id);
    if (result.failures.length) setError(`${result.failures.length} page candidate${result.failures.length === 1 ? '' : 's'} need retry.`);
  }, [refresh]);

  const generatePages = useCallback(async (pageNumbers?: number[]) => {
    if (!activeSet) return;
    await generatePagesForSet(activeSet, pageNumbers);
  }, [activeSet, generatePagesForSet]);

  const create = useCallback(async () => {
    if (!issueId) return;
    setGenerating(true);
    setError(null);
    const response = await invokeWriterTools({
      mode: 'pacing_revision_outline_preview',
      issue_id: issueId,
    });
    if (!response.success) {
      setGenerating(false);
      setError([response.error, response.details].filter(Boolean).join(': '));
      return;
    }
    const parsed = pacingRevisionSetSchema.safeParse(response.data);
    if (!parsed.success) {
      setGenerating(false);
      setError('The Revision Set response was invalid.');
      return;
    }
    setActiveSet(parsed.data);
    setGenerating(false);
    await generatePagesForSet(parsed.data);
  }, [generatePagesForSet, issueId]);

  const updateChange = useCallback(async (changeId: string, patch: PacingRevisionDecisionPatch) => {
    const result = await updateWriterPacingRevisionChange(changeId, patch);
    if (!result.ok) { setError(result.error); return; }
    setActiveSet((current) => current ? {
      ...current,
      items: current.items.map((item) => ({
        ...item,
        changes: item.changes.map((change) => change.id === changeId ? result.change : change),
      })),
    } : current);
  }, []);

  const discard = useCallback(async () => {
    if (!activeSet) return;
    const result = await discardWriterPacingRevisionSet(activeSet.id);
    if (!result.ok) { setError(result.error); return; }
    setActiveSet(null);
  }, [activeSet]);

  return {
    activeSet,
    loading,
    generating,
    error,
    create,
    refresh,
    updateChange,
    discard,
    generatePages,
    retryFailed: (pageNumbers: number[]) => generatePages(pageNumbers),
    stopAfterCurrentPage: () => { stopRef.current = true; },
  };
}
