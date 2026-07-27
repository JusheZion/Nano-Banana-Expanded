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
type PacingRevisionChildLayer = 'beats' | 'dialogue';

export type PacingRevisionRetryTarget = {
  page: number;
  layer?: PacingRevisionChildLayer;
};

function readyLayersByPage(set: PacingRevisionSet): Map<number, Set<PacingRevisionChildLayer>> {
  const readyLayers = new Map<number, Set<PacingRevisionChildLayer>>();
  for (const change of set.items.flatMap((item) => item.changes)) {
    if (
      change.page_number == null
      || !['beats', 'dialogue'].includes(change.layer)
      || !['ready', 'applied'].includes(change.generation_status)
    ) continue;
    const layers = readyLayers.get(change.page_number) ?? new Set<PacingRevisionChildLayer>();
    layers.add(change.layer as PacingRevisionChildLayer);
    readyLayers.set(change.page_number, layers);
  }
  return readyLayers;
}

function missingLayersByPage(set: PacingRevisionSet | null): Map<number, Set<PacingRevisionChildLayer>> {
  if (!set || ['applied', 'discarded'].includes(set.status)) return new Map();
  const affectedPages = new Set(set.items.flatMap((item) => item.affected_page_numbers));
  const readyLayers = readyLayersByPage(set);
  const missing = new Map<number, Set<PacingRevisionChildLayer>>();
  for (const pageNumber of affectedPages) {
    const pageReadyLayers = readyLayers.get(pageNumber);
    const pageMissing = new Set<PacingRevisionChildLayer>();
    if (!pageReadyLayers?.has('beats')) pageMissing.add('beats');
    if (!pageReadyLayers?.has('dialogue')) pageMissing.add('dialogue');
    if (pageMissing.size > 0) missing.set(pageNumber, pageMissing);
  }
  return new Map([...missing.entries()].sort(([a], [b]) => a - b));
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

  const generatePagesForSet = useCallback(async (
    set: PacingRevisionSet,
    retryTargets?: PacingRevisionRetryTarget[],
  ) => {
    const missing = missingLayersByPage(set);
    const ready = readyLayersByPage(set);
    const layersToRunByPage = new Map<number, Set<PacingRevisionChildLayer>>();
    if (retryTargets) {
      for (const target of retryTargets) {
        const layers = layersToRunByPage.get(target.page) ?? new Set<PacingRevisionChildLayer>();
        const targetLayers = target.layer ? [target.layer] : [...(missing.get(target.page) ?? [])];
        for (const layer of targetLayers) layers.add(layer);
        if (layers.has('dialogue') && !ready.get(target.page)?.has('beats')) layers.add('beats');
        if (layers.size > 0) layersToRunByPage.set(target.page, layers);
      }
    } else {
      for (const [pageNumber, layers] of missing) {
        layersToRunByPage.set(pageNumber, new Set(layers));
      }
    }
    const requested = new Set(layersToRunByPage.keys());
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
        const layersToRun = layersToRunByPage.get(pageNumber) ?? new Set<PacingRevisionChildLayer>();
        for (const layer of ['beats', 'dialogue'] as const) {
          if (!layersToRun.has(layer)) continue;
          const response = await invokeWriterTools({
            mode: 'pacing_revision_page_preview',
            revision_set_id: set.id,
            page_id: pageByNumber.get(pageNumber)!.id,
            page_number: pageNumber,
            include_beats: layer === 'beats',
            include_dialogue: layer === 'dialogue',
          });
          if (!response.success) {
            const label = layer === 'beats' ? 'Page Beats' : 'Dialogue';
            const detail = [response.error, response.details].filter(Boolean).join(': ');
            return { ok: false as const, page: pageNumber, reason: `${label}: ${detail}` };
          }
        }
        return { ok: true as const, page: pageNumber };
      },
      onCheckpoint: async () => { await refresh(set.id); },
    });
    const persistedResult = await getWriterPacingRevisionSet(set.id);
    if (persistedResult.ok) {
      const persistedMissing = missingLayersByPage(persistedResult.set);
      const affectedPages = new Set(
        persistedResult.set.items.flatMap((item) => item.affected_page_numbers)
      );
      await updateWriterPacingRevisionProgress(set.id, {
        ...persistedResult.set.progress_json,
        completed_pages: [...affectedPages]
          .filter((pageNumber) => !persistedMissing.has(pageNumber))
          .sort((a, b) => a - b),
        current_page: null,
        stopped: result.stopped,
      });
    } else {
      setError(persistedResult.error);
    }
    setGenerating(false);
    await refresh(set.id);
    if (result.failures.length) setError(`${result.failures.length} page candidate${result.failures.length === 1 ? '' : 's'} need retry.`);
  }, [refresh]);

  const generatePages = useCallback(async (retryTargets?: PacingRevisionRetryTarget[]) => {
    if (!activeSet) return;
    await generatePagesForSet(activeSet, retryTargets);
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
    if (
      result.change.layer === 'beats'
      && Object.prototype.hasOwnProperty.call(patch, 'edited_candidate')
    ) {
      await refresh(activeSet?.id);
      return;
    }
    setActiveSet((current) => current ? {
      ...current,
      items: current.items.map((item) => ({
        ...item,
        changes: item.changes.map((change) => change.id === changeId ? result.change : change),
      })),
    } : current);
  }, [activeSet?.id, refresh]);

  const discard = useCallback(async () => {
    if (!activeSet) return;
    const result = await discardWriterPacingRevisionSet(activeSet.id);
    if (!result.ok) { setError(result.error); return; }
    setActiveSet(null);
  }, [activeSet]);

  const hasPendingCandidates = useMemo(
    () => missingLayersByPage(activeSet).size > 0,
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
    retryFailed: (targets: PacingRevisionRetryTarget[]) => generatePages(targets),
    stopAfterCurrentPage: () => { stopRef.current = true; },
  };
}
