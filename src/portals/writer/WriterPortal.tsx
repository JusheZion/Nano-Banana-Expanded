import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  clearWriterPageBeats,
  clearWriterPageScript,
  createWriterIssue,
  createWriterPage,
  createWriterSeries,
  deleteLatestWriterOutline,
  ensureWriterPagesToCount,
  listWriterIssues,
  listWriterOutlinesForIssue,
  listWriterPages,
  listWriterSeries,
  listWriterShotPlansForIssue,
  updateWriterIssue,
  updateWriterSeries,
  type WriterIssueOutlineRow,
  type WriterIssueRow,
  type WriterPageRow,
  type WriterSeriesRow,
  type WriterVideoShotPlanRow,
} from '@/shared/api/arcsWriterRoom';
import { invokeWriterTools } from '@/shared/api/writerTools';
import { getSupabaseDiagnostic, isSupabaseConfigured } from '@/shared/lib/supabase';
import { useAuth } from '@/shared/context/AuthContext';
import { shotPlanJsonToCsv } from '@/portals/writer/shotPlanCsv';
import { WriterShotStoryboardStrip } from '@/portals/writer/WriterShotStoryboardStrip';
import { WriterContextMenu } from '@/portals/writer/WriterContextMenu';
import { WriterHighlightedText } from '@/portals/writer/WriterHighlightedText';
import { WriterHelpModal } from '@/portals/writer/WriterHelpModal';
import {
  WriterHelpCategoryBody,
  WriterSectionTip,
  WRITER_UI_TIPS,
  writerHelpCategoryTitle,
  type WriterHelpCategoryId,
} from '@/portals/writer/writerHelpRegistry';
import { WriterRibbon, type WriterRibbonMenuId } from '@/portals/writer/WriterRibbon';
import { WriterStudioDock, type WriterDockTabId } from '@/portals/writer/WriterStudioDock';
import { useWriterHotkeys } from '@/portals/writer/useWriterHotkeys';
import { getWriterQuickGenerateNextHint } from '@/portals/writer/writerNextStep';
import {
  countFindMatches,
  formatArcReviewPlainText,
  getWriterSearchableText,
  type WriterWorkspaceTabId,
  WRITER_WORKSPACE_TAB_LABELS,
  WRITER_WORKSPACE_TAB_ORDER,
} from '@/portals/writer/writerSearch';
import { Tooltip } from '@/shared/components/Tooltip';
import { useResponsiveLayout } from '@/shared/context/ResponsiveLayoutContext';
import {
  ACCENT_GOLD_GRADIENT,
  WRITERS_GOLD_SLANT,
  WRITERS_TIFFANY_TEXT,
  WRITERS_WORKSHOP_BG,
} from '@/shared/theme/Phase12DesignTokens';
import { WRITER_PAGE_BEATS_ISSUE_MAX } from '@/shared/writer/schemas';

const titleTextStyle: React.CSSProperties = {
  background: WRITERS_TIFFANY_TEXT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

/** Frosted panels — tiffany workspace shows through (parity with Character / Assets studios). */
const WRITER_GLASS_CARD =
  'rounded-2xl border border-white/35 bg-white/20 backdrop-blur-md shadow-lg shadow-teal-900/25';

const TABS: { id: WriterWorkspaceTabId; label: string }[] = WRITER_WORKSPACE_TAB_ORDER.map((id) => ({
  id,
  label: WRITER_WORKSPACE_TAB_LABELS[id].heading,
}));

function pageRowHasPanelBeats(p: WriterPageRow | null | undefined): boolean {
  const panels = (p?.beats_json as { panels?: unknown } | null)?.panels;
  return Array.isArray(panels) && panels.length > 0;
}

function readWriterToolCache(notes: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!notes) return undefined;
  const c = notes.writer_tool_cache;
  if (c && typeof c === 'object' && !Array.isArray(c)) return c as Record<string, unknown>;
  return undefined;
}

function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTextFile(filename: string, body: string, mime: string) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type WriterPortalProps = {
  /** Deep-link into Portals Wiki → Writers' Workshop (optional section id). */
  onRequestPortalsWiki?: (opts: { chapterId: string; headingId?: string }) => void;
};

export const WriterPortal: React.FC<WriterPortalProps> = ({ onRequestPortalsWiki }) => {
  const { isPhone } = useResponsiveLayout();
  const [seriesList, setSeriesList] = useState<WriterSeriesRow[]>([]);
  const [issues, setIssues] = useState<WriterIssueRow[]>([]);
  const [pages, setPages] = useState<WriterPageRow[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WriterWorkspaceTabId>('outline');
  const [activeRibbonMenu, setActiveRibbonMenu] = useState<WriterRibbonMenuId>('home');
  const [dockTab, setDockTab] = useState<WriterDockTabId>('library');
  const [dockCollapsed, setDockCollapsed] = useState(false);

  useEffect(() => {
    if (isPhone) setDockCollapsed(true);
  }, [isPhone]);
  const [helpCategory, setHelpCategory] = useState<WriterHelpCategoryId | null>(null);
  const { user: authUser, ready: authReady, openSignInModal } = useAuth();
  const [aiAuthBannerDismissed, setAiAuthBannerDismissed] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findActiveIndex, setFindActiveIndex] = useState(0);
  const [monospacePre, setMonospacePre] = useState(true);
  const [textScale, setTextScale] = useState<'sm' | 'md' | 'lg'>('sm');
  const findInputRef = useRef<HTMLInputElement>(null);
  const [outlines, setOutlines] = useState<WriterIssueOutlineRow[]>([]);
  const [targetPageCount, setTargetPageCount] = useState(22);
  const [outlineGenLoading, setOutlineGenLoading] = useState(false);
  const [outlineGenError, setOutlineGenError] = useState<string | null>(null);
  const [outlineDeleteBusy, setOutlineDeleteBusy] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [beatsLoading, setBeatsLoading] = useState(false);
  const [beatsError, setBeatsError] = useState<string | null>(null);
  const [beatsSkipExisting, setBeatsSkipExisting] = useState(true);
  const [beatsPickPageIds, setBeatsPickPageIds] = useState<string[]>([]);
  const [beatsBatchBusy, setBeatsBatchBusy] = useState(false);
  const [beatsBatchLabel, setBeatsBatchLabel] = useState('');
  const [beatsBatchSource, setBeatsBatchSource] = useState<'all' | 'picked' | null>(null);
  const beatsBatchAbortRef = useRef<AbortController | null>(null);
  const [syncPagesBusy, setSyncPagesBusy] = useState(false);
  const [syncPagesError, setSyncPagesError] = useState<string | null>(null);
  const [arcSelectedIssueIds, setArcSelectedIssueIds] = useState<string[]>([]);
  const [arcBatchBusy, setArcBatchBusy] = useState(false);
  const [arcBatchLabel, setArcBatchLabel] = useState('');
  const [arcBatchMode, setArcBatchMode] = useState<'pacing_review' | 'canon_check' | null>(null);
  const prevWorkspaceTabRef = useRef<WriterWorkspaceTabId>(activeTab);
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [dialogueError, setDialogueError] = useState<string | null>(null);
  const [clearPageFieldBusy, setClearPageFieldBusy] = useState<'beats' | 'script' | null>(null);
  const [dialogueStyle, setDialogueStyle] = useState<'comic_script' | 'screenplay_light'>('comic_script');
  const [shotPlans, setShotPlans] = useState<WriterVideoShotPlanRow[]>([]);
  const [shotsBrief, setShotsBrief] = useState('');
  const [pacingLoading, setPacingLoading] = useState(false);
  const [pacingError, setPacingError] = useState<string | null>(null);
  const [canonLoading, setCanonLoading] = useState(false);
  const [canonError, setCanonError] = useState<string | null>(null);
  const [shotsLoading, setShotsLoading] = useState(false);
  const [shotsError, setShotsError] = useState<string | null>(null);
  const [aiHistory, setAiHistory] = useState<string[]>([]);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [createSeriesBusy, setCreateSeriesBusy] = useState(false);
  const [createIssueBusy, setCreateIssueBusy] = useState(false);
  const [createPageBusy, setCreatePageBusy] = useState(false);
  const [createPageError, setCreatePageError] = useState<string | null>(null);
  const [issueTitleDraft, setIssueTitleDraft] = useState('');
  const [issueSynopsisDraft, setIssueSynopsisDraft] = useState('');
  const [seriesTitleDraft, setSeriesTitleDraft] = useState('');
  const [seriesLoglineDraft, setSeriesLoglineDraft] = useState('');
  const [contextSaveLoading, setContextSaveLoading] = useState(false);
  const [contextSaveError, setContextSaveError] = useState<string | null>(null);

  const pushHistory = (line: string) => {
    setAiHistory((h) => [`${new Date().toLocaleTimeString()} — ${line}`, ...h].slice(0, 24));
  };

  const toolErrorMessage = (res: { error: string; details?: string }) =>
    'details' in res && res.details ? `${res.error}: ${res.details}` : res.error;

  const refreshIssuesForSeries = useCallback(async () => {
    if (!selectedSeriesId) return;
    const rows = await listWriterIssues(selectedSeriesId);
    setIssues(rows);
  }, [selectedSeriesId]);

  const sortedIssuesForArc = useMemo(
    () => [...issues].sort((a, b) => a.issue_number - b.issue_number),
    [issues],
  );

  const arcBatchIssueIdsOrdered = useMemo(() => {
    const valid = new Set(issues.map((i) => i.id));
    const sel = new Set(arcSelectedIssueIds.filter((id) => valid.has(id)));
    return sortedIssuesForArc.filter((iss) => sel.has(iss.id)).map((iss) => iss.id);
  }, [issues, arcSelectedIssueIds, sortedIssuesForArc]);

  useEffect(() => {
    setArcSelectedIssueIds([]);
  }, [selectedSeriesId]);

  useEffect(() => {
    const prev = prevWorkspaceTabRef.current;
    prevWorkspaceTabRef.current = activeTab;
    if (activeTab !== 'arc' || prev === 'arc') return;
    if (!selectedIssueId) return;
    const valid = new Set(issues.map((i) => i.id));
    setArcSelectedIssueIds((cur) => {
      const kept = cur.filter((id) => valid.has(id));
      if (kept.length > 0) return kept;
      return valid.has(selectedIssueId) ? [selectedIssueId] : [];
    });
  }, [activeTab, selectedIssueId, issues]);

  const handleCreateSeries = useCallback(async () => {
    setBootstrapError(null);
    setCreateSeriesBusy(true);
    const row = await createWriterSeries();
    setCreateSeriesBusy(false);
    if (!row) {
      setBootstrapError(
        'Could not create a series. Confirm writer_series exists, RLS allows insert, and see the browser console.',
      );
      return;
    }
    const rows = await listWriterSeries();
    setSeriesList(rows);
    setSelectedSeriesId(row.id);
    setSelectedIssueId(null);
    setDockTab('library');
    pushHistory(`created series “${row.title || 'Untitled'}”`);
  }, []);

  useEffect(() => {
    if (authUser) setAiAuthBannerDismissed(false);
  }, [authUser]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await listWriterSeries();
      if (cancelled) return;
      setSeriesList(rows);
      setSelectedSeriesId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nextIssueNumber = useMemo(() => {
    if (issues.length === 0) return 1;
    return Math.max(...issues.map((i) => i.issue_number)) + 1;
  }, [issues]);

  const handleAddWriterIssue = useCallback(async () => {
    if (!selectedSeriesId) return;
    setBootstrapError(null);
    setCreateIssueBusy(true);
    const row = await createWriterIssue({
      series_id: selectedSeriesId,
      issue_number: nextIssueNumber,
    });
    setCreateIssueBusy(false);
    if (!row) {
      setBootstrapError(
        'Could not create an issue. Confirm writer_issues exists and issue_number is unique.',
      );
      return;
    }
    await refreshIssuesForSeries();
    setSelectedIssueId(row.id);
    setDockTab('library');
    setDockCollapsed(false);
    pushHistory(`created issue #${row.issue_number}`);
  }, [selectedSeriesId, nextIssueNumber, refreshIssuesForSeries]);

  useEffect(() => {
    if (!selectedSeriesId) {
      setIssues([]);
      setSelectedIssueId(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const rows = await listWriterIssues(selectedSeriesId);
      if (cancelled) return;
      setIssues(rows);
      setSelectedIssueId(rows[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSeriesId]);

  useEffect(() => {
    if (!selectedIssueId) {
      setPages([]);
      setOutlines([]);
      setShotPlans([]);
      setSelectedPageId(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [pageRows, outlineRows, planRows] = await Promise.all([
        listWriterPages(selectedIssueId),
        listWriterOutlinesForIssue(selectedIssueId),
        listWriterShotPlansForIssue(selectedIssueId),
      ]);
      if (cancelled) return;
      setPages(pageRows);
      setOutlines(outlineRows);
      setShotPlans(planRows);
      setSelectedPageId((prev) => {
        if (prev && pageRows.some((p) => p.id === prev)) return prev;
        return pageRows[0]?.id ?? null;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedIssueId]);

  useEffect(() => {
    setBeatsPickPageIds([]);
  }, [selectedIssueId]);

  useEffect(() => {
    const valid = new Set(pages.map((p) => p.id));
    setBeatsPickPageIds((cur) => cur.filter((id) => valid.has(id)));
  }, [pages]);

  useEffect(() => {
    setCreatePageError(null);
  }, [selectedIssueId]);

  useEffect(() => {
    const row = issues.find((x) => x.id === selectedIssueId);
    if (row) {
      setIssueTitleDraft(row.title ?? '');
      setIssueSynopsisDraft(row.synopsis ?? '');
    } else {
      setIssueTitleDraft('');
      setIssueSynopsisDraft('');
    }
  }, [selectedIssueId, issues]);

  useEffect(() => {
    const s = seriesList.find((x) => x.id === selectedSeriesId);
    setSeriesTitleDraft(s?.title ?? '');
    setSeriesLoglineDraft(s?.logline ?? '');
  }, [selectedSeriesId, seriesList]);

  const latestOutline = outlines[0];
  const latestShotPlan = shotPlans[0];
  const selectedIssue = issues.find((i) => i.id === selectedIssueId) ?? null;
  const toolCache = readWriterToolCache(selectedIssue?.notes);
  const pacingSaved = toolCache?.pacing_review as { at?: string; result?: unknown } | undefined;
  const canonSaved = toolCache?.canon_check as { at?: string; result?: unknown } | undefined;
  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;

  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => a.page_number - b.page_number),
    [pages],
  );

  const beatsPickOrdered = useMemo(() => {
    const sel = new Set(beatsPickPageIds);
    return sortedPages.filter((p) => sel.has(p.id)).map((p) => p.id);
  }, [sortedPages, beatsPickPageIds]);

  const pagesWithBeatsCount = useMemo(
    () => sortedPages.filter((p) => pageRowHasPanelBeats(p)).length,
    [sortedPages],
  );
  const pagesWithScriptCount = useMemo(
    () => sortedPages.filter((p) => (p.script_text ?? '').trim().length > 0).length,
    [sortedPages],
  );

  const nextStepCtx = useMemo(
    () => ({
      hasSeries: Boolean(selectedSeriesId),
      hasIssue: Boolean(selectedIssueId),
      hasOutline: Boolean(latestOutline),
      pageCount: sortedPages.length,
      targetPageCount,
      pagesWithBeats: pagesWithBeatsCount,
      pagesWithScript: pagesWithScriptCount,
    }),
    [
      selectedSeriesId,
      selectedIssueId,
      latestOutline,
      sortedPages.length,
      targetPageCount,
      pagesWithBeatsCount,
      pagesWithScriptCount,
    ],
  );

  const quickGenerateNextHint = useMemo(
    () => getWriterQuickGenerateNextHint(activeTab, nextStepCtx),
    [activeTab, nextStepCtx],
  );

  const nextPageNumber = useMemo(() => {
    if (sortedPages.length === 0) return 1;
    return Math.max(...sortedPages.map((p) => p.page_number)) + 1;
  }, [sortedPages]);

  const searchableCtx = useMemo(
    () => ({
      activeTab,
      latestOutlineJson: latestOutline?.outline_json ?? null,
      latestShotPlanJson: latestShotPlan?.shot_plan_json ?? null,
      selectedPageBeats: selectedPage?.beats_json ?? null,
      scriptText: selectedPage?.script_text ?? null,
      pacingReview: pacingSaved,
      canonCheck: canonSaved,
    }),
    [activeTab, latestOutline, latestShotPlan, selectedPage, pacingSaved, canonSaved],
  );

  const searchableText = useMemo(() => getWriterSearchableText(searchableCtx), [searchableCtx]);
  const findMatchCount = useMemo(
    () => countFindMatches(searchableText, findQuery),
    [searchableText, findQuery],
  );

  useEffect(() => {
    setFindActiveIndex(0);
  }, [findQuery]);

  useEffect(() => {
    if (findMatchCount === 0) setFindActiveIndex(0);
    else setFindActiveIndex((i) => Math.min(i, findMatchCount - 1));
  }, [findMatchCount]);

  const textScaleClass =
    textScale === 'sm' ? 'text-xs' : textScale === 'md' ? 'text-sm' : 'text-base';
  const preFont = monospacePre ? 'font-mono' : 'font-sans';

  const supabaseOk = isSupabaseConfigured();
  const supabaseDiag = getSupabaseDiagnostic();

  const seriesLibraryTooltip = useMemo(() => {
    if (!supabaseOk) return WRITER_UI_TIPS.seriesSupabase;
    if (seriesList.length === 0) return WRITER_UI_TIPS.seriesEmpty;
    return WRITER_UI_TIPS.seriesLibrary;
  }, [supabaseOk, seriesList.length]);

  const pageIndex = sortedPages.findIndex((p) => p.id === selectedPageId);
  const hasPrevPage = pageIndex > 0;
  const hasNextPage = pageIndex >= 0 && pageIndex < sortedPages.length - 1;

  const copyVisibleText = useCallback(() => {
    if (!searchableText) return;
    void navigator.clipboard.writeText(searchableText);
  }, [searchableText]);

  const onFindNext = useCallback(() => {
    if (findMatchCount <= 0) return;
    setFindActiveIndex((i) => (i + 1) % findMatchCount);
  }, [findMatchCount]);

  const onFindPrev = useCallback(() => {
    if (findMatchCount <= 0) return;
    setFindActiveIndex((i) => (i - 1 + findMatchCount) % findMatchCount);
  }, [findMatchCount]);

  const onPrevPage = useCallback(() => {
    if (!hasPrevPage) return;
    setSelectedPageId(sortedPages[pageIndex - 1]!.id);
  }, [hasPrevPage, pageIndex, sortedPages]);

  const onNextPage = useCallback(() => {
    if (!hasNextPage) return;
    setSelectedPageId(sortedPages[pageIndex + 1]!.id);
  }, [hasNextPage, pageIndex, sortedPages]);

  const runPacingFromRibbon = useCallback(async () => {
    if (!selectedIssueId) return;
    setPacingError(null);
    setPacingLoading(true);
    const res = await invokeWriterTools({ mode: 'pacing_review', issue_id: selectedIssueId });
    setPacingLoading(false);
    if (res.success) {
      pushHistory('pacing review saved');
      await refreshIssuesForSeries();
    } else {
      const msg = toolErrorMessage(res);
      setPacingError(msg);
      pushHistory(`error: ${msg}`);
    }
  }, [selectedIssueId, refreshIssuesForSeries]);

  const runCanonFromRibbon = useCallback(async () => {
    if (!selectedIssueId) return;
    setCanonError(null);
    setCanonLoading(true);
    const res = await invokeWriterTools({ mode: 'canon_check', issue_id: selectedIssueId });
    setCanonLoading(false);
    if (res.success) {
      pushHistory('canon check saved');
      await refreshIssuesForSeries();
    } else {
      const msg = toolErrorMessage(res);
      setCanonError(msg);
      pushHistory(`error: ${msg}`);
    }
  }, [selectedIssueId, refreshIssuesForSeries]);

  const runArcToolBatch = useCallback(
    async (mode: 'pacing_review' | 'canon_check') => {
      if (arcBatchIssueIdsOrdered.length === 0 || !supabaseOk) return;
      setPacingError(null);
      setCanonError(null);
      setArcBatchBusy(true);
      setArcBatchMode(mode);
      try {
        for (let i = 0; i < arcBatchIssueIdsOrdered.length; i++) {
          setArcBatchLabel(`${i + 1}/${arcBatchIssueIdsOrdered.length}`);
          const id = arcBatchIssueIdsOrdered[i]!;
          const res = await invokeWriterTools({ mode, issue_id: id });
          if (!res.success) {
            const msg = toolErrorMessage(res);
            if (mode === 'pacing_review') setPacingError(msg);
            else setCanonError(msg);
            pushHistory(`error: ${mode} batch — ${msg}`);
            return;
          }
          const iss = sortedIssuesForArc.find((x) => x.id === id);
          pushHistory(
            `${mode === 'pacing_review' ? 'pacing review' : 'canon check'} saved — issue #${iss?.issue_number ?? '?'}`,
          );
        }
        await refreshIssuesForSeries();
        pushHistory(
          `${mode === 'pacing_review' ? 'Pacing' : 'Canon'} batch complete (${arcBatchIssueIdsOrdered.length} issue(s))`,
        );
      } finally {
        setArcBatchBusy(false);
        setArcBatchLabel('');
        setArcBatchMode(null);
      }
    },
    [arcBatchIssueIdsOrdered, supabaseOk, sortedIssuesForArc, refreshIssuesForSeries],
  );

  const runOutlineGenerate = useCallback(async () => {
    if (!selectedIssueId) return;
    setOutlineGenError(null);
    setOutlineGenLoading(true);
    const res = await invokeWriterTools({
      mode: 'outline_issue',
      issue_id: selectedIssueId,
      target_page_count: targetPageCount,
    });
    setOutlineGenLoading(false);
    if (res.success) {
      pushHistory(`outline v${res.version ?? '?'} saved`);
      const rows = await listWriterOutlinesForIssue(selectedIssueId);
      setOutlines(rows);
    } else {
      const msg = toolErrorMessage(res);
      setOutlineGenError(msg);
      pushHistory(`error: ${msg}`);
    }
  }, [selectedIssueId, targetPageCount]);

  const runSyncPagesToTarget = useCallback(async () => {
    if (!selectedIssueId) return;
    setSyncPagesError(null);
    setSyncPagesBusy(true);
    const r = await ensureWriterPagesToCount(selectedIssueId, targetPageCount);
    const pageRows = await listWriterPages(selectedIssueId);
    setPages(pageRows);
    setSyncPagesBusy(false);
    if (!r.ok) {
      setSyncPagesError('Could not create all page rows. Check Supabase and try again.');
      pushHistory('error: sync pages');
      return;
    }
    pushHistory(
      r.created > 0 ? `synced pages (+${r.created} new, ${pageRows.length} total)` : 'pages already match target',
    );
  }, [selectedIssueId, targetPageCount]);

  const runBatchPageBeats = useCallback(async () => {
    if (!selectedIssueId) return;
    beatsBatchAbortRef.current = new AbortController();
    setBeatsBatchBusy(true);
    setBeatsBatchSource('all');
    setBeatsError(null);
    setBeatsBatchLabel('Running…');
    try {
      let round = 0;
      for (;;) {
        if (beatsBatchAbortRef.current?.signal.aborted) {
          pushHistory('batch beats cancelled');
          break;
        }
        const res = await invokeWriterTools({
          mode: 'page_beats_issue',
          issue_id: selectedIssueId,
          skip_existing: beatsSkipExisting,
          batch_limit: WRITER_PAGE_BEATS_ISSUE_MAX,
        });
        if (!res.success) {
          setBeatsError(toolErrorMessage(res));
          pushHistory('error: batch beats');
          break;
        }
        const data = res.data as {
          processed?: number[];
          errors?: { page_number: number; message: string }[];
          has_more?: boolean;
        };
        round += 1;
        const processed = data.processed ?? [];
        const errs = data.errors ?? [];
        setBeatsBatchLabel(
          `Round ${round}: ok ${processed.length}${errs.length ? ` · errors ${errs.length}` : ''}`,
        );
        const pageRows = await listWriterPages(selectedIssueId);
        setPages(pageRows);
        if (!data.has_more) {
          pushHistory(`batch beats finished (${round} round(s))`);
          break;
        }
      }
    } finally {
      setBeatsBatchBusy(false);
      setBeatsBatchLabel('');
      setBeatsBatchSource(null);
      beatsBatchAbortRef.current = null;
    }
  }, [selectedIssueId, beatsSkipExisting]);

  const runSelectedBatchPageBeats = useCallback(async () => {
    if (!selectedIssueId || beatsPickOrdered.length === 0) return;
    setBeatsBatchBusy(true);
    setBeatsBatchSource('picked');
    setBeatsError(null);
    setBeatsBatchLabel('Selected…');
    try {
      const res = await invokeWriterTools({
        mode: 'page_beats_issue',
        issue_id: selectedIssueId,
        page_ids: beatsPickOrdered,
        skip_existing: beatsSkipExisting,
      });
      if (!res.success) {
        setBeatsError(toolErrorMessage(res));
        pushHistory('error: batch beats (selected pages)');
        return;
      }
      const data = res.data as {
        processed?: number[];
        errors?: { page_number: number; message: string }[];
      };
      const processed = data.processed ?? [];
      const errs = data.errors ?? [];
      setBeatsBatchLabel(
        `Done: ok ${processed.length}${errs.length ? ` · errors ${errs.length}` : ''}`,
      );
      const pageRows = await listWriterPages(selectedIssueId);
      setPages(pageRows);
      pushHistory(`batch beats (selected): ${processed.length} page(s)`);
    } finally {
      setBeatsBatchBusy(false);
      setBeatsBatchLabel('');
      setBeatsBatchSource(null);
    }
  }, [selectedIssueId, beatsPickOrdered, beatsSkipExisting]);

  const quickGenerate = useCallback(async () => {
    if (activeTab === 'outline' && selectedIssueId) {
      await runOutlineGenerate();
      return;
    }
    if (activeTab === 'beats' && selectedPageId && selectedIssueId) {
      setBeatsError(null);
      setBeatsLoading(true);
      const res = await invokeWriterTools({ mode: 'page_beats', page_id: selectedPageId });
      setBeatsLoading(false);
      if (res.success) {
        pushHistory('page beats saved (page)');
        const pageRows = await listWriterPages(selectedIssueId);
        setPages(pageRows);
      } else {
        const msg = toolErrorMessage(res);
        setBeatsError(msg);
        pushHistory(`error: ${msg}`);
      }
      return;
    }
    if (activeTab === 'dialogue' && selectedPageId && selectedIssueId) {
      setDialogueError(null);
      setDialogueLoading(true);
      const res = await invokeWriterTools({
        mode: 'draft_dialogue',
        page_id: selectedPageId,
        style: dialogueStyle,
      });
      setDialogueLoading(false);
      if (res.success) {
        pushHistory('dialogue draft saved');
        const pageRows = await listWriterPages(selectedIssueId);
        setPages(pageRows);
      } else {
        const msg = toolErrorMessage(res);
        setDialogueError(msg);
        pushHistory(`error: ${msg}`);
      }
      return;
    }
    if (activeTab === 'video' && selectedIssueId) {
      setShotsError(null);
      setShotsLoading(true);
      const res = await invokeWriterTools({
        mode: 'plan_shots_from_issue',
        issue_id: selectedIssueId,
        creative_brief: shotsBrief.trim() || undefined,
      });
      setShotsLoading(false);
      if (res.success) {
        pushHistory(`shot plan v${res.version ?? '?'} saved`);
        const rows = await listWriterShotPlansForIssue(selectedIssueId);
        setShotPlans(rows);
      } else {
        const msg = toolErrorMessage(res);
        setShotsError(msg);
        pushHistory(`error: ${msg}`);
      }
      return;
    }
    if (activeTab === 'arc' && selectedIssueId) {
      await runPacingFromRibbon();
    }
  }, [
    activeTab,
    selectedIssueId,
    selectedPageId,
    dialogueStyle,
    shotsBrief,
    runPacingFromRibbon,
    runOutlineGenerate,
  ]);

  const quickGenerateLabel =
    activeTab === 'arc'
      ? 'Run pacing review'
      : activeTab === 'outline'
        ? 'Generate outline'
        : activeTab === 'beats'
          ? 'Generate page beats'
          : activeTab === 'dialogue'
            ? 'Draft dialogue'
            : 'Generate shot plan';

  const quickGenerateLoading =
    outlineGenLoading ||
    beatsLoading ||
    dialogueLoading ||
    shotsLoading ||
    (activeTab === 'arc' && (pacingLoading || arcBatchBusy)) ||
    (activeTab === 'beats' && beatsBatchBusy);

  const quickGenerateDisabled =
    !supabaseOk ||
    !selectedIssueId ||
    (activeTab === 'beats' && (!selectedPageId || beatsBatchBusy)) ||
    (activeTab === 'dialogue' && !selectedPageId) ||
    (activeTab === 'arc' && arcBatchBusy);

  useWriterHotkeys({
    onWorkspaceTab: setActiveTab,
    onFocusFind: () => findInputRef.current?.focus(),
    onClearFind: () => {
      setFindQuery('');
      setFindActiveIndex(0);
    },
    onToggleDock: () => setDockCollapsed((c) => !c),
    dockEnabled: true,
  });

  const outlineJsonString = latestOutline
    ? JSON.stringify(latestOutline.outline_json, null, 2)
    : '';
  const beatsJsonString = selectedPage?.beats_json
    ? JSON.stringify(selectedPage.beats_json, null, 2)
    : '';
  const shotPlanJsonString = latestShotPlan
    ? JSON.stringify(latestShotPlan.shot_plan_json, null, 2)
    : '';
  const arcReviewPlain = useMemo(
    () => formatArcReviewPlainText(pacingSaved, canonSaved),
    [pacingSaved, canonSaved],
  );

  const libraryPanel = (
    <div className="flex flex-col gap-3 min-h-0 text-black/80">
      <div className="rounded-xl border border-white/30 bg-white/15 backdrop-blur-md p-2 shadow-md shadow-teal-900/10">
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-black/55">Series</p>
          <Tooltip content={seriesLibraryTooltip} side="left">
            <button
              type="button"
              className="rounded p-0.5 text-black/45 hover:text-black/75 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
              aria-label="About series and Supabase"
            >
              <HelpCircle size={13} aria-hidden />
            </button>
          </Tooltip>
        </div>
        {bootstrapError && supabaseOk && (
          <p className="text-[11px] text-red-800 bg-red-100/80 rounded-lg px-2 py-1.5 mb-2">{bootstrapError}</p>
        )}
        {supabaseOk && seriesList.length > 0 ? (
          <div className="mb-1.5 px-0.5">
            <button
              type="button"
              disabled={createSeriesBusy}
              onClick={() => void handleCreateSeries()}
              className="w-full rounded-lg px-2 py-1.5 text-[10px] font-bold text-black/85 border border-black/15 bg-white/45 hover:bg-white/70 shadow-sm disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
            >
              {createSeriesBusy ? 'Creating…' : '+ Add series'}
            </button>
          </div>
        ) : null}
        <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
          {seriesList.length === 0 && supabaseOk && (
            <div className="px-1 space-y-2">
              <button
                type="button"
                disabled={createSeriesBusy}
                onClick={() => void handleCreateSeries()}
                className="w-full rounded-lg px-3 py-2 text-[11px] font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                style={{ background: ACCENT_GOLD_GRADIENT }}
              >
                {createSeriesBusy ? 'Creating…' : 'Create first series'}
              </button>
            </div>
          )}
          {seriesList.map((s) => (
            <Tooltip key={s.id} content="Switch series" side="left">
              <button
                type="button"
                onClick={() => {
                  if (selectedSeriesId === s.id) return;
                  setSelectedSeriesId(s.id);
                  setSelectedIssueId(null);
                }}
                className={`w-full text-left rounded-lg px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                  selectedSeriesId === s.id
                    ? 'bg-black/15 text-black ring-1 ring-black/20'
                    : 'text-black/70 hover:bg-black/10'
                }`}
              >
                {s.title || 'Untitled series'}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-white/30 bg-white/15 backdrop-blur-md p-2 flex flex-col min-h-0 flex-1 shadow-md shadow-teal-900/10">
        <div className="flex items-center gap-1 mb-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-black/55">Issues</p>
          <Tooltip content={WRITER_UI_TIPS.issuesStoryContext} side="left">
            <button
              type="button"
              className="rounded p-0.5 text-black/45 hover:text-black/75 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
              aria-label="About issues and story context"
            >
              <HelpCircle size={13} aria-hidden />
            </button>
          </Tooltip>
        </div>
        {selectedSeriesId && supabaseOk ? (
          <div className="mb-1.5 space-y-1">
            <button
              type="button"
              disabled={createIssueBusy}
              onClick={() => void handleAddWriterIssue()}
              className="w-full rounded-lg px-2 py-1.5 text-[11px] font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
              style={{ background: ACCENT_GOLD_GRADIENT }}
            >
              {createIssueBusy ? 'Creating…' : `Add issue #${nextIssueNumber}`}
            </button>
            {issues.length === 0 ? (
              <p className="text-[10px] text-black/55 leading-snug px-0.5">
                No issues yet. Add one above for each comic issue you want in this series.
              </p>
            ) : null}
          </div>
        ) : !selectedSeriesId && supabaseOk ? (
          <p className="text-[10px] text-black/45 mb-1.5 leading-snug">Select a series to add issues.</p>
        ) : null}
        <div className="flex-1 min-h-[80px] max-h-40 overflow-y-auto custom-scrollbar space-y-1">
          {issues.map((i) => (
            <Tooltip key={i.id} content={`Open issue #${i.issue_number}`} side="left">
              <button
                type="button"
                onClick={() => setSelectedIssueId(i.id)}
                className={`w-full text-left rounded-lg px-2 py-1 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                  selectedIssueId === i.id
                    ? 'bg-black/15 text-black ring-1 ring-black/20'
                    : 'text-black/65 hover:bg-black/10'
                }`}
              >
                #{i.issue_number}
                {i.title ? ` — ${i.title}` : ''}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-white/30 bg-white/15 backdrop-blur-md p-2 flex flex-col min-h-0 shadow-md shadow-teal-900/10">
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-black/55">Pages</p>
          <WriterSectionTip tipKey="pagesLibrary" label="About pages and beats" />
        </div>
        {supabaseOk && selectedIssueId ? (
          <div className="mb-1.5 space-y-1">
            <button
              type="button"
              disabled={createPageBusy || nextPageNumber > 500}
              onClick={async () => {
                if (!selectedIssueId) return;
                setCreatePageError(null);
                setCreatePageBusy(true);
                const row = await createWriterPage({
                  issue_id: selectedIssueId,
                  page_number: nextPageNumber,
                });
                setCreatePageBusy(false);
                if (row) {
                  const pageRows = await listWriterPages(selectedIssueId);
                  setPages(pageRows);
                  setSelectedPageId(row.id);
                  pushHistory(`added page ${row.page_number}`);
                } else {
                  const msg =
                    'Could not add page (duplicate number or network). Try again or refresh the list.';
                  setCreatePageError(msg);
                  pushHistory(`error: add page`);
                }
              }}
              className="w-full rounded-lg px-2 py-1.5 text-[11px] font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
              style={{ background: ACCENT_GOLD_GRADIENT }}
            >
              {createPageBusy ? 'Adding…' : `Add page ${nextPageNumber}`}
            </button>
            {createPageError ? (
              <p className="text-[10px] text-red-800 leading-snug px-0.5">{createPageError}</p>
            ) : null}
          </div>
        ) : supabaseOk ? (
          <p className="text-[10px] text-black/45 mb-1.5 leading-snug">Select an issue to add pages.</p>
        ) : null}
        <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1">
          {sortedPages.map((p) => (
            <Tooltip key={p.id} content={`Page ${p.page_number}`} side="left">
              <button
                type="button"
                onClick={() => setSelectedPageId(p.id)}
                className={`w-full text-left rounded-lg px-2 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                  selectedPageId === p.id
                    ? 'bg-black/15 text-black ring-1 ring-black/20'
                    : 'text-black/65 hover:bg-black/10 bg-white/40'
                }`}
              >
                Page {p.page_number}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );

  const activityPanel = (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">AI activity</p>
        <WriterSectionTip tipKey="activityPanel" label="About activity log" />
      </div>
      {aiHistory.length === 0 ? (
        <p className="text-[10px] text-black/45">No runs yet.</p>
      ) : (
        aiHistory.map((line, i) => (
          <p
            key={`${i}-${line.slice(0, 24)}`}
            className="text-[11px] text-black/75 leading-snug border-b border-black/5 pb-2"
          >
            {line}
          </p>
        ))
      )}
    </div>
  );

  const helpPanel = (
    <div className="space-y-3 text-[11px] text-black/75 leading-relaxed">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">Shortcuts</p>
        <WriterSectionTip tipKey="dockShortcutsBlurb" label="Keyboard shortcuts summary" />
      </div>
      <p className="text-[10px] text-black/50 leading-snug">
        Full workflow guides live under <strong className="text-black/70">Help</strong> in the top ribbon.
      </p>
    </div>
  );

  const contextItems = [
    {
      label: 'Copy visible text',
      onClick: () => void copyVisibleText(),
      disabled: !searchableText,
    },
    {
      label: 'Copy outline JSON',
      onClick: () => {
        if (!latestOutline) return;
        void navigator.clipboard.writeText(JSON.stringify(latestOutline.outline_json, null, 2));
      },
      disabled: !latestOutline,
    },
    {
      label: 'Download issue pack',
      onClick: () => {
        downloadJsonFile('writer-issue-pack.json', {
          issue_id: selectedIssueId,
          exported_at: new Date().toISOString(),
          outline: latestOutline?.outline_json ?? null,
          shot_plan: latestShotPlan?.shot_plan_json ?? null,
          pages: pages.map((p) => ({
            page_number: p.page_number,
            beats_json: p.beats_json,
            script_preview: (p.script_text ?? '').slice(0, 2000),
          })),
        });
      },
      disabled: !latestOutline && !latestShotPlan && pages.length === 0,
    },
  ];

  const preShell = `${textScaleClass} leading-relaxed whitespace-pre-wrap break-words rounded-xl bg-black/15 border border-white/25 backdrop-blur-sm p-3 overflow-y-auto min-h-0 custom-scrollbar`;

  return (
    <div
      className="flex-1 min-h-0 flex flex-col text-sm overflow-hidden"
      style={{ background: WRITERS_WORKSHOP_BG }}
    >
      <header
        className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-2 border-b border-black/10"
        style={{ background: WRITERS_GOLD_SLANT }}
      >
        <div className="min-w-0 flex items-baseline gap-3">
          <h1 className="text-lg font-black tracking-tight truncate" style={titleTextStyle}>
            WRITERS&apos; WORKSHOP
          </h1>
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/50 hidden sm:inline">
            Series → Issues → Pages
          </span>
        </div>
      </header>

      {supabaseOk && authReady && !authUser && !aiAuthBannerDismissed ? (
        <div
          className="flex-shrink-0 flex items-start gap-2 px-4 py-2 border-b border-amber-300/60 bg-amber-100/95 text-[11px] text-amber-950"
          role="status"
        >
          <p className="flex-1 min-w-0 leading-snug">
            <span className="font-bold">Sign in for AI tools.</span> Writer-tools expects a logged-in Supabase user (JWT).
            Use the sidebar account control or{' '}
            <button
              type="button"
              className="font-bold underline underline-offset-2 hover:text-black"
              onClick={() => openSignInModal()}
            >
              Sign in here
            </button>
            .{' '}
            <button
              type="button"
              className="font-bold underline underline-offset-2 hover:text-black"
              onClick={() => setHelpCategory('setup')}
            >
              Help → Setup
            </button>
            .
          </p>
          <button
            type="button"
            className="shrink-0 rounded-md px-2 py-0.5 text-sm font-bold leading-none text-amber-900 hover:bg-amber-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
            aria-label="Dismiss sign-in reminder"
            onClick={() => setAiAuthBannerDismissed(true)}
          >
            ×
          </button>
        </div>
      ) : null}

      <WriterRibbon
        activeMenu={activeRibbonMenu}
        onActiveMenu={setActiveRibbonMenu}
        workspaceTab={activeTab}
        onWorkspaceTab={setActiveTab}
        findQuery={findQuery}
        onFindQuery={setFindQuery}
        findInputRef={findInputRef}
        findMatchCount={findMatchCount}
        findActiveIndex={findActiveIndex}
        onFindNext={onFindNext}
        onFindPrev={onFindPrev}
        monospacePre={monospacePre}
        onToggleMonospace={() => setMonospacePre((m) => !m)}
        textScale={textScale}
        onTextScale={setTextScale}
        dockOpen={!dockCollapsed}
        onToggleDock={() => setDockCollapsed((c) => !c)}
        onCopyVisibleText={copyVisibleText}
        canCopyVisible={searchableText.length > 0}
        onRunPacing={runPacingFromRibbon}
        onRunCanon={runCanonFromRibbon}
        canRunReview={Boolean(supabaseOk && selectedIssueId)}
        pacingLoading={pacingLoading || arcBatchBusy}
        canonLoading={canonLoading || arcBatchBusy}
        onQuickGenerate={() => void quickGenerate()}
        quickGenerateLabel={quickGenerateLabel}
        quickGenerateDisabled={quickGenerateDisabled}
        quickGenerateLoading={quickGenerateLoading}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        onOpenHelpCategory={(id) => setHelpCategory(id)}
        quickGenerateNextHint={quickGenerateNextHint}
      />

      <div
        className="flex-shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 border-b border-white/20 bg-teal-950/15 text-[10px] text-black/80"
        aria-label="Workflow steps"
      >
        <span className="font-bold uppercase tracking-wider text-black/50 shrink-0">Pipeline</span>
        {WRITER_WORKSPACE_TAB_ORDER.map((id) => {
          const done =
            id === 'outline'
              ? Boolean(latestOutline)
              : id === 'beats'
                ? sortedPages.length > 0 && pagesWithBeatsCount >= sortedPages.length
                : id === 'dialogue'
                  ? sortedPages.length > 0 && pagesWithScriptCount >= pagesWithBeatsCount && pagesWithBeatsCount > 0
                  : id === 'video'
                    ? Boolean(latestShotPlan)
                    : id === 'arc'
                      ? Boolean(pacingSaved?.result ?? canonSaved?.result)
                      : false;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`rounded-full px-2.5 py-1 font-bold uppercase tracking-wide border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                activeTab === id
                  ? 'border-amber-700 bg-amber-100 text-black'
                  : done
                    ? 'border-emerald-600/50 bg-emerald-100/60 text-black/80'
                    : 'border-black/15 bg-white/50 text-black/65 hover:bg-white/80'
              }`}
            >
              {WRITER_WORKSPACE_TAB_LABELS[id].ribbon}
            </button>
          );
        })}
        <span className="text-black/45 ml-auto max-w-[min(100%,280px)] leading-snug hidden sm:inline">
          {quickGenerateNextHint}
        </span>
      </div>

      <WriterHelpModal
        open={Boolean(helpCategory)}
        title={helpCategory ? writerHelpCategoryTitle(helpCategory) : 'Help'}
        onClose={() => setHelpCategory(null)}
      >
        {helpCategory ? (
          <WriterHelpCategoryBody
            category={helpCategory}
            supabaseDiag={supabaseDiag}
            onOpenPortalsWiki={
              onRequestPortalsWiki
                ? (headingId) => onRequestPortalsWiki({ chapterId: 'writer', headingId })
                : undefined
            }
          />
        ) : null}
      </WriterHelpModal>

      <div
        className={`flex-1 min-h-0 flex min-w-0 ${isPhone ? 'flex-col' : 'flex-row'}`}
      >
        <WriterContextMenu items={contextItems}>
          <section className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
            <div
              className={`flex-1 min-h-0 overflow-y-scroll overscroll-y-contain scrollbar-gutter-stable custom-scrollbar min-w-0 ${
                isPhone ? 'p-3 pb-28' : 'p-4 pb-10'
              }`}
            >
              <div className="w-full min-w-0 space-y-4 text-slate-900/90">
                <div className={`${WRITER_GLASS_CARD} p-4`}>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    {TABS.find((x) => x.id === activeTab)?.label}
                  </h2>
                </div>
                {activeTab === 'outline' && (
                  <div className="flex min-w-0 flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(300px,40%)] xl:items-start xl:gap-4">
                    <div className="min-w-0 space-y-4">
                    {!supabaseOk ? (
                      <div
                        className={`${WRITER_GLASS_CARD} p-4 space-y-2 border-amber-400/40 bg-amber-50/30`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900/80">Story context</p>
                          <Tooltip content={WRITER_UI_TIPS.storyContextSupabase} side="left">
                            <button
                              type="button"
                              className="rounded-md p-1 text-amber-900/80 hover:bg-amber-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                              aria-label="How to configure Supabase"
                            >
                              <HelpCircle size={15} aria-hidden />
                            </button>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-amber-950/90 leading-snug">
                          Add Supabase env vars and restart the dev server to enable fields below.
                        </p>
                      </div>
                    ) : (
                      <div className={`${WRITER_GLASS_CARD} p-4 space-y-3`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/55">
                            Story context → database fields
                          </p>
                          {dockCollapsed ? (
                            <Tooltip content={WRITER_UI_TIPS.dockLibraryHidden} side="left">
                              <button
                                type="button"
                                className="inline-flex items-center rounded-md p-1 text-amber-900/90 bg-amber-100/80 border border-amber-200/80 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                                aria-label="Library panel is hidden"
                              >
                                <HelpCircle size={14} aria-hidden />
                              </button>
                            </Tooltip>
                          ) : null}
                        </div>
                        <label className="flex flex-col gap-1 text-[11px] font-semibold text-black/70" htmlFor="writer-series-title">
                          Series title
                          <input
                            id="writer-series-title"
                            name="writer-series-title"
                            type="text"
                            value={seriesTitleDraft}
                            onChange={(e) => setSeriesTitleDraft(e.target.value)}
                            disabled={!selectedSeriesId}
                            className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder={
                              selectedSeriesId ? 'e.g. Midnight Archives' : 'Select a series in Library…'
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[11px] font-semibold text-black/70" htmlFor="writer-issue-title">
                          Issue title
                          <input
                            id="writer-issue-title"
                            name="writer-issue-title"
                            type="text"
                            value={issueTitleDraft}
                            onChange={(e) => setIssueTitleDraft(e.target.value)}
                            disabled={!selectedIssueId}
                            className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder={
                              selectedIssueId ? 'e.g. The door in the cellar' : 'Select an issue in Library to edit…'
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[11px] font-semibold text-black/70" htmlFor="writer-issue-synopsis">
                          Issue synopsis
                          <textarea
                            id="writer-issue-synopsis"
                            name="writer-issue-synopsis"
                            value={issueSynopsisDraft}
                            onChange={(e) => setIssueSynopsisDraft(e.target.value)}
                            rows={5}
                            disabled={!selectedIssueId}
                            className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y min-h-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder={
                              selectedIssueId
                                ? 'What happens in this issue — beats, twists, character goals…'
                                : 'Select an issue in Library to edit…'
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[11px] font-semibold text-black/70" htmlFor="writer-series-logline">
                          Series logline
                          <textarea
                            id="writer-series-logline"
                            name="writer-series-logline"
                            value={seriesLoglineDraft}
                            onChange={(e) => setSeriesLoglineDraft(e.target.value)}
                            rows={3}
                            disabled={!selectedSeriesId}
                            className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder={
                              selectedSeriesId
                                ? 'One- or two-sentence series premise'
                                : 'Select a series in Library…'
                            }
                          />
                        </label>
                        {contextSaveError && (
                          <p className="text-xs text-red-800 bg-red-100/80 rounded-lg px-3 py-2">{contextSaveError}</p>
                        )}
                        <button
                          type="button"
                          disabled={contextSaveLoading || !selectedSeriesId}
                          onClick={async () => {
                            if (!selectedSeriesId) return;
                            setContextSaveError(null);
                            setContextSaveLoading(true);
                            let okIssue = true;
                            if (selectedIssueId) {
                              okIssue = await updateWriterIssue(selectedIssueId, {
                                title: issueTitleDraft.trim() || null,
                                synopsis: issueSynopsisDraft.trim() || null,
                              });
                            }
                            const okSeries = await updateWriterSeries(selectedSeriesId, {
                              title: seriesTitleDraft.trim() || null,
                              logline: seriesLoglineDraft.trim() || null,
                            });
                            setContextSaveLoading(false);
                            if (!okIssue || !okSeries) {
                              setContextSaveError('Could not save story context. Check Supabase connection and tables.');
                              return;
                            }
                            await refreshIssuesForSeries();
                            const seriesRows = await listWriterSeries();
                            setSeriesList(seriesRows);
                            pushHistory(
                              selectedIssueId ? 'saved story context' : 'saved series title & logline',
                            );
                          }}
                          className="rounded-lg px-4 py-2 text-xs font-bold text-black border border-black/20 bg-white shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                        >
                          {contextSaveLoading ? 'Saving…' : 'Save story context'}
                        </button>
                      </div>
                    )}
                    <div className={`${WRITER_GLASS_CARD} p-4 space-y-3`}>
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="flex flex-col gap-1 text-[11px] font-semibold text-black/70" htmlFor="writer-target-pages">
                        Target pages
                        <input
                          id="writer-target-pages"
                          name="writer-target-pages"
                          type="number"
                          min={1}
                          max={200}
                          value={targetPageCount}
                          onChange={(e) => setTargetPageCount(Number(e.target.value) || 1)}
                          className="w-24 rounded-lg border border-black/15 bg-white/90 px-2 py-1.5 text-sm text-black"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={!supabaseOk || !selectedIssueId || outlineGenLoading}
                        onClick={() => void runOutlineGenerate()}
                        className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                        style={{ background: ACCENT_GOLD_GRADIENT }}
                      >
                        {outlineGenLoading ? 'Generating…' : 'Generate outline'}
                      </button>
                      <Tooltip content={WRITER_UI_TIPS.syncPagesToTarget} side="bottom">
                        <button
                          type="button"
                          disabled={!supabaseOk || !selectedIssueId || syncPagesBusy}
                          onClick={() => void runSyncPagesToTarget()}
                          className="rounded-lg px-3 py-2 text-xs font-bold text-black border border-black/20 bg-white/80 shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                        >
                          {syncPagesBusy ? 'Syncing…' : 'Sync pages to target'}
                        </button>
                      </Tooltip>
                    </div>
                    {syncPagesError && (
                      <p className="text-xs text-red-800 bg-red-100/80 rounded-lg px-3 py-2">{syncPagesError}</p>
                    )}
                    {outlineGenError && (
                      <p className="text-xs text-red-800 bg-red-100/80 rounded-lg px-3 py-2">{outlineGenError}</p>
                    )}
                    </div>
                    </div>
                    <aside
                      className="custom-scrollbar min-w-0 space-y-4 xl:sticky xl:top-2 xl:max-h-[min(calc(100dvh-9rem),920px)] xl:overflow-y-auto xl:overscroll-y-contain"
                      aria-label="Outline preview"
                    >
                      <div className={`${WRITER_GLASS_CARD} p-4 space-y-2 min-h-0`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/55">
                            Latest saved outline
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <WriterSectionTip tipKey="outlinePreview" label="About outline preview" />
                            {latestOutline ? (
                              <Tooltip content={WRITER_UI_TIPS.clearLatestOutline} side="bottom">
                                <button
                                  type="button"
                                  disabled={
                                    !supabaseOk ||
                                    !selectedIssueId ||
                                    outlineDeleteBusy ||
                                    outlineGenLoading
                                  }
                                  onClick={async () => {
                                    if (!selectedIssueId || !latestOutline) return;
                                    if (
                                      !window.confirm(
                                        'Delete the latest saved outline version for this issue? Older versions (if any) are kept.',
                                      )
                                    ) {
                                      return;
                                    }
                                    setOutlineGenError(null);
                                    setOutlineDeleteBusy(true);
                                    const r = await deleteLatestWriterOutline(selectedIssueId);
                                    setOutlineDeleteBusy(false);
                                    if (!r.ok) {
                                      setOutlineGenError(r.error ?? 'Could not delete outline');
                                      pushHistory('error: delete outline');
                                      return;
                                    }
                                    const rows = await listWriterOutlinesForIssue(selectedIssueId);
                                    setOutlines(rows);
                                    pushHistory('deleted latest outline');
                                  }}
                                  className="rounded-md px-2 py-1 text-[10px] font-bold text-red-900/90 border border-red-900/30 bg-red-50/90 hover:bg-red-50 disabled:opacity-45"
                                >
                                  {outlineDeleteBusy ? 'Deleting…' : 'Delete latest outline'}
                                </button>
                              </Tooltip>
                            ) : null}
                          </div>
                        </div>
                        {latestOutline ? (
                          <pre
                            className={`${preShell} ${preFont} max-h-[min(520px,55vh)] min-h-[12rem] xl:max-h-[min(520px,calc(100dvh-14rem))]`}
                          >
                            <WriterHighlightedText
                              text={outlineJsonString}
                              query={findQuery}
                              activeMatchIndex={findActiveIndex}
                            />
                          </pre>
                        ) : (
                          <p className="text-xs text-black/55">No outlines for this issue yet.</p>
                        )}
                      </div>
                    </aside>
                  </div>
                )}
                {activeTab === 'beats' && (
                  <div className={`${WRITER_GLASS_CARD} p-4 space-y-4`}>
                    <div className="flex items-center justify-end">
                      <WriterSectionTip tipKey="beatsTab" label="About page beats" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-black/75 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={beatsSkipExisting}
                          onChange={(e) => setBeatsSkipExisting(e.target.checked)}
                          className="rounded border-black/30"
                        />
                        Skip pages that already have beats
                      </label>
                      <Tooltip content={WRITER_UI_TIPS.batchPageBeats} side="bottom">
                        <button
                          type="button"
                          disabled={
                            !supabaseOk ||
                            !selectedIssueId ||
                            sortedPages.length === 0 ||
                            beatsBatchBusy ||
                            beatsLoading
                          }
                          onClick={() => void runBatchPageBeats()}
                          className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                          style={{ background: ACCENT_GOLD_GRADIENT }}
                        >
                          {beatsBatchBusy && beatsBatchSource === 'all'
                            ? beatsBatchLabel || 'Batch…'
                            : 'Generate all beats'}
                        </button>
                      </Tooltip>
                      {beatsBatchBusy ? (
                        <button
                          type="button"
                          onClick={() => {
                            beatsBatchAbortRef.current?.abort();
                          }}
                          className="rounded-lg px-3 py-2 text-xs font-bold text-black border border-black/20 bg-white/80"
                        >
                          Cancel after this batch
                        </button>
                      ) : null}
                    </div>
                    {sortedPages.length > 0 ? (
                      <div className="space-y-3 rounded-xl border border-black/10 bg-black/[0.03] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                              Pick pages for one batch (max {WRITER_PAGE_BEATS_ISSUE_MAX})
                            </p>
                            <WriterSectionTip tipKey="beatsMultiPick" label="About multi-select beats" />
                          </div>
                          <button
                            type="button"
                            disabled={!supabaseOk || beatsBatchBusy || beatsPickPageIds.length === 0}
                            onClick={() => setBeatsPickPageIds([])}
                            className="rounded-md px-2 py-1 text-[10px] font-bold text-black border border-black/15 bg-white/80 hover:bg-white disabled:opacity-45"
                          >
                            Clear picks
                          </button>
                        </div>
                        <ul className="space-y-1.5 max-h-[min(200px,28vh)] overflow-y-auto custom-scrollbar -mx-1 px-1">
                          {sortedPages.map((p) => {
                            const checked = beatsPickPageIds.includes(p.id);
                            const atCap = beatsPickPageIds.length >= WRITER_PAGE_BEATS_ISSUE_MAX && !checked;
                            return (
                              <li key={p.id} className="flex items-start gap-2 text-[11px]">
                                <input
                                  type="checkbox"
                                  id={`writer-beats-pick-${p.id}`}
                                  checked={checked}
                                  onChange={() => {
                                    setBeatsPickPageIds((prev) => {
                                      if (prev.includes(p.id)) return prev.filter((x) => x !== p.id);
                                      if (prev.length >= WRITER_PAGE_BEATS_ISSUE_MAX) return prev;
                                      return [...prev, p.id];
                                    });
                                  }}
                                  disabled={!supabaseOk || beatsBatchBusy || atCap}
                                  className="mt-0.5 rounded border-black/25"
                                />
                                <label
                                  htmlFor={`writer-beats-pick-${p.id}`}
                                  className={`cursor-pointer flex-1 min-w-0 leading-snug ${atCap ? 'opacity-50' : ''}`}
                                >
                                  <span className="font-semibold text-black">Page {p.page_number}</span>
                                  {pageRowHasPanelBeats(p) ? (
                                    <span className="text-black/55"> — has beats</span>
                                  ) : null}
                                </label>
                                <button
                                  type="button"
                                  className="shrink-0 text-[10px] font-bold text-amber-900/80 underline decoration-amber-900/30 underline-offset-2 hover:text-black"
                                  onClick={() => setSelectedPageId(p.id)}
                                >
                                  Library
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        <Tooltip content={WRITER_UI_TIPS.batchPageBeats} side="bottom">
                          <button
                            type="button"
                            disabled={
                              !supabaseOk ||
                              !selectedIssueId ||
                              beatsPickOrdered.length === 0 ||
                              beatsBatchBusy ||
                              beatsLoading
                            }
                            onClick={() => void runSelectedBatchPageBeats()}
                            className="rounded-lg px-3 py-2 text-[11px] font-bold text-black border border-amber-800/35 bg-amber-50/90 shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                          >
                            {beatsBatchBusy && beatsBatchSource === 'picked'
                              ? beatsBatchLabel || 'Batch…'
                              : `Generate beats for selected (${beatsPickOrdered.length})`}
                          </button>
                        </Tooltip>
                        {beatsPickPageIds.length >= WRITER_PAGE_BEATS_ISSUE_MAX ? (
                          <p className="text-[10px] text-black/50">
                            Maximum {WRITER_PAGE_BEATS_ISSUE_MAX} pages per batch. Clear a pick to choose another.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {!selectedPageId && sortedPages.length > 0 && (
                      <p className="text-xs text-black/50">
                        Select a page in the Library to preview, use picks above, or Generate all beats (
                        {WRITER_PAGE_BEATS_ISSUE_MAX} pages per server round).
                      </p>
                    )}
                    {sortedPages.length === 0 && (
                      <p className="text-xs text-black/50">{WRITER_UI_TIPS.beatsNeedPage}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={!supabaseOk || !selectedPageId || beatsLoading || beatsBatchBusy}
                        onClick={async () => {
                          if (!selectedPageId || !selectedIssueId) return;
                          setBeatsError(null);
                          setBeatsLoading(true);
                          const res = await invokeWriterTools({ mode: 'page_beats', page_id: selectedPageId });
                          setBeatsLoading(false);
                          if (res.success) {
                            pushHistory(`page beats saved (page)`);
                            const pageRows = await listWriterPages(selectedIssueId);
                            setPages(pageRows);
                          } else {
                            const msg = toolErrorMessage(res);
                            setBeatsError(msg);
                            pushHistory(`error: ${msg}`);
                          }
                        }}
                        className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                        style={{ background: ACCENT_GOLD_GRADIENT }}
                      >
                        {beatsLoading ? 'Generating…' : 'Generate page beats'}
                      </button>
                      <Tooltip content={WRITER_UI_TIPS.clearPageBeats} side="bottom">
                        <button
                          type="button"
                          disabled={
                            !supabaseOk ||
                            !selectedPageId ||
                            clearPageFieldBusy !== null ||
                            beatsLoading ||
                            beatsBatchBusy
                          }
                          onClick={async () => {
                            if (!selectedPageId || !selectedIssueId) return;
                            if (!window.confirm('Clear panel beats for the Library-selected page?')) return;
                            setBeatsError(null);
                            setClearPageFieldBusy('beats');
                            const r = await clearWriterPageBeats(selectedPageId);
                            setClearPageFieldBusy(null);
                            if (!r.ok) {
                              setBeatsError(r.error ?? 'Could not clear beats');
                              pushHistory('error: clear beats');
                              return;
                            }
                            const pageRows = await listWriterPages(selectedIssueId);
                            setPages(pageRows);
                            pushHistory('cleared page beats');
                          }}
                          className="rounded-lg px-3 py-2 text-xs font-bold text-red-900/90 border border-red-900/25 bg-red-50/85 shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                        >
                          {clearPageFieldBusy === 'beats' ? 'Clearing…' : 'Clear beats'}
                        </button>
                      </Tooltip>
                    </div>
                    {beatsError && (
                      <p className="text-xs text-red-800 bg-red-100/80 rounded-lg px-3 py-2">{beatsError}</p>
                    )}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/50 mb-1">
                        Beats for selected page
                      </p>
                      {selectedPage?.beats_json ? (
                        <pre className={`${preShell} ${preFont} max-h-[min(420px,50vh)]`}>
                          <WriterHighlightedText
                            text={beatsJsonString}
                            query={findQuery}
                            activeMatchIndex={findActiveIndex}
                          />
                        </pre>
                      ) : (
                        <p className="text-xs text-black/50">No beats yet for this page.</p>
                      )}
                    </div>
                  </div>
                )}
                {activeTab === 'dialogue' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-end">
                      <WriterSectionTip tipKey="dialogueTab" label="About dialogue drafting" />
                    </div>
                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-black/70 max-w-xs">
                      Style
                      <select
                        value={dialogueStyle}
                        onChange={(e) =>
                          setDialogueStyle(e.target.value as 'comic_script' | 'screenplay_light')
                        }
                        className="rounded-lg border border-black/15 bg-white/90 px-2 py-1.5 text-sm text-black"
                      >
                        <option value="comic_script">Comic script</option>
                        <option value="screenplay_light">Screenplay (light)</option>
                      </select>
                    </label>
                    {!selectedPageId && (
                      <p className="text-xs text-black/50">{WRITER_UI_TIPS.beatsNeedPage}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={
                          !supabaseOk ||
                          !selectedPageId ||
                          dialogueLoading ||
                          clearPageFieldBusy !== null
                        }
                        onClick={async () => {
                          if (!selectedPageId || !selectedIssueId) return;
                          setDialogueError(null);
                          setDialogueLoading(true);
                          const res = await invokeWriterTools({
                            mode: 'draft_dialogue',
                            page_id: selectedPageId,
                            style: dialogueStyle,
                          });
                          setDialogueLoading(false);
                          if (res.success) {
                            pushHistory('dialogue draft saved');
                            const pageRows = await listWriterPages(selectedIssueId);
                            setPages(pageRows);
                          } else {
                            const msg = toolErrorMessage(res);
                            setDialogueError(msg);
                            pushHistory(`error: ${msg}`);
                          }
                        }}
                        className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                        style={{ background: ACCENT_GOLD_GRADIENT }}
                      >
                        {dialogueLoading ? 'Drafting…' : 'Draft dialogue'}
                      </button>
                      <Tooltip content={WRITER_UI_TIPS.clearPageDialogue} side="bottom">
                        <button
                          type="button"
                          disabled={
                            !supabaseOk ||
                            !selectedPageId ||
                            dialogueLoading ||
                            clearPageFieldBusy !== null
                          }
                          onClick={async () => {
                            if (!selectedPageId || !selectedIssueId) return;
                            if (!window.confirm('Clear dialogue (script_text) for the Library-selected page?')) return;
                            setDialogueError(null);
                            setClearPageFieldBusy('script');
                            const r = await clearWriterPageScript(selectedPageId);
                            setClearPageFieldBusy(null);
                            if (!r.ok) {
                              setDialogueError(r.error ?? 'Could not clear dialogue');
                              pushHistory('error: clear dialogue');
                              return;
                            }
                            const pageRows = await listWriterPages(selectedIssueId);
                            setPages(pageRows);
                            pushHistory('cleared page dialogue');
                          }}
                          className="rounded-lg px-3 py-2 text-xs font-bold text-red-900/90 border border-red-900/25 bg-red-50/85 shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                        >
                          {clearPageFieldBusy === 'script' ? 'Clearing…' : 'Clear dialogue'}
                        </button>
                      </Tooltip>
                    </div>
                    {dialogueError && (
                      <p className="text-xs text-red-800 bg-red-100/80 rounded-lg px-3 py-2">{dialogueError}</p>
                    )}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/50 mb-1">Script</p>
                      {selectedPage?.script_text ? (
                        <pre className={`${preShell} ${preFont} max-h-[min(420px,50vh)]`}>
                          <WriterHighlightedText
                            text={selectedPage.script_text}
                            query={findQuery}
                            activeMatchIndex={findActiveIndex}
                          />
                        </pre>
                      ) : (
                        <p className="text-xs text-black/50">No script yet for this page.</p>
                      )}
                    </div>
                  </div>
                )}
                {activeTab === 'arc' && (
                  <div className={`${WRITER_GLASS_CARD} p-4 space-y-6`}>
                    <div className="flex items-center justify-end">
                      <WriterSectionTip tipKey="arcTab" label="About pacing and canon" />
                    </div>
                    {issues.length > 0 && (
                      <div className="space-y-3 rounded-xl border border-black/10 bg-black/[0.03] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                              Batch arc tools
                            </p>
                            <WriterSectionTip tipKey="arcMultiIssueBatch" label="About batch arc tools" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!supabaseOk || arcBatchBusy}
                              onClick={() => setArcSelectedIssueIds(sortedIssuesForArc.map((i) => i.id))}
                              className="rounded-md px-2 py-1 text-[10px] font-bold text-black border border-black/15 bg-white/80 hover:bg-white disabled:opacity-45"
                            >
                              Select all
                            </button>
                            <button
                              type="button"
                              disabled={!supabaseOk || arcBatchBusy}
                              onClick={() => setArcSelectedIssueIds([])}
                              className="rounded-md px-2 py-1 text-[10px] font-bold text-black border border-black/15 bg-white/80 hover:bg-white disabled:opacity-45"
                            >
                              Clear
                            </button>
                            {selectedIssueId ? (
                              <button
                                type="button"
                                disabled={!supabaseOk || arcBatchBusy}
                                onClick={() => setArcSelectedIssueIds([selectedIssueId])}
                                className="rounded-md px-2 py-1 text-[10px] font-bold text-black border border-black/15 bg-white/80 hover:bg-white disabled:opacity-45"
                              >
                                Library issue only
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <ul className="space-y-1.5 max-h-[min(220px,32vh)] overflow-y-auto custom-scrollbar -mx-1 px-1">
                          {sortedIssuesForArc.map((iss) => (
                            <li key={iss.id} className="flex items-start gap-2 text-[11px]">
                              <input
                                type="checkbox"
                                id={`writer-arc-batch-${iss.id}`}
                                checked={arcSelectedIssueIds.includes(iss.id)}
                                onChange={() => {
                                  setArcSelectedIssueIds((prev) =>
                                    prev.includes(iss.id)
                                      ? prev.filter((x) => x !== iss.id)
                                      : [...prev, iss.id],
                                  );
                                }}
                                disabled={!supabaseOk || arcBatchBusy}
                                className="mt-0.5 rounded border-black/25"
                              />
                              <label
                                htmlFor={`writer-arc-batch-${iss.id}`}
                                className="cursor-pointer flex-1 min-w-0 leading-snug"
                              >
                                <span className="font-semibold text-black">#{iss.issue_number}</span>
                                {iss.title ? (
                                  <span className="text-black/75"> — {iss.title}</span>
                                ) : null}
                              </label>
                              <button
                                type="button"
                                className="shrink-0 text-[10px] font-bold text-amber-900/80 underline decoration-amber-900/30 underline-offset-2 hover:text-black"
                                onClick={() => setSelectedIssueId(iss.id)}
                              >
                                Library
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            disabled={
                              !supabaseOk ||
                              arcBatchIssueIdsOrdered.length === 0 ||
                              arcBatchBusy ||
                              pacingLoading ||
                              canonLoading
                            }
                            onClick={() => void runArcToolBatch('pacing_review')}
                            className="rounded-lg px-3 py-2 text-[11px] font-bold text-black border border-amber-800/35 bg-amber-50/90 shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                          >
                            {arcBatchBusy && arcBatchMode === 'pacing_review'
                              ? `Pacing ${arcBatchLabel || '…'}`
                              : `Run pacing on selected (${arcBatchIssueIdsOrdered.length})`}
                          </button>
                          <button
                            type="button"
                            disabled={
                              !supabaseOk ||
                              arcBatchIssueIdsOrdered.length === 0 ||
                              arcBatchBusy ||
                              pacingLoading ||
                              canonLoading
                            }
                            onClick={() => void runArcToolBatch('canon_check')}
                            className="rounded-lg px-3 py-2 text-[11px] font-bold text-black border border-amber-800/35 bg-amber-50/90 shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                          >
                            {arcBatchBusy && arcBatchMode === 'canon_check'
                              ? `Canon ${arcBatchLabel || '…'}`
                              : `Run canon on selected (${arcBatchIssueIdsOrdered.length})`}
                          </button>
                        </div>
                        <p className="text-[10px] text-black/50 leading-snug">
                          Check issues, then run pacing or canon once per selected row (in issue order). Results save on
                          each issue; use Library to focus an issue and read combined output below.
                        </p>
                      </div>
                    )}
                    {!selectedIssueId && (
                      <p className="text-xs text-black/50">Select an issue in the Library panel.</p>
                    )}
                    <div className="space-y-3 rounded-xl border border-black/10 bg-black/[0.03] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">Pacing review</p>
                      <button
                        type="button"
                        disabled={!supabaseOk || !selectedIssueId || pacingLoading || arcBatchBusy}
                        onClick={async () => {
                          if (!selectedIssueId) return;
                          setPacingError(null);
                          setPacingLoading(true);
                          const res = await invokeWriterTools({ mode: 'pacing_review', issue_id: selectedIssueId });
                          setPacingLoading(false);
                          if (res.success) {
                            pushHistory('pacing review saved');
                            await refreshIssuesForSeries();
                          } else {
                            const msg = toolErrorMessage(res);
                            setPacingError(msg);
                            pushHistory(`error: ${msg}`);
                          }
                        }}
                        className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                        style={{ background: ACCENT_GOLD_GRADIENT }}
                      >
                        {pacingLoading ? 'Analyzing…' : 'Run pacing review'}
                      </button>
                      {pacingError && (
                        <p className="text-xs text-red-800 bg-red-100/80 rounded-lg px-3 py-2">{pacingError}</p>
                      )}
                      {pacingSaved?.result ? (
                        <p className="text-[10px] text-black/45">
                          Last run{pacingSaved.at ? ` — ${pacingSaved.at}` : ''} — see combined output below.
                        </p>
                      ) : (
                        <p className="text-xs text-black/50">No pacing review yet for this issue.</p>
                      )}
                    </div>
                    <div className="space-y-3 rounded-xl border border-black/10 bg-black/[0.03] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">Canon check</p>
                      <button
                        type="button"
                        disabled={!supabaseOk || !selectedIssueId || canonLoading || arcBatchBusy}
                        onClick={async () => {
                          if (!selectedIssueId) return;
                          setCanonError(null);
                          setCanonLoading(true);
                          const res = await invokeWriterTools({ mode: 'canon_check', issue_id: selectedIssueId });
                          setCanonLoading(false);
                          if (res.success) {
                            pushHistory('canon check saved');
                            await refreshIssuesForSeries();
                          } else {
                            const msg = toolErrorMessage(res);
                            setCanonError(msg);
                            pushHistory(`error: ${msg}`);
                          }
                        }}
                        className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                        style={{ background: ACCENT_GOLD_GRADIENT }}
                      >
                        {canonLoading ? 'Checking…' : 'Run canon check'}
                      </button>
                      {canonError && (
                        <p className="text-xs text-red-800 bg-red-100/80 rounded-lg px-3 py-2">{canonError}</p>
                      )}
                      {canonSaved?.result ? (
                        <p className="text-[10px] text-black/45">
                          Last run{canonSaved.at ? ` — ${canonSaved.at}` : ''} — see combined output below.
                        </p>
                      ) : (
                        <p className="text-xs text-black/50">No canon check yet for this issue.</p>
                      )}
                    </div>
                    {arcReviewPlain ? (
                      <div className="space-y-2 rounded-xl border border-black/10 bg-white/40 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                            Review output (Find searches here)
                          </p>
                          <WriterSectionTip tipKey="reviewOutputFind" label="About review output and find" />
                        </div>
                        <pre className={`${preShell} ${preFont} max-h-[min(420px,50vh)]`}>
                          <WriterHighlightedText
                            text={arcReviewPlain}
                            query={findQuery}
                            activeMatchIndex={findActiveIndex}
                          />
                        </pre>
                      </div>
                    ) : null}
                  </div>
                )}
                {activeTab === 'video' && (
                  <div className={`${WRITER_GLASS_CARD} p-4 space-y-4`}>
                    <div className="flex items-center justify-end">
                      <WriterSectionTip tipKey="videoTab" label="About shot plans and video" />
                    </div>
                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-black/70">
                      Creative brief (optional)
                      <textarea
                        value={shotsBrief}
                        onChange={(e) => setShotsBrief(e.target.value)}
                        rows={3}
                        placeholder="e.g. 90s trailer, handheld doc feel, emphasize the chase on pages 8–12…"
                        className="rounded-lg border border-black/15 bg-white/90 px-2 py-1.5 text-sm text-black resize-y min-h-[72px]"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!supabaseOk || !selectedIssueId || shotsLoading}
                      onClick={async () => {
                        if (!selectedIssueId) return;
                        setShotsError(null);
                        setShotsLoading(true);
                        const res = await invokeWriterTools({
                          mode: 'plan_shots_from_issue',
                          issue_id: selectedIssueId,
                          creative_brief: shotsBrief.trim() || undefined,
                        });
                        setShotsLoading(false);
                        if (res.success) {
                          pushHistory(`shot plan v${res.version ?? '?'} saved`);
                          const rows = await listWriterShotPlansForIssue(selectedIssueId);
                          setShotPlans(rows);
                        } else {
                          const msg = toolErrorMessage(res);
                          setShotsError(msg);
                          pushHistory(`error: ${msg}`);
                        }
                      }}
                      className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                      style={{ background: ACCENT_GOLD_GRADIENT }}
                    >
                      {shotsLoading ? 'Planning…' : 'Generate shot plan'}
                    </button>
                    {shotsError && (
                      <p className="text-xs text-red-800 bg-red-100/80 rounded-lg px-3 py-2">{shotsError}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!latestShotPlan}
                        onClick={() => {
                          if (!latestShotPlan) return;
                          downloadJsonFile(
                            `writer-shot-plan-v${latestShotPlan.version}.json`,
                            latestShotPlan.shot_plan_json,
                          );
                        }}
                        className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                      >
                        Download shot plan JSON
                      </button>
                      <button
                        type="button"
                        disabled={!latestShotPlan}
                        onClick={() => {
                          if (!latestShotPlan) return;
                          const csv = shotPlanJsonToCsv(latestShotPlan.shot_plan_json);
                          downloadTextFile(
                            `writer-shot-plan-v${latestShotPlan.version}.csv`,
                            csv,
                            'text/csv;charset=utf-8',
                          );
                        }}
                        className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                      >
                        Download shot plan CSV
                      </button>
                      <button
                        type="button"
                        disabled={!latestOutline}
                        onClick={() => {
                          if (!latestOutline) return;
                          downloadJsonFile(
                            `writer-outline-v${latestOutline.version}.json`,
                            latestOutline.outline_json,
                          );
                        }}
                        className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                      >
                        Download outline JSON
                      </button>
                      <button
                        type="button"
                        disabled={!latestOutline && !latestShotPlan && pages.length === 0}
                        onClick={() => {
                          downloadJsonFile('writer-issue-pack.json', {
                            issue_id: selectedIssueId,
                            exported_at: new Date().toISOString(),
                            outline: latestOutline?.outline_json ?? null,
                            shot_plan: latestShotPlan?.shot_plan_json ?? null,
                            pages: pages.map((p) => ({
                              page_number: p.page_number,
                              beats_json: p.beats_json,
                              script_preview: (p.script_text ?? '').slice(0, 2000),
                            })),
                          });
                        }}
                        className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                      >
                        Download issue pack
                      </button>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/50 mb-1">
                        Latest shot plan
                      </p>
                      {latestShotPlan ? (
                        <pre className={`${preShell} ${preFont} max-h-[min(320px,45vh)]`}>
                          <WriterHighlightedText
                            text={shotPlanJsonString}
                            query={findQuery}
                            activeMatchIndex={findActiveIndex}
                          />
                        </pre>
                      ) : (
                        <p className="text-xs text-black/50">No shot plans for this issue yet.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">Storyboard strip</p>
                      <WriterShotStoryboardStrip shotPlanJson={latestShotPlan?.shot_plan_json ?? null} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </WriterContextMenu>

        <WriterStudioDock
          activeTabId={dockTab}
          onTabChange={setDockTab}
          library={libraryPanel}
          activity={activityPanel}
          help={helpPanel}
          collapsed={dockCollapsed}
          onToggleCollapse={() => setDockCollapsed((c) => !c)}
          phoneLayout={isPhone}
        />
      </div>
    </div>
  );
};
