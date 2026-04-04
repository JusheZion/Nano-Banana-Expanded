import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  createWriterIssue,
  createWriterPage,
  createWriterSeries,
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
import {
  countFindMatches,
  formatArcReviewPlainText,
  getWriterSearchableText,
  type WriterWorkspaceTabId,
} from '@/portals/writer/writerSearch';
import { Tooltip } from '@/shared/components/Tooltip';
import {
  ACCENT_GOLD_GRADIENT,
  WRITERS_GOLD_SLANT,
  WRITERS_TIFFANY_TEXT,
  WRITERS_WORKSHOP_BG,
} from '@/shared/theme/Phase12DesignTokens';

const titleTextStyle: React.CSSProperties = {
  background: WRITERS_TIFFANY_TEXT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

/** Frosted panels — tiffany workspace shows through (parity with Character / Assets studios). */
const WRITER_GLASS_CARD =
  'rounded-2xl border border-white/35 bg-white/20 backdrop-blur-md shadow-lg shadow-teal-900/25';

const TABS: { id: WriterWorkspaceTabId; label: string }[] = [
  { id: 'arc', label: 'Arc Planner' },
  { id: 'outline', label: 'Issue Outline' },
  { id: 'beats', label: 'Page Beats' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'video', label: 'Video' },
];

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

export const WriterPortal: React.FC = () => {
  const [seriesList, setSeriesList] = useState<WriterSeriesRow[]>([]);
  const [issues, setIssues] = useState<WriterIssueRow[]>([]);
  const [pages, setPages] = useState<WriterPageRow[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WriterWorkspaceTabId>('outline');
  const [activeRibbonMenu, setActiveRibbonMenu] = useState<WriterRibbonMenuId>('home');
  const [dockTab, setDockTab] = useState<WriterDockTabId>('library');
  const [dockCollapsed, setDockCollapsed] = useState(false);
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
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [beatsLoading, setBeatsLoading] = useState(false);
  const [beatsError, setBeatsError] = useState<string | null>(null);
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [dialogueError, setDialogueError] = useState<string | null>(null);
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
  const [seriesLoglineDraft, setSeriesLoglineDraft] = useState('');
  const [contextSaveLoading, setContextSaveLoading] = useState(false);
  const [contextSaveError, setContextSaveError] = useState<string | null>(null);

  const pushHistory = (line: string) => {
    setAiHistory((h) => [`${new Date().toLocaleTimeString()} — ${line}`, ...h].slice(0, 24));
  };

  const toolErrorMessage = (res: { error: string; details?: string }) =>
    'details' in res && res.details ? `${res.error}: ${res.details}` : res.error;

  const refreshIssuesForSeries = async () => {
    if (!selectedSeriesId) return;
    const rows = await listWriterIssues(selectedSeriesId);
    setIssues(rows);
  };

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
  }, [refreshIssuesForSeries, selectedIssueId]);

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
  }, [refreshIssuesForSeries, selectedIssueId]);

  const quickGenerate = useCallback(async () => {
    if (activeTab === 'outline' && selectedIssueId) {
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
    targetPageCount,
    dialogueStyle,
    shotsBrief,
    runPacingFromRibbon,
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
    (activeTab === 'arc' && pacingLoading);

  const quickGenerateDisabled =
    !supabaseOk ||
    !selectedIssueId ||
    (activeTab === 'beats' && !selectedPageId) ||
    (activeTab === 'dialogue' && !selectedPageId);

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
        <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
          {seriesList.length === 0 && supabaseOk && (
            <div className="px-1 space-y-2">
              <button
                type="button"
                disabled={createSeriesBusy}
                onClick={async () => {
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
                  setDockTab('library');
                  pushHistory(`created series “${row.title || 'Untitled'}”`);
                }}
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
        {selectedSeriesId && issues.length === 0 && supabaseOk && (
          <div className="mb-2 space-y-1">
            <p className="text-[11px] text-black/55">No issues in this series yet.</p>
            <button
              type="button"
              disabled={createIssueBusy}
              onClick={async () => {
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
                pushHistory(`created issue #${row.issue_number}`);
              }}
              className="w-full rounded-lg px-3 py-1.5 text-[11px] font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
              style={{ background: ACCENT_GOLD_GRADIENT }}
            >
              {createIssueBusy ? 'Creating…' : `Add issue #${nextIssueNumber}`}
            </button>
          </div>
        )}
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
        pacingLoading={pacingLoading}
        canonLoading={canonLoading}
        onQuickGenerate={() => void quickGenerate()}
        quickGenerateLabel={quickGenerateLabel}
        quickGenerateDisabled={quickGenerateDisabled}
        quickGenerateLoading={quickGenerateLoading}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
        onOpenHelpCategory={(id) => setHelpCategory(id)}
      />

      <WriterHelpModal
        open={Boolean(helpCategory)}
        title={helpCategory ? writerHelpCategoryTitle(helpCategory) : 'Help'}
        onClose={() => setHelpCategory(null)}
      >
        {helpCategory ? <WriterHelpCategoryBody category={helpCategory} supabaseDiag={supabaseDiag} /> : null}
      </WriterHelpModal>

      <div className="flex-1 min-h-0 flex min-w-0">
        <WriterContextMenu items={contextItems}>
          <section className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-scroll overscroll-y-contain scrollbar-gutter-stable custom-scrollbar p-4 pb-10 min-w-0">
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
                            disabled={!selectedSeriesId || !selectedIssueId}
                            className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder={
                              selectedIssueId && selectedSeriesId
                                ? 'One- or two-sentence series premise'
                                : 'Select an issue in Library to edit…'
                            }
                          />
                        </label>
                        {contextSaveError && (
                          <p className="text-xs text-red-800 bg-red-100/80 rounded-lg px-3 py-2">{contextSaveError}</p>
                        )}
                        <button
                          type="button"
                          disabled={contextSaveLoading || !selectedIssueId || !selectedSeriesId}
                          onClick={async () => {
                            if (!selectedIssueId || !selectedSeriesId) return;
                            setContextSaveError(null);
                            setContextSaveLoading(true);
                            const okIssue = await updateWriterIssue(selectedIssueId, {
                              title: issueTitleDraft.trim() || null,
                              synopsis: issueSynopsisDraft.trim() || null,
                            });
                            const okSeries = await updateWriterSeries(selectedSeriesId, {
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
                            pushHistory('saved story context');
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
                        disabled={
                          !supabaseOk ||
                          !selectedIssueId ||
                          outlineGenLoading
                        }
                        onClick={async () => {
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
                            const v = res.version ?? '?';
                            pushHistory(`outline v${v} saved`);
                            const rows = await listWriterOutlinesForIssue(selectedIssueId);
                            setOutlines(rows);
                          } else {
                            const msg = toolErrorMessage(res);
                            setOutlineGenError(msg);
                            pushHistory(`error: ${msg}`);
                          }
                        }}
                        className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                        style={{ background: ACCENT_GOLD_GRADIENT }}
                      >
                        {outlineGenLoading ? 'Generating…' : 'Generate outline'}
                      </button>
                    </div>
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
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/55">
                            Latest saved outline
                          </p>
                          <WriterSectionTip tipKey="outlinePreview" label="About outline preview" />
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
                    {!selectedPageId && (
                      <p className="text-xs text-black/50">{WRITER_UI_TIPS.beatsNeedPage}</p>
                    )}
                    <button
                      type="button"
                      disabled={!supabaseOk || !selectedPageId || beatsLoading}
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
                    <button
                      type="button"
                      disabled={!supabaseOk || !selectedPageId || dialogueLoading}
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
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">Issue spine</p>
                        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1">
                          {[...issues]
                            .sort((a, b) => a.issue_number - b.issue_number)
                            .map((iss) => (
                              <button
                                key={iss.id}
                                type="button"
                                onClick={() => setSelectedIssueId(iss.id)}
                                className={`flex-shrink-0 max-w-[200px] truncate rounded-lg border px-3 py-2 text-left text-[11px] font-semibold transition-colors ${
                                  selectedIssueId === iss.id
                                    ? 'border-black/30 bg-black/15 text-black ring-1 ring-black/15'
                                    : 'border-black/15 bg-white/60 text-black/75 hover:bg-white/90'
                                }`}
                                title={iss.title ?? undefined}
                              >
                                #{iss.issue_number}
                                {iss.title ? ` — ${iss.title}` : ''}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                    {!selectedIssueId && (
                      <p className="text-xs text-black/50">Select an issue in the Library panel.</p>
                    )}
                    <div className="space-y-3 rounded-xl border border-black/10 bg-black/[0.03] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">Pacing review</p>
                      <button
                        type="button"
                        disabled={!supabaseOk || !selectedIssueId || pacingLoading}
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
                        disabled={!supabaseOk || !selectedIssueId || canonLoading}
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
        />
      </div>
    </div>
  );
};
