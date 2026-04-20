import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  clearWriterPagesBeatsJson,
  clearWriterPagesScriptText,
  createWriterIssue,
  createWriterPage,
  createWriterLoreCard,
  createWriterSeries,
  deleteLatestWriterOutline,
  deleteWriterLoreCard,
  deleteWriterPages,
  ensureWriterPagesToCount,
  listWriterIssues,
  listWriterOutlinesForIssue,
  listWriterPages,
  listWriterLoreCards,
  listWriterSeries,
  listWriterShotPlansForIssue,
  updateWriterIssue,
  updateWriterIssueOutlineJson,
  updateWriterPageBeatsJson,
  updateWriterPageScriptText,
  updateWriterSeries,
  updateWriterLoreCard,
  updateWriterVideoShotPlanJson,
  type WriterIssueOutlineRow,
  type WriterIssueRow,
  type WriterPageRow,
  type WriterLoreCardRow,
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
import {
  buildSynopsisDocumentFromParts,
  EMPTY_SYNOPSIS_HELPER_PARTS,
  mergeSynopsisHelperIntoNotes,
  readSynopsisHelperFromNotes,
  type SynopsisHelperParts,
} from '@/portals/writer/writerSynopsisHelper';
import { buildImageWorkshopDraftFromWriterSelection } from '@/portals/storyline/imageWorkshopPlanning';
import { getCharacterAlbums } from '@/shared/api/arcsVault';
import { getAssetAlbums } from '@/shared/api/arcsAssetVault';
import { Tooltip } from '@/shared/components/Tooltip';
import { useResponsiveLayout } from '@/shared/context/ResponsiveLayoutContext';
import { useImageWorkshopBridge } from '@/stores/imageWorkshopBridge';
import {
  ACCENT_GOLD_GRADIENT,
  WRITERS_GOLD_SLANT,
  WRITERS_TIFFANY_TEXT,
  WRITERS_WORKSHOP_BG,
} from '@/shared/theme/Phase12DesignTokens';
import { WRITER_PAGE_BEATS_ISSUE_MAX } from '@/shared/writer/schemas';
import type { PageBeatsJson } from '@/shared/writer/types';

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

function normalizeLoreKeyPart(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildLoreDedupKey(input: { category: unknown; title: unknown }): string {
  const categoryNorm = normalizeLoreKeyPart(input.category) || 'world';
  const titleNorm = normalizeLoreKeyPart(input.title);
  return `${categoryNorm}|${titleNorm}`;
}

function startLoreSortOrder(existing: WriterLoreCardRow[]): number {
  const max = existing.reduce((m, c) => Math.max(m, Number.isFinite(c.sort_order) ? c.sort_order : 0), 0);
  const roundedUpTo10 = Math.ceil(max / 10) * 10;
  return roundedUpTo10 + 10;
}

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

function getOutlinePageBeatsCount(outlineJson: unknown): number {
  if (!outlineJson || typeof outlineJson !== 'object') return 0;
  const arr = (outlineJson as { page_beats?: unknown }).page_beats;
  return Array.isArray(arr) ? arr.length : 0;
}

function buildCoverageBoostOutlineSupplement(baseSupplement: string, targetPageCount: number): string {
  const trimmed = baseSupplement.trim();
  const boostLine = `Coverage boost: map this issue to about ${targetPageCount} pages with sequential per-page beats from opening to ending.`;
  if (!trimmed) return boostLine;
  if (trimmed.includes('Coverage boost:')) return trimmed;
  return `${trimmed}\n\n${boostLine}`;
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
  const [beatsDirectorNotesDraft, setBeatsDirectorNotesDraft] = useState('');
  const [selectedPageIdsForBatch, setSelectedPageIdsForBatch] = useState<string[]>([]);
  const [beatsBatchBusy, setBeatsBatchBusy] = useState(false);
  const [beatsBatchLabel, setBeatsBatchLabel] = useState('');
  const [beatsBatchSource, setBeatsBatchSource] = useState<'all' | 'picked' | null>(null);
  const [imageWorkshopBusy, setImageWorkshopBusy] = useState(false);
  const [imageWorkshopError, setImageWorkshopError] = useState<string | null>(null);
  const beatsBatchAbortRef = useRef<AbortController | null>(null);
  /** When "Skip pages that already have beats" is off, server advances by batch_offset; client tracks it across rounds. */
  const beatsBatchOffsetFullPassRef = useRef(0);
  const [syncPagesBusy, setSyncPagesBusy] = useState(false);
  const [syncPagesError, setSyncPagesError] = useState<string | null>(null);
  const [arcSelectedIssueIds, setArcSelectedIssueIds] = useState<string[]>([]);
  const [arcBatchBusy, setArcBatchBusy] = useState(false);
  const [arcBatchLabel, setArcBatchLabel] = useState('');
  const [arcBatchMode, setArcBatchMode] = useState<'pacing_review' | 'canon_check' | null>(null);
  const prevWorkspaceTabRef = useRef<WriterWorkspaceTabId>(activeTab);
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [dialogueError, setDialogueError] = useState<string | null>(null);
  const [dialogueStyle, setDialogueStyle] = useState<'comic_script' | 'screenplay_light'>('comic_script');
  const [shotPlans, setShotPlans] = useState<WriterVideoShotPlanRow[]>([]);
  const [shotsBrief, setShotsBrief] = useState('');
  const [pacingLoading, setPacingLoading] = useState(false);
  const [pacingError, setPacingError] = useState<string | null>(null);
  /** Arc tab: hypothetical total pages for density explorer (slider). Resets when the Library issue or counts change. */
  const [pacingExplorePages, setPacingExplorePages] = useState(22);
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
  /** Optional text sent only with Generate outline / coverage boost (not saved on the issue row). */
  const [outlineSupplementDraft, setOutlineSupplementDraft] = useState('');
  const [seriesTitleDraft, setSeriesTitleDraft] = useState('');
  const [seriesLoglineDraft, setSeriesLoglineDraft] = useState('');
  const [contextSaveLoading, setContextSaveLoading] = useState(false);
  const [contextSaveError, setContextSaveError] = useState<string | null>(null);
  const [synopsisHelperParts, setSynopsisHelperParts] = useState<SynopsisHelperParts>({
    ...EMPTY_SYNOPSIS_HELPER_PARTS,
  });
  type ScriptsEditorTab = 'synopsis' | 'outline' | 'beats' | 'dialogue' | 'video';
  const [scriptsEditorTab, setScriptsEditorTab] = useState<ScriptsEditorTab>('synopsis');
  const [outlineEditDraft, setOutlineEditDraft] = useState('');
  const [beatsEditDraft, setBeatsEditDraft] = useState('');
  const [dialogueEditDraft, setDialogueEditDraft] = useState('');
  const [shotEditDraft, setShotEditDraft] = useState('');
  const [scriptsBusy, setScriptsBusy] = useState(false);
  const [scriptsError, setScriptsError] = useState<string | null>(null);
  const [loreCards, setLoreCards] = useState<WriterLoreCardRow[]>([]);
  const [loreBusy, setLoreBusy] = useState(false);
  const [loreDraftTitle, setLoreDraftTitle] = useState('');
  const [loreDraftCategory, setLoreDraftCategory] = useState('world');
  const [loreDraftBody, setLoreDraftBody] = useState('');
  const [loreDraftInclude, setLoreDraftInclude] = useState(true);
  const [loreDraftSort, setLoreDraftSort] = useState(0);
  const [loreEditingId, setLoreEditingId] = useState<string | null>(null);
  const [loreImportOpen, setLoreImportOpen] = useState(false);
  const [loreImportJsonDraft, setLoreImportJsonDraft] = useState('');
  const [loreImportBusy, setLoreImportBusy] = useState(false);
  const [loreImportError, setLoreImportError] = useState<string | null>(null);
  const [loreImportResult, setLoreImportResult] = useState<{
    imported: number;
    skippedExisting: number;
    skippedPayload: number;
    invalid: number;
  } | null>(null);

  const pushHistory = useCallback((line: string) => {
    setAiHistory((h) => [`${new Date().toLocaleTimeString()} — ${line}`, ...h].slice(0, 24));
  }, []);

  const refreshPagesForIssue = useCallback(async () => {
    if (!selectedIssueId) return;
    const pageRows = await listWriterPages(selectedIssueId);
    setPages(pageRows);
    setSelectedPageId((prev) => {
      if (prev && pageRows.some((p) => p.id === prev)) return prev;
      return pageRows[0]?.id ?? null;
    });
  }, [selectedIssueId]);

  const togglePageBatchSelect = useCallback((pageId: string) => {
    setSelectedPageIdsForBatch((prev) =>
      prev.includes(pageId) ? prev.filter((x) => x !== pageId) : [...prev, pageId],
    );
  }, []);

  const [libraryPagesBusy, setLibraryPagesBusy] = useState(false);
  const requestWriterHandoff = useImageWorkshopBridge((s) => s.requestWriterHandoff);

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
  }, [pushHistory]);

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
  }, [selectedSeriesId, nextIssueNumber, refreshIssuesForSeries, pushHistory]);

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
    setSelectedPageIdsForBatch([]);
  }, [selectedIssueId]);

  const reloadLoreCards = useCallback(async () => {
    if (!selectedSeriesId) {
      setLoreCards([]);
      return;
    }
    setLoreBusy(true);
    const rows = await listWriterLoreCards(selectedSeriesId);
    setLoreCards(rows);
    setLoreBusy(false);
  }, [selectedSeriesId]);

  const runLoreJsonImport = useCallback(async () => {
    if (!selectedSeriesId) return;
    setLoreImportError(null);
    setLoreImportResult(null);
    setLoreImportBusy(true);
    try {
      const parsed = JSON.parse(loreImportJsonDraft);
      if (!Array.isArray(parsed)) {
        setLoreImportError('JSON must be an array of objects.');
        return;
      }

      const existingKeys = new Set(
        loreCards.map((c) => buildLoreDedupKey({ category: c.category, title: c.title })),
      );
      const payloadKeys = new Set<string>();
      const validRows: Array<{
        title: string;
        category: string;
        body: string;
        include_in_prompt: boolean;
        key: string;
      }> = [];
      let skippedExisting = 0;
      let skippedPayload = 0;
      let invalid = 0;

      for (const row of parsed) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          invalid += 1;
          continue;
        }
        const r = row as Record<string, unknown>;
        const title = typeof r.title === 'string' ? r.title.trim() : '';
        if (!title) {
          invalid += 1;
          continue;
        }
        const category = typeof r.category === 'string' ? r.category.trim() : 'world';
        const key = buildLoreDedupKey({ category, title });
        if (existingKeys.has(key)) {
          skippedExisting += 1;
          continue;
        }
        if (payloadKeys.has(key)) {
          skippedPayload += 1;
          continue;
        }
        payloadKeys.add(key);
        validRows.push({
          title,
          category: category.trim() || 'world',
          body: typeof r.body === 'string' ? r.body : '',
          include_in_prompt: typeof r.include_in_prompt === 'boolean' ? r.include_in_prompt : true,
          key,
        });
      }

      validRows.sort((a, b) => {
        if (a.key < b.key) return -1;
        if (a.key > b.key) return 1;
        return 0;
      });

      let sortOrder = startLoreSortOrder(loreCards);
      let imported = 0;
      for (const r of validRows) {
        const created = await createWriterLoreCard({
          series_id: selectedSeriesId,
          title: r.title,
          category: r.category,
          body: r.body,
          include_in_prompt: r.include_in_prompt,
          sort_order: sortOrder,
        });
        sortOrder += 10;
        if (created) imported += 1;
      }

      setLoreImportResult({ imported, skippedExisting, skippedPayload, invalid });
      pushHistory(`imported lore cards: ${imported}`);
      await reloadLoreCards();
    } catch (e) {
      setLoreImportError(e instanceof Error ? e.message : 'Invalid JSON.');
    } finally {
      setLoreImportBusy(false);
    }
  }, [loreCards, loreImportJsonDraft, reloadLoreCards, selectedSeriesId, pushHistory]);

  useEffect(() => {
    void reloadLoreCards();
  }, [reloadLoreCards]);

  useEffect(() => {
    setLoreEditingId(null);
    setLoreDraftTitle('');
    setLoreDraftCategory('world');
    setLoreDraftBody('');
    setLoreDraftInclude(true);
    setLoreDraftSort(0);
  }, [selectedSeriesId]);

  useEffect(() => {
    setLoreImportError(null);
    setLoreImportResult(null);
  }, [selectedSeriesId]);

  useEffect(() => {
    setSelectedPageIdsForBatch((prev) => prev.filter((id) => pages.some((p) => p.id === id)));
  }, [pages]);

  useEffect(() => {
    const row = issues.find((x) => x.id === selectedIssueId);
    if (row) {
      setIssueTitleDraft(row.title ?? '');
      setIssueSynopsisDraft(row.synopsis ?? '');
      setSynopsisHelperParts(readSynopsisHelperFromNotes(row.notes));
    } else {
      setIssueTitleDraft('');
      setIssueSynopsisDraft('');
      setSynopsisHelperParts({ ...EMPTY_SYNOPSIS_HELPER_PARTS });
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

  const pacingLengthAlignment = useMemo(() => {
    const r = pacingSaved?.result;
    if (!r || typeof r !== 'object' || r === null) return null;
    const la = (r as Record<string, unknown>).length_alignment;
    if (!la || typeof la !== 'object') return null;
    return la as {
      target_pages?: number;
      script_pages: number;
      outline_beats: number;
      suggested_page_delta: number;
      suggested_beat_delta?: number;
      rationale: string;
    };
  }, [pacingSaved?.result]);

  const openImageWorkshopFromWriter = useCallback(
    async (mode: 'outline' | 'page' | 'shot-plan') => {
      if (!selectedIssue) return;
      setImageWorkshopBusy(true);
      setImageWorkshopError(null);
      try {
        const [characterAlbums, assetAlbums] = await Promise.all([
          getCharacterAlbums(),
          getAssetAlbums(),
        ]);
        const outlineJson = latestOutline?.outline_json as
          | { page_beats?: Array<{ page_target?: number; summary?: string }> }
          | null
          | undefined;
        const shotPlanJson = latestShotPlan?.shot_plan_json as
          | { title?: string; shots?: Array<{ description: string; shot_type?: string }> }
          | null
          | undefined;
        const outlinePageBeat =
          mode === 'page' && selectedPage?.page_number && outlineJson?.page_beats
            ? outlineJson.page_beats.find((beat) => beat.page_target === selectedPage.page_number)
            : null;
        const outlinePageBeats: PageBeatsJson | null =
          mode === 'outline' && outlineJson?.page_beats
            ? {
                one_line_hook: selectedIssue.title ?? undefined,
                panels: outlineJson.page_beats
                  .filter(
                    (
                      beat,
                    ): beat is { page_target?: number; summary: string } =>
                      typeof beat?.summary === 'string' && beat.summary.trim().length > 0,
                  )
                  .map((beat) => ({
                    index: typeof beat.page_target === 'number' ? beat.page_target : undefined,
                    action: beat.summary.trim(),
                  })),
              }
            : null;
        const shotPlanPageBeats: PageBeatsJson | null =
          mode === 'shot-plan' && shotPlanJson?.shots
            ? {
                one_line_hook:
                  typeof shotPlanJson.title === 'string'
                    ? shotPlanJson.title
                    : selectedIssue.title ?? undefined,
                panels: shotPlanJson.shots.map((shot, index) => ({
                  index: index + 1,
                  action: shot.description,
                  composition: shot.shot_type,
                })),
              }
            : null;

        const pageBeatsToSend =
          mode === 'page'
            ? ((selectedPage?.beats_json as PageBeatsJson | null) ?? {
                one_line_hook: outlinePageBeat?.summary,
                panels: outlinePageBeat?.summary ? [{ action: outlinePageBeat.summary }] : [],
              })
            : mode === 'shot-plan'
              ? shotPlanPageBeats
              : outlinePageBeats;

        const draft = buildImageWorkshopDraftFromWriterSelection({
          source: {
            sourceLabel:
              mode === 'page'
                ? `Issue #${selectedIssue.issue_number} · Page ${selectedPage?.page_number ?? 'selected'}`
                : mode === 'shot-plan'
                  ? `Issue #${selectedIssue.issue_number} · Shot plan`
                  : `Issue #${selectedIssue.issue_number} · Outline`,
            issueTitle: selectedIssue.title ?? undefined,
            issueSynopsis: selectedIssue.synopsis ?? undefined,
            pageId: selectedPage?.id ?? null,
            pageNumber: selectedPage?.page_number ?? null,
            issueId: selectedIssue.id,
            seriesId: selectedSeriesId,
            shotPlanId: mode === 'shot-plan' ? latestShotPlan?.id ?? null : null,
          },
          pageBeats: pageBeatsToSend,
          scriptText: mode === 'page' ? selectedPage?.script_text ?? null : null,
          loreCards,
          characterAlbums,
          assetAlbums,
        });

        requestWriterHandoff(draft);
        pushHistory(
          mode === 'page'
            ? 'sent page to Illustrator’s Imageshop'
            : mode === 'shot-plan'
              ? 'sent shot plan to Illustrator’s Imageshop'
              : 'sent outline to Illustrator’s Imageshop',
        );
      } catch (error) {
        setImageWorkshopError(
          error instanceof Error ? error.message : 'Could not prepare Illustrator’s Imageshop handoff.',
        );
      } finally {
        setImageWorkshopBusy(false);
      }
    },
    [
      latestOutline,
      latestShotPlan,
      loreCards,
      pushHistory,
      requestWriterHandoff,
      selectedIssue,
      selectedPage,
      selectedSeriesId,
    ],
  );

  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => a.page_number - b.page_number),
    [pages],
  );

  const beatsPickOrdered = useMemo(() => {
    const sel = new Set(beatsPickPageIds);
    return sortedPages.filter((p) => sel.has(p.id)).map((p) => p.id);
  }, [sortedPages, beatsPickPageIds]);

  const selectedPagesForBatchExport = useMemo(
    () => sortedPages.filter((p) => selectedPageIdsForBatch.includes(p.id)),
    [sortedPages, selectedPageIdsForBatch],
  );

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

  const outlinePageBeatsCount = useMemo(
    () => getOutlinePageBeatsCount(latestOutline?.outline_json),
    [latestOutline],
  );
  const outlineCoverageGap = Math.max(0, targetPageCount - outlinePageBeatsCount);
  const outlineCoverageWarning =
    Boolean(latestOutline) && targetPageCount > 0 && outlineCoverageGap >= 2;

  const arcPacingExploreMax = useMemo(
    () => Math.max(64, sortedPages.length + 20, targetPageCount, outlinePageBeatsCount, 1),
    [sortedPages.length, targetPageCount, outlinePageBeatsCount],
  );

  const lastArcExploreIssueRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedIssueId) return;
    const hi = arcPacingExploreMax;
    if (lastArcExploreIssueRef.current !== selectedIssueId) {
      lastArcExploreIssueRef.current = selectedIssueId;
      const base = Math.max(1, targetPageCount, sortedPages.length || 1);
      setPacingExplorePages(Math.min(Math.max(base, 1), hi));
    } else {
      setPacingExplorePages((p) => Math.min(Math.max(p, 1), hi));
    }
  }, [selectedIssueId, targetPageCount, sortedPages.length, arcPacingExploreMax]);

  const nextPageNumber = useMemo(() => {
    if (sortedPages.length === 0) return 1;
    return Math.max(...sortedPages.map((p) => p.page_number)) + 1;
  }, [sortedPages]);

  const loreCardsFindText = useMemo(
    () =>
      loreCards
        .map((c) => [c.title, c.category, c.body].filter(Boolean).join('\n'))
        .join('\n\n'),
    [loreCards],
  );

  const searchableCtx = useMemo(
    () => ({
      activeTab,
      latestOutlineJson: latestOutline?.outline_json ?? null,
      latestShotPlanJson: latestShotPlan?.shot_plan_json ?? null,
      selectedPageBeats: selectedPage?.beats_json ?? null,
      scriptText: selectedPage?.script_text ?? null,
      pacingReview: pacingSaved,
      canonCheck: canonSaved,
      loreCardsFindText,
    }),
    [activeTab, latestOutline, latestShotPlan, selectedPage, pacingSaved, canonSaved, loreCardsFindText],
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
    const res = await invokeWriterTools({
      mode: 'pacing_review',
      issue_id: selectedIssueId,
      target_page_count: targetPageCount,
    });
    setPacingLoading(false);
    if (res.success) {
      pushHistory('pacing review saved');
      await refreshIssuesForSeries();
    } else {
      const msg = toolErrorMessage(res);
      setPacingError(msg);
      pushHistory(`error: ${msg}`);
    }
  }, [selectedIssueId, targetPageCount, refreshIssuesForSeries, pushHistory]);

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
  }, [selectedIssueId, refreshIssuesForSeries, pushHistory]);

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
          const res = await invokeWriterTools(
            mode === 'pacing_review'
              ? { mode: 'pacing_review', issue_id: id, target_page_count: targetPageCount }
              : { mode, issue_id: id },
          );
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
    [arcBatchIssueIdsOrdered, supabaseOk, sortedIssuesForArc, refreshIssuesForSeries, pushHistory, targetPageCount],
  );

  const runOutlineGenerate = useCallback(
    async (opts?: { coverageBoost?: boolean }) => {
      if (!selectedIssueId) return;
      setOutlineGenError(null);
      setOutlineGenLoading(true);
      const supplementTrim = opts?.coverageBoost
        ? buildCoverageBoostOutlineSupplement(outlineSupplementDraft, targetPageCount).trim()
        : outlineSupplementDraft.trim();
      const res = await invokeWriterTools({
        mode: 'outline_issue',
        issue_id: selectedIssueId,
        target_page_count: targetPageCount,
        ...(supplementTrim ? { outline_supplement: supplementTrim } : {}),
      });
      setOutlineGenLoading(false);
      if (res.success) {
        if (opts?.coverageBoost) {
          setOutlineSupplementDraft(supplementTrim);
        }
        pushHistory(`outline v${res.version ?? '?'} saved`);
        const rows = await listWriterOutlinesForIssue(selectedIssueId);
        setOutlines(rows);
      } else {
        const msg = toolErrorMessage(res);
        setOutlineGenError(msg);
        pushHistory(`error: ${msg}`);
      }
    },
    [selectedIssueId, targetPageCount, outlineSupplementDraft, pushHistory],
  );

  const runOutlineGenerateCoverageBoost = useCallback(async () => {
    await runOutlineGenerate({ coverageBoost: true });
  }, [runOutlineGenerate]);

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
  }, [selectedIssueId, targetPageCount, pushHistory]);

  const runLibraryDeleteSelectedPages = useCallback(async () => {
    if (!selectedIssueId || selectedPageIdsForBatch.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedPageIdsForBatch.length} page row(s) from the database? Page numbers may leave gaps (e.g. 1,2,4). This cannot be undone.`,
      )
    ) {
      return;
    }
    setLibraryPagesBusy(true);
    const ok = await deleteWriterPages(selectedPageIdsForBatch);
    setLibraryPagesBusy(false);
    if (!ok) {
      pushHistory('error: delete pages');
      return;
    }
    const deleted = new Set(selectedPageIdsForBatch);
    setSelectedPageIdsForBatch([]);
    await refreshPagesForIssue();
    pushHistory(`deleted ${deleted.size} page(s)`);
  }, [selectedIssueId, selectedPageIdsForBatch, refreshPagesForIssue, pushHistory]);

  const runLibraryClearBeatsSelected = useCallback(async () => {
    if (selectedPageIdsForBatch.length === 0) return;
    if (!window.confirm(`Clear panel beats on ${selectedPageIdsForBatch.length} page(s)?`)) return;
    setLibraryPagesBusy(true);
    const ok = await clearWriterPagesBeatsJson(selectedPageIdsForBatch);
    setLibraryPagesBusy(false);
    if (!ok) {
      pushHistory('error: clear beats');
      return;
    }
    await refreshPagesForIssue();
    pushHistory(`cleared beats on ${selectedPageIdsForBatch.length} page(s)`);
  }, [selectedPageIdsForBatch, refreshPagesForIssue, pushHistory]);

  const runLibraryClearDialogueSelected = useCallback(async () => {
    if (selectedPageIdsForBatch.length === 0) return;
    if (!window.confirm(`Clear dialogue/script on ${selectedPageIdsForBatch.length} page(s)?`)) return;
    setLibraryPagesBusy(true);
    const ok = await clearWriterPagesScriptText(selectedPageIdsForBatch);
    setLibraryPagesBusy(false);
    if (!ok) {
      pushHistory('error: clear dialogue');
      return;
    }
    await refreshPagesForIssue();
    pushHistory(`cleared dialogue on ${selectedPageIdsForBatch.length} page(s)`);
  }, [selectedPageIdsForBatch, refreshPagesForIssue, pushHistory]);

  const downloadSelectedBeatsBundle = useCallback(() => {
    if (!selectedIssueId || selectedPagesForBatchExport.length === 0) return;
    const sorted = [...selectedPagesForBatchExport].sort((a, b) => a.page_number - b.page_number);
    downloadJsonFile(`writer-beats-pages-${sorted.map((p) => p.page_number).join('-')}.json`, {
      issue_id: selectedIssueId,
      exported_at: new Date().toISOString(),
      pages: sorted.map((p) => ({
        page_number: p.page_number,
        beats_json: p.beats_json,
      })),
    });
    pushHistory(`downloaded beats bundle (${sorted.length} page(s))`);
  }, [selectedIssueId, selectedPagesForBatchExport, pushHistory]);

  const downloadSelectedDialogueBundle = useCallback(() => {
    if (!selectedIssueId || selectedPagesForBatchExport.length === 0) return;
    const sorted = [...selectedPagesForBatchExport].sort((a, b) => a.page_number - b.page_number);
    downloadJsonFile(`writer-dialogue-pages-${sorted.map((p) => p.page_number).join('-')}.json`, {
      issue_id: selectedIssueId,
      exported_at: new Date().toISOString(),
      pages: sorted.map((p) => ({
        page_number: p.page_number,
        script_text: p.script_text,
      })),
    });
    pushHistory(`downloaded dialogue bundle (${sorted.length} page(s))`);
  }, [selectedIssueId, selectedPagesForBatchExport, pushHistory]);

  const clearBeatsForSelectedPage = useCallback(async () => {
    if (!selectedPageId) return;
    if (!window.confirm('Clear panel beats for this page?')) return;
    setBeatsError(null);
    setLibraryPagesBusy(true);
    const ok = await clearWriterPagesBeatsJson([selectedPageId]);
    setLibraryPagesBusy(false);
    if (!ok) {
      setBeatsError('Could not clear beats.');
      pushHistory('error: clear beats (page)');
      return;
    }
    await refreshPagesForIssue();
    pushHistory('cleared beats (selected page)');
  }, [selectedPageId, refreshPagesForIssue, pushHistory]);

  const clearDialogueForSelectedPage = useCallback(async () => {
    if (!selectedPageId) return;
    if (!window.confirm('Clear dialogue/script for this page?')) return;
    setDialogueError(null);
    setLibraryPagesBusy(true);
    const ok = await clearWriterPagesScriptText([selectedPageId]);
    setLibraryPagesBusy(false);
    if (!ok) {
      setDialogueError('Could not clear dialogue.');
      pushHistory('error: clear dialogue (page)');
      return;
    }
    await refreshPagesForIssue();
    pushHistory('cleared dialogue (selected page)');
  }, [selectedPageId, refreshPagesForIssue, pushHistory]);

  const runBatchPageBeats = useCallback(async () => {
    if (!selectedIssueId) return;
    beatsBatchAbortRef.current = new AbortController();
    setBeatsBatchBusy(true);
    setBeatsBatchSource('all');
    setBeatsError(null);
    setBeatsBatchLabel('Running…');
    beatsBatchOffsetFullPassRef.current = 0;
    try {
      let round = 0;
      for (;;) {
        if (beatsBatchAbortRef.current?.signal.aborted) {
          pushHistory('batch beats cancelled');
          break;
        }
        const notesTrim = beatsDirectorNotesDraft.trim();
        const res = await invokeWriterTools({
          mode: 'page_beats_issue',
          issue_id: selectedIssueId,
          skip_existing: beatsSkipExisting,
          batch_limit: WRITER_PAGE_BEATS_ISSUE_MAX,
          ...(!beatsSkipExisting ? { batch_offset: beatsBatchOffsetFullPassRef.current } : {}),
          ...(notesTrim ? { director_notes_for_beats: notesTrim } : {}),
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
          batch_size?: number;
          next_batch_offset?: number;
        };
        round += 1;
        const processed = data.processed ?? [];
        const errs = data.errors ?? [];
        if (!beatsSkipExisting) {
          beatsBatchOffsetFullPassRef.current =
            typeof data.next_batch_offset === 'number'
              ? data.next_batch_offset
              : beatsBatchOffsetFullPassRef.current +
                (data.batch_size ?? WRITER_PAGE_BEATS_ISSUE_MAX);
        }
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
  }, [selectedIssueId, beatsSkipExisting, beatsDirectorNotesDraft, pushHistory]);

  const runSelectedBatchPageBeats = useCallback(async () => {
    if (!selectedIssueId || beatsPickOrdered.length === 0) return;
    setBeatsBatchBusy(true);
    setBeatsBatchSource('picked');
    setBeatsError(null);
    setBeatsBatchLabel('Selected…');
    try {
      const notesTrim = beatsDirectorNotesDraft.trim();
      const res = await invokeWriterTools({
        mode: 'page_beats_issue',
        issue_id: selectedIssueId,
        page_ids: beatsPickOrdered,
        skip_existing: beatsSkipExisting,
        ...(notesTrim ? { director_notes_for_beats: notesTrim } : {}),
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
  }, [selectedIssueId, beatsPickOrdered, beatsSkipExisting, beatsDirectorNotesDraft, pushHistory]);

  const quickGenerate = useCallback(async () => {
    if (activeTab === 'scripts' || activeTab === 'lore') return;
    if (activeTab === 'outline' && selectedIssueId) {
      await runOutlineGenerate();
      return;
    }
    if (activeTab === 'beats' && selectedPageId && selectedIssueId) {
      setBeatsError(null);
      setBeatsLoading(true);
      const notesTrim = beatsDirectorNotesDraft.trim();
      const res = await invokeWriterTools({
        mode: 'page_beats',
        page_id: selectedPageId,
        ...(notesTrim ? { director_notes_for_beats: notesTrim } : {}),
      });
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
    beatsDirectorNotesDraft,
    dialogueStyle,
    shotsBrief,
    runPacingFromRibbon,
    runOutlineGenerate,
    pushHistory,
  ]);

  const quickGenerateLabel =
    activeTab === 'scripts' || activeTab === 'lore'
      ? '—'
      : activeTab === 'arc'
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
    activeTab === 'scripts' ||
    activeTab === 'lore' ||
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

  const issuePackObject = useMemo(
    () => ({
      issue_id: selectedIssueId,
      exported_at: new Date().toISOString(),
      series: selectedSeriesId
        ? {
            title: seriesList.find((s) => s.id === selectedSeriesId)?.title ?? null,
            logline: seriesList.find((s) => s.id === selectedSeriesId)?.logline ?? null,
          }
        : null,
      issue: selectedIssue
        ? {
            issue_number: selectedIssue.issue_number,
            title: selectedIssue.title,
            synopsis: selectedIssue.synopsis,
          }
        : null,
      outline: latestOutline
        ? { version: latestOutline.version, outline_json: latestOutline.outline_json }
        : null,
      shot_plan: latestShotPlan
        ? { version: latestShotPlan.version, shot_plan_json: latestShotPlan.shot_plan_json }
        : null,
      arc_review: {
        pacing_review: pacingSaved ?? null,
        canon_check: canonSaved ?? null,
      },
      pages: sortedPages.map((p) => ({
        page_number: p.page_number,
        beats_json: p.beats_json,
        script_text: p.script_text,
      })),
    }),
    [
      selectedIssueId,
      selectedSeriesId,
      seriesList,
      selectedIssue,
      latestOutline,
      latestShotPlan,
      pacingSaved,
      canonSaved,
      sortedPages,
    ],
  );

  useEffect(() => {
    if (!latestOutline) {
      setOutlineEditDraft('');
      return;
    }
    setOutlineEditDraft(JSON.stringify(latestOutline.outline_json, null, 2));
  }, [latestOutline]);

  useEffect(() => {
    if (!selectedPage) {
      setBeatsEditDraft('');
      setDialogueEditDraft('');
      return;
    }
    setBeatsEditDraft(
      selectedPage.beats_json ? JSON.stringify(selectedPage.beats_json, null, 2) : '',
    );
    setDialogueEditDraft(selectedPage.script_text ?? '');
    // Sync when the logical row fields change, not when `pages` replaces row object identity (e.g. batch `setPages`).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedPage omitted on purpose; see above.
  }, [selectedPage?.id, selectedPage?.beats_json, selectedPage?.script_text]);

  useEffect(() => {
    if (!latestShotPlan) {
      setShotEditDraft('');
      return;
    }
    setShotEditDraft(JSON.stringify(latestShotPlan.shot_plan_json, null, 2));
  }, [latestShotPlan]);

  const copyIssuePackJson = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(issuePackObject, null, 2));
  }, [issuePackObject]);

  const saveSynopsisHelperToNotes = useCallback(async () => {
    if (!selectedIssueId || !selectedIssue) return;
    setScriptsError(null);
    setScriptsBusy(true);
    const merged = mergeSynopsisHelperIntoNotes(selectedIssue.notes, synopsisHelperParts);
    const ok = await updateWriterIssue(selectedIssueId, { notes: merged });
    setScriptsBusy(false);
    if (!ok) {
      setScriptsError('Could not save synopsis helper. Check Supabase.');
      return;
    }
    await refreshIssuesForSeries();
    pushHistory('saved synopsis helper fields to issue notes');
  }, [selectedIssueId, selectedIssue, synopsisHelperParts, refreshIssuesForSeries, pushHistory]);

  const applyBuiltSynopsis = useCallback(() => {
    const doc = buildSynopsisDocumentFromParts(synopsisHelperParts);
    if (!doc) {
      setScriptsError('Fill at least one synopsis helper field to build.');
      return;
    }
    setScriptsError(null);
    setIssueSynopsisDraft(doc);
    pushHistory('built synopsis from helper (review in Issue Outline → Save story context)');
  }, [synopsisHelperParts, pushHistory]);

  const saveOutlineEdit = useCallback(async () => {
    if (!latestOutline) return;
    setScriptsError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(outlineEditDraft || '{}');
    } catch {
      setScriptsError('Outline JSON is invalid.');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setScriptsError('Outline must be a JSON object.');
      return;
    }
    setScriptsBusy(true);
    const ok = await updateWriterIssueOutlineJson(latestOutline.id, parsed as Record<string, unknown>);
    setScriptsBusy(false);
    if (!ok) {
      setScriptsError('Could not save outline. Check Supabase / permissions.');
      return;
    }
    const rows = await listWriterOutlinesForIssue(latestOutline.issue_id);
    setOutlines(rows);
    pushHistory(`saved edited outline v${latestOutline.version}`);
  }, [latestOutline, outlineEditDraft, pushHistory]);

  const saveBeatsEdit = useCallback(async () => {
    if (!selectedPageId || !selectedPage) return;
    setScriptsError(null);
    let parsed: Record<string, unknown> | null = null;
    const raw = beatsEditDraft.trim();
    if (raw) {
      try {
        const v = JSON.parse(raw);
        if (!v || typeof v !== 'object' || Array.isArray(v)) {
          setScriptsError('Beats must be a JSON object.');
          return;
        }
        parsed = v as Record<string, unknown>;
      } catch {
        setScriptsError('Beats JSON is invalid.');
        return;
      }
    }
    setScriptsBusy(true);
    const ok = await updateWriterPageBeatsJson(selectedPageId, parsed);
    setScriptsBusy(false);
    if (!ok) {
      setScriptsError('Could not save beats. Check Supabase.');
      return;
    }
    if (selectedIssueId) {
      const pageRows = await listWriterPages(selectedIssueId);
      setPages(pageRows);
    }
    pushHistory(`saved edited beats (page ${selectedPage.page_number})`);
  }, [selectedPageId, selectedPage, beatsEditDraft, selectedIssueId, pushHistory]);

  const saveDialogueEdit = useCallback(async () => {
    if (!selectedPageId || !selectedPage) return;
    setScriptsError(null);
    setScriptsBusy(true);
    const text = dialogueEditDraft.trim() ? dialogueEditDraft : null;
    const ok = await updateWriterPageScriptText(selectedPageId, text);
    setScriptsBusy(false);
    if (!ok) {
      setScriptsError('Could not save dialogue. Check Supabase.');
      return;
    }
    if (selectedIssueId) {
      const pageRows = await listWriterPages(selectedIssueId);
      setPages(pageRows);
    }
    pushHistory(`saved edited dialogue (page ${selectedPage.page_number})`);
  }, [selectedPageId, selectedPage, dialogueEditDraft, selectedIssueId, pushHistory]);

  const saveShotPlanEdit = useCallback(async () => {
    if (!latestShotPlan) return;
    setScriptsError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(shotEditDraft || '{}');
    } catch {
      setScriptsError('Shot plan JSON is invalid.');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setScriptsError('Shot plan must be a JSON object.');
      return;
    }
    setScriptsBusy(true);
    const ok = await updateWriterVideoShotPlanJson(
      latestShotPlan.id,
      parsed as Record<string, unknown>,
    );
    setScriptsBusy(false);
    if (!ok) {
      setScriptsError('Could not save shot plan. Check Supabase.');
      return;
    }
    const rows = await listWriterShotPlansForIssue(latestShotPlan.issue_id);
    setShotPlans(rows);
    pushHistory(`saved edited shot plan v${latestShotPlan.version}`);
  }, [latestShotPlan, shotEditDraft, pushHistory]);

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
        <p className="text-[9px] text-black/50 leading-snug">
          <span className="inline-flex items-center gap-1.5 mr-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-600 shrink-0" aria-hidden />
            <span>= panel beats saved</span>
          </span>
          Multi-select pages for batch delete, clear beats or dialogue, or download bundles (Select all pages).
        </p>
        {sortedPages.length > 0 ? (
          <div className="flex flex-wrap gap-1 mb-1">
            <button
              type="button"
              disabled={!supabaseOk}
              onClick={() => setSelectedPageIdsForBatch(sortedPages.map((p) => p.id))}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-black border border-black/20 bg-white/80 disabled:opacity-45"
            >
              Select all pages
            </button>
            <button
              type="button"
              disabled={selectedPageIdsForBatch.length === 0}
              onClick={() => setSelectedPageIdsForBatch([])}
              className="rounded-md px-2 py-1 text-[10px] font-semibold text-black/70 border border-black/15 bg-white/50 disabled:opacity-40"
            >
              Clear selection
            </button>
          </div>
        ) : null}
        {selectedPageIdsForBatch.length > 0 ? (
          <div className="flex flex-wrap gap-1 mb-1">
            <button
              type="button"
              disabled={libraryPagesBusy || !supabaseOk}
              onClick={() => void runLibraryDeleteSelectedPages()}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-red-900 bg-red-100/90 border border-red-300/70 disabled:opacity-45"
            >
              Delete selected
            </button>
            <button
              type="button"
              disabled={libraryPagesBusy || !supabaseOk}
              onClick={() => void runLibraryClearBeatsSelected()}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-black border border-black/20 bg-white/80 disabled:opacity-45"
            >
              Clear beats
            </button>
            <button
              type="button"
              disabled={libraryPagesBusy || !supabaseOk}
              onClick={() => void runLibraryClearDialogueSelected()}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-black border border-black/20 bg-white/80 disabled:opacity-45"
            >
              Clear dialogue
            </button>
            <button
              type="button"
              disabled={!supabaseOk || selectedPagesForBatchExport.length === 0}
              onClick={() => downloadSelectedBeatsBundle()}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-black border border-black/20 bg-white/80 disabled:opacity-45"
            >
              Download beats
            </button>
            <button
              type="button"
              disabled={!supabaseOk || selectedPagesForBatchExport.length === 0}
              onClick={() => downloadSelectedDialogueBundle()}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-black border border-black/20 bg-white/80 disabled:opacity-45"
            >
              Download dialogue
            </button>
          </div>
        ) : null}
        <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1">
          {sortedPages.map((p) => {
            const batchOn = selectedPageIdsForBatch.includes(p.id);
            const primaryOn = selectedPageId === p.id;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 rounded-lg px-1 py-0.5 ${
                  primaryOn ? 'bg-black/10 ring-1 ring-black/15' : 'bg-white/30'
                }`}
              >
                <input
                  type="checkbox"
                  checked={batchOn}
                  disabled={!supabaseOk}
                  onChange={() => togglePageBatchSelect(p.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-black/40 shrink-0"
                  title="Select for batch delete, clear, or download"
                  aria-label={`Select page ${p.page_number} for batch`}
                />
                <Tooltip content={`Page ${p.page_number}`} side="left">
                  <button
                    type="button"
                    onClick={() => setSelectedPageId(p.id)}
                    className={`flex-1 min-w-0 text-left rounded-md px-2 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 flex items-center gap-2 ${
                      primaryOn ? 'font-bold text-black' : 'text-black/65 hover:bg-black/10'
                    }`}
                  >
                    <span
                      className={`shrink-0 h-2 w-2 rounded-full ${
                        pageRowHasPanelBeats(p)
                          ? 'bg-emerald-600 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]'
                          : 'bg-black/10 ring-1 ring-inset ring-black/15'
                      }`}
                      title={
                        pageRowHasPanelBeats(p)
                          ? 'Has saved panel beats'
                          : 'No panel beats yet'
                      }
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">Page {p.page_number}</span>
                  </button>
                </Tooltip>
              </div>
            );
          })}
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
      label: 'Download outline JSON',
      onClick: () => {
        if (!latestOutline) return;
        downloadJsonFile(`writer-outline-v${latestOutline.version}.json`, latestOutline.outline_json);
        pushHistory(`downloaded outline v${latestOutline.version}`);
      },
      disabled: !latestOutline,
    },
    {
      label: 'Copy issue pack (JSON)',
      onClick: () => copyIssuePackJson(),
      disabled: !selectedIssueId,
    },
    {
      label: 'Download issue pack',
      onClick: () => {
        downloadJsonFile('writer-issue-pack.json', issuePackObject);
      },
      disabled: !selectedIssueId,
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
        onSelectWorkspaceTabFromFile={(id) => {
          setActiveRibbonMenu('home');
          setActiveTab(id);
        }}
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
            id === 'scripts'
              ? false
              : id === 'outline'
                ? Boolean(latestOutline)
                : id === 'lore'
                  ? loreCards.length > 0
                : id === 'beats'
                  ? sortedPages.length > 0 && pagesWithBeatsCount >= sortedPages.length
                  : id === 'dialogue'
                    ? sortedPages.length > 0 &&
                      pagesWithScriptCount >= pagesWithBeatsCount &&
                      pagesWithBeatsCount > 0
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
                {imageWorkshopError ? (
                  <p className="mb-3 rounded-lg bg-red-100/90 px-3 py-2 text-xs text-red-800">
                    {imageWorkshopError}
                  </p>
                ) : null}
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
                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-black/70" htmlFor="writer-outline-supplement">
                      <span className="inline-flex items-center gap-1.5">
                        Outline instructions for AI (optional)
                        <WriterSectionTip tipKey="outlineInstructionsOptional" label="About outline instructions" />
                      </span>
                      <textarea
                        id="writer-outline-supplement"
                        name="writer-outline-supplement"
                        value={outlineSupplementDraft}
                        onChange={(e) => setOutlineSupplementDraft(e.target.value)}
                        rows={3}
                        disabled={!selectedIssueId}
                        className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder={
                          selectedIssueId
                            ? 'Optional: pacing, tone, act breaks, or “more pages per beat”. Sent only with Generate outline — not saved to the issue row.'
                            : 'Select an issue…'
                        }
                      />
                    </label>
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
                      <button
                        type="button"
                        disabled={!selectedIssueId || imageWorkshopBusy}
                        onClick={() => void openImageWorkshopFromWriter('outline')}
                        className="rounded-lg border border-black/20 bg-white/80 px-3 py-2 text-[11px] font-semibold text-black disabled:opacity-40"
                      >
                        {imageWorkshopBusy ? 'Opening…' : 'Open in Illustrator’s Imageshop'}
                      </button>
                      {outlineCoverageWarning && (
                        <button
                          type="button"
                          disabled={!supabaseOk || !selectedIssueId || outlineGenLoading}
                          onClick={() => void runOutlineGenerateCoverageBoost()}
                          className="rounded-lg px-3 py-2 text-[11px] font-bold text-black border border-amber-700/35 bg-amber-100/90 shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                        >
                          {outlineGenLoading
                            ? 'Regenerating with coverage boost…'
                            : 'Regenerate with page-coverage hint'}
                        </button>
                      )}
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
                    {outlineCoverageWarning && (
                      <div className="rounded-lg border border-amber-300/70 bg-amber-100/85 px-3 py-2 space-y-2">
                        <p className="text-xs text-amber-900">
                          Outline notes detected: {outlinePageBeatsCount} page beat
                          {outlinePageBeatsCount === 1 ? '' : 's'} for target {targetPageCount} pages (gap{' '}
                          {outlineCoverageGap}). Regenerate with coverage boost to reduce repeated mid-issue beats.
                        </p>
                        <button
                          type="button"
                          disabled={!supabaseOk || !selectedIssueId || outlineGenLoading}
                          onClick={() => void runOutlineGenerateCoverageBoost()}
                          className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-black border border-amber-800/30 bg-amber-50/90 shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                        >
                          {outlineGenLoading ? 'Regenerating…' : 'Regenerate with coverage boost'}
                        </button>
                      </div>
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
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              disabled={!latestOutline}
                              onClick={() => {
                                if (!latestOutline) return;
                                downloadJsonFile(
                                  `writer-outline-v${latestOutline.version}.json`,
                                  latestOutline.outline_json,
                                );
                                pushHistory(`downloaded outline v${latestOutline.version}`);
                              }}
                              className="rounded-md border border-black/20 bg-white/80 px-2 py-1 text-[10px] font-bold text-black disabled:opacity-40"
                            >
                              Download outline
                            </button>
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
                {activeTab === 'lore' && (
                  <div className={`${WRITER_GLASS_CARD} p-4 space-y-4`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/55">
                        Series lore cards
                      </p>
                      <WriterSectionTip tipKey="loreTab" label="About lore cards" />
                    </div>
                    {!selectedSeriesId ? (
                      <p className="text-xs text-black/50">{WRITER_UI_TIPS.seriesLibrary}</p>
                    ) : (
                      <>
                        <p className="text-xs text-black/65 leading-snug max-w-3xl">
                          Store worldbuilding, character facts, and locations for this series. Cards checked
                          below are included in <strong>Generate outline</strong> and <strong>page beats</strong>{' '}
                          prompts (truncated if very large).
                        </p>
                        <div className="rounded-xl border border-black/10 bg-white/40 p-3 space-y-3 max-w-3xl">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                            {loreEditingId ? 'Edit card' : 'New card'}
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1 text-[11px] font-semibold text-black/70">
                              Title
                              <input
                                type="text"
                                value={loreDraftTitle}
                                onChange={(e) => setLoreDraftTitle(e.target.value)}
                                className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black"
                                placeholder="e.g. The Silver Compact"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] font-semibold text-black/70">
                              Category
                              <input
                                type="text"
                                value={loreDraftCategory}
                                onChange={(e) => setLoreDraftCategory(e.target.value)}
                                className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black"
                                placeholder="world · character · place · rule · timeline"
                              />
                            </label>
                          </div>
                          <label className="flex flex-col gap-1 text-[11px] font-semibold text-black/70">
                            Body
                            <textarea
                              value={loreDraftBody}
                              onChange={(e) => setLoreDraftBody(e.target.value)}
                              rows={5}
                              className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y min-h-[100px]"
                              placeholder="Facts, tone, relationships, geography — what the AI should remember."
                            />
                          </label>
                          <div className="flex flex-wrap items-center gap-4">
                            <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-black/75 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={loreDraftInclude}
                                onChange={(e) => setLoreDraftInclude(e.target.checked)}
                                className="rounded border-black/30"
                              />
                              Include in AI prompts
                            </label>
                            <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-black/70">
                              Sort order
                              <input
                                type="number"
                                value={loreDraftSort}
                                onChange={(e) => setLoreDraftSort(Number(e.target.value) || 0)}
                                className="w-20 rounded-lg border border-black/15 bg-white px-2 py-1 text-sm text-black"
                              />
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!supabaseOk || loreBusy || !loreDraftTitle.trim()}
                              onClick={async () => {
                                if (!selectedSeriesId || !loreDraftTitle.trim()) return;
                                setLoreBusy(true);
                                if (loreEditingId) {
                                  const ok = await updateWriterLoreCard(loreEditingId, {
                                    title: loreDraftTitle.trim(),
                                    category: loreDraftCategory.trim() || 'general',
                                    body: loreDraftBody,
                                    include_in_prompt: loreDraftInclude,
                                    sort_order: loreDraftSort,
                                  });
                                  setLoreBusy(false);
                                  if (!ok) {
                                    pushHistory('error: save lore card');
                                    return;
                                  }
                                  pushHistory('updated lore card');
                                } else {
                                  const row = await createWriterLoreCard({
                                    series_id: selectedSeriesId,
                                    title: loreDraftTitle.trim(),
                                    category: loreDraftCategory.trim() || 'world',
                                    body: loreDraftBody,
                                    include_in_prompt: loreDraftInclude,
                                    sort_order: loreDraftSort,
                                  });
                                  setLoreBusy(false);
                                  if (!row) {
                                    pushHistory('error: create lore card');
                                    return;
                                  }
                                  pushHistory('created lore card');
                                }
                                setLoreEditingId(null);
                                setLoreDraftTitle('');
                                setLoreDraftCategory('world');
                                setLoreDraftBody('');
                                setLoreDraftInclude(true);
                                setLoreDraftSort(0);
                                await reloadLoreCards();
                              }}
                              className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45"
                              style={{ background: ACCENT_GOLD_GRADIENT }}
                            >
                              {loreEditingId ? 'Save changes' : 'Add card'}
                            </button>
                            {loreEditingId ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setLoreEditingId(null);
                                  setLoreDraftTitle('');
                                  setLoreDraftCategory('world');
                                  setLoreDraftBody('');
                                  setLoreDraftInclude(true);
                                  setLoreDraftSort(0);
                                }}
                                className="rounded-lg px-3 py-2 text-xs font-semibold text-black/70 border border-black/20 bg-white/80"
                              >
                                Cancel edit
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className="rounded-xl border border-black/10 bg-white/40 p-3 space-y-3 max-w-3xl">
                          <button
                            type="button"
                            onClick={() => setLoreImportOpen((v) => !v)}
                            className="w-full flex items-center justify-between gap-2 text-left"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                              Import JSON
                            </span>
                            <span className="text-[10px] font-bold text-black/50">{loreImportOpen ? 'Hide' : 'Show'}</span>
                          </button>
                          {loreImportOpen ? (
                            <div className="space-y-2">
                              <p className="text-xs text-black/60 leading-snug">
                                Paste a JSON array of objects with <strong>title</strong> (required) and optional{' '}
                                <strong>category</strong>, <strong>body</strong>, <strong>include_in_prompt</strong>.
                                Duplicates are skipped by normalized (category,title).
                              </p>
                              <textarea
                                value={loreImportJsonDraft}
                                onChange={(e) => setLoreImportJsonDraft(e.target.value)}
                                rows={8}
                                className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-black font-mono resize-y min-h-[140px]"
                                placeholder='[\n  {"title":"The Silver Compact","category":"world","body":"...","include_in_prompt":true}\n]'
                              />
                              {loreImportError ? (
                                <p className="text-xs text-red-800 bg-red-100/80 rounded-lg px-3 py-2">{loreImportError}</p>
                              ) : null}
                              {loreImportResult ? (
                                <p className="text-xs text-emerald-900 bg-emerald-100/70 rounded-lg px-3 py-2">
                                  Imported {loreImportResult.imported}. Skipped duplicates (existing):{' '}
                                  {loreImportResult.skippedExisting}. Skipped duplicates (payload):{' '}
                                  {loreImportResult.skippedPayload}. Invalid: {loreImportResult.invalid}.
                                </p>
                              ) : null}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={!supabaseOk || loreImportBusy || !loreImportJsonDraft.trim()}
                                  onClick={() => void runLoreJsonImport()}
                                  className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                                  style={{ background: ACCENT_GOLD_GRADIENT }}
                                >
                                  {loreImportBusy ? 'Importing…' : 'Import'}
                                </button>
                                <button
                                  type="button"
                                  disabled={loreImportBusy}
                                  onClick={() => {
                                    setLoreImportJsonDraft('');
                                    setLoreImportError(null);
                                    setLoreImportResult(null);
                                  }}
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-black/70 border border-black/20 bg-white/80 disabled:opacity-45"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                            Cards ({loreCards.length})
                          </p>
                          {loreBusy && loreCards.length === 0 ? (
                            <p className="text-xs text-black/50">Loading…</p>
                          ) : loreCards.length === 0 ? (
                            <p className="text-xs text-black/50">No lore cards yet. Add one above.</p>
                          ) : (
                            <ul className="space-y-2 max-w-4xl">
                              {loreCards.map((c) => (
                                <li
                                  key={c.id}
                                  className="rounded-xl border border-black/10 bg-white/35 p-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-black truncate">
                                      {c.title || 'Untitled'}
                                      <span className="font-normal text-black/55 text-xs ml-2">
                                        ({c.category})
                                      </span>
                                      {!c.include_in_prompt ? (
                                        <span className="ml-2 text-[10px] font-bold uppercase text-amber-900/80">
                                          excluded from AI
                                        </span>
                                      ) : null}
                                    </p>
                                    <p className="text-xs text-black/75 whitespace-pre-wrap mt-1">
                                      {c.body || '(empty body)'}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLoreEditingId(c.id);
                                        setLoreDraftTitle(c.title);
                                        setLoreDraftCategory(c.category);
                                        setLoreDraftBody(c.body);
                                        setLoreDraftInclude(c.include_in_prompt);
                                        setLoreDraftSort(c.sort_order);
                                      }}
                                      className="rounded-md px-2 py-1 text-[10px] font-bold border border-black/20 bg-white/80"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      disabled={loreBusy}
                                      onClick={async () => {
                                        if (!window.confirm('Delete this lore card?')) return;
                                        setLoreBusy(true);
                                        const ok = await deleteWriterLoreCard(c.id);
                                        setLoreBusy(false);
                                        if (!ok) {
                                          pushHistory('error: delete lore card');
                                          return;
                                        }
                                        if (loreEditingId === c.id) {
                                          setLoreEditingId(null);
                                          setLoreDraftTitle('');
                                          setLoreDraftCategory('world');
                                          setLoreDraftBody('');
                                          setLoreDraftInclude(true);
                                          setLoreDraftSort(0);
                                        }
                                        pushHistory('deleted lore card');
                                        await reloadLoreCards();
                                      }}
                                      className="rounded-md px-2 py-1 text-[10px] font-bold text-red-900 border border-red-300/70 bg-red-50/90"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {activeTab === 'beats' && (
                  <div className={`${WRITER_GLASS_CARD} p-4`}>
                    <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,48%)] xl:items-start xl:gap-4">
                      <div className="min-w-0 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/55">
                            Page beats
                          </p>
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
                              {beatsBatchBusy ? beatsBatchLabel || 'Batch…' : 'Generate all beats'}
                            </button>
                          </Tooltip>
                          {beatsBatchBusy && beatsBatchSource === 'all' ? (
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
                        <div className="space-y-1 min-w-0 xl:max-w-none">
                          <div className="flex items-center gap-1.5">
                            <label
                              className="text-[11px] font-semibold text-black/70"
                              htmlFor="writer-beats-director-notes"
                            >
                              Director notes for beats (optional)
                            </label>
                            <WriterSectionTip tipKey="beatsDirectorNotes" label="About director notes for beats" />
                          </div>
                          <textarea
                            id="writer-beats-director-notes"
                            name="writer-beats-director-notes"
                            rows={4}
                            value={beatsDirectorNotesDraft}
                            onChange={(e) => setBeatsDirectorNotesDraft(e.target.value)}
                            disabled={!selectedIssueId}
                            placeholder="e.g. Pages 3–4 = double-page spread (council); vary panel sizes; more props/lighting detail. Not sent to outline — only page_beats."
                            className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y min-h-[72px] disabled:opacity-50"
                          />
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
                                const atCap =
                                  beatsPickPageIds.length >= WRITER_PAGE_BEATS_ISSUE_MAX && !checked;
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
                                Maximum {WRITER_PAGE_BEATS_ISSUE_MAX} pages per batch. Clear a pick to choose
                                another.
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
                              const notesTrim = beatsDirectorNotesDraft.trim();
                              const res = await invokeWriterTools({
                                mode: 'page_beats',
                                page_id: selectedPageId,
                                ...(notesTrim ? { director_notes_for_beats: notesTrim } : {}),
                              });
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
                          <button
                            type="button"
                            disabled={!selectedPageId || imageWorkshopBusy}
                            onClick={() => void openImageWorkshopFromWriter('page')}
                            className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                          >
                            {imageWorkshopBusy ? 'Opening…' : 'Send page to Illustrator’s Imageshop'}
                          </button>
                          <button
                            type="button"
                            disabled={!selectedPage?.beats_json}
                            onClick={() => {
                              if (!selectedPage?.beats_json) return;
                              downloadJsonFile(
                                `writer-beats-page-${selectedPage.page_number}.json`,
                                selectedPage.beats_json,
                              );
                              pushHistory(`downloaded beats page ${selectedPage.page_number}`);
                            }}
                            className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                          >
                            Download beats (this page)
                          </button>
                          <button
                            type="button"
                            disabled={
                              !supabaseOk || !selectedPageId || libraryPagesBusy || !selectedPage?.beats_json
                            }
                            onClick={() => void clearBeatsForSelectedPage()}
                            className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                          >
                            Clear beats (this page)
                          </button>
                        </div>
                        {beatsError && (
                          <p className="text-xs text-red-800 bg-red-100/80 rounded-lg px-3 py-2">{beatsError}</p>
                        )}
                      </div>
                      <aside
                        className="min-w-0 flex flex-col xl:sticky xl:top-2 xl:max-h-[min(calc(100dvh-10rem),920px)] xl:min-h-[min(280px,40vh)]"
                        aria-label="Beats preview"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-black/50 mb-1 shrink-0">
                          Beats for selected page
                        </p>
                        {selectedPage?.beats_json ? (
                          <pre
                            className={`${preShell} ${preFont} flex-1 min-h-[min(200px,28vh)] max-h-[min(420px,50vh)] xl:min-h-[min(320px,45vh)] xl:max-h-[min(calc(100dvh-12rem),720px)]`}
                          >
                            <WriterHighlightedText
                              text={beatsJsonString}
                              query={findQuery}
                              activeMatchIndex={findActiveIndex}
                            />
                          </pre>
                        ) : (
                          <p className="text-xs text-black/50 rounded-xl border border-white/20 bg-black/10 px-3 py-4 xl:flex-1 xl:min-h-[12rem]">
                            No beats yet for this page.
                          </p>
                        )}
                      </aside>
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
                          !supabaseOk || !selectedPageId || dialogueLoading || libraryPagesBusy
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
                      <button
                        type="button"
                        disabled={!selectedPage?.script_text?.trim()}
                        onClick={() => {
                          if (!selectedPage?.script_text) return;
                          downloadTextFile(
                            `writer-dialogue-page-${selectedPage.page_number}.txt`,
                            selectedPage.script_text,
                            'text/plain;charset=utf-8',
                          );
                          pushHistory(`downloaded dialogue page ${selectedPage.page_number}`);
                        }}
                        className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                      >
                        Download dialogue (this page)
                      </button>
                      <button
                        type="button"
                        disabled={
                          !supabaseOk || !selectedPageId || libraryPagesBusy || !selectedPage?.script_text?.trim()
                        }
                        onClick={() => void clearDialogueForSelectedPage()}
                        className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                      >
                        Clear dialogue (this page)
                      </button>
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
                    {selectedIssueId ? (
                      <div className="space-y-3 rounded-xl border border-black/10 bg-black/[0.03] p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                            Length explorer
                          </p>
                          <WriterSectionTip tipKey="arcLengthExplore" label="About length explorer" />
                        </div>
                        <p className="text-[10px] text-black/50 leading-snug">
                          Outline target: {targetPageCount} pages · Script: {sortedPages.length} page
                          {sortedPages.length === 1 ? '' : 's'} · Outline beats: {outlinePageBeatsCount}
                        </p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-black/60">
                            <span>Hypothetical length: {pacingExplorePages} pages</span>
                            <span className="tabular-nums">
                              Beats/page:{' '}
                              {(outlinePageBeatsCount / Math.max(1, pacingExplorePages)).toFixed(2)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={arcPacingExploreMax}
                            value={Math.min(pacingExplorePages, arcPacingExploreMax)}
                            onChange={(e) =>
                              setPacingExplorePages(
                                Math.max(1, Math.min(arcPacingExploreMax, Number(e.target.value) || 1)),
                              )
                            }
                            className="w-full accent-amber-700"
                            aria-label="Hypothetical issue page count for pacing density"
                          />
                          <div className="flex justify-between text-[9px] text-black/45">
                            <span>1</span>
                            <span>max {arcPacingExploreMax}</span>
                          </div>
                        </div>
                        <div className="rounded-lg border border-black/10 bg-white/40 px-2 py-1.5 text-[10px] text-black/75 space-y-1">
                          <p className="tabular-nums">
                            vs script: {pacingExplorePages >= sortedPages.length ? '+' : ''}
                            {pacingExplorePages - sortedPages.length} pages
                          </p>
                          <p className="tabular-nums">
                            vs outline target: {pacingExplorePages >= targetPageCount ? '+' : ''}
                            {pacingExplorePages - targetPageCount} pages
                          </p>
                          <p className="text-black/60 pt-0.5">
                            {pacingExplorePages < sortedPages.length
                              ? 'Structural hint: fewer pages than your script — compress or trim panels/beats to raise density.'
                              : pacingExplorePages > sortedPages.length
                                ? 'Structural hint: more pages than your script — room to spread moments for breathing room.'
                                : 'Structural hint: matches current script length.'}
                          </p>
                        </div>
                        <div
                          className="relative h-2 rounded-full bg-gradient-to-r from-teal-700/35 via-white/50 to-amber-700/40 border border-black/10"
                          aria-hidden
                        >
                          {(() => {
                            const max = Math.max(1, arcPacingExploreMax - 1);
                            const scriptPct = ((Math.min(sortedPages.length, arcPacingExploreMax) - 1) / max) * 100;
                            const explorePct = ((Math.min(pacingExplorePages, arcPacingExploreMax) - 1) / max) * 100;
                            return (
                              <>
                                <span
                                  className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-black/55"
                                  style={{ left: `clamp(0%, ${scriptPct}%, 100%)` }}
                                  title="Script pages"
                                />
                                <span
                                  className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-amber-700"
                                  style={{ left: `clamp(0%, ${explorePct}%, 100%)` }}
                                  title="Explorer"
                                />
                              </>
                            );
                          })()}
                        </div>
                        <p className="text-[9px] text-black/45">
                          Bar: black tick = script length · amber = explorer · compress → expand (cosmetic only).
                        </p>
                        <button
                          type="button"
                          className="rounded-md border border-black/15 bg-white/80 px-2 py-1 text-[10px] font-bold text-black hover:bg-white disabled:opacity-40"
                          onClick={() => setTargetPageCount(pacingExplorePages)}
                        >
                          Use {pacingExplorePages} as outline target
                        </button>
                      </div>
                    ) : null}
                    {pacingLengthAlignment ? (
                      <div className="space-y-2 rounded-xl border border-amber-800/25 bg-amber-50/80 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-950/90">
                          Length alignment (last pacing run)
                        </p>
                        <p className="text-[10px] text-black/55">
                          Editorial estimate toward strong pacing — not a guarantee of a &quot;10&quot; score.
                        </p>
                        <ul className="text-[11px] text-black/85 space-y-1 list-disc list-inside">
                          {pacingLengthAlignment.target_pages != null ? (
                            <li>Target (planning): {pacingLengthAlignment.target_pages} pages</li>
                          ) : null}
                          <li>Script pages (measured): {pacingLengthAlignment.script_pages}</li>
                          <li>Outline beats (measured): {pacingLengthAlignment.outline_beats}</li>
                          <li>
                            Suggested page delta:{' '}
                            {pacingLengthAlignment.suggested_page_delta >= 0 ? '+' : ''}
                            {pacingLengthAlignment.suggested_page_delta} pages
                          </li>
                          {pacingLengthAlignment.suggested_beat_delta != null ? (
                            <li>
                              Suggested beat delta:{' '}
                              {pacingLengthAlignment.suggested_beat_delta >= 0 ? '+' : ''}
                              {pacingLengthAlignment.suggested_beat_delta} beats
                            </li>
                          ) : null}
                        </ul>
                        <p className="text-[11px] text-black/80 leading-snug">{pacingLengthAlignment.rationale}</p>
                      </div>
                    ) : null}
                    <div className="space-y-3 rounded-xl border border-black/10 bg-black/[0.03] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">Pacing review</p>
                      <button
                        type="button"
                        disabled={!supabaseOk || !selectedIssueId || pacingLoading || arcBatchBusy}
                        onClick={async () => {
                          if (!selectedIssueId) return;
                          setPacingError(null);
                          setPacingLoading(true);
                          const res = await invokeWriterTools({
                            mode: 'pacing_review',
                            issue_id: selectedIssueId,
                            target_page_count: targetPageCount,
                          });
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
                    <button
                      type="button"
                      disabled={!selectedIssueId || !latestShotPlan || imageWorkshopBusy}
                      onClick={() => void openImageWorkshopFromWriter('shot-plan')}
                      className="rounded-lg border border-black/20 bg-white/80 px-3 py-2 text-[11px] font-semibold text-black disabled:opacity-40"
                    >
                      {imageWorkshopBusy ? 'Opening…' : 'Send shot plan to Illustrator’s Imageshop'}
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
                {activeTab === 'scripts' && (
                  <div className={`${WRITER_GLASS_CARD} p-4 space-y-6`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-lg font-bold text-black">Scripts & exports</p>
                      <WriterSectionTip tipKey="scriptsTab" label="About synopsis helper and exports" />
                    </div>
                    {!selectedIssueId ? (
                      <p className="text-sm text-black/55">Select an issue in the Library to use this tab.</p>
                    ) : (
                      <>
                        {scriptsError && (
                          <p className="text-xs text-red-800 bg-red-100/80 rounded-lg px-3 py-2">{scriptsError}</p>
                        )}
                        {sortedPages.length > 0 ? (
                          <div
                            className="rounded-xl border border-black/10 bg-white/40 px-3 py-2.5 space-y-2"
                            aria-label="Panel beats coverage for this issue"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-black/55">
                                Panel beats (this issue)
                              </p>
                              <p className="text-[11px] font-semibold text-black/70 tabular-nums">
                                {pagesWithBeatsCount} / {sortedPages.length} pages
                              </p>
                            </div>
                            <p className="text-[9px] text-black/45 leading-snug">
                              Green dot = saved beats in the database. Click a page to open the Beats tab and select it.
                            </p>
                            <div className="flex flex-wrap gap-1 max-h-[4.5rem] overflow-y-auto custom-scrollbar pr-0.5">
                              {sortedPages.map((p) => {
                                const hasBeats = pageRowHasPanelBeats(p);
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPageId(p.id);
                                      setActiveTab('beats');
                                      setDockCollapsed(false);
                                      setDockTab('library');
                                    }}
                                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                                      selectedPageId === p.id
                                        ? 'border-amber-700/80 bg-amber-100/90 text-black'
                                        : 'border-black/15 bg-white/70 text-black/75 hover:bg-white'
                                    }`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                        hasBeats
                                          ? 'bg-emerald-600'
                                          : 'bg-black/12 ring-1 ring-inset ring-black/12'
                                      }`}
                                      aria-hidden
                                    />
                                    {p.page_number}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                        <div className="grid gap-6 xl:grid-cols-2">
                          <div className="space-y-3 rounded-xl border border-black/10 bg-black/[0.03] p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                              Synopsis helper
                            </p>
                            <p className="text-[11px] text-black/60 leading-snug">
                              Structured fields save under{' '}
                              <code className="rounded bg-black/10 px-1">notes.synopsis_helper</code> on the issue row.
                              Build a labeled synopsis into the Issue Outline draft, then{' '}
                              <strong>Save story context</strong> there to persist it as{' '}
                              <code className="rounded bg-black/10 px-1">synopsis</code>.
                            </p>
                            <div className="space-y-2 max-h-[min(480px,55vh)] overflow-y-auto custom-scrollbar pr-1">
                              <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
                                Logline
                                <textarea
                                  value={synopsisHelperParts.logline}
                                  onChange={(e) =>
                                    setSynopsisHelperParts((p) => ({ ...p, logline: e.target.value }))
                                  }
                                  rows={2}
                                  className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y"
                                  placeholder="One or two sentences…"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
                                Must-happen beats (one per line, in order)
                                <textarea
                                  value={synopsisHelperParts.mustHappen}
                                  onChange={(e) =>
                                    setSynopsisHelperParts((p) => ({ ...p, mustHappen: e.target.value }))
                                  }
                                  rows={5}
                                  className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y font-mono text-xs"
                                  placeholder={'1. …\n2. …'}
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
                                Pacing / structure
                                <textarea
                                  value={synopsisHelperParts.pacingNotes}
                                  onChange={(e) =>
                                    setSynopsisHelperParts((p) => ({ ...p, pacingNotes: e.target.value }))
                                  }
                                  rows={2}
                                  className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y"
                                  placeholder="Act breaks, page targets, midpoint…"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
                                Cast (this issue)
                                <textarea
                                  value={synopsisHelperParts.castGoals}
                                  onChange={(e) =>
                                    setSynopsisHelperParts((p) => ({ ...p, castGoals: e.target.value }))
                                  }
                                  rows={3}
                                  className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
                                Factions / threats
                                <textarea
                                  value={synopsisHelperParts.factions}
                                  onChange={(e) =>
                                    setSynopsisHelperParts((p) => ({ ...p, factions: e.target.value }))
                                  }
                                  rows={2}
                                  className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
                                Locations / sets
                                <textarea
                                  value={synopsisHelperParts.locations}
                                  onChange={(e) =>
                                    setSynopsisHelperParts((p) => ({ ...p, locations: e.target.value }))
                                  }
                                  rows={2}
                                  className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
                                Rules for the outline
                                <textarea
                                  value={synopsisHelperParts.rules}
                                  onChange={(e) =>
                                    setSynopsisHelperParts((p) => ({ ...p, rules: e.target.value }))
                                  }
                                  rows={2}
                                  className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y"
                                  placeholder="e.g. no repeating beats across adjacent pages…"
                                />
                              </label>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={!supabaseOk || scriptsBusy}
                                onClick={() => void saveSynopsisHelperToNotes()}
                                className="rounded-lg px-3 py-2 text-[11px] font-bold text-black border border-black/20 bg-white shadow-sm disabled:opacity-45"
                              >
                                {scriptsBusy ? 'Saving…' : 'Save helper to issue notes'}
                              </button>
                              <button
                                type="button"
                                onClick={() => applyBuiltSynopsis()}
                                className="rounded-lg px-3 py-2 text-[11px] font-bold text-black shadow-sm disabled:opacity-45"
                                style={{ background: ACCENT_GOLD_GRADIENT }}
                              >
                                Build synopsis → Issue Outline draft
                              </button>
                            </div>
                          </div>
                          <div className="space-y-3 rounded-xl border border-black/10 bg-black/[0.03] p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                              Copy & download
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => copyIssuePackJson()}
                                className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black"
                              >
                                Copy issue pack (JSON)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  downloadJsonFile('writer-issue-pack.json', issuePackObject);
                                  pushHistory('downloaded issue pack');
                                }}
                                className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black"
                              >
                                Download issue pack
                              </button>
                              <button
                                type="button"
                                disabled={!arcReviewPlain}
                                onClick={() => void navigator.clipboard.writeText(arcReviewPlain)}
                                className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                              >
                                Copy arc review
                              </button>
                              <button
                                type="button"
                                disabled={!arcReviewPlain}
                                onClick={() => {
                                  downloadTextFile(
                                    'writer-arc-review.txt',
                                    arcReviewPlain,
                                    'text/plain;charset=utf-8',
                                  );
                                  pushHistory('downloaded arc review');
                                }}
                                className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                              >
                                Download arc review
                              </button>
                            </div>
                            <p className="text-[10px] text-black/50 leading-snug">
                              Issue pack includes synopsis, full outline &amp; shot plan JSON, all page beats and
                              dialogue, and pacing/canon cache. For selected pages only, use Library → Pages batch
                              actions.
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3 rounded-xl border border-black/10 bg-black/[0.03] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                            Edit saved outputs
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                ['synopsis', 'Synopsis preview'],
                                ['outline', 'Outline JSON'],
                                ['beats', 'Beats JSON'],
                                ['dialogue', 'Dialogue'],
                                ['video', 'Shot plan JSON'],
                              ] as const
                            ).map(([id, label]) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => setScriptsEditorTab(id)}
                                className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase border ${
                                  scriptsEditorTab === id
                                    ? 'border-amber-700 bg-amber-100 text-black'
                                    : 'border-black/15 bg-white/60 text-black/70 hover:bg-white/90'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {scriptsEditorTab === 'synopsis' && (
                            <div className="space-y-3">
                              <p className="text-[11px] text-black/60">
                                Preview of the combined document from helper fields (not yet saved as issue synopsis
                                until you use <strong>Build synopsis</strong> and <strong>Save story context</strong> on
                                Issue Outline).
                              </p>
                              <pre
                                className={`${preShell} ${preFont} max-h-[min(240px,35vh)] text-xs whitespace-pre-wrap`}
                              >
                                {buildSynopsisDocumentFromParts(synopsisHelperParts) || '(helper fields empty)'}
                              </pre>
                              <p className="text-[10px] font-semibold text-black/55">Issue synopsis draft (Issue Outline tab)</p>
                              <pre
                                className={`${preShell} ${preFont} max-h-[min(200px,30vh)] text-xs whitespace-pre-wrap`}
                              >
                                {issueSynopsisDraft.trim() || '(empty — edit on Issue Outline)'}
                              </pre>
                            </div>
                          )}
                          {scriptsEditorTab === 'outline' && (
                            <div className="space-y-2">
                              {!latestOutline ? (
                                <p className="text-xs text-black/50">No saved outline for this issue.</p>
                              ) : (
                                <>
                                  <p className="text-[10px] text-black/50">
                                    Editing outline v{latestOutline.version}. Invalid JSON will not save.
                                  </p>
                                  <textarea
                                    value={outlineEditDraft}
                                    onChange={(e) => setOutlineEditDraft(e.target.value)}
                                    className={`w-full min-h-[min(360px,45vh)] rounded-lg border border-black/15 bg-white px-2 py-1.5 ${preFont} text-xs text-black resize-y`}
                                    spellCheck={false}
                                  />
                                  <button
                                    type="button"
                                    disabled={!supabaseOk || scriptsBusy}
                                    onClick={() => void saveOutlineEdit()}
                                    className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45"
                                    style={{ background: ACCENT_GOLD_GRADIENT }}
                                  >
                                    {scriptsBusy ? 'Saving…' : 'Save outline to database'}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                          {scriptsEditorTab === 'beats' && (
                            <div className="space-y-2">
                              {!selectedPage ? (
                                <p className="text-xs text-black/50">Select a page in the Library.</p>
                              ) : (
                                <>
                                  <p className="text-[10px] text-black/50">
                                    Page {selectedPage.page_number}. Empty JSON clears beats.
                                  </p>
                                  <textarea
                                    value={beatsEditDraft}
                                    onChange={(e) => setBeatsEditDraft(e.target.value)}
                                    className={`w-full min-h-[min(360px,45vh)] rounded-lg border border-black/15 bg-white px-2 py-1.5 ${preFont} text-xs text-black resize-y`}
                                    spellCheck={false}
                                  />
                                  <button
                                    type="button"
                                    disabled={!supabaseOk || scriptsBusy}
                                    onClick={() => void saveBeatsEdit()}
                                    className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45"
                                    style={{ background: ACCENT_GOLD_GRADIENT }}
                                  >
                                    {scriptsBusy ? 'Saving…' : 'Save beats to database'}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                          {scriptsEditorTab === 'dialogue' && (
                            <div className="space-y-2">
                              {!selectedPage ? (
                                <p className="text-xs text-black/50">Select a page in the Library.</p>
                              ) : (
                                <>
                                  <p className="text-[10px] text-black/50">Page {selectedPage.page_number} script_text</p>
                                  <textarea
                                    value={dialogueEditDraft}
                                    onChange={(e) => setDialogueEditDraft(e.target.value)}
                                    className="w-full min-h-[min(360px,45vh)] rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y"
                                  />
                                  <button
                                    type="button"
                                    disabled={!supabaseOk || scriptsBusy}
                                    onClick={() => void saveDialogueEdit()}
                                    className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45"
                                    style={{ background: ACCENT_GOLD_GRADIENT }}
                                  >
                                    {scriptsBusy ? 'Saving…' : 'Save dialogue to database'}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                          {scriptsEditorTab === 'video' && (
                            <div className="space-y-2">
                              {!latestShotPlan ? (
                                <p className="text-xs text-black/50">No shot plan for this issue.</p>
                              ) : (
                                <>
                                  <p className="text-[10px] text-black/50">
                                    Editing shot plan v{latestShotPlan.version}
                                  </p>
                                  <textarea
                                    value={shotEditDraft}
                                    onChange={(e) => setShotEditDraft(e.target.value)}
                                    className={`w-full min-h-[min(360px,45vh)] rounded-lg border border-black/15 bg-white px-2 py-1.5 ${preFont} text-xs text-black resize-y`}
                                    spellCheck={false}
                                  />
                                  <button
                                    type="button"
                                    disabled={!supabaseOk || scriptsBusy}
                                    onClick={() => void saveShotPlanEdit()}
                                    className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45"
                                    style={{ background: ACCENT_GOLD_GRADIENT }}
                                  >
                                    {scriptsBusy ? 'Saving…' : 'Save shot plan to database'}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
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
