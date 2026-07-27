import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  archiveWriterPacingRevisionSet,
  discardWriterPacingRevisionSet,
  getWriterPacingRevisionSet,
  listWriterPacingRevisionSetHistory,
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
type PacingRevisionOperationContext = {
  issueId: string;
  issueVersion: number;
  pages: PageRef[];
};

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
  const [historySets, setHistorySets] = useState<PacingRevisionSet[]>([]);
  const [selectedHistorySet, setSelectedHistorySet] = useState<PacingRevisionSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef(false);
  const [stateIssueId, setStateIssueId] = useState(issueId);
  const issueVersionRef = useRef(0);
  const activeRequestSequenceRef = useRef(0);
  const historyRequestSequenceRef = useRef(0);
  const currentIssueIdRef = useRef(issueId);
  const activeSetRef = useRef<PacingRevisionSet | null>(null);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  currentIssueIdRef.current = issueId;

  const activeSetForIssue = activeSet?.issue_id === issueId ? activeSet : null;
  const historySetsForIssue = historySets.filter((set) => set.issue_id === issueId);
  const selectedHistorySetForIssue =
    selectedHistorySet?.issue_id === issueId ? selectedHistorySet : null;
  activeSetRef.current = activeSetForIssue;

  if (stateIssueId !== issueId) {
    issueVersionRef.current += 1;
    activeRequestSequenceRef.current += 1;
    historyRequestSequenceRef.current += 1;
    setStateIssueId(issueId);
    setActiveSet(null);
    setHistorySets([]);
    setSelectedHistorySet(null);
    setLoading(false);
    setHistoryLoading(false);
    setHistoryError(null);
    setGenerating(false);
    setError(null);
    stopRef.current = true;
  }

  const isCurrentOperation = useCallback((
    operationIssueId: string,
    operationIssueVersion: number,
  ) => (
    currentIssueIdRef.current === operationIssueId
    && issueVersionRef.current === operationIssueVersion
  ), []);

  const refresh = useCallback(async (setId?: string) => {
    if (!issueId) { setActiveSet(null); return; }
    const requestIssueId = issueId;
    const requestVersion = issueVersionRef.current;
    const requestSequence = ++activeRequestSequenceRef.current;
    setLoading(true);
    const result = setId
      ? await getWriterPacingRevisionSet(setId)
      : await listWriterPacingRevisionSets(issueId);
    if (
      currentIssueIdRef.current !== requestIssueId
      || issueVersionRef.current !== requestVersion
      || activeRequestSequenceRef.current !== requestSequence
    ) return;
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    setError(null);
    setActiveSet('set' in result ? result.set : result.sets[0] ?? null);
  }, [issueId]);

  const refreshHistory = useCallback(async () => {
    if (!issueId) {
      setHistorySets([]);
      setHistoryError(null);
      return;
    }
    const requestIssueId = issueId;
    const requestVersion = issueVersionRef.current;
    const requestSequence = ++historyRequestSequenceRef.current;
    setHistoryLoading(true);
    const result = await listWriterPacingRevisionSetHistory(issueId);
    if (
      currentIssueIdRef.current !== requestIssueId
      || issueVersionRef.current !== requestVersion
      || historyRequestSequenceRef.current !== requestSequence
    ) return;
    setHistoryLoading(false);
    if (!result.ok) {
      setHistoryError(result.error);
      return;
    }
    setHistoryError(null);
    setHistorySets(result.sets);
  }, [issueId]);

  useEffect(() => {
    void refresh();
    void refreshHistory();
    setSelectedHistorySet(null);
  }, [refresh, refreshHistory]);

  const generatePagesForSet = useCallback(async (
    set: PacingRevisionSet,
    retryTargets?: PacingRevisionRetryTarget[],
    suppliedContext?: PacingRevisionOperationContext,
  ) => {
    const operationContext = suppliedContext ?? (
      currentIssueIdRef.current
        ? {
            issueId: currentIssueIdRef.current,
            issueVersion: issueVersionRef.current,
            pages: pagesRef.current.map((page) => ({ ...page })),
          }
        : null
    );
    if (
      !operationContext
      || set.issue_id !== operationContext.issueId
      || !isCurrentOperation(operationContext.issueId, operationContext.issueVersion)
    ) return;
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
    const pageByNumber = new Map(operationContext.pages.map((page) => [page.page_number, page]));
    const runnablePages = [...requested].sort((a, b) => a - b);
    if (runnablePages.length === 0) return;
    stopRef.current = false;
    setGenerating(true);
    await updateWriterPacingRevisionProgress(set.id, {
      ...set.progress_json,
      current_page: null,
      stopped: false,
    });
    if (!isCurrentOperation(operationContext.issueId, operationContext.issueVersion)) return;
    const result = await runPacingRevisionQueue({
      pages: runnablePages,
      shouldStop: () => (
        stopRef.current
        || !isCurrentOperation(operationContext.issueId, operationContext.issueVersion)
      ),
      runPage: async (pageNumber) => {
        if (!isCurrentOperation(operationContext.issueId, operationContext.issueVersion)) {
          return { ok: false as const, page: pageNumber, reason: 'The selected issue changed.' };
        }
        const layersToRun = layersToRunByPage.get(pageNumber) ?? new Set<PacingRevisionChildLayer>();
        for (const layer of ['beats', 'dialogue'] as const) {
          if (!layersToRun.has(layer)) continue;
          const physicalPage = pageByNumber.get(pageNumber);
          const response = await invokeWriterTools({
            mode: 'pacing_revision_page_preview',
            revision_set_id: set.id,
            page_id: physicalPage?.id ?? null,
            page_number: pageNumber,
            include_beats: layer === 'beats',
            include_dialogue: layer === 'dialogue',
          });
          if (!isCurrentOperation(operationContext.issueId, operationContext.issueVersion)) {
            return { ok: false as const, page: pageNumber, reason: 'The selected issue changed.' };
          }
          if (!response.success) {
            const label = layer === 'beats' ? 'Page Beats' : 'Dialogue';
            const detail = [response.error, response.details].filter(Boolean).join(': ');
            return { ok: false as const, page: pageNumber, reason: `${label}: ${detail}` };
          }
        }
        return { ok: true as const, page: pageNumber };
      },
      onCheckpoint: async () => {
        if (isCurrentOperation(operationContext.issueId, operationContext.issueVersion)) {
          await refresh(set.id);
        }
      },
    });
    if (!isCurrentOperation(operationContext.issueId, operationContext.issueVersion)) return;
    const persistedResult = await getWriterPacingRevisionSet(set.id);
    if (!isCurrentOperation(operationContext.issueId, operationContext.issueVersion)) return;
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
      if (!isCurrentOperation(operationContext.issueId, operationContext.issueVersion)) return;
    } else {
      setError(persistedResult.error);
    }
    setGenerating(false);
    await refresh(set.id);
    if (!isCurrentOperation(operationContext.issueId, operationContext.issueVersion)) return;
    if (result.failures.length) setError(`${result.failures.length} page candidate${result.failures.length === 1 ? '' : 's'} need retry.`);
  }, [isCurrentOperation, refresh]);

  const generatePages = useCallback(async (retryTargets?: PacingRevisionRetryTarget[]) => {
    if (!activeSetForIssue) return;
    const operationContext: PacingRevisionOperationContext = {
      issueId: activeSetForIssue.issue_id,
      issueVersion: issueVersionRef.current,
      pages: pagesRef.current.map((page) => ({ ...page })),
    };
    await generatePagesForSet(activeSetForIssue, retryTargets, operationContext);
  }, [activeSetForIssue, generatePagesForSet]);

  const create = useCallback(async () => {
    if (!issueId) return;
    const operationContext: PacingRevisionOperationContext = {
      issueId,
      issueVersion: issueVersionRef.current,
      pages: pagesRef.current.map((page) => ({ ...page })),
    };
    setGenerating(true);
    setError(null);
    const response = await invokeWriterTools({
      mode: 'pacing_revision_outline_preview',
      issue_id: issueId,
    });
    if (!isCurrentOperation(operationContext.issueId, operationContext.issueVersion)) return;
    if (!response.success) {
      setGenerating(false);
      setError([response.error, response.details].filter(Boolean).join(': '));
      return;
    }
    const parsed = pacingRevisionSetSchema.safeParse(response.data);
    if (!isCurrentOperation(operationContext.issueId, operationContext.issueVersion)) return;
    if (!parsed.success) {
      setGenerating(false);
      setError(`The Revision Set response was invalid: ${parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.') || 'root'} — ${issue.message}`)
        .join('; ')}`);
      return;
    }
    if (parsed.data.issue_id !== operationContext.issueId) {
      setGenerating(false);
      setError('The Revision Set response belonged to a different issue.');
      return;
    }
    setActiveSet(parsed.data);
    setGenerating(false);
    await generatePagesForSet(parsed.data, undefined, operationContext);
  }, [generatePagesForSet, isCurrentOperation, issueId]);

  const updateChange = useCallback(async (changeId: string, patch: PacingRevisionDecisionPatch) => {
    if (!activeSetForIssue) return;
    const operationIssueId = activeSetForIssue.issue_id;
    const operationIssueVersion = issueVersionRef.current;
    const targetSetId = activeSetForIssue.id;
    const result = await updateWriterPacingRevisionChange(changeId, patch);
    if (
      !isCurrentOperation(operationIssueId, operationIssueVersion)
      || activeSetRef.current?.id !== targetSetId
    ) return;
    if (!result.ok) { setError(result.error); return; }
    if (
      result.change.layer === 'beats'
      && Object.prototype.hasOwnProperty.call(patch, 'edited_candidate')
    ) {
      await refresh(targetSetId);
      if (
        !isCurrentOperation(operationIssueId, operationIssueVersion)
        || activeSetRef.current?.id !== targetSetId
      ) return;
      return;
    }
    setActiveSet((current) => current?.id === targetSetId ? {
      ...current,
      items: current.items.map((item) => ({
        ...item,
        changes: item.changes.map((change) => change.id === changeId ? result.change : change),
      })),
    } : current);
  }, [activeSetForIssue, isCurrentOperation, refresh]);

  const discard = useCallback(async () => {
    if (!activeSetForIssue) return;
    const operationIssueId = activeSetForIssue.issue_id;
    const operationIssueVersion = issueVersionRef.current;
    const targetSetId = activeSetForIssue.id;
    const result = await discardWriterPacingRevisionSet(targetSetId);
    if (
      !isCurrentOperation(operationIssueId, operationIssueVersion)
      || activeSetRef.current?.id !== targetSetId
    ) return;
    if (!result.ok) { setError(result.error); return; }
    setActiveSet((current) => current?.id === targetSetId ? null : current);
  }, [activeSetForIssue, isCurrentOperation]);

  const archiveActive = useCallback(async (
    expectedSet?: PacingRevisionSet,
    options: { surfaceError?: boolean } = {},
  ): Promise<
    { ok: true } | { ok: false; kind?: 'conflict' | 'operational'; error: string }
  > => {
    const surfaceError = options.surfaceError ?? true;
    const setToArchive = expectedSet ?? activeSetRef.current;
    if (!setToArchive) {
      const archiveError = 'There is no active Pacing Revision Set to archive.';
      if (surfaceError) setError(archiveError);
      return { ok: false, error: archiveError };
    }
    if (
      !currentIssueIdRef.current
      || setToArchive.issue_id !== currentIssueIdRef.current
      || activeSetRef.current?.id !== setToArchive.id
    ) {
      const archiveError = 'This Pacing Revision Set belongs to a different issue.';
      if (surfaceError) setError(archiveError);
      return { ok: false, error: archiveError };
    }
    if (!['ready', 'partially_ready', 'applied', 'failed'].includes(setToArchive.status)) {
      const archiveError = 'This Pacing Revision Set cannot be archived in its current state.';
      if (surfaceError) setError(archiveError);
      return { ok: false, error: archiveError };
    }
    if (!setToArchive.updated_at) {
      const archiveError = 'This Pacing Revision Set is missing the version needed for a safe archive.';
      if (surfaceError) setError(archiveError);
      return { ok: false, error: archiveError };
    }
    const operationIssueId = setToArchive.issue_id;
    const operationIssueVersion = issueVersionRef.current;
    const result = await archiveWriterPacingRevisionSet({
      setId: setToArchive.id,
      expectedStatus: setToArchive.status as 'ready' | 'partially_ready' | 'applied' | 'failed',
      expectedUpdatedAt: setToArchive.updated_at,
    });
    if (
      !isCurrentOperation(operationIssueId, operationIssueVersion)
      || activeSetRef.current?.id !== setToArchive.id
    ) {
      return {
        ok: false,
        kind: 'operational',
        error: 'The selected issue changed before archive completed.',
      };
    }
    if (!result.ok) {
      if (surfaceError) setError(result.error);
      return result;
    }
    setError(null);
    setActiveSet((current) => current?.id === setToArchive.id ? null : current);
    setHistorySets((current) => [
      {
        ...setToArchive,
        status: 'archived',
        archived_from_status: setToArchive.status as
          'ready' | 'partially_ready' | 'applied' | 'failed',
        archived_at: new Date().toISOString(),
      },
      ...current.filter((set) => set.id !== setToArchive.id),
    ]);
    await Promise.all([refresh(), refreshHistory()]);
    return { ok: true };
  }, [isCurrentOperation, refresh, refreshHistory]);

  const hasPendingCandidates = useMemo(
    () => missingLayersByPage(activeSetForIssue).size > 0,
    [activeSetForIssue],
  );

  return {
    activeSet: activeSetForIssue,
    historySets: historySetsForIssue,
    selectedHistorySet: selectedHistorySetForIssue,
    loading,
    historyLoading,
    historyError,
    generating,
    error,
    create,
    refresh,
    refreshHistory,
    selectHistory: (set: PacingRevisionSet) => { setSelectedHistorySet(set); },
    closeHistory: () => { setSelectedHistorySet(null); },
    archiveActive,
    updateChange,
    discard,
    hasPendingCandidates,
    generatePages,
    retryFailed: (targets: PacingRevisionRetryTarget[]) => generatePages(targets),
    stopAfterCurrentPage: () => { stopRef.current = true; },
  };
}
