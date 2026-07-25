import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  discardWriterPacingRevisionSet,
  getWriterPacingRevisionSet,
  listWriterPacingRevisionSets,
  updateWriterPacingRevisionChange,
  updateWriterPacingRevisionProgress,
} from '@/shared/api/writerPacingRevisionSets';
import { invokeWriterTools } from '@/shared/api/writerTools';
import {
  pacingRevisionSetSchema,
  type PacingRevisionDecisionPatch,
  type PacingRevisionSet,
} from '@/shared/writer/pacingRevisionSchemas';
import { runPacingRevisionQueue } from './writerPacingRevisionQueue';

type PageRef = { id: string; page_number: number };

function pagesMissingCandidates(set: PacingRevisionSet | null): number[] {
  if (!set || ['applied', 'discarded'].includes(set.status)) return [];
  const affectedPages = new Set(set.items.flatMap((item) => item.affected_page_numbers));
  const readyLayersByPage = new Map<number, Set<string>>();
  for (const change of set.items.flatMap((item) => item.changes)) {
    if (
      change.page_number == null
      || !['beats', 'dialogue'].includes(change.layer)
      || !['ready', 'applied'].includes(change.generation_status)
    ) continue;
    const layers = readyLayersByPage.get(change.page_number) ?? new Set<string>();
    layers.add(change.layer);
    readyLayersByPage.set(change.page_number, layers);
  }
  return [...affectedPages]
    .filter((pageNumber) => {
      const layers = readyLayersByPage.get(pageNumber);
      return !layers?.has('beats') || !layers.has('dialogue');
    })
    .sort((a, b) => a - b);
}

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
    const requested = new Set(pageNumbers ?? pagesMissingCandidates(set));
    const pageByNumber = new Map(pagesRef.current.map((page) => [page.page_number, page]));
    const runnablePages = [...requested].filter((page) => pageByNumber.has(page));
    if (runnablePages.length === 0) {
      if (requested.size > 0) setError('The affected pages are not available in the current issue.');
      return;
    }
    stopRef.current = false;
    setGenerating(true);
    await updateWriterPacingRevisionProgress(set.id, {
      ...set.progress_json,
      current_page: null,
      stopped: false,
    });
    const result = await runPacingRevisionQueue({
      pages: runnablePages,
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
    await updateWriterPacingRevisionProgress(set.id, {
      ...set.progress_json,
      completed_pages: [...new Set([
        ...set.progress_json.completed_pages,
        ...result.completedPages,
      ])].sort((a, b) => a - b),
      current_page: null,
      stopped: result.stopped,
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
      setError(`The Revision Set response was invalid: ${parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.') || 'root'} — ${issue.message}`)
        .join('; ')}`);
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

  const hasPendingCandidates = useMemo(
    () => pagesMissingCandidates(activeSet).length > 0,
    [activeSet],
  );

  return {
    activeSet,
    loading,
    generating,
    error,
    create,
    refresh,
    updateChange,
    discard,
    hasPendingCandidates,
    generatePages,
    retryFailed: (pageNumbers: number[]) => generatePages(pageNumbers),
    stopAfterCurrentPage: () => { stopRef.current = true; },
  };
}
