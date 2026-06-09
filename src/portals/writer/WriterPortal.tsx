import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Edit3,
  FileUp,
  FolderOpen,
  HelpCircle,
  Image,
  Loader2,
  Lock,
  ShieldCheck,
  Trash2,
  Unlock,
} from 'lucide-react';
import {
  clearWriterPagesBeatsJson,
  clearWriterPagesScriptText,
  createWriterIssue,
  createWriterPage,
  createWriterLoreCard,
  createWriterSeries,
  deleteLatestWriterOutline,
  deleteWriterIssue,
  deleteWriterLoreCard,
  deleteWriterPages,
  deleteWriterSeries,
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
import { uploadImageFileToArcsGenerations } from '@/shared/api/arcsPersistence';
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
  formatBeatsBundleAsMarkdown,
  formatBeatsBundleAsText,
  formatDialogueBundleAsFountain,
  formatDialogueBundleAsText,
  formatOutlineAsMarkdown,
  formatOutlineAsText,
} from '@/portals/writer/writerExportFormats';
import {
  countFindMatches,
  formatArcReviewPlainText,
  getWriterSearchableText,
  type WriterWorkspaceTabId,
  WRITER_WORKSPACE_TAB_LABELS,
  WRITER_WORKSPACE_TAB_ORDER,
} from '@/portals/writer/writerSearch';
import {
  buildWriterWorkflowSteps,
  type WriterWorkflowStep,
  type WriterWorkflowStepId,
} from '@/portals/writer/writerWorkflowChronology';
import {
  buildWriterPageEditReview,
  summarizeWriterPageEditReview,
  type WriterPageEditLayer,
} from '@/portals/writer/writerPageEditReview';
import {
  EMPTY_AUTHOR_OUTLINE_SOURCE,
  buildSynopsisDocumentFromParts,
  EMPTY_SYNOPSIS_HELPER_PARTS,
  mergeAuthorOutlineIntoNotes,
  mergeSynopsisHelperIntoNotes,
  readAuthorOutlineFromNotes,
  readSynopsisHelperFromNotes,
  type AuthorOutlineMode,
  type AuthorOutlineSource,
  type SynopsisHelperParts,
} from '@/portals/writer/writerSynopsisHelper';
import {
  buildWriterVisualReferenceDigest,
  mergeVisualReferencesIntoSynopsisParts,
  mergeWriterVisualReferenceIntoNotes,
  readWriterVisualReferencesFromNotes,
  removeWriterVisualReferenceFromNotes,
  type WriterVisualReference,
  type WriterVisualReferenceKind,
} from '@/portals/writer/writerVisualReferences';
import {
  EMPTY_WRITER_PRODUCTION_DEFAULTS,
  mergeProductionDefaultsIntoNotes,
  productionDefaultsToPayload,
  readProductionDefaultsFromNotes,
  resolveProductionDefaults,
  type WriterProductionDefaults,
} from '@/portals/writer/writerProductionDefaults';
import {
  WRITER_HIERARCHY_NODE_KINDS,
  deleteHierarchyNode,
  importHierarchyFromJson,
  importHierarchyFromText,
  mergeHierarchyIntoNotes,
  moveHierarchyNode,
  readHierarchyFromNotes,
  updateHierarchyNode,
  type WriterHierarchyNode,
} from '@/portals/writer/writerHierarchy';
import {
  buildGuidedComicsHandoffExport,
  buildPreferredWriterExport,
  formatIssuePackAsMarkdown,
  summarizePageBeatMetadata,
  summarizeWriterAuditModes,
  summarizeWriterProductionBranches,
} from '@/portals/writer/writerProductionBranches';
import {
  filterUnlockedWriterPageIds,
  isWriterItemLocked,
  mergeWriterLockIntoNotes,
  readWriterLocksFromNotes,
  writerPageBeatsLockKey,
  writerPageDialogueLockKey,
  type WriterLockEntry,
  type WriterLockKey,
} from '@/portals/writer/writerProtectionLocks';
import {
  mergeWriterDraftsIntoNotes,
  readWriterDraftsFromNotes,
  type WriterDraftKey,
} from '@/portals/writer/writerDraftPersistence';
import { buildWriterRegenerationScope, type WriterRegenerationScope } from '@/portals/writer/writerRegenerationScope';
import { mergeWriterStorySnapshotIntoNotes } from '@/portals/writer/writerStorySnapshots';
import {
  OBSIDIAN_LORE_TYPE_OPTIONS,
  buildLoreBodyFromObsidianEntry,
  parseObsidianLoreImport,
  readLoreImportMetadataFromBody,
  resolveObsidianLoreDuplicate,
  stripLoreImportMetadataFromBody,
  type ObsidianLoreDuplicateAction,
  type ObsidianLoreEntry,
  type ObsidianLoreExistingEntry,
  type ObsidianLoreImage,
} from '@/portals/writer/obsidianLoreImport';
import { buildImageWorkshopDraftFromWriterSelection } from '@/portals/storyline/imageWorkshopPlanning';
import { mergeImageshopImageMapIntoWriterBeats } from '@/portals/writer/writerImageshopReturn';
import { getCharacterAlbums, type VaultCharacterAlbum, type VaultCharacterItem } from '@/shared/api/arcsVault';
import { getAssetAlbums, type VaultAssetAlbum, type VaultAssetItem } from '@/shared/api/arcsAssetVault';
import { Tooltip } from '@/shared/components/Tooltip';
import { useResponsiveLayout } from '@/shared/context/ResponsiveLayoutContext';
import { useImageWorkshopBridge } from '@/stores/imageWorkshopBridge';
import { usePromptLibraryBridge } from '@/stores/promptLibraryBridge';
import { useWriterWorkshopBridge } from '@/stores/writerWorkshopBridge';
import {
  ACCENT_GOLD_GRADIENT,
  WRITERS_GOLD_SLANT,
  WRITERS_TIFFANY_TEXT,
  WRITERS_WORKSHOP_BG,
} from '@/shared/theme/Phase12DesignTokens';
import {
  ideaAssistResultSchema,
  pacingRegenerationPreviewResultSchema,
  WRITER_PAGE_BEATS_ISSUE_MAX,
} from '@/shared/writer/schemas';
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

type WriterProductionStage = WriterWorkflowStep & { current: boolean };

type WriterCockpitPanelView =
  | 'outline'
  | 'beats'
  | 'dialogue'
  | 'arc'
  | 'lore'
  | 'video'
  | 'scripts';

const COCKPIT_VIEW_OPTIONS: { id: WriterCockpitPanelView; label: string }[] = [
  { id: 'outline', label: 'Outline' },
  { id: 'beats', label: 'Beats' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'arc', label: 'Arc review' },
  { id: 'lore', label: 'Lore' },
  { id: 'video', label: 'Shot plan' },
  { id: 'scripts', label: 'Synopsis helper' },
];

const WRITER_COCKPIT_DIGEST_CAP = 12_000;

type LoreObsidianImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  storedImages: number;
  warnings: string[];
};

function truncateWriterPromptText(raw: string, cap: number): string {
  const t = raw.trim();
  if (!t) return '';
  if (t.length <= cap) return t;
  return `${t.slice(0, cap)}\n\n…(truncated)`;
}

type WriterCockpitDigestContext = {
  view: WriterCockpitPanelView;
  outlineJson: unknown | null;
  selectedPage: WriterPageRow | null;
  pacingSaved: { at?: string; result?: unknown } | undefined;
  canonSaved: { at?: string; result?: unknown } | undefined;
  loreCards: WriterLoreCardRow[];
  latestShotPlanJson: unknown | null;
  shotsBrief: string;
  synopsisParts: SynopsisHelperParts;
  authorOutline: AuthorOutlineSource;
  productionDefaults: WriterProductionDefaults;
};

function buildWriterCockpitViewDigest(ctx: WriterCockpitDigestContext): string {
  const cap = WRITER_COCKPIT_DIGEST_CAP;

  switch (ctx.view) {
    case 'outline': {
      if (!ctx.outlineJson) return '(No outline yet for this issue.)';
      const text = formatOutlineAsText(ctx.outlineJson);
      return truncateWriterPromptText(text, cap);
    }
    case 'beats': {
      if (!ctx.selectedPage) return '(No page selected in Library — pick a page to preview beats.)';
      const text = formatBeatsBundleAsText([{ page_number: ctx.selectedPage.page_number, beats_json: ctx.selectedPage.beats_json }]);
      const header = `FOCUS: Page ${ctx.selectedPage.page_number} (Library selection)\n\n`;
      return truncateWriterPromptText(`${header}${text}`, cap);
    }
    case 'dialogue': {
      if (!ctx.selectedPage) return '(No page selected in Library — pick a page to preview dialogue.)';
      const text = formatDialogueBundleAsText([
        { page_number: ctx.selectedPage.page_number, script_text: ctx.selectedPage.script_text },
      ]);
      const header = `FOCUS: Page ${ctx.selectedPage.page_number} (Library selection)\n\n`;
      return truncateWriterPromptText(`${header}${text}`, cap);
    }
    case 'arc': {
      const text = formatArcReviewPlainText(ctx.pacingSaved, ctx.canonSaved);
      return truncateWriterPromptText(text || '(No pacing/canon runs saved for this issue yet.)', cap);
    }
    case 'lore': {
      if (ctx.loreCards.length === 0) return '(No lore cards for this series yet.)';
      const lines = ctx.loreCards.map((c) => {
        const title = typeof c.title === 'string' ? c.title.trim() : '';
        const category = typeof c.category === 'string' ? c.category.trim() : 'world';
        const body = typeof c.body === 'string' ? stripLoreImportMetadataFromBody(c.body).trim() : '';
        const inc = c.include_in_prompt ? 'include' : 'exclude';
        return [`## ${title || '(untitled)'} (${category}) [${inc}]`, body].filter(Boolean).join('\n\n');
      });
      return truncateWriterPromptText(lines.join('\n\n'), cap);
    }
    case 'video': {
      const brief = ctx.shotsBrief.trim();
      const shotJson = ctx.latestShotPlanJson;
      const parts: string[] = [];
      parts.push('VIDEO / SHOT PLAN DIGEST');
      parts.push('', 'PRODUCTION DEFAULTS', JSON.stringify(productionDefaultsToPayload(ctx.productionDefaults), null, 2));
      if (brief) parts.push('', 'Director / creative brief (Video tab):', brief);
      if (shotJson) {
        parts.push('', 'Latest saved shot plan JSON:', JSON.stringify(shotJson, null, 2));
      } else {
        parts.push('', '(No saved shot plan yet for this issue.)');
      }
      return truncateWriterPromptText(parts.join('\n'), cap);
    }
    case 'scripts': {
      const doc = buildSynopsisDocumentFromParts(ctx.synopsisParts).trim();
      const authorOutline = ctx.authorOutline.text.trim();
      const parts = [
        `PRODUCTION DEFAULTS\n${JSON.stringify(productionDefaultsToPayload(ctx.productionDefaults), null, 2)}`,
        authorOutline
          ? `AUTHOR OUTLINE SOURCE (${ctx.authorOutline.mode})\n${authorOutline}`
          : '',
        doc ? `SYNOPSIS HELPER\n${doc}` : '',
      ].filter(Boolean);
      return truncateWriterPromptText(
        parts.join('\n\n') || '(Synopsis helper is empty — open Synopsis helper to fill sections.)',
        cap,
      );
    }
    default: {
      return '';
    }
  }
}

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

type WriterPacingLengthAlignment = {
  target_pages?: number;
  script_pages: number;
  outline_beats: number;
  recommended_pages: { exact: number } | { min: number; max: number };
  recommended_action?: 'change_target' | 'cut_beats' | 'add_beats' | 'keep_target';
  suggested_page_delta: number;
  suggested_beat_delta?: number;
  cut_suggestions?: string[];
  add_suggestions?: string[];
  assumptions?: string[];
  rationale: string;
};

function recommendedPacingTargetPages(
  alignment: WriterPacingLengthAlignment | null,
  currentTarget: number,
): number | null {
  if (!alignment) return null;
  if ('exact' in alignment.recommended_pages) return alignment.recommended_pages.exact;
  const min = Math.min(alignment.recommended_pages.min, alignment.recommended_pages.max);
  const max = Math.max(alignment.recommended_pages.min, alignment.recommended_pages.max);
  if (currentTarget >= min && currentTarget <= max) return currentTarget;
  return currentTarget < min ? min : max;
}

function buildPacingApplyOutlineSupplement(
  baseSupplement: string,
  alignment: WriterPacingLengthAlignment,
  targetPages: number,
): string {
  const direction =
    alignment.suggested_page_delta > 0
      ? 'expand'
      : alignment.suggested_page_delta < 0
        ? 'condense'
        : 'rebalance';
  const suggestions =
    direction === 'condense'
      ? alignment.cut_suggestions ?? []
      : direction === 'expand'
        ? alignment.add_suggestions ?? []
        : [...(alignment.add_suggestions ?? []), ...(alignment.cut_suggestions ?? [])];
  const lines = [
    'Pacing apply recommendation:',
    `- Target length: ${targetPages} pages.`,
    `- Direction: ${direction} the issue according to the latest pacing review.`,
    `- Suggested page delta: ${alignment.suggested_page_delta >= 0 ? '+' : ''}${alignment.suggested_page_delta}.`,
    alignment.suggested_beat_delta != null
      ? `- Suggested beat delta: ${alignment.suggested_beat_delta >= 0 ? '+' : ''}${alignment.suggested_beat_delta}.`
      : '',
    `- Rationale: ${alignment.rationale}`,
    suggestions.length ? '- Editorial changes to apply:' : '',
    ...suggestions.slice(0, 12).map((s) => `  - ${s}`),
    '- After outline regeneration, regenerate page beats and dialogue for pages affected by this pacing change.',
  ].filter(Boolean);
  const block = lines.join('\n');
  const trimmed = baseSupplement.trim();
  return trimmed ? `${trimmed}\n\n${block}` : block;
}

type PageBeatPanelDraft = NonNullable<PageBeatsJson['panels']>[number];

type BeatsDraftParseResult =
  | { ok: true; value: PageBeatsJson & Record<string, unknown> }
  | { ok: false; error: string };

function parseBeatsEditDraft(raw: string): BeatsDraftParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: { panels: [] } };
  try {
    const value = JSON.parse(trimmed);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, error: 'Beats must be a JSON object.' };
    }
    const panels = (value as PageBeatsJson).panels;
    if (!Array.isArray(panels)) return { ok: false, error: 'Beats JSON must include a panels array.' };
    return { ok: true, value: value as PageBeatsJson & Record<string, unknown> };
  } catch {
    return { ok: false, error: 'Beats JSON is invalid.' };
  }
}

function serializeBeatsEditDraft(value: PageBeatsJson & Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

function readBeatPanelIndex(raw: string, panelsLength: number, allowEnd = false): number | null {
  const value = Number.parseInt(raw, 10);
  const upper = allowEnd ? panelsLength + 1 : panelsLength;
  if (!Number.isFinite(value) || value < 1 || value > Math.max(1, upper)) return null;
  return value - 1;
}

function makeInsertedBeatPanel(index: number): PageBeatPanelDraft {
  return {
    index,
    action: 'New beat',
  };
}

function renumberBeatPanels(panels: PageBeatPanelDraft[]): PageBeatPanelDraft[] {
  return panels.map((panel, index) => ({ ...panel, index: index + 1 }));
}

function renderHierarchyNodes(nodes: WriterHierarchyNode[], depth = 0): React.ReactNode {
  if (!nodes.length) return null;
  return (
    <ul className={depth === 0 ? 'space-y-1.5' : 'mt-1 space-y-1 border-l border-black/10 pl-3'}>
      {nodes.map((node) => (
        <li key={node.id} className="text-[11px] leading-snug text-black/75">
          <span className="font-bold uppercase tracking-wide text-black/45">{node.kind}</span>{' '}
          <span className="font-semibold text-black">{node.title}</span>
          {renderHierarchyNodes(node.children, depth + 1)}
        </li>
      ))}
    </ul>
  );
}

function renderEditableHierarchyNodes(
  nodes: WriterHierarchyNode[],
  onChange: (nodes: WriterHierarchyNode[]) => void,
  depth = 0,
  rootNodes = nodes,
): React.ReactNode {
  if (!nodes.length) return null;
  return (
    <ul className={depth === 0 ? 'space-y-2' : 'mt-2 space-y-2 border-l border-black/10 pl-3'}>
      {nodes.map((node) => (
        <li key={node.id} className="space-y-1.5 rounded-md border border-black/10 bg-white/65 px-2 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={node.kind}
              onChange={(event) =>
                onChange(updateHierarchyNode(rootNodes, node.id, { kind: event.target.value as WriterHierarchyNode['kind'] }))
              }
              className="rounded border border-black/15 bg-white px-1.5 py-1 text-[10px] font-bold uppercase text-black/65"
              aria-label={`Kind for ${node.title}`}
            >
              {WRITER_HIERARCHY_NODE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
            <input
              value={node.title}
              onChange={(event) => onChange(updateHierarchyNode(rootNodes, node.id, { title: event.target.value }))}
              className="min-w-[160px] flex-1 rounded border border-black/15 bg-white px-2 py-1 text-xs font-semibold text-black"
              aria-label={`Title for ${node.title}`}
            />
            <button
              type="button"
              onClick={() => onChange(moveHierarchyNode(rootNodes, node.id, 'up'))}
              className="rounded border border-black/15 bg-white px-2 py-1 text-[10px] font-black text-black/65"
              aria-label={`Move ${node.title} up`}
            >
              Up
            </button>
            <button
              type="button"
              onClick={() => onChange(moveHierarchyNode(rootNodes, node.id, 'down'))}
              className="rounded border border-black/15 bg-white px-2 py-1 text-[10px] font-black text-black/65"
              aria-label={`Move ${node.title} down`}
            >
              Down
            </button>
            <button
              type="button"
              onClick={() => onChange(deleteHierarchyNode(rootNodes, node.id))}
              className="rounded border border-red-900/20 bg-red-50 px-2 py-1 text-[10px] font-black text-red-800"
              aria-label={`Delete ${node.title}`}
            >
              Delete
            </button>
          </div>
          {renderEditableHierarchyNodes(node.children, onChange, depth + 1, rootNodes)}
        </li>
      ))}
    </ul>
  );
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

type PacingRegenerationPreviewPage = {
  page_id: string;
  page_number: number;
  reason?: string;
  proposed_beats_json?: PageBeatsJson;
  proposed_script_text?: string;
};

const WRITER_LAST_WORKSPACE_KEY = 'writerPortalLastWorkspace';

type WriterLastWorkspace = {
  seriesId: string | null;
  issueId: string | null;
  pageId: string | null;
  tabId: WriterWorkspaceTabId;
};

type WriterMenuOption = {
  id: string;
  label: string;
  meta?: string;
  searchText?: string;
};

function compactWriterMenuMeta(raw: string | null | undefined, cap = 86): string | undefined {
  const text = raw?.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  if (text.length <= cap) return text;
  return `${text.slice(0, Math.max(0, cap - 3)).trimEnd()}...`;
}

function readWriterLastWorkspace(): WriterLastWorkspace {
  const fallback: WriterLastWorkspace = {
    seriesId: null,
    issueId: null,
    pageId: null,
    tabId: 'dashboard',
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(WRITER_LAST_WORKSPACE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<WriterLastWorkspace>;
    const tabId =
      parsed.tabId && WRITER_WORKSPACE_TAB_ORDER.includes(parsed.tabId) ? parsed.tabId : fallback.tabId;
    return {
      seriesId: typeof parsed.seriesId === 'string' ? parsed.seriesId : null,
      issueId: typeof parsed.issueId === 'string' ? parsed.issueId : null,
      pageId: typeof parsed.pageId === 'string' ? parsed.pageId : null,
      tabId,
    };
  } catch {
    return fallback;
  }
}

function WriterSearchableMenu({
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  ariaLabel,
}: {
  label: string;
  value: string | null;
  onChange: (next: string | null) => void;
  options: WriterMenuOption[];
  disabled?: boolean;
  placeholder: string;
  ariaLabel: string;
}) {
  const selected = options.find((option) => option.id === value) ?? null;
  const [query, setQuery] = useState(selected?.label ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(selected?.label ?? '');
  }, [selected?.label]);

  useEffect(
    () => () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    },
    [],
  );

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || selected?.label === query) return options.slice(0, 12);
    return options
      .filter((option) => `${option.label} ${option.meta ?? ''} ${option.searchText ?? ''}`.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [options, query, selected?.label]);

  const pick = useCallback(
    (option: WriterMenuOption | null) => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      onChange(option?.id ?? null);
      setQuery(option?.label ?? '');
      setOpen(false);
      setActiveIndex(-1);
    },
    [onChange],
  );

  return (
    <label className="relative flex min-w-0 flex-col gap-1 text-[10px] font-black uppercase tracking-wide text-black/48">
      {label}
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open && !disabled}
        disabled={disabled}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
          if (!event.target.value.trim()) onChange(null);
        }}
        onFocus={() => {
          if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        }}
        onBlur={() => {
          blurTimerRef.current = setTimeout(() => {
            setOpen(false);
            setActiveIndex(-1);
            setQuery(selected?.label ?? '');
          }, 160);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
            setActiveIndex(-1);
            setQuery(selected?.label ?? '');
            return;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) =>
              filteredOptions.length === 0 ? -1 : (index + 1) % filteredOptions.length,
            );
            return;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) =>
              filteredOptions.length === 0 ? -1 : index <= 0 ? filteredOptions.length - 1 : index - 1,
            );
            return;
          }
          if (event.key === 'Enter' && open && activeIndex >= 0 && activeIndex < filteredOptions.length) {
            event.preventDefault();
            pick(filteredOptions[activeIndex]!);
          }
        }}
        placeholder={placeholder}
        className="min-w-0 rounded-md border border-black/15 bg-white px-2 py-1.5 text-xs font-semibold normal-case tracking-normal text-black placeholder:text-black/35 disabled:opacity-45"
      />
      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-full z-[90] mt-1 max-h-48 overflow-y-auto rounded-lg border border-black/15 bg-white py-1 text-left shadow-xl">
          {value ? (
            <button
              type="button"
              className="flex w-full px-2.5 py-1.5 text-left text-[11px] font-bold normal-case tracking-normal text-black/55 hover:bg-black/5"
              onMouseDown={(event) => {
                event.preventDefault();
                pick(null);
              }}
            >
              Clear selection
            </button>
          ) : null}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-label={option.meta ? `${option.label}: ${option.meta}` : option.label}
                aria-selected={option.id === value}
                className={`flex w-full flex-col px-2.5 py-1.5 text-left normal-case tracking-normal hover:bg-amber-50 ${
                  index === activeIndex ? 'bg-amber-100' : ''
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(option);
                }}
              >
                <span className="truncate text-xs font-black text-black">{option.label}</span>
                {option.meta ? (
                  <span className="truncate text-[10px] font-semibold text-black/45">{option.meta}</span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="px-2.5 py-2 text-[11px] font-semibold normal-case tracking-normal text-black/45">
              No matches.
            </p>
          )}
        </div>
      ) : null}
    </label>
  );
}

function getWriterCharacterReferenceLabel(item: VaultCharacterItem, album: VaultCharacterAlbum): string {
  return item.cast_name?.trim() || item.name?.trim() || item.profile_name?.trim() || album.profileName;
}

function getWriterAssetReferenceLabel(item: VaultAssetItem, album: VaultAssetAlbum): string {
  return item.asset_name?.trim() || item.name?.trim() || item.collection_name?.trim() || album.collectionName;
}

export const WriterPortal: React.FC<WriterPortalProps> = ({ onRequestPortalsWiki }) => {
  const { isPhone } = useResponsiveLayout();
  const initialWriterWorkspaceRef = useRef<WriterLastWorkspace>(readWriterLastWorkspace());
  const [seriesList, setSeriesList] = useState<WriterSeriesRow[]>([]);
  const [issues, setIssues] = useState<WriterIssueRow[]>([]);
  const [pages, setPages] = useState<WriterPageRow[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(
    initialWriterWorkspaceRef.current.seriesId,
  );
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(
    initialWriterWorkspaceRef.current.issueId,
  );
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    initialWriterWorkspaceRef.current.pageId,
  );
  const [activeTab, setActiveTab] = useState<WriterWorkspaceTabId>(
    initialWriterWorkspaceRef.current.tabId,
  );
  const [activeRibbonMenu, setActiveRibbonMenu] = useState<WriterRibbonMenuId>('home');
  const [dockTab, setDockTab] = useState<WriterDockTabId>('library');
  const [dockCollapsed, setDockCollapsed] = useState(true);
  const [writerFocusedMode, setWriterFocusedMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('writerPortalViewMode') !== 'all-tools';
  });
  const [writerSafetyMessage, setWriterSafetyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isPhone) setDockCollapsed(true);
  }, [isPhone]);
  useEffect(() => {
    window.localStorage.setItem('writerPortalViewMode', writerFocusedMode ? 'focused' : 'all-tools');
  }, [writerFocusedMode]);
  useEffect(() => {
    window.localStorage.setItem(
      WRITER_LAST_WORKSPACE_KEY,
      JSON.stringify({
        seriesId: selectedSeriesId,
        issueId: selectedIssueId,
        pageId: selectedPageId,
        tabId: activeTab,
      } satisfies WriterLastWorkspace),
    );
  }, [activeTab, selectedIssueId, selectedPageId, selectedSeriesId]);
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
  const [dialogueSkipExisting, setDialogueSkipExisting] = useState(true);
  const [dialogueBatchBusy, setDialogueBatchBusy] = useState(false);
  const [dialogueBatchLabel, setDialogueBatchLabel] = useState('');
  const dialogueBatchAbortRef = useRef<AbortController | null>(null);
  const [shotPlans, setShotPlans] = useState<WriterVideoShotPlanRow[]>([]);
  const [shotsBrief, setShotsBrief] = useState('');
  const [pacingLoading, setPacingLoading] = useState(false);
  const [pacingError, setPacingError] = useState<string | null>(null);
  const [pacingApplyBusy, setPacingApplyBusy] = useState(false);
  const [pacingApplyError, setPacingApplyError] = useState<string | null>(null);
  const [pacingPreviewBusy, setPacingPreviewBusy] = useState(false);
  const [pacingPreviewError, setPacingPreviewError] = useState<string | null>(null);
  const [pacingPreviewPages, setPacingPreviewPages] = useState<PacingRegenerationPreviewPage[]>([]);
  const [canonLoading, setCanonLoading] = useState(false);
  const [canonError, setCanonError] = useState<string | null>(null);
  const [shotsLoading, setShotsLoading] = useState(false);
  const [shotsError, setShotsError] = useState<string | null>(null);
  const [cockpitLeftView, setCockpitLeftView] = useState<WriterCockpitPanelView>('outline');
  const [cockpitMiddleView, setCockpitMiddleView] = useState<WriterCockpitPanelView>('beats');
  const [cockpitRightView, setCockpitRightView] = useState<WriterCockpitPanelView>('dialogue');
  const [cockpitAiBarCollapsed, setCockpitAiBarCollapsed] = useState(false);
  const [cockpitIdeaPromptDraft, setCockpitIdeaPromptDraft] = useState('');
  const [cockpitIncludeLeft, setCockpitIncludeLeft] = useState(true);
  const [cockpitIncludeMiddle, setCockpitIncludeMiddle] = useState(true);
  const [cockpitIncludeRight, setCockpitIncludeRight] = useState(true);
  const [cockpitIdeaFocus, setCockpitIdeaFocus] = useState<'left' | 'middle' | 'right'>('left');
  const [cockpitIdeaLoading, setCockpitIdeaLoading] = useState(false);
  const [cockpitIdeaError, setCockpitIdeaError] = useState<string | null>(null);
  const [cockpitIdeaOutput, setCockpitIdeaOutput] = useState('');
  const [aiHistory, setAiHistory] = useState<string[]>([]);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [createSeriesBusy, setCreateSeriesBusy] = useState(false);
  const [deleteSeriesBusy, setDeleteSeriesBusy] = useState(false);
  const [createIssueBusy, setCreateIssueBusy] = useState(false);
  const [deleteIssueBusy, setDeleteIssueBusy] = useState(false);
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
  const [writerVisualReferenceAlbums, setWriterVisualReferenceAlbums] = useState<{
    characters: VaultCharacterAlbum[];
    assets: VaultAssetAlbum[];
  }>({ characters: [], assets: [] });
  const [writerVisualReferencesLoading, setWriterVisualReferencesLoading] = useState(false);
  const [writerVisualReferencesBusy, setWriterVisualReferencesBusy] = useState(false);
  const [writerVisualReferencesError, setWriterVisualReferencesError] = useState<string | null>(null);
  const [writerVisualReferenceSource, setWriterVisualReferenceSource] = useState<'character_vault' | 'asset_vault'>(
    'character_vault',
  );
  const [writerVisualReferenceProfile, setWriterVisualReferenceProfile] = useState('');
  const [writerVisualReferenceCollection, setWriterVisualReferenceCollection] = useState('');
  const [writerVisualReferenceIds, setWriterVisualReferenceIds] = useState<string[]>([]);
  const [writerVisualReferenceKind, setWriterVisualReferenceKind] = useState<WriterVisualReferenceKind>('character');
  const [writerVisualReferenceNote, setWriterVisualReferenceNote] = useState('');
  const [authorOutlineText, setAuthorOutlineText] = useState('');
  const [authorOutlineMode, setAuthorOutlineMode] = useState<AuthorOutlineMode>('structure');
  const [hierarchyImportDraft, setHierarchyImportDraft] = useState('');
  const [hierarchyImportError, setHierarchyImportError] = useState<string | null>(null);
  const [hierarchyEditNodes, setHierarchyEditNodes] = useState<WriterHierarchyNode[]>([]);
  const [hierarchyEditError, setHierarchyEditError] = useState<string | null>(null);
  const [productionDefaultsDraft, setProductionDefaultsDraft] = useState<WriterProductionDefaults>({
    ...EMPTY_WRITER_PRODUCTION_DEFAULTS,
  });
  const [productionDefaultsBusy, setProductionDefaultsBusy] = useState(false);
  const [productionDefaultsError, setProductionDefaultsError] = useState<string | null>(null);
  type ScriptsEditorTab = 'synopsis' | 'outline' | 'beats' | 'dialogue' | 'video';
  const [scriptsEditorTab, setScriptsEditorTab] = useState<ScriptsEditorTab>('synopsis');
  const [outlineEditDraft, setOutlineEditDraft] = useState('');
  const [beatsEditDraft, setBeatsEditDraft] = useState('');
  const [beatPanelIndexDraft, setBeatPanelIndexDraft] = useState('1');
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
  const loreObsidianFileInputRef = useRef<HTMLInputElement | null>(null);
  const loreObsidianFolderInputRef = useRef<HTMLInputElement | null>(null);
  const [loreObsidianEntries, setLoreObsidianEntries] = useState<ObsidianLoreEntry[]>([]);
  const [loreObsidianSelectedIds, setLoreObsidianSelectedIds] = useState<string[]>([]);
  const [loreObsidianTypeFilter, setLoreObsidianTypeFilter] = useState('');
  const [loreObsidianError, setLoreObsidianError] = useState<string | null>(null);
  const [loreObsidianResult, setLoreObsidianResult] = useState<LoreObsidianImportResult | null>(null);
  const [loreAssistLoading, setLoreAssistLoading] = useState(false);
  const [loreAssistError, setLoreAssistError] = useState<string | null>(null);
  const [loreAssistOutput, setLoreAssistOutput] = useState('');

  const pushHistory = useCallback((line: string) => {
    setAiHistory((h) => [`${new Date().toLocaleTimeString()} — ${line}`, ...h].slice(0, 24));
  }, []);

  const refreshPagesForIssue = useCallback(async () => {
    if (!selectedIssueId) return;
    const pageRows = await listWriterPages(selectedIssueId);
    setPages(pageRows);
    setSelectedPageId((prev) => {
      if (prev && pageRows.some((p) => p.id === prev)) return prev;
      return null;
    });
  }, [selectedIssueId]);

  const togglePageBatchSelect = useCallback((pageId: string) => {
    setSelectedPageIdsForBatch((prev) =>
      prev.includes(pageId) ? prev.filter((x) => x !== pageId) : [...prev, pageId],
    );
  }, []);

  const [libraryPagesBusy, setLibraryPagesBusy] = useState(false);
  const requestWriterHandoff = useImageWorkshopBridge((s) => s.requestWriterHandoff);
  const consumeImageshopWriterImageMapReturn = useImageWorkshopBridge(
    (s) => s.consumeImageshopWriterImageMapReturn,
  );
  const requestPromptLibrarySave = usePromptLibraryBridge((s) => s.requestSavePrompt);
  const consumeRequestedIssueOpen = useWriterWorkshopBridge((s) => s.consumeRequestedIssueOpen);

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

  const handleDeleteWriterSeries = useCallback(
    async (series: WriterSeriesRow) => {
      const confirmed = window.confirm(
        `Delete Writer series "${series.title || 'Untitled series'}"? This also removes its issues, saved pages, beats, dialogue, outlines, lore cards, locations, style bibles, and shot plans.`,
      );
      if (!confirmed) return;

      setBootstrapError(null);
      setDeleteSeriesBusy(true);
      const ok = await deleteWriterSeries(series.id);
      setDeleteSeriesBusy(false);
      if (!ok) {
        setBootstrapError('Could not delete the Writer series. Confirm you are signed in and own this series.');
        pushHistory(`error: delete series “${series.title || 'Untitled'}”`);
        return;
      }

      const rows = await listWriterSeries();
      setSeriesList(rows);
      setSelectedSeriesId((current) =>
        current && current !== series.id && rows.some((row) => row.id === current) ? current : null,
      );
      if (selectedSeriesId === series.id) {
        setIssues([]);
        setSelectedIssueId(null);
        setPages([]);
        setSelectedPageId(null);
      }
      pushHistory(`deleted series “${series.title || 'Untitled'}”`);
    },
    [pushHistory, selectedSeriesId],
  );

  useEffect(() => {
    if (authUser) setAiAuthBannerDismissed(false);
  }, [authUser]);

  useEffect(() => {
    const requestedIssueId = consumeRequestedIssueOpen();
    if (!requestedIssueId) return;
    let cancelled = false;

    void (async () => {
      const seriesRows = await listWriterSeries();
      for (const series of seriesRows) {
        const issueRows = await listWriterIssues(series.id);
        const requestedIssue = issueRows.find((issue) => issue.id === requestedIssueId);
        if (!requestedIssue) continue;
        if (cancelled) return;
        setSeriesList(seriesRows);
        setSelectedSeriesId(series.id);
        setIssues(issueRows);
        setSelectedIssueId(requestedIssue.id);
        setDockTab('library');
        setDockCollapsed(false);
        pushHistory(`opened linked Guided Comics issue #${requestedIssue.issue_number}`);
        return;
      }
      if (!cancelled) pushHistory('linked Guided Comics issue was not found in Writers Workshop');
    })();

    return () => {
      cancelled = true;
    };
  }, [consumeRequestedIssueOpen, pushHistory]);

  useEffect(() => {
    const imageMap = consumeImageshopWriterImageMapReturn();
    if (!imageMap) return;
    let cancelled = false;

    void (async () => {
      const seriesRows = await listWriterSeries();
      let targetSeries: WriterSeriesRow | null = null;
      let targetIssue: WriterIssueRow | null = null;
      let targetIssues: WriterIssueRow[] = [];

      for (const series of seriesRows) {
        const issueRows = await listWriterIssues(series.id);
        const issue = imageMap.writer_issue_id
          ? issueRows.find((candidate) => candidate.id === imageMap.writer_issue_id)
          : issueRows.find(
              (candidate) =>
                candidate.issue_number === imageMap.issue.issue_number &&
                (candidate.title ?? '').trim().toLowerCase() === imageMap.issue.title.trim().toLowerCase(),
            );
        if (!issue) continue;
        targetSeries = series;
        targetIssue = issue;
        targetIssues = issueRows;
        break;
      }

      if (!targetSeries || !targetIssue) {
        if (!cancelled) pushHistory('Imageshop return could not find its Writers Workshop issue');
        return;
      }

      const pageRows = await listWriterPages(targetIssue.id);
      let appliedPanels = 0;
      for (const imageMapPage of imageMap.pages) {
        const firstMappedPanel = imageMapPage.panels[0];
        const page = pageRows.find(
          (candidate) =>
            candidate.id === firstMappedPanel?.writer_page_id ||
            candidate.page_number === imageMapPage.page_number,
        );
        if (!page) continue;

        let nextBeatsJson = page.beats_json;
        for (const imageMapPanel of imageMapPage.panels) {
          nextBeatsJson = mergeImageshopImageMapIntoWriterBeats({
            beatsJson: nextBeatsJson,
            imageMapPanel,
            returnedAt: imageMap.exported_at,
          });
          appliedPanels += 1;
        }
        await updateWriterPageBeatsJson(page.id, nextBeatsJson);
      }

      if (cancelled) return;
      const refreshedPages = await listWriterPages(targetIssue.id);
      setSeriesList(seriesRows);
      setSelectedSeriesId(targetSeries.id);
      setIssues(targetIssues);
      setSelectedIssueId(targetIssue.id);
      setPages(refreshedPages);
      setSelectedPageId((current) =>
        current && refreshedPages.some((page) => page.id === current)
          ? current
          : refreshedPages[0]?.id ?? null,
      );
      setDockTab('library');
      setDockCollapsed(false);
      pushHistory(
        `applied ${appliedPanels} Imageshop panel image${appliedPanels === 1 ? '' : 's'} to issue #${targetIssue.issue_number}`,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [consumeImageshopWriterImageMapReturn, pushHistory]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await listWriterSeries();
      if (cancelled) return;
      setSeriesList(rows);
      setSelectedSeriesId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) return prev;
        return null;
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

  const handleDeleteWriterIssue = useCallback(
    async (issue: WriterIssueRow) => {
      if (!selectedSeriesId) return;
      const confirmed = window.confirm(
        `Delete Writer issue #${issue.issue_number}${issue.title ? `: ${issue.title}` : ''}? This also removes its saved pages, beats, dialogue, outlines, and shot plans.`,
      );
      if (!confirmed) return;

      setBootstrapError(null);
      setDeleteIssueBusy(true);
      const ok = await deleteWriterIssue(issue.id);
      setDeleteIssueBusy(false);
      if (!ok) {
        setBootstrapError('Could not delete the Writer issue. Confirm you are signed in and own this series.');
        pushHistory(`error: delete issue #${issue.issue_number}`);
        return;
      }

      const rows = await listWriterIssues(selectedSeriesId);
      setIssues(rows);
      setSelectedIssueId((current) =>
        current && current !== issue.id && rows.some((row) => row.id === current) ? current : null,
      );
      if (selectedIssueId === issue.id) {
        setPages([]);
        setSelectedPageId(null);
      }
      pushHistory(`deleted issue #${issue.issue_number}`);
    },
    [pushHistory, selectedIssueId, selectedSeriesId],
  );

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
      setSelectedIssueId((prev) => (prev && rows.some((row) => row.id === prev) ? prev : null));
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
        return null;
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

  const handleLoreObsidianFiles = useCallback(
    async (fileList: FileList | null) => {
      const files = Array.from(fileList ?? []);
      setLoreObsidianError(null);
      setLoreObsidianResult(null);
      if (files.length === 0) return;
      const existingEntries: ObsidianLoreExistingEntry[] = loreCards.map((card) => ({
        id: card.id,
        title: card.title,
        category: card.category,
        body: card.body,
        include_in_prompt: card.include_in_prompt,
        sort_order: card.sort_order,
      }));
      try {
        const parsed = await parseObsidianLoreImport(files, {
          existingEntries,
          typeFilter: loreObsidianTypeFilter || null,
        });
        if (parsed.entries.length === 0) {
          setLoreObsidianEntries([]);
          setLoreObsidianSelectedIds([]);
          setLoreObsidianError(
            loreObsidianTypeFilter
              ? `No Markdown notes matched type "${loreObsidianTypeFilter}".`
              : 'No Markdown notes were found in that selection.',
          );
          return;
        }
        setLoreObsidianEntries(parsed.entries);
        setLoreObsidianSelectedIds(parsed.entries.map((entry) => entry.id));
      } catch (e) {
        setLoreObsidianEntries([]);
        setLoreObsidianSelectedIds([]);
        setLoreObsidianError(e instanceof Error ? e.message : 'Could not parse Obsidian notes.');
      }
    },
    [loreCards, loreObsidianTypeFilter],
  );

  const setLoreObsidianEntryAction = useCallback((entryId: string, action: ObsidianLoreDuplicateAction) => {
    setLoreObsidianEntries((entries) =>
      entries.map((entry) => (entry.id === entryId ? { ...entry, duplicateAction: action } : entry)),
    );
  }, []);

  const toggleLoreObsidianEntry = useCallback((entryId: string) => {
    setLoreObsidianSelectedIds((ids) =>
      ids.includes(entryId) ? ids.filter((id) => id !== entryId) : [...ids, entryId],
    );
  }, []);

  const runLoreObsidianImport = useCallback(async () => {
    if (!selectedSeriesId) return;
    const selectedEntries = loreObsidianEntries.filter((entry) => loreObsidianSelectedIds.includes(entry.id));
    if (selectedEntries.length === 0) {
      setLoreObsidianError('Select at least one detected note before importing.');
      return;
    }
    setLoreImportBusy(true);
    setLoreObsidianError(null);
    setLoreObsidianResult(null);
    const warnings: string[] = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    let storedImages = 0;
    let sortOrder = startLoreSortOrder(loreCards);

    try {
      for (const entry of selectedEntries) {
        const storedImagesForEntry: ObsidianLoreImage[] = [];
        for (const image of entry.images) {
          if (image.status !== 'resolved' || !image.file) {
            storedImagesForEntry.push(image);
            continue;
          }
          const storageUrl = await uploadImageFileToArcsGenerations(image.file);
          if (storageUrl) {
            storedImages += 1;
            storedImagesForEntry.push({ ...image, storageUrl, status: 'stored' });
          } else {
            const warning = `Could not store "${image.fileName}" for "${entry.title}". The lore note was imported, but the image remains an unresolved reference.`;
            warnings.push(warning);
            storedImagesForEntry.push({ ...image, status: 'unresolved' });
          }
        }

        const body = buildLoreBodyFromObsidianEntry(entry, storedImagesForEntry);
        const incoming = {
          title: entry.title,
          category: entry.category,
          body,
          include_in_prompt: true,
          sort_order: sortOrder,
        };
        const operation = resolveObsidianLoreDuplicate({
          existing: entry.duplicateOf,
          incoming,
          action: entry.duplicateOf ? entry.duplicateAction : 'create_duplicate',
        });

        if (operation.kind === 'skip') {
          skipped += 1;
          continue;
        }

        if (operation.kind === 'update') {
          const ok = await updateWriterLoreCard(operation.id, operation.patch);
          if (ok) {
            updated += 1;
          } else {
            failed += 1;
            warnings.push(`Could not update existing lore card "${entry.title}".`);
          }
          continue;
        }

        const created = await createWriterLoreCard({
          series_id: selectedSeriesId,
          ...operation.input,
          sort_order: sortOrder,
        });
        sortOrder += 10;
        if (created) {
          imported += 1;
        } else {
          failed += 1;
          warnings.push(`Could not create lore card "${entry.title}".`);
        }
      }

      const allWarnings = [...selectedEntries.flatMap((entry) => entry.warnings), ...warnings];
      setLoreObsidianResult({ imported, updated, skipped, failed, storedImages, warnings: allWarnings });
      pushHistory(`imported Obsidian lore: ${imported} new, ${updated} updated, ${skipped} skipped`);
      await reloadLoreCards();
    } finally {
      setLoreImportBusy(false);
    }
  }, [
    loreCards,
    loreObsidianEntries,
    loreObsidianSelectedIds,
    pushHistory,
    reloadLoreCards,
    selectedSeriesId,
  ]);

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
    setLoreObsidianEntries([]);
    setLoreObsidianSelectedIds([]);
    setLoreObsidianError(null);
    setLoreObsidianResult(null);
  }, [selectedSeriesId]);

  useEffect(() => {
    setSelectedPageIdsForBatch((prev) => prev.filter((id) => pages.some((p) => p.id === id)));
  }, [pages]);

  const selectedSeries = seriesList.find((s) => s.id === selectedSeriesId) ?? null;

  useEffect(() => {
    const row = issues.find((x) => x.id === selectedIssueId);
    if (row) {
      setIssueTitleDraft(row.title ?? '');
      setIssueSynopsisDraft(row.synopsis ?? '');
      setSynopsisHelperParts(readSynopsisHelperFromNotes(row.notes));
      const authorOutline = readAuthorOutlineFromNotes(row.notes);
      const savedDrafts = readWriterDraftsFromNotes(row.notes);
      setAuthorOutlineText(authorOutline.text);
      setAuthorOutlineMode(authorOutline.mode);
      setOutlineSupplementDraft(savedDrafts.outline_instructions?.value ?? '');
      setBeatsDirectorNotesDraft(savedDrafts.beats_director_notes?.value ?? '');
      setShotsBrief(savedDrafts.visual_creative_brief?.value ?? '');
      setProductionDefaultsDraft(resolveProductionDefaults(selectedSeries?.notes, row.notes));
    } else {
      setIssueTitleDraft('');
      setIssueSynopsisDraft('');
      setSynopsisHelperParts({ ...EMPTY_SYNOPSIS_HELPER_PARTS });
      setAuthorOutlineText('');
      setAuthorOutlineMode(EMPTY_AUTHOR_OUTLINE_SOURCE.mode);
      setOutlineSupplementDraft('');
      setBeatsDirectorNotesDraft('');
      setShotsBrief('');
      setProductionDefaultsDraft(readProductionDefaultsFromNotes(selectedSeries?.notes));
    }
    setProductionDefaultsError(null);
    setHierarchyImportDraft('');
    setHierarchyImportError(null);
    setHierarchyEditError(null);
    setPacingPreviewPages([]);
    setPacingPreviewError(null);
  }, [selectedIssueId, issues, selectedSeries]);

  useEffect(() => {
    if (!selectedIssueId) {
      setWriterVisualReferenceAlbums({ characters: [], assets: [] });
      setWriterVisualReferenceIds([]);
      setWriterVisualReferenceProfile('');
      setWriterVisualReferenceCollection('');
      setWriterVisualReferencesError(null);
      return;
    }
    let cancelled = false;
    setWriterVisualReferencesLoading(true);
    setWriterVisualReferencesError(null);
    void Promise.all([getCharacterAlbums(), getAssetAlbums()])
      .then(([characters, assets]) => {
        if (cancelled) return;
        setWriterVisualReferenceAlbums({ characters, assets });
      })
      .catch((error) => {
        if (cancelled) return;
        setWriterVisualReferencesError(error instanceof Error ? error.message : 'Could not load vault references.');
      })
      .finally(() => {
        if (!cancelled) setWriterVisualReferencesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIssueId]);

  useEffect(() => {
    setWriterVisualReferenceKind(writerVisualReferenceSource === 'character_vault' ? 'character' : 'prop');
    setWriterVisualReferenceIds([]);
  }, [writerVisualReferenceSource]);

  useEffect(() => {
    setWriterVisualReferenceIds([]);
  }, [writerVisualReferenceProfile, writerVisualReferenceCollection]);

  useEffect(() => {
    const s = seriesList.find((x) => x.id === selectedSeriesId);
    setSeriesTitleDraft(s?.title ?? '');
    setSeriesLoglineDraft(s?.logline ?? '');
  }, [selectedSeriesId, seriesList]);

  const latestOutline = outlines[0];
  const latestShotPlan = shotPlans[0];
  const selectedIssue = issues.find((i) => i.id === selectedIssueId) ?? null;
  const writerLocks = useMemo(() => readWriterLocksFromNotes(selectedIssue?.notes), [selectedIssue?.notes]);
  const writerVisualReferences = useMemo(
    () => readWriterVisualReferencesFromNotes(selectedIssue?.notes),
    [selectedIssue?.notes],
  );
  const writerVisualReferenceDigest = useMemo(
    () => buildWriterVisualReferenceDigest(writerVisualReferences),
    [writerVisualReferences],
  );
  const writerCharacterReferenceOptions = useMemo(
    () =>
      writerVisualReferenceAlbums.characters.flatMap((album) =>
        album.items.map((item) => ({
          id: item.id,
          album,
          item,
          label: getWriterCharacterReferenceLabel(item, album),
        })),
      ),
    [writerVisualReferenceAlbums.characters],
  );
  const writerAssetReferenceOptions = useMemo(
    () =>
      writerVisualReferenceAlbums.assets.flatMap((album) =>
        album.items.map((item) => ({
          id: item.id,
          album,
          item,
          label: getWriterAssetReferenceLabel(item, album),
        })),
      ),
    [writerVisualReferenceAlbums.assets],
  );
  const writerVisualReferenceProfileOptions = useMemo(
    () => [...new Set(writerVisualReferenceAlbums.characters.map((album) => album.profileName))].sort(),
    [writerVisualReferenceAlbums.characters],
  );
  const writerVisualReferenceCollectionOptions = useMemo(
    () => [...new Set(writerVisualReferenceAlbums.assets.map((album) => album.collectionName))].sort(),
    [writerVisualReferenceAlbums.assets],
  );
  const visibleWriterCharacterReferenceOptions = useMemo(
    () =>
      writerVisualReferenceProfile
        ? writerCharacterReferenceOptions.filter(
            (option) => option.album.profileName === writerVisualReferenceProfile,
          )
        : writerCharacterReferenceOptions,
    [writerCharacterReferenceOptions, writerVisualReferenceProfile],
  );
  const visibleWriterAssetReferenceOptions = useMemo(
    () =>
      writerVisualReferenceCollection
        ? writerAssetReferenceOptions.filter(
            (option) => option.album.collectionName === writerVisualReferenceCollection,
          )
        : writerAssetReferenceOptions,
    [writerAssetReferenceOptions, writerVisualReferenceCollection],
  );
  const toolCache = readWriterToolCache(selectedIssue?.notes);
  const pacingSaved = toolCache?.pacing_review as { at?: string; result?: unknown } | undefined;
  const canonSaved = toolCache?.canon_check as { at?: string; result?: unknown } | undefined;
  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;

  const updateSelectedIssueNotes = useCallback(
    async (nextNotes: Record<string, unknown>) => {
      if (!selectedIssueId) return false;
      const ok = await updateWriterIssue(selectedIssueId, { notes: nextNotes });
      if (!ok) return false;
      setIssues((prev) =>
        prev.map((issue) => (issue.id === selectedIssueId ? { ...issue, notes: nextNotes } : issue)),
      );
      return true;
    },
    [selectedIssueId],
  );

  const refreshWriterVisualReferenceAlbums = useCallback(async () => {
    if (!selectedIssueId) return;
    setWriterVisualReferencesLoading(true);
    setWriterVisualReferencesError(null);
    try {
      const [characters, assets] = await Promise.all([getCharacterAlbums(), getAssetAlbums()]);
      setWriterVisualReferenceAlbums({ characters, assets });
    } catch (error) {
      setWriterVisualReferencesError(error instanceof Error ? error.message : 'Could not load vault references.');
    } finally {
      setWriterVisualReferencesLoading(false);
    }
  }, [selectedIssueId]);

  const attachWriterVisualReference = useCallback(async () => {
    if (!selectedIssue) return;
    setWriterVisualReferencesError(null);
    const source = writerVisualReferenceSource;
    const selectedOptions =
      source === 'character_vault'
        ? writerCharacterReferenceOptions.filter((option) => writerVisualReferenceIds.includes(option.id))
        : writerAssetReferenceOptions.filter((option) => writerVisualReferenceIds.includes(option.id));
    if (selectedOptions.length === 0) {
      setWriterVisualReferencesError('Choose one or more vault images to attach.');
      return;
    }

    const refs: Omit<WriterVisualReference, 'id' | 'linkedAt'>[] = selectedOptions.map((selected) => ({
      source,
      sourceId: selected.id,
      sourceLabel:
        source === 'character_vault'
          ? (selected as { album: VaultCharacterAlbum }).album.profileName
          : (selected as { album: VaultAssetAlbum }).album.collectionName,
      label: selected.label,
      kind: source === 'character_vault' ? 'character' : writerVisualReferenceKind,
      imageUrl:
        source === 'character_vault'
          ? (selected as { item: VaultCharacterItem }).item.image_url
          : (selected as { item: VaultAssetItem }).item.image_url,
      note: writerVisualReferenceNote.trim() || undefined,
    }));
    let nextNotes = refs.reduce(
      (notes, ref) => mergeWriterVisualReferenceIntoNotes(notes, ref),
      selectedIssue.notes,
    );
    const linkedAt = new Date().toISOString();
    const nextSynopsisParts = mergeVisualReferencesIntoSynopsisParts(
      synopsisHelperParts,
      refs.map((ref) => ({
        ...ref,
        id: `${ref.source}:${ref.sourceId}`,
        linkedAt,
      })),
    );
    nextNotes = mergeSynopsisHelperIntoNotes(nextNotes, nextSynopsisParts);

    setWriterVisualReferencesBusy(true);
    const ok = await updateSelectedIssueNotes(nextNotes);
    setWriterVisualReferencesBusy(false);
    if (!ok) {
      setWriterVisualReferencesError('Could not attach this visual reference to the issue.');
      return;
    }
    setSynopsisHelperParts(nextSynopsisParts);
    setWriterVisualReferenceIds([]);
    setWriterVisualReferenceNote('');
    pushHistory(`attached ${refs.length} visual reference${refs.length === 1 ? '' : 's'}`);
  }, [
    selectedIssue,
    writerVisualReferenceSource,
    writerCharacterReferenceOptions,
    writerVisualReferenceIds,
    writerAssetReferenceOptions,
    writerVisualReferenceKind,
    writerVisualReferenceNote,
    synopsisHelperParts,
    updateSelectedIssueNotes,
    pushHistory,
  ]);

  const removeWriterVisualReference = useCallback(
    async (ref: WriterVisualReference) => {
      if (!selectedIssue) return;
      setWriterVisualReferencesError(null);
      setWriterVisualReferencesBusy(true);
      const ok = await updateSelectedIssueNotes(removeWriterVisualReferenceFromNotes(selectedIssue.notes, ref.id));
      setWriterVisualReferencesBusy(false);
      if (!ok) {
        setWriterVisualReferencesError('Could not remove this visual reference from the issue.');
        return;
      }
      pushHistory(`removed visual reference “${ref.label}”`);
    },
    [selectedIssue, updateSelectedIssueNotes, pushHistory],
  );

  const persistWriterDrafts = useCallback(
    async (drafts: Partial<Record<WriterDraftKey, string>>) => {
      if (!selectedIssue) return true;
      const draftsToSave = { ...drafts };
      if (isWriterItemLocked(selectedIssue.notes, 'issue.outline_instructions')) {
        delete draftsToSave.outline_instructions;
      }
      const nextNotes = mergeWriterDraftsIntoNotes(selectedIssue.notes, draftsToSave);
      const ok = await updateSelectedIssueNotes(nextNotes);
      if (!ok) {
        setWriterSafetyMessage('Could not save current draft notes before the AI call. Nothing was generated.');
      }
      return ok;
    },
    [selectedIssue, updateSelectedIssueNotes],
  );

  const persistWriterSnapshot = useCallback(
    async (snapshot: { key: string; label: string; value: unknown }) => {
      if (!selectedIssue) return true;
      const nextNotes = mergeWriterStorySnapshotIntoNotes(selectedIssue.notes, snapshot);
      return updateSelectedIssueNotes(nextNotes);
    },
    [selectedIssue, updateSelectedIssueNotes],
  );

  const persistWriterPreAiNotes = useCallback(
    async (
      drafts: Partial<Record<WriterDraftKey, string>>,
      snapshot?: { key: string; label: string; value: unknown },
    ) => {
      if (!selectedIssue) return true;
      let nextNotes = selectedIssue.notes;
      const draftsToSave = { ...drafts };
      if (isWriterItemLocked(selectedIssue.notes, 'issue.outline_instructions')) {
        delete draftsToSave.outline_instructions;
      }
      if (snapshot) nextNotes = mergeWriterStorySnapshotIntoNotes(nextNotes, snapshot);
      nextNotes = mergeWriterDraftsIntoNotes(nextNotes, draftsToSave);
      const ok = await updateSelectedIssueNotes(nextNotes);
      if (!ok) {
        setWriterSafetyMessage('Could not save current drafts before the AI call. Nothing was generated.');
      }
      return ok;
    },
    [selectedIssue, updateSelectedIssueNotes],
  );

  const setWriterLock = useCallback(
    async (key: WriterLockKey, label: string, locked: boolean) => {
      if (!selectedIssue) return;
      setWriterSafetyMessage(null);
      const nextNotes = mergeWriterLockIntoNotes(selectedIssue.notes, key, label, locked);
      const ok = await updateSelectedIssueNotes(nextNotes);
      if (!ok) {
        setWriterSafetyMessage(`Could not ${locked ? 'lock' : 'unlock'} ${label}. Check Supabase and try again.`);
        return;
      }
      pushHistory(`${locked ? 'locked' : 'unlocked'} ${label}`);
    },
    [selectedIssue, updateSelectedIssueNotes, pushHistory],
  );

  const guardWriterLock = useCallback(
    (key: WriterLockKey, label: string) => {
      if (!isWriterItemLocked(selectedIssue?.notes, key)) return true;
      setWriterSafetyMessage(`${label} is locked. Unlock it before regenerating, clearing, or overwriting it.`);
      return false;
    },
    [selectedIssue?.notes],
  );

  const hierarchyNodes = useMemo(
    () => readHierarchyFromNotes(selectedIssue?.notes),
    [selectedIssue?.notes],
  );
  useEffect(() => {
    setHierarchyEditNodes(hierarchyNodes);
    setHierarchyEditError(null);
  }, [hierarchyNodes]);
  const selectedPageMetadata = useMemo(
    () => summarizePageBeatMetadata((selectedPage?.beats_json as PageBeatsJson | null | undefined) ?? null),
    [selectedPage?.beats_json],
  );
  const auditSummaries = useMemo(
    () =>
      summarizeWriterAuditModes({
        pacingResult: pacingSaved?.result,
        canonResult: canonSaved?.result,
      }),
    [pacingSaved?.result, canonSaved?.result],
  );
  const authorOutlineSource = useMemo<AuthorOutlineSource>(
    () => ({
      text: authorOutlineText,
      mode: authorOutlineMode,
    }),
    [authorOutlineText, authorOutlineMode],
  );
  const productionDefaultsPayload = useMemo(
    () => productionDefaultsToPayload(productionDefaultsDraft),
    [productionDefaultsDraft],
  );

  const pacingLengthAlignment = useMemo(() => {
    const r = pacingSaved?.result;
    if (!r || typeof r !== 'object' || r === null) return null;
    const la = (r as Record<string, unknown>).length_alignment;
    if (!la || typeof la !== 'object') return null;
    return la as WriterPacingLengthAlignment;
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
            seriesTitle: selectedSeries?.title ?? undefined,
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
      selectedSeries?.title,
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
  const pacingRecommendedTarget = useMemo(
    () => recommendedPacingTargetPages(pacingLengthAlignment, targetPageCount),
    [pacingLengthAlignment, targetPageCount],
  );
  const pacingAffectedPageSummary = useMemo(() => {
    if (!pacingLengthAlignment || pacingRecommendedTarget == null) return null;
    if (pacingRecommendedTarget > sortedPages.length) {
      return `Creates page rows ${sortedPages.length + 1}-${pacingRecommendedTarget} and queues those pages for beat/dialogue regeneration.`;
    }
    if (pacingRecommendedTarget < sortedPages.length) {
      return `Removes page rows above ${pacingRecommendedTarget}; their page beats and dialogue are removed with those rows.`;
    }
    if ((pacingLengthAlignment.suggested_beat_delta ?? 0) !== 0) {
      return 'Keeps the page count but queues the current pages for beat/dialogue regeneration after the outline is rebalanced.';
    }
    return 'Keeps the current page rows and updates the outline instructions with the pacing recommendation.';
  }, [pacingLengthAlignment, pacingRecommendedTarget, sortedPages.length]);

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

  const cockpitDigestBase = useMemo(
    () =>
      ({
        outlineJson: latestOutline?.outline_json ?? null,
        selectedPage,
        pacingSaved,
        canonSaved,
        loreCards,
        latestShotPlanJson: latestShotPlan?.shot_plan_json ?? null,
        shotsBrief,
        synopsisParts: synopsisHelperParts,
        authorOutline: authorOutlineSource,
        productionDefaults: productionDefaultsDraft,
      }) satisfies Omit<WriterCockpitDigestContext, 'view'>,
    [
      latestOutline,
      selectedPage,
      pacingSaved,
      canonSaved,
      loreCards,
      latestShotPlan,
      shotsBrief,
      synopsisHelperParts,
      authorOutlineSource,
      productionDefaultsDraft,
    ],
  );

  const cockpitFindText = useMemo(() => {
    const hdr = (name: string, view: WriterCockpitPanelView) =>
      `${name} — ${COCKPIT_VIEW_OPTIONS.find((o) => o.id === view)?.label ?? view}`;
    const left = buildWriterCockpitViewDigest({ ...cockpitDigestBase, view: cockpitLeftView });
    const mid = buildWriterCockpitViewDigest({ ...cockpitDigestBase, view: cockpitMiddleView });
    const right = buildWriterCockpitViewDigest({ ...cockpitDigestBase, view: cockpitRightView });
    return [
      hdr('Left', cockpitLeftView),
      left,
      '',
      hdr('Middle', cockpitMiddleView),
      mid,
      '',
      hdr('Right', cockpitRightView),
      right,
      '',
      'Idea assist prompt:',
      cockpitIdeaPromptDraft,
      '',
      'Idea assist output:',
      cockpitIdeaOutput,
    ].join('\n');
  }, [
    cockpitLeftView,
    cockpitMiddleView,
    cockpitRightView,
    latestOutline,
    selectedPage,
    pacingSaved,
    canonSaved,
    loreCards,
    latestShotPlan,
    shotsBrief,
    synopsisHelperParts,
    cockpitIdeaPromptDraft,
    cockpitIdeaOutput,
    cockpitDigestBase,
  ]);

  const runCockpitIdeaAssist = useCallback(async () => {
    if (!selectedIssueId) return;
    const prompt = cockpitIdeaPromptDraft.trim();
    if (!prompt) return;

    setCockpitIdeaLoading(true);
    setCockpitIdeaError(null);

    const leftRaw = buildWriterCockpitViewDigest({ ...cockpitDigestBase, view: cockpitLeftView });
    const midRaw = buildWriterCockpitViewDigest({ ...cockpitDigestBase, view: cockpitMiddleView });
    const rightRaw = buildWriterCockpitViewDigest({ ...cockpitDigestBase, view: cockpitRightView });

    const left = truncateWriterPromptText(leftRaw, 16_000);
    const middle = truncateWriterPromptText(midRaw, 16_000);
    const right = truncateWriterPromptText(rightRaw, 16_000);

    const pageScopedViews: WriterCockpitPanelView[] = ['beats', 'dialogue'];
    const focusView =
      cockpitIdeaFocus === 'left'
        ? cockpitLeftView
        : cockpitIdeaFocus === 'middle'
          ? cockpitMiddleView
          : cockpitRightView;
    const pageIdForAssist =
      selectedPageId && pageScopedViews.includes(focusView) ? selectedPageId : undefined;

    const res = await invokeWriterTools({
      mode: 'idea_assist',
      issue_id: selectedIssueId,
      prompt,
      include_left: cockpitIncludeLeft,
      include_middle: cockpitIncludeMiddle,
      include_right: cockpitIncludeRight,
      ...(left ? { context_left: left } : {}),
      ...(middle ? { context_middle: middle } : {}),
      ...(right ? { context_right: right } : {}),
      ...(pageIdForAssist ? { page_id: pageIdForAssist } : {}),
    });

    setCockpitIdeaLoading(false);

    if (!res.success) {
      const msg = toolErrorMessage(res);
      setCockpitIdeaError(msg);
      pushHistory(`error: idea assist — ${msg}`);
      return;
    }

    const parsed = ideaAssistResultSchema.safeParse(res.data);
    if (!parsed.success) {
      const msg = 'Idea assist returned unexpected JSON';
      setCockpitIdeaError(msg);
      pushHistory(`error: ${msg}`);
      return;
    }

    const d = parsed.data;
    const pieces: string[] = [];
    if (d.title?.trim()) pieces.push(`# ${d.title.trim()}`);
    pieces.push(d.answer_markdown.trim());
    if (d.bullets?.length) {
      pieces.push('', '## Notes', ...d.bullets.map((b) => `- ${b}`));
    }
    if (d.next_steps?.length) {
      pieces.push('', '## Next steps', ...d.next_steps.map((b) => `- ${b}`));
    }
    if (d.risks?.length) {
      pieces.push('', '## Risks', ...d.risks.map((b) => `- ${b}`));
    }

    const out = pieces.filter(Boolean).join('\n\n').trim();
    setCockpitIdeaOutput(out);
    pushHistory('idea assist — ok');
  }, [
    selectedIssueId,
    cockpitIdeaPromptDraft,
    cockpitIncludeLeft,
    cockpitIncludeMiddle,
    cockpitIncludeRight,
    cockpitLeftView,
    cockpitMiddleView,
    cockpitRightView,
    cockpitIdeaFocus,
    selectedPageId,
    cockpitDigestBase,
    pushHistory,
  ]);

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
      cockpitFindText,
    }),
    [
      activeTab,
      latestOutline,
      latestShotPlan,
      selectedPage,
      pacingSaved,
      canonSaved,
      loreCardsFindText,
      cockpitFindText,
    ],
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

  const saveVisibleTextToPromptLibrary = useCallback(() => {
    const promptText = searchableText.trim();
    if (!promptText) return;
    const tabLabel = WRITER_WORKSPACE_TAB_LABELS[activeTab].heading;
    const pageLabel = selectedPage ? ` · page ${selectedPage.page_number}` : '';
    requestPromptLibrarySave({
      sourcePortal: 'writer',
      sourceLabel: `Writer · ${tabLabel}${pageLabel}`,
      title: `${selectedIssue?.title || 'Writer issue'} · ${tabLabel}${pageLabel}`,
      promptText,
      category: activeTab === 'lore' ? 'project' : 'scene',
      tags: ['writer', activeTab],
      collections: ['ARCS handoffs'],
      sourceContext: {
        activeTab,
        seriesId: selectedSeriesId,
        seriesTitle: selectedSeries?.title,
        issueId: selectedIssueId,
        issueTitle: selectedIssue?.title,
        issueNumber: selectedIssue?.issue_number,
        pageId: selectedPage?.id,
        pageNumber: selectedPage?.page_number,
      },
      promptSections: {
        visibleText: promptText,
        synopsis: selectedIssue?.synopsis ?? '',
        pageBeats: selectedPage?.beats_json ?? null,
        scriptText: selectedPage?.script_text ?? '',
      },
    });
    pushHistory('saved visible Writer text to Prompt Library');
  }, [
    activeTab,
    pushHistory,
    requestPromptLibrarySave,
    searchableText,
    selectedIssue,
    selectedIssueId,
    selectedPage,
    selectedSeries?.title,
    selectedSeriesId,
  ]);

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
      if (!guardWriterLock('outline.latest', 'Latest outline')) return;
      const draftSaved = await persistWriterPreAiNotes(
        {
          outline_instructions: outlineSupplementDraft,
          visual_creative_brief: shotsBrief,
        },
        latestOutline
          ? {
              key: 'outline.latest',
              label: `Outline v${latestOutline.version} before regeneration`,
              value: latestOutline.outline_json,
            }
          : undefined,
      );
      if (!draftSaved) return;
      setOutlineGenError(null);
      setOutlineGenLoading(true);
      const supplementTrim = opts?.coverageBoost
        ? buildCoverageBoostOutlineSupplement(outlineSupplementDraft, targetPageCount).trim()
        : outlineSupplementDraft.trim();
      const res = await invokeWriterTools({
        mode: 'outline_issue',
        issue_id: selectedIssueId,
        target_page_count: targetPageCount,
        production_defaults: productionDefaultsPayload,
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
    [
      selectedIssueId,
      targetPageCount,
      outlineSupplementDraft,
      shotsBrief,
      latestOutline,
      productionDefaultsPayload,
      guardWriterLock,
      persistWriterPreAiNotes,
      pushHistory,
    ],
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

  const runApplyPacingRecommendation = useCallback(
    async (opts?: { regenerateOutline?: boolean }) => {
      if (!selectedIssueId || !pacingLengthAlignment || pacingRecommendedTarget == null) return;
      const target = pacingRecommendedTarget;
      const supplement = buildPacingApplyOutlineSupplement(
        outlineSupplementDraft,
        pacingLengthAlignment,
        target,
      );
      const pageRowsBefore = sortedPages;
      const rowsToDelete = pageRowsBefore.filter((p) => p.page_number > target);
      const lockedRowsToDelete = rowsToDelete.filter(
        (p) =>
          isWriterItemLocked(selectedIssue?.notes, writerPageBeatsLockKey(p.id)) ||
          isWriterItemLocked(selectedIssue?.notes, writerPageDialogueLockKey(p.id)),
      );

      if (lockedRowsToDelete.length > 0) {
        setPacingApplyError(
          `Pacing apply would delete locked content on page(s) ${lockedRowsToDelete
            .map((p) => p.page_number)
            .join(', ')}. Unlock those pages or use a non-destructive update.`,
        );
        return;
      }
      if (opts?.regenerateOutline && !guardWriterLock('outline.latest', 'Latest outline')) return;

      if (rowsToDelete.length > 0) {
        const ok = window.confirm(
          `Apply pacing recommendation by trimming ${rowsToDelete.length} page row(s) above page ${target}? Their saved page beats and dialogue will be deleted with those rows.`,
        );
        if (!ok) return;
      }

      setPacingApplyBusy(true);
      setPacingApplyError(null);
      setTargetPageCount(target);
      setOutlineSupplementDraft(supplement);

      try {
        if (rowsToDelete.length > 0) {
          const deleted = await deleteWriterPages(rowsToDelete.map((p) => p.id));
          if (!deleted) {
            setPacingApplyError('Could not delete rows above the recommended page target.');
            pushHistory('error: apply pacing recommendation');
            return;
          }
        } else if (target > pageRowsBefore.length) {
          const synced = await ensureWriterPagesToCount(selectedIssueId, target);
          if (!synced.ok) {
            setPacingApplyError('Could not create all recommended page rows.');
            pushHistory('error: apply pacing recommendation');
            return;
          }
        }

        let pageRows = await listWriterPages(selectedIssueId);
        setPages(pageRows);
        if (pageRows.length > 0) {
          const affectedIds =
            target > pageRowsBefore.length
              ? pageRows
                  .filter((p) => p.page_number > pageRowsBefore.length && p.page_number <= target)
                  .map((p) => p.id)
              : rowsToDelete.length > 0
                ? pageRows.filter((p) => p.page_number >= Math.max(1, target - 1)).map((p) => p.id)
                : (pacingLengthAlignment.suggested_beat_delta ?? 0) !== 0
                  ? pageRows.map((p) => p.id)
                  : [];
          setSelectedPageIdsForBatch(affectedIds);
        }

        if (opts?.regenerateOutline) {
          setOutlineGenError(null);
          setOutlineGenLoading(true);
          const res = await invokeWriterTools({
            mode: 'outline_issue',
            issue_id: selectedIssueId,
            target_page_count: target,
            outline_supplement: supplement,
            production_defaults: productionDefaultsPayload,
          });
          setOutlineGenLoading(false);
          if (!res.success) {
            const msg = toolErrorMessage(res);
            setPacingApplyError(msg);
            setOutlineGenError(msg);
            pushHistory(`error: ${msg}`);
            return;
          }
          const outlineRows = await listWriterOutlinesForIssue(selectedIssueId);
          setOutlines(outlineRows);
          pageRows = await listWriterPages(selectedIssueId);
          setPages(pageRows);
          pushHistory(`applied pacing recommendation and saved outline v${res.version ?? '?'}`);
        } else {
          pushHistory('staged pacing recommendation for outline regeneration');
        }
      } finally {
        setPacingApplyBusy(false);
        setOutlineGenLoading(false);
      }
    },
    [
      selectedIssueId,
      selectedIssue?.notes,
      pacingLengthAlignment,
      pacingRecommendedTarget,
      outlineSupplementDraft,
      sortedPages,
      productionDefaultsPayload,
      guardWriterLock,
      pushHistory,
    ],
  );

  const runPacingRegenerationPreview = useCallback(async (explicitPageIds?: string[]) => {
    if (!selectedIssueId) return;
    const rawPageIds =
      explicitPageIds?.slice(0, WRITER_PAGE_BEATS_ISSUE_MAX) ??
      selectedPagesForBatchExport.slice(0, WRITER_PAGE_BEATS_ISSUE_MAX).map((p) => p.id);
    const beatsUnlocked = filterUnlockedWriterPageIds(rawPageIds, selectedIssue?.notes, 'beats');
    const dialogueUnlocked = filterUnlockedWriterPageIds(beatsUnlocked.unlockedPageIds, selectedIssue?.notes, 'dialogue');
    const pageIds = dialogueUnlocked.unlockedPageIds;
    const lockedCount = rawPageIds.length - pageIds.length;
    if (lockedCount > 0) {
      setWriterSafetyMessage(`Skipped ${lockedCount} locked page(s) in the pacing preview.`);
    }
    if (pageIds.length === 0) {
      setPacingPreviewError('Stage affected pages before generating a preview.');
      return;
    }
    setPacingPreviewBusy(true);
    setPacingPreviewError(null);
    const res = await invokeWriterTools({
      mode: 'pacing_regeneration_preview',
      issue_id: selectedIssueId,
      page_ids: pageIds,
      include_beats: true,
      include_dialogue: true,
      production_defaults: productionDefaultsPayload,
    });
    setPacingPreviewBusy(false);
    if (!res.success) {
      const msg = toolErrorMessage(res);
      setPacingPreviewError(msg);
      pushHistory(`error: pacing preview — ${msg}`);
      return;
    }
    const parsed = pacingRegenerationPreviewResultSchema.safeParse(res.data);
    if (!parsed.success) {
      setPacingPreviewError('Preview response did not match the expected shape.');
      pushHistory('error: pacing preview validation');
      return;
    }
    setPacingPreviewPages(parsed.data.pages as PacingRegenerationPreviewPage[]);
    pushHistory(`generated pacing preview (${parsed.data.pages.length} page(s))`);
  }, [selectedIssueId, selectedIssue?.notes, selectedPagesForBatchExport, productionDefaultsPayload, pushHistory]);

  const applyPacingPreviewPage = useCallback(
    async (preview: PacingRegenerationPreviewPage, target: 'beats' | 'dialogue' | 'both') => {
      if (
        (target === 'beats' || target === 'both') &&
        !guardWriterLock(writerPageBeatsLockKey(preview.page_id), `Page ${preview.page_number} beats`)
      ) {
        return;
      }
      if (
        (target === 'dialogue' || target === 'both') &&
        !guardWriterLock(writerPageDialogueLockKey(preview.page_id), `Page ${preview.page_number} dialogue`)
      ) {
        return;
      }
      setPacingPreviewError(null);
      setPacingPreviewBusy(true);
      let ok = true;
      if ((target === 'beats' || target === 'both') && preview.proposed_beats_json) {
        ok = await updateWriterPageBeatsJson(preview.page_id, preview.proposed_beats_json);
      }
      if (ok && (target === 'dialogue' || target === 'both') && preview.proposed_script_text != null) {
        ok = await updateWriterPageScriptText(preview.page_id, preview.proposed_script_text);
      }
      setPacingPreviewBusy(false);
      if (!ok) {
        setPacingPreviewError(`Could not apply preview for page ${preview.page_number}.`);
        return;
      }
      await refreshPagesForIssue();
      setPacingPreviewPages((prev) => prev.filter((page) => page.page_id !== preview.page_id));
      pushHistory(`applied pacing preview (page ${preview.page_number})`);
    },
    [refreshPagesForIssue, guardWriterLock, pushHistory],
  );

  const runLibraryDeleteSelectedPages = useCallback(async () => {
    if (!selectedIssueId || selectedPageIdsForBatch.length === 0) return;
    const lockedPageIds = selectedPageIdsForBatch.filter(
      (pageId) =>
        isWriterItemLocked(selectedIssue?.notes, writerPageBeatsLockKey(pageId)) ||
        isWriterItemLocked(selectedIssue?.notes, writerPageDialogueLockKey(pageId)),
    );
    if (lockedPageIds.length > 0) {
      setWriterSafetyMessage(`Cannot delete ${lockedPageIds.length} selected page(s) because they contain locked content.`);
      return;
    }
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
  }, [selectedIssueId, selectedIssue?.notes, selectedPageIdsForBatch, refreshPagesForIssue, pushHistory]);

  const runLibraryClearBeatsSelected = useCallback(async () => {
    if (selectedPageIdsForBatch.length === 0) return;
    const { unlockedPageIds, lockedPageIds } = filterUnlockedWriterPageIds(
      selectedPageIdsForBatch,
      selectedIssue?.notes,
      'beats',
    );
    if (lockedPageIds.length > 0) {
      setWriterSafetyMessage(`Skipped ${lockedPageIds.length} locked page beat set(s).`);
    }
    if (unlockedPageIds.length === 0) return;
    if (!window.confirm(`Clear panel beats on ${unlockedPageIds.length} unlocked page(s)?`)) return;
    setLibraryPagesBusy(true);
    const ok = await clearWriterPagesBeatsJson(unlockedPageIds);
    setLibraryPagesBusy(false);
    if (!ok) {
      pushHistory('error: clear beats');
      return;
    }
    await refreshPagesForIssue();
    pushHistory(`cleared beats on ${unlockedPageIds.length} page(s)`);
  }, [selectedPageIdsForBatch, selectedIssue?.notes, refreshPagesForIssue, pushHistory]);

  const runLibraryClearDialogueSelected = useCallback(async () => {
    if (selectedPageIdsForBatch.length === 0) return;
    const { unlockedPageIds, lockedPageIds } = filterUnlockedWriterPageIds(
      selectedPageIdsForBatch,
      selectedIssue?.notes,
      'dialogue',
    );
    if (lockedPageIds.length > 0) {
      setWriterSafetyMessage(`Skipped ${lockedPageIds.length} locked page dialogue set(s).`);
    }
    if (unlockedPageIds.length === 0) return;
    if (!window.confirm(`Clear dialogue/script on ${unlockedPageIds.length} unlocked page(s)?`)) return;
    setLibraryPagesBusy(true);
    const ok = await clearWriterPagesScriptText(unlockedPageIds);
    setLibraryPagesBusy(false);
    if (!ok) {
      pushHistory('error: clear dialogue');
      return;
    }
    await refreshPagesForIssue();
    pushHistory(`cleared dialogue on ${unlockedPageIds.length} page(s)`);
  }, [selectedPageIdsForBatch, selectedIssue?.notes, refreshPagesForIssue, pushHistory]);

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

  const downloadSelectedBeatsBundleText = useCallback(() => {
    if (!selectedIssueId || selectedPagesForBatchExport.length === 0) return;
    const sorted = [...selectedPagesForBatchExport].sort((a, b) => a.page_number - b.page_number);
    const body = formatBeatsBundleAsText(sorted.map((p) => ({ page_number: p.page_number, beats_json: p.beats_json })));
    downloadTextFile(
      `writer-beats-pages-${sorted.map((p) => p.page_number).join('-')}.txt`,
      body,
      'text/plain;charset=utf-8',
    );
    pushHistory(`downloaded beats bundle (text) (${sorted.length} page(s))`);
  }, [selectedIssueId, selectedPagesForBatchExport, pushHistory]);

  const downloadSelectedBeatsBundleMarkdown = useCallback(() => {
    if (!selectedIssueId || selectedPagesForBatchExport.length === 0) return;
    const sorted = [...selectedPagesForBatchExport].sort((a, b) => a.page_number - b.page_number);
    const body = formatBeatsBundleAsMarkdown(
      sorted.map((p) => ({ page_number: p.page_number, beats_json: p.beats_json })),
    );
    downloadTextFile(
      `writer-beats-pages-${sorted.map((p) => p.page_number).join('-')}.md`,
      body,
      'text/markdown;charset=utf-8',
    );
    pushHistory(`downloaded beats bundle (md) (${sorted.length} page(s))`);
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

  const downloadSelectedDialogueBundleText = useCallback(() => {
    if (!selectedIssueId || selectedPagesForBatchExport.length === 0) return;
    const sorted = [...selectedPagesForBatchExport].sort((a, b) => a.page_number - b.page_number);
    const body = formatDialogueBundleAsText(sorted.map((p) => ({ page_number: p.page_number, script_text: p.script_text })));
    downloadTextFile(
      `writer-dialogue-pages-${sorted.map((p) => p.page_number).join('-')}.txt`,
      body,
      'text/plain;charset=utf-8',
    );
    pushHistory(`downloaded dialogue bundle (text) (${sorted.length} page(s))`);
  }, [selectedIssueId, selectedPagesForBatchExport, pushHistory]);

  const downloadSelectedDialogueBundleFountain = useCallback(() => {
    if (!selectedIssueId || selectedPagesForBatchExport.length === 0) return;
    const sorted = [...selectedPagesForBatchExport].sort((a, b) => a.page_number - b.page_number);
    const body = formatDialogueBundleAsFountain(
      sorted.map((p) => ({ page_number: p.page_number, script_text: p.script_text })),
    );
    downloadTextFile(
      `writer-dialogue-pages-${sorted.map((p) => p.page_number).join('-')}.fountain`,
      body,
      'text/plain;charset=utf-8',
    );
    pushHistory(`downloaded dialogue bundle (fountain) (${sorted.length} page(s))`);
  }, [selectedIssueId, selectedPagesForBatchExport, pushHistory]);

  const clearBeatsForSelectedPage = useCallback(async () => {
    if (!selectedPageId) return;
    if (!guardWriterLock(writerPageBeatsLockKey(selectedPageId), 'Selected page beats')) return;
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
  }, [selectedPageId, guardWriterLock, refreshPagesForIssue, pushHistory]);

  const clearDialogueForSelectedPage = useCallback(async () => {
    if (!selectedPageId) return;
    if (!guardWriterLock(writerPageDialogueLockKey(selectedPageId), 'Selected page dialogue')) return;
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
  }, [selectedPageId, guardWriterLock, refreshPagesForIssue, pushHistory]);

  const runBatchPageBeats = useCallback(async () => {
    if (!selectedIssueId) return;
    const { unlockedPageIds, lockedPageIds } = filterUnlockedWriterPageIds(
      sortedPages.map((p) => p.id),
      selectedIssue?.notes,
      'beats',
    );
    if (lockedPageIds.length > 0) {
      setWriterSafetyMessage(
        `Batch beats will skip ${lockedPageIds.length} locked page(s). Use selected pages for tighter control.`,
      );
    }
    if (unlockedPageIds.length === 0) return;
    const draftSaved = await persistWriterPreAiNotes({
      beats_director_notes: beatsDirectorNotesDraft,
      outline_instructions: outlineSupplementDraft,
    });
    if (!draftSaved) return;
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
          ...(lockedPageIds.length > 0 ? { page_ids: unlockedPageIds } : { batch_limit: WRITER_PAGE_BEATS_ISSUE_MAX }),
          production_defaults: productionDefaultsPayload,
          ...(!beatsSkipExisting && lockedPageIds.length === 0
            ? { batch_offset: beatsBatchOffsetFullPassRef.current }
            : {}),
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
  }, [
    selectedIssueId,
    sortedPages,
    selectedIssue?.notes,
    beatsSkipExisting,
    beatsDirectorNotesDraft,
    outlineSupplementDraft,
    productionDefaultsPayload,
    persistWriterPreAiNotes,
    pushHistory,
  ]);

  const runSelectedBatchPageBeats = useCallback(async () => {
    if (!selectedIssueId || beatsPickOrdered.length === 0) return;
    const { unlockedPageIds, lockedPageIds } = filterUnlockedWriterPageIds(
      beatsPickOrdered,
      selectedIssue?.notes,
      'beats',
    );
    if (lockedPageIds.length > 0) {
      setWriterSafetyMessage(`Skipped ${lockedPageIds.length} locked page beat set(s).`);
    }
    if (unlockedPageIds.length === 0) return;
    const draftSaved = await persistWriterPreAiNotes({
      beats_director_notes: beatsDirectorNotesDraft,
      outline_instructions: outlineSupplementDraft,
    });
    if (!draftSaved) return;
    setBeatsBatchBusy(true);
    setBeatsBatchSource('picked');
    setBeatsError(null);
    setBeatsBatchLabel('Selected…');
    try {
      const notesTrim = beatsDirectorNotesDraft.trim();
      const res = await invokeWriterTools({
        mode: 'page_beats_issue',
        issue_id: selectedIssueId,
        page_ids: unlockedPageIds,
        skip_existing: beatsSkipExisting,
        production_defaults: productionDefaultsPayload,
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
  }, [
    selectedIssueId,
    beatsPickOrdered,
    selectedIssue?.notes,
    beatsSkipExisting,
    beatsDirectorNotesDraft,
    outlineSupplementDraft,
    productionDefaultsPayload,
    persistWriterPreAiNotes,
    pushHistory,
  ]);

  const runSelectedPageBeatsGeneration = useCallback(async () => {
    if (!selectedPageId || !selectedIssueId) return;
    if (!guardWriterLock(writerPageBeatsLockKey(selectedPageId), 'Selected page beats')) return;
    const draftSaved = await persistWriterPreAiNotes(
      {
        beats_director_notes: beatsDirectorNotesDraft,
        outline_instructions: outlineSupplementDraft,
      },
      selectedPage?.beats_json
        ? {
            key: writerPageBeatsLockKey(selectedPageId),
            label: `Page ${selectedPage.page_number} beats before regeneration`,
            value: selectedPage.beats_json,
          }
        : undefined,
    );
    if (!draftSaved) return;
    setBeatsError(null);
    setBeatsLoading(true);
    const notesTrim = beatsDirectorNotesDraft.trim();
    const res = await invokeWriterTools({
      mode: 'page_beats',
      page_id: selectedPageId,
      production_defaults: productionDefaultsPayload,
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
  }, [
    selectedPageId,
    selectedIssueId,
    selectedPage,
    beatsDirectorNotesDraft,
    outlineSupplementDraft,
    productionDefaultsPayload,
    guardWriterLock,
    persistWriterPreAiNotes,
    pushHistory,
  ]);

  const runSelectedPageDialogueGeneration = useCallback(async () => {
    if (!selectedPageId || !selectedIssueId) return;
    if (!guardWriterLock(writerPageDialogueLockKey(selectedPageId), 'Selected page dialogue')) return;
    const draftSaved = await persistWriterPreAiNotes(
      {
        beats_director_notes: beatsDirectorNotesDraft,
        outline_instructions: outlineSupplementDraft,
      },
      selectedPage?.script_text
        ? {
            key: writerPageDialogueLockKey(selectedPageId),
            label: `Page ${selectedPage.page_number} dialogue before regeneration`,
            value: selectedPage.script_text,
          }
        : undefined,
    );
    if (!draftSaved) return;
    setDialogueError(null);
    setDialogueLoading(true);
    const res = await invokeWriterTools({
      mode: 'draft_dialogue',
      page_id: selectedPageId,
      style: dialogueStyle,
      production_defaults: productionDefaultsPayload,
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
  }, [
    selectedPageId,
    selectedIssueId,
    selectedPage,
    beatsDirectorNotesDraft,
    outlineSupplementDraft,
    dialogueStyle,
    productionDefaultsPayload,
    guardWriterLock,
    persistWriterPreAiNotes,
    pushHistory,
  ]);

  const runBatchDialogueForSelectedPages = useCallback(async () => {
    if (!selectedIssueId || selectedPageIdsForBatch.length === 0) return;
    if (dialogueBatchBusy) return;

    dialogueBatchAbortRef.current = new AbortController();
    setDialogueBatchBusy(true);
    setDialogueBatchLabel('Queued…');
    setDialogueError(null);

    try {
      const ordered = sortedPages.filter((p) => selectedPageIdsForBatch.includes(p.id));
      const unlockedOrdered = ordered.filter(
        (p) => !isWriterItemLocked(selectedIssue?.notes, writerPageDialogueLockKey(p.id)),
      );
      const lockedSkipped = ordered.length - unlockedOrdered.length;
      if (lockedSkipped > 0) {
        setWriterSafetyMessage(`Skipped ${lockedSkipped} locked page dialogue set(s).`);
      }
      const candidates = unlockedOrdered.filter((p) => {
        if (!dialogueSkipExisting) return true;
        return (p.script_text ?? '').trim().length === 0;
      });

      const skippedCount = ordered.length - candidates.length;
      const chunkSize = 5;
      const chunks: WriterPageRow[][] = [];
      for (let i = 0; i < candidates.length; i += chunkSize) {
        chunks.push(candidates.slice(i, i + chunkSize));
      }

      let okCount = 0;
      let errCount = 0;
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        if (dialogueBatchAbortRef.current?.signal.aborted) {
          pushHistory('batch dialogue cancelled');
          break;
        }

        const chunk = chunks[chunkIndex]!;
        setDialogueBatchLabel(
          `Batch dialogue: ${okCount}/${candidates.length} (ok ${okCount}${skippedCount ? ` · skipped ${skippedCount}` : ''}${errCount ? ` · errors ${errCount}` : ''})`,
        );

        const settled = await Promise.allSettled(
          chunk.map(async (p) => {
            const res = await invokeWriterTools({
              mode: 'draft_dialogue',
              page_id: p.id,
              style: dialogueStyle,
              production_defaults: productionDefaultsPayload,
            });
            return res.success;
          }),
        );

        for (const r of settled) {
          if (r.status === 'fulfilled') {
            if (r.value) okCount += 1;
            else errCount += 1;
          } else {
            errCount += 1;
          }
        }

        const pageRows = await listWriterPages(selectedIssueId);
        setPages(pageRows);
      }

      setDialogueBatchLabel(
        `Done: ok ${okCount}${skippedCount ? ` · skipped ${skippedCount}` : ''}${errCount ? ` · errors ${errCount}` : ''}`,
      );
      pushHistory(
        `batch dialogue finished (${okCount} ok${skippedCount ? `, ${skippedCount} skipped` : ''}${errCount ? `, ${errCount} errors` : ''})`,
      );
    } finally {
      setDialogueBatchBusy(false);
      dialogueBatchAbortRef.current = null;
    }
  }, [
    selectedIssueId,
    selectedIssue?.notes,
    selectedPageIdsForBatch,
    dialogueBatchBusy,
    dialogueSkipExisting,
    sortedPages,
    dialogueStyle,
    productionDefaultsPayload,
    pushHistory,
  ]);

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
  const selectedOutlinePageText = useMemo(() => {
    const outline = latestOutline?.outline_json;
    if (!outline || !selectedPage?.page_number) return outlineJsonString;
    if (typeof outline === 'object' && !Array.isArray(outline)) {
      const pageBeats = (outline as { page_beats?: unknown }).page_beats;
      if (Array.isArray(pageBeats)) {
        const match = pageBeats.find((beat) => {
          if (!beat || typeof beat !== 'object' || Array.isArray(beat)) return false;
          return (beat as { page_target?: unknown }).page_target === selectedPage.page_number;
        });
        if (match) return JSON.stringify(match, null, 2);
      }
    }
    return outlineJsonString;
  }, [latestOutline?.outline_json, outlineJsonString, selectedPage?.page_number]);
  let pageEditLayer: WriterPageEditLayer | null = null;
  if (activeTab === 'beats' || activeTab === 'dialogue') {
    pageEditLayer = activeTab;
  } else if (scriptsEditorTab === 'outline' || scriptsEditorTab === 'beats' || scriptsEditorTab === 'dialogue') {
    pageEditLayer = scriptsEditorTab;
  }
  const pageEditReview = useMemo(() => {
    if (!selectedPage || !pageEditLayer) return null;
    const previousPage = sortedPages.find((page) => page.page_number === selectedPage.page_number - 1);
    const nextPage = sortedPages.find((page) => page.page_number === selectedPage.page_number + 1);
    const stagedText =
      pageEditLayer === 'outline'
        ? outlineEditDraft
        : pageEditLayer === 'beats'
          ? beatsEditDraft
          : dialogueEditDraft;
    return buildWriterPageEditReview({
      layer: pageEditLayer,
      pageNumber: selectedPage.page_number,
      stagedText,
      outlineText: selectedOutlinePageText,
      beatsText: beatsJsonString,
      dialogueText: selectedPage.script_text,
      previousPageText: [
        previousPage?.beats_json ? JSON.stringify(previousPage.beats_json) : '',
        previousPage?.script_text ?? '',
      ].filter(Boolean).join('\n'),
      nextPageText: [
        nextPage?.beats_json ? JSON.stringify(nextPage.beats_json) : '',
        nextPage?.script_text ?? '',
      ].filter(Boolean).join('\n'),
      canonText: loreCards.map((card) => `${card.title}\n${stripLoreImportMetadataFromBody(card.body)}`).join('\n\n'),
    });
  }, [
    selectedPage,
    pageEditLayer,
    sortedPages,
    outlineEditDraft,
    beatsEditDraft,
    dialogueEditDraft,
    selectedOutlinePageText,
    beatsJsonString,
    loreCards,
  ]);

  const runLoreGapAssist = useCallback(async () => {
    if (!selectedIssueId) return;
    setLoreAssistLoading(true);
    setLoreAssistError(null);

    const foundationContext = truncateWriterPromptText(
      [
        `Series logline:\n${seriesLoglineDraft.trim() || '(none)'}`,
        `Issue synopsis / author source:\n${issueSynopsisDraft.trim() || '(none)'}`,
        `Author outline source (${authorOutlineMode}):\n${authorOutlineText.trim() || '(none)'}`,
        `Production defaults:\n${JSON.stringify(productionDefaultsPayload, null, 2)}`,
      ].join('\n\n'),
      16_000,
    );
    const loreContext = truncateWriterPromptText(loreCardsFindText || '(No included lore cards yet.)', 16_000);
    const structureContext = truncateWriterPromptText(
      [
        outlineJsonString ? `Saved outline:\n${outlineJsonString}` : '(No saved outline yet.)',
        arcReviewPlain ? `Latest pacing/canon review:\n${arcReviewPlain}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      16_000,
    );

    const res = await invokeWriterTools({
      mode: 'idea_assist',
      issue_id: selectedIssueId,
      prompt:
        'Act as a continuity editor before comic outline/page-beat generation. Suggest lore cards the author should add or tighten so AI generation does not invent character appearance, species/race/gender, buildings, devices, factions, magic/technology rules, visual motifs, or setting details. Return markdown grouped as: Pre-lore entries to add, Questions for the author, Post-lore checks before beats. Do not state invented details as canon; phrase uncertain items as questions or proposed card drafts.',
      include_left: true,
      include_middle: true,
      include_right: true,
      context_left: foundationContext,
      context_middle: loreContext,
      context_right: structureContext,
    });

    setLoreAssistLoading(false);

    if (!res.success) {
      const msg = toolErrorMessage(res);
      setLoreAssistError(msg);
      pushHistory(`error: lore suggestions — ${msg}`);
      return;
    }

    const parsed = ideaAssistResultSchema.safeParse(res.data);
    if (!parsed.success) {
      const msg = 'Lore suggestions returned unexpected JSON';
      setLoreAssistError(msg);
      pushHistory(`error: ${msg}`);
      return;
    }

    const d = parsed.data;
    const pieces: string[] = [];
    if (d.title?.trim()) pieces.push(`# ${d.title.trim()}`);
    pieces.push(d.answer_markdown.trim());
    if (d.bullets?.length) pieces.push('', '## Notes', ...d.bullets.map((b) => `- ${b}`));
    if (d.next_steps?.length) pieces.push('', '## Next steps', ...d.next_steps.map((b) => `- ${b}`));
    if (d.risks?.length) pieces.push('', '## Risks', ...d.risks.map((b) => `- ${b}`));

    setLoreAssistOutput(pieces.filter(Boolean).join('\n\n').trim());
    pushHistory('lore gap suggestions — ok');
  }, [
    selectedIssueId,
    seriesLoglineDraft,
    issueSynopsisDraft,
    authorOutlineText,
    authorOutlineMode,
    productionDefaultsPayload,
    loreCardsFindText,
    outlineJsonString,
    arcReviewPlain,
    pushHistory,
  ]);

  const quickGenerateLabel =
    activeTab === 'dashboard'
      ? selectedIssueId
        ? 'Continue issue'
        : 'Select issue'
      : activeTab === 'visual_canon'
        ? writerVisualReferences.length > 0
          ? 'Continue to beats'
          : 'Attach references'
    : activeTab === 'scripts' || activeTab === 'lore'
      ? 'Use tab actions'
      : activeTab === 'export'
        ? 'Export issue'
      : activeTab === 'cockpit'
        ? cockpitIdeaPromptDraft.trim()
          ? 'Run Idea assist'
          : '—'
      : activeTab === 'arc'
        ? 'Run pacing review'
	      : activeTab === 'outline'
	          ? latestOutline
	            ? 'Continue to beats'
	            : 'Generate outline'
	          : activeTab === 'beats'
	            ? selectedPage?.beats_json
	              ? 'Continue to dialogue'
	              : 'Generate page beats'
	            : activeTab === 'dialogue'
	              ? selectedPage?.script_text?.trim()
	                ? 'Continue to Visual Prep'
	                : 'Draft dialogue'
	              : 'Generate shot plan';

  const quickGenerateLoading =
    outlineGenLoading ||
    beatsLoading ||
    dialogueLoading ||
    shotsLoading ||
    (activeTab === 'cockpit' && cockpitIdeaLoading) ||
    (activeTab === 'arc' && (pacingLoading || arcBatchBusy)) ||
    (activeTab === 'beats' && beatsBatchBusy);

  const quickGenerateDisabled =
    activeTab === 'scripts' ||
    activeTab === 'lore' ||
    !supabaseOk ||
    !selectedIssueId ||
    (activeTab === 'cockpit' && (!cockpitIdeaPromptDraft.trim() || cockpitIdeaLoading)) ||
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
      production_defaults: productionDefaultsPayload,
      issue: selectedIssue
        ? {
            issue_number: selectedIssue.issue_number,
            title: selectedIssue.title,
            synopsis: selectedIssue.synopsis,
            author_outline: authorOutlineText.trim()
              ? { text: authorOutlineText, mode: authorOutlineMode }
              : null,
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
      authorOutlineText,
      authorOutlineMode,
      productionDefaultsPayload,
    ],
  );
  const productionBranchSummaries = useMemo(
    () =>
      summarizeWriterProductionBranches({
        hasOutline: Boolean(latestOutline),
        pagesWithBeats: pagesWithBeatsCount,
        pagesWithDialogue: pagesWithScriptCount,
        pageCount: sortedPages.length,
        hasShotPlan: Boolean(latestShotPlan),
        outputFormat: productionDefaultsPayload.output_format,
      }),
    [
      latestOutline,
      pagesWithBeatsCount,
      pagesWithScriptCount,
      sortedPages.length,
      latestShotPlan,
      productionDefaultsPayload.output_format,
    ],
  );

  const downloadIssuePackMarkdown = useCallback(() => {
    downloadTextFile(
      'writer-issue-pack.md',
      formatIssuePackAsMarkdown(issuePackObject),
      'text/markdown;charset=utf-8',
    );
    pushHistory('downloaded issue pack markdown');
  }, [issuePackObject, pushHistory]);

  const downloadGuidedComicsHandoff = useCallback(() => {
    downloadJsonFile('writer-guided-comics-handoff.json', buildGuidedComicsHandoffExport(issuePackObject));
    pushHistory('downloaded Guided Comics handoff package');
  }, [issuePackObject, pushHistory]);

  const preferredWriterExport = useMemo(() => buildPreferredWriterExport(issuePackObject), [issuePackObject]);

  const downloadPreferredWriterExport = useCallback(() => {
    if (preferredWriterExport.kind === 'json') {
      downloadJsonFile(preferredWriterExport.filename, preferredWriterExport.data);
    } else {
      downloadTextFile(preferredWriterExport.filename, preferredWriterExport.body, preferredWriterExport.mime);
    }
    pushHistory(`downloaded preferred export: ${preferredWriterExport.filename}`);
  }, [preferredWriterExport, pushHistory]);

  const quickGenerate = useCallback(async () => {
    if (activeTab === 'dashboard') {
      if (!selectedIssueId) return;
      if (!latestOutline) {
        setActiveTab('outline');
        return;
      }
      if (writerVisualReferences.length === 0) {
        setActiveTab('visual_canon');
        return;
      }
      if (!selectedPage?.beats_json) {
        setActiveTab('beats');
        return;
      }
      if (!selectedPage?.script_text?.trim()) {
        setActiveTab('dialogue');
        return;
      }
      setActiveTab('arc');
      return;
    }
    if (activeTab === 'visual_canon') {
      setActiveTab('beats');
      return;
    }
    if (activeTab === 'scripts' || activeTab === 'lore') return;
    if (activeTab === 'export' && selectedIssueId) {
      downloadPreferredWriterExport();
      return;
    }
    if (activeTab === 'cockpit' && selectedIssueId) {
      await runCockpitIdeaAssist();
      return;
    }
    if (activeTab === 'outline' && selectedIssueId) {
      if (latestOutline) {
        setActiveTab('beats');
        return;
      }
      await runOutlineGenerate();
      return;
    }
    if (activeTab === 'beats' && selectedPageId && selectedIssueId) {
      if (selectedPage?.beats_json) {
        setActiveTab('dialogue');
        return;
      }
      await runSelectedPageBeatsGeneration();
      return;
    }
    if (activeTab === 'dialogue' && selectedPageId && selectedIssueId) {
      if (selectedPage?.script_text?.trim()) {
        setActiveTab('video');
        return;
      }
      await runSelectedPageDialogueGeneration();
      return;
    }
    if (activeTab === 'video' && selectedIssueId) {
      const draftSaved = await persistWriterPreAiNotes(
        {
          visual_creative_brief: shotsBrief,
          outline_instructions: outlineSupplementDraft,
        },
        latestShotPlan
          ? {
              key: 'shot_plan.latest',
              label: `Shot plan v${latestShotPlan.version} before regeneration`,
              value: latestShotPlan.shot_plan_json,
            }
          : undefined,
      );
      if (!draftSaved) return;
      setShotsError(null);
      setShotsLoading(true);
      const res = await invokeWriterTools({
        mode: 'plan_shots_from_issue',
        issue_id: selectedIssueId,
        creative_brief: shotsBrief.trim() || undefined,
        production_defaults: productionDefaultsPayload,
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
    selectedPage,
    writerVisualReferences.length,
    shotsBrief,
    outlineSupplementDraft,
    latestShotPlan,
    latestOutline,
    productionDefaultsPayload,
    runPacingFromRibbon,
    runOutlineGenerate,
    runCockpitIdeaAssist,
    runSelectedPageBeatsGeneration,
    runSelectedPageDialogueGeneration,
    downloadPreferredWriterExport,
    persistWriterPreAiNotes,
    pushHistory,
  ]);

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

  const saveAuthorOutlineToNotes = useCallback(async () => {
    if (!selectedIssueId || !selectedIssue) return;
    if (!guardWriterLock('issue.author_outline', 'Author outline')) return;
    setScriptsError(null);
    setScriptsBusy(true);
    const merged = mergeAuthorOutlineIntoNotes(selectedIssue.notes, {
      text: authorOutlineText,
      mode: authorOutlineMode,
    });
    const ok = await updateWriterIssue(selectedIssueId, { notes: merged });
    setScriptsBusy(false);
    if (!ok) {
      setScriptsError('Could not save author outline. Check Supabase.');
      return;
    }
    await refreshIssuesForSeries();
    pushHistory('saved author outline source to issue notes');
  }, [
    selectedIssueId,
    selectedIssue,
    authorOutlineText,
    authorOutlineMode,
    refreshIssuesForSeries,
    guardWriterLock,
    pushHistory,
  ]);

  const saveHierarchyToNotes = useCallback(async () => {
    if (!selectedIssueId || !selectedIssue) return;
    const raw = hierarchyImportDraft.trim();
    if (!raw) {
      setHierarchyImportError('Paste an outline tree or JSON payload before saving.');
      return;
    }

    const nodes = raw.startsWith('{') || raw.startsWith('[')
      ? importHierarchyFromJson(raw)
      : importHierarchyFromText(raw);
    if (nodes.length === 0) {
      setHierarchyImportError('No hierarchy nodes were found. Include arc/book/issue/chapter/page/scene/beat labels.');
      return;
    }

    setHierarchyImportError(null);
    setScriptsBusy(true);
    const ok = await updateWriterIssue(selectedIssueId, {
      notes: mergeHierarchyIntoNotes(selectedIssue.notes, nodes, { source: 'paste/import' }),
    });
    setScriptsBusy(false);
    if (!ok) {
      setHierarchyImportError('Could not save hierarchy tree. Check Supabase.');
      return;
    }
    await refreshIssuesForSeries();
    pushHistory(`saved hierarchy tree (${nodes.length} root node${nodes.length === 1 ? '' : 's'})`);
  }, [selectedIssueId, selectedIssue, hierarchyImportDraft, refreshIssuesForSeries, pushHistory]);

  const saveEditedHierarchyToNotes = useCallback(async () => {
    if (!selectedIssueId || !selectedIssue) return;
    if (hierarchyEditNodes.length === 0) {
      setHierarchyEditError('No hierarchy nodes to save.');
      return;
    }
    setHierarchyEditError(null);
    setScriptsBusy(true);
    const ok = await updateWriterIssue(selectedIssueId, {
      notes: mergeHierarchyIntoNotes(selectedIssue.notes, hierarchyEditNodes, { source: 'manual-edit' }),
    });
    setScriptsBusy(false);
    if (!ok) {
      setHierarchyEditError('Could not save hierarchy edits. Check Supabase.');
      return;
    }
    await refreshIssuesForSeries();
    pushHistory('saved hierarchy tree edits');
  }, [selectedIssueId, selectedIssue, hierarchyEditNodes, refreshIssuesForSeries, pushHistory]);

  const saveProductionDefaultsToNotes = useCallback(async () => {
    if (!selectedSeriesId) return;
    if (selectedIssueId && !guardWriterLock('issue.production_defaults', 'Production defaults')) return;
    setProductionDefaultsError(null);
    setProductionDefaultsBusy(true);

    let ok = false;
    if (selectedIssueId && selectedIssue) {
      ok = await updateWriterIssue(selectedIssueId, {
        notes: mergeProductionDefaultsIntoNotes(selectedIssue.notes, productionDefaultsDraft),
      });
    } else if (selectedSeries) {
      ok = await updateWriterSeries(selectedSeries.id, {
        notes: mergeProductionDefaultsIntoNotes(selectedSeries.notes, productionDefaultsDraft),
      });
    }

    setProductionDefaultsBusy(false);
    if (!ok) {
      setProductionDefaultsError('Could not save production defaults. Check Supabase.');
      return;
    }

    if (selectedIssueId) await refreshIssuesForSeries();
    const seriesRows = await listWriterSeries();
    setSeriesList(seriesRows);
    pushHistory(selectedIssueId ? 'saved issue production defaults' : 'saved series production defaults');
  }, [
    selectedSeriesId,
    selectedIssueId,
    selectedIssue,
    selectedSeries,
    productionDefaultsDraft,
    refreshIssuesForSeries,
    guardWriterLock,
    pushHistory,
  ]);

  const applyBuiltSynopsis = useCallback(() => {
    if (!guardWriterLock('issue.synopsis', 'Issue synopsis')) return;
    const doc = buildSynopsisDocumentFromParts(synopsisHelperParts);
    if (!doc) {
      setScriptsError('Fill at least one synopsis helper field to build.');
      return;
    }
    setScriptsError(null);
    setIssueSynopsisDraft(doc);
    pushHistory('built synopsis from helper (review in Issue Outline → Save story context)');
  }, [synopsisHelperParts, guardWriterLock, pushHistory]);

  const saveOutlineEdit = useCallback(async () => {
    if (!latestOutline) return;
    if (!guardWriterLock('outline.latest', 'Latest outline')) return;
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
    await persistWriterSnapshot({
      key: 'outline.latest',
      label: `Outline v${latestOutline.version} before manual edit`,
      value: latestOutline.outline_json,
    });
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
  }, [latestOutline, outlineEditDraft, guardWriterLock, persistWriterSnapshot, pushHistory]);

  const saveBeatsEdit = useCallback(async () => {
    if (!selectedPageId || !selectedPage) return;
    if (!guardWriterLock(writerPageBeatsLockKey(selectedPageId), `Page ${selectedPage.page_number} beats`)) return;
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
    if (selectedPage.beats_json) {
      await persistWriterSnapshot({
        key: writerPageBeatsLockKey(selectedPageId),
        label: `Page ${selectedPage.page_number} beats before manual edit`,
        value: selectedPage.beats_json,
      });
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
  }, [selectedPageId, selectedPage, beatsEditDraft, selectedIssueId, guardWriterLock, persistWriterSnapshot, pushHistory]);

  const openSavedOutputEditor = useCallback((tab: ScriptsEditorTab) => {
    setScriptsEditorTab(tab);
    setActiveTab('scripts');
  }, []);

  const updateBeatsPanelsDraft = useCallback(
    (operation: 'insert' | 'remove' | 'merge' | 'split' | 'up' | 'down') => {
      const parsed = parseBeatsEditDraft(beatsEditDraft);
      if (!parsed.ok) {
        setScriptsError(parsed.error);
        return;
      }

      const panels = [...parsed.value.panels];
      const index = readBeatPanelIndex(
        beatPanelIndexDraft,
        panels.length,
        operation === 'insert',
      );
      if (index == null) {
        setScriptsError('Choose a valid panel number before editing beats.');
        return;
      }

      if (operation === 'insert') {
        panels.splice(Math.min(index + 1, panels.length), 0, makeInsertedBeatPanel(index + 2));
      } else if (operation === 'remove') {
        if (panels.length === 0) {
          setScriptsError('There are no panels to remove.');
          return;
        }
        panels.splice(index, 1);
      } else if (operation === 'merge') {
        if (index >= panels.length - 1) {
          setScriptsError('Choose a panel with another panel after it to merge.');
          return;
        }
        const current = panels[index]!;
        const next = panels[index + 1]!;
        panels.splice(index, 2, {
          ...current,
          action: [current.action, next.action].filter(Boolean).join(' / '),
          composition: [current.composition, next.composition].filter(Boolean).join(' / ') || undefined,
          emotion: [current.emotion, next.emotion].filter(Boolean).join(' / ') || undefined,
          dialogue_placeholder:
            [current.dialogue_placeholder, next.dialogue_placeholder].filter(Boolean).join(' / ') || undefined,
          sfx: [current.sfx, next.sfx].filter(Boolean).join(' / ') || undefined,
        });
      } else if (operation === 'split') {
        if (index >= panels.length) {
          setScriptsError('Choose an existing panel to split.');
          return;
        }
        const current = panels[index]!;
        panels.splice(index + 1, 0, {
          ...current,
          action: current.action ? `${current.action} (continued)` : 'Continued beat',
        });
      } else if (operation === 'up') {
        if (index <= 0 || index >= panels.length) {
          setScriptsError('Choose a panel after the first panel to move up.');
          return;
        }
        [panels[index - 1], panels[index]] = [panels[index]!, panels[index - 1]!];
      } else if (operation === 'down') {
        if (index < 0 || index >= panels.length - 1) {
          setScriptsError('Choose a panel before the last panel to move down.');
          return;
        }
        [panels[index], panels[index + 1]] = [panels[index + 1]!, panels[index]!];
      }

      setScriptsError(null);
      setBeatsEditDraft(serializeBeatsEditDraft({ ...parsed.value, panels: renumberBeatPanels(panels) }));
    },
    [beatsEditDraft, beatPanelIndexDraft],
  );

  const saveDialogueEdit = useCallback(async () => {
    if (!selectedPageId || !selectedPage) return;
    if (!guardWriterLock(writerPageDialogueLockKey(selectedPageId), `Page ${selectedPage.page_number} dialogue`)) return;
    setScriptsError(null);
    if (selectedPage.script_text) {
      await persistWriterSnapshot({
        key: writerPageDialogueLockKey(selectedPageId),
        label: `Page ${selectedPage.page_number} dialogue before manual edit`,
        value: selectedPage.script_text,
      });
    }
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
  }, [selectedPageId, selectedPage, dialogueEditDraft, selectedIssueId, guardWriterLock, persistWriterSnapshot, pushHistory]);

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
            <div
              key={s.id}
              className={`flex items-center gap-1 rounded-lg ${
                selectedSeriesId === s.id ? 'bg-black/15 ring-1 ring-black/20' : 'hover:bg-black/10'
              }`}
            >
              <Tooltip content="Switch series" side="left">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSeriesId === s.id) return;
                    setSelectedSeriesId(s.id);
                    setSelectedIssueId(null);
                  }}
                  className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                    selectedSeriesId === s.id ? 'text-black' : 'text-black/70'
                  }`}
                >
                  {s.title || 'Untitled series'}
                </button>
              </Tooltip>
              <Tooltip content={`Delete series ${s.title || 'Untitled series'}`} side="left">
                <button
                  type="button"
                  disabled={deleteSeriesBusy}
                  onClick={() => void handleDeleteWriterSeries(s)}
                  className="mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-red-800/70 transition hover:bg-red-500/15 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Delete series ${s.title || 'Untitled series'}`}
                >
                  <Trash2 size={12} aria-hidden />
                </button>
              </Tooltip>
            </div>
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
            <div
              key={i.id}
              className={`flex items-center gap-1 rounded-lg ${
                selectedIssueId === i.id ? 'bg-black/15 ring-1 ring-black/20' : 'hover:bg-black/10'
              }`}
            >
              <Tooltip content={`Open issue #${i.issue_number}`} side="left">
                <button
                  type="button"
                  onClick={() => setSelectedIssueId(i.id)}
                  className={`min-w-0 flex-1 rounded-lg px-2 py-1 text-left text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                    selectedIssueId === i.id ? 'text-black' : 'text-black/65'
                  }`}
                >
                  #{i.issue_number}
                  {i.title ? ` — ${i.title}` : ''}
                </button>
              </Tooltip>
              <Tooltip content={`Delete issue #${i.issue_number}`} side="left">
                <button
                  type="button"
                  disabled={deleteIssueBusy}
                  onClick={() => void handleDeleteWriterIssue(i)}
                  className="mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-red-800/70 transition hover:bg-red-500/15 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Delete issue #${i.issue_number}`}
                >
                  <Trash2 size={12} aria-hidden />
                </button>
              </Tooltip>
            </div>
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
            <label className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-[10px] font-semibold text-black/75 border border-black/15 bg-white/50">
              <input
                type="checkbox"
                checked={dialogueSkipExisting}
                onChange={(e) => setDialogueSkipExisting(e.target.checked)}
                disabled={dialogueBatchBusy}
                className="rounded border-black/30"
              />
              Skip pages that already have dialogue
            </label>
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
              onClick={() => downloadSelectedBeatsBundleText()}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-black/75 border border-black/15 bg-white/70 disabled:opacity-45"
              title="Download selected beats as plain text"
            >
              Beats .txt
            </button>
            <button
              type="button"
              disabled={!supabaseOk || selectedPagesForBatchExport.length === 0}
              onClick={() => downloadSelectedBeatsBundleMarkdown()}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-black/75 border border-black/15 bg-white/70 disabled:opacity-45"
              title="Download selected beats as Markdown"
            >
              Beats .md
            </button>
            <button
              type="button"
              disabled={!supabaseOk || selectedPagesForBatchExport.length === 0}
              onClick={() => downloadSelectedDialogueBundle()}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-black border border-black/20 bg-white/80 disabled:opacity-45"
            >
              Download dialogue
            </button>
            <button
              type="button"
              disabled={!supabaseOk || selectedPagesForBatchExport.length === 0}
              onClick={() => downloadSelectedDialogueBundleText()}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-black/75 border border-black/15 bg-white/70 disabled:opacity-45"
              title="Download selected dialogue as plain text"
            >
              Dialogue .txt
            </button>
            <button
              type="button"
              disabled={!supabaseOk || selectedPagesForBatchExport.length === 0}
              onClick={() => downloadSelectedDialogueBundleFountain()}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-black/75 border border-black/15 bg-white/70 disabled:opacity-45"
              title="Download selected dialogue as Fountain"
            >
              Dialogue .fountain
            </button>
            <button
              type="button"
              disabled={
                !supabaseOk ||
                !selectedIssueId ||
                selectedPageIdsForBatch.length === 0 ||
                dialogueBatchBusy ||
                dialogueLoading ||
                libraryPagesBusy
              }
              onClick={() => void runBatchDialogueForSelectedPages()}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-black border border-black/20 bg-white/80 disabled:opacity-45"
              title="Generate dialogue for selected pages in chunks of 5"
            >
              {dialogueBatchBusy ? 'Generating…' : 'Generate dialogue (batch)'}
            </button>
            {dialogueBatchBusy ? (
              <button
                type="button"
                onClick={() => {
                  dialogueBatchAbortRef.current?.abort();
                }}
                className="rounded-md px-2 py-1 text-[10px] font-bold text-black border border-black/20 bg-white/80"
              >
                Cancel after this chunk
              </button>
            ) : null}
          </div>
        ) : null}
        {selectedPageIdsForBatch.length > 0 && dialogueBatchLabel ? (
          <p className="text-[10px] text-black/50 leading-snug mb-1">{dialogueBatchLabel}</p>
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
      label: 'Save visible text to Prompt Library',
      onClick: () => saveVisibleTextToPromptLibrary(),
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

  const appendTextToField = useCallback((setter: React.Dispatch<React.SetStateAction<string>>, chunk: string) => {
    const next = chunk.trim();
    if (!next) return;
    setter((prev) => {
      const base = prev.trim();
      if (!base) return `${next}\n`;
      return `${base}\n\n${next}\n`;
    });
  }, []);

  const cockpitColumnPreview = (view: WriterCockpitPanelView) =>
    buildWriterCockpitViewDigest({ ...cockpitDigestBase, view });

  const reviewReady = Boolean(pacingSaved?.result ?? canonSaved?.result);
  const activeWorkflowStepId: WriterWorkflowStepId =
    activeTab === 'dashboard'
      ? 'dashboard'
      : activeTab === 'visual_canon'
        ? 'visual_canon'
        : activeTab === 'outline'
      ? !selectedSeriesId || !selectedIssueId
        ? 'library'
        : !latestOutline
          ? 'foundation'
          : sortedPages.length < targetPageCount
            ? 'pages'
            : 'outline'
      : activeTab === 'scripts'
        ? scriptsEditorTab === 'synopsis'
          ? 'synopsis'
          : 'export'
        : activeTab === 'export'
          ? 'export'
        : activeTab === 'lore'
          ? 'canon'
          : activeTab === 'beats'
            ? 'beats'
            : activeTab === 'dialogue'
              ? 'dialogue'
              : activeTab === 'video'
                ? 'visual'
                : activeTab === 'arc'
                  ? 'audit'
                  : 'cockpit';
  const productionStages: WriterProductionStage[] = buildWriterWorkflowSteps({
    hasSeries: Boolean(selectedSeriesId),
    hasIssue: Boolean(selectedIssueId),
    hasFoundation: Boolean(selectedSeriesId),
    hasSynopsis: Boolean(authorOutlineText.trim() || issueSynopsisDraft.trim()),
    hasVisualCanon: writerVisualReferences.length > 0,
    hasCanon: loreCards.length > 0,
    hasOutline: Boolean(latestOutline),
    pageCount: sortedPages.length,
    targetPageCount,
    pagesWithBeats: pagesWithBeatsCount,
    pagesWithDialogue: pagesWithScriptCount,
    hasShotPlan: Boolean(latestShotPlan),
    hasAudit: reviewReady,
  }).map((stage) => ({
    ...stage,
    current: stage.id === activeWorkflowStepId,
  }));
  const activeStage = productionStages.find((stage) => stage.current) ?? productionStages.find((stage) => stage.tab === activeTab);
  const completedStageCount = productionStages.filter((stage) => stage.done).length;
  const selectedPageLabel = selectedPage ? `Page ${selectedPage.page_number}` : 'No page selected';
  const workspaceHeading = TABS.find((x) => x.id === activeTab)?.label ?? 'Workspace';
  const focusWriterElement = useCallback((id: string) => {
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.focus();
    });
  }, []);
  const renderLockButton = (key: WriterLockKey, label: string) => {
    const locked = Boolean(writerLocks[key]?.locked);
    return (
      <button
        type="button"
        disabled={!selectedIssueId || !supabaseOk}
        onClick={() => void setWriterLock(key, label, !locked)}
        className={`inline-flex min-h-[28px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition disabled:opacity-45 ${
          locked
            ? 'border-emerald-700/45 bg-emerald-100/90 text-emerald-950 hover:bg-emerald-50'
            : 'border-black/15 bg-white/75 text-black/60 hover:bg-white hover:text-black'
        }`}
        title={locked ? `${label} is locked` : `Lock ${label}`}
      >
        {locked ? <Lock size={12} aria-hidden /> : <Unlock size={12} aria-hidden />}
        {locked ? 'Locked' : 'Lock'}
      </button>
    );
  };
  const outlineRegenerationScope = useMemo(
    () =>
      buildWriterRegenerationScope({
        actionLabel: 'Generate outline',
        targetLabel: 'latest outline',
        overwriteLabels: latestOutline && !writerLocks['outline.latest'] ? ['Latest outline'] : [],
        lockedLabels: writerLocks['outline.latest'] ? ['Latest outline'] : [],
        downstreamLabels: ['Page rows, beats, dialogue, and Visual Prep may need review after outline changes'],
      }),
    [latestOutline, writerLocks],
  );
  const selectedBeatsScope = useMemo(
    () =>
      buildWriterRegenerationScope({
        actionLabel: 'Generate page beats',
        targetLabel: selectedPage ? `Page ${selectedPage.page_number} beats` : 'selected page beats',
        overwriteLabels:
          selectedPage && selectedPage.beats_json && !writerLocks[writerPageBeatsLockKey(selectedPage.id)]
            ? [`Page ${selectedPage.page_number} beats`]
            : [],
        lockedLabels:
          selectedPage && writerLocks[writerPageBeatsLockKey(selectedPage.id)]
            ? [`Page ${selectedPage.page_number} beats`]
            : [],
        downstreamLabels: selectedPage ? [`Page ${selectedPage.page_number} dialogue`] : [],
      }),
    [selectedPage, writerLocks],
  );
  const selectedDialogueScope = useMemo(
    () =>
      buildWriterRegenerationScope({
        actionLabel: 'Draft dialogue',
        targetLabel: selectedPage ? `Page ${selectedPage.page_number} dialogue` : 'selected page dialogue',
        overwriteLabels:
          selectedPage && selectedPage.script_text && !writerLocks[writerPageDialogueLockKey(selectedPage.id)]
            ? [`Page ${selectedPage.page_number} dialogue`]
            : [],
        lockedLabels:
          selectedPage && writerLocks[writerPageDialogueLockKey(selectedPage.id)]
            ? [`Page ${selectedPage.page_number} dialogue`]
            : [],
      }),
    [selectedPage, writerLocks],
  );
  const renderScopePreview = (scope: WriterRegenerationScope) => (
    <div
      className={`border-l-2 px-3 py-2 text-[11px] ${
        scope.blocked
          ? 'border-emerald-700 bg-emerald-50/80 text-emerald-950'
          : 'border-amber-700/50 bg-amber-50/75 text-amber-950'
      }`}
    >
      <p className="font-black uppercase tracking-wide">{scope.title}</p>
      <p className="mt-1 leading-snug">{scope.summary}</p>
      {scope.items.length > 0 ? (
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {scope.items.slice(0, 4).map((item) => (
            <li key={`${item.label}-${item.change}`} className="rounded bg-white/65 px-2 py-1">
              <span className="font-bold">{item.label}</span>: {item.change}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
  const editProtectionBar = (
    <div className="border-b border-black/10 bg-white/45 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-black/45">
          <Edit3 size={13} aria-hidden />
          Edit
        </span>
        <button
          type="button"
          disabled={!selectedIssueId}
          onClick={() => {
            setActiveTab('outline');
            focusWriterElement('writer-issue-synopsis');
          }}
          className="rounded-md border border-black/15 bg-white/85 px-2.5 py-1.5 text-[11px] font-bold text-black hover:bg-white disabled:opacity-45"
        >
          Edit issue synopsis
        </button>
        <button
          type="button"
          disabled={!latestOutline}
          onClick={() => {
            setActiveTab('outline');
            focusWriterElement('writer-outline-inline-editor');
          }}
          className="rounded-md border border-black/15 bg-white/85 px-2.5 py-1.5 text-[11px] font-bold text-black hover:bg-white disabled:opacity-45"
        >
          Edit outline
        </button>
        <button
          type="button"
          disabled={!selectedIssueId}
          onClick={() => {
            setActiveTab('outline');
            focusWriterElement('writer-outline-supplement');
          }}
          className="rounded-md border border-black/15 bg-white/85 px-2.5 py-1.5 text-[11px] font-bold text-black hover:bg-white disabled:opacity-45"
        >
          Edit outline instructions
        </button>
        <button
          type="button"
          disabled={!selectedPageId}
          onClick={() => {
            setActiveTab('beats');
            focusWriterElement('writer-beats-inline-editor');
          }}
          className="rounded-md border border-black/15 bg-white/85 px-2.5 py-1.5 text-[11px] font-bold text-black hover:bg-white disabled:opacity-45"
        >
          Edit {selectedPage ? `Page ${selectedPage.page_number}` : 'page'} beats
        </button>
        <button
          type="button"
          disabled={!selectedPageId}
          onClick={() => {
            setActiveTab('dialogue');
            focusWriterElement('writer-dialogue-inline-editor');
          }}
          className="rounded-md border border-black/15 bg-white/85 px-2.5 py-1.5 text-[11px] font-bold text-black hover:bg-white disabled:opacity-45"
        >
          Edit {selectedPage ? `Page ${selectedPage.page_number}` : 'page'} dialogue
        </button>
        <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-black/40">
          <ShieldCheck size={13} aria-hidden />
          Protect
        </span>
        {renderLockButton('issue.synopsis', 'Issue synopsis')}
        {renderLockButton('issue.author_outline', 'Author outline')}
        {renderLockButton('issue.outline_instructions', 'Outline instructions')}
        {renderLockButton('issue.production_defaults', 'Production defaults')}
        {renderLockButton('outline.latest', 'Latest outline')}
        {selectedPage ? renderLockButton(writerPageBeatsLockKey(selectedPage.id), `Page ${selectedPage.page_number} beats`) : null}
        {selectedPage ? renderLockButton(writerPageDialogueLockKey(selectedPage.id), `Page ${selectedPage.page_number} dialogue`) : null}
        <label className="ml-auto flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-black/45">
          Page
          <select
            aria-label="Choose Writer page"
            value={selectedPageId ?? ''}
            onChange={(event) => setSelectedPageId(event.target.value || null)}
            disabled={sortedPages.length === 0}
            className="rounded-md border border-black/15 bg-white/85 px-2 py-1 text-[11px] font-bold normal-case tracking-normal text-black disabled:opacity-45"
          >
            <option value="">No page</option>
            {sortedPages.map((page) => (
              <option key={page.id} value={page.id}>
                Page {page.page_number}
              </option>
            ))}
          </select>
        </label>
      </div>
      {writerSafetyMessage ? (
        <div className="mt-2 flex items-start gap-2 bg-emerald-50/90 px-3 py-2 text-[11px] font-semibold text-emerald-950">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 leading-snug">{writerSafetyMessage}</p>
          <button
            type="button"
            className="font-black text-emerald-950/65 hover:text-emerald-950"
            onClick={() => setWriterSafetyMessage(null)}
            aria-label="Dismiss safety message"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
  const lockedStoryPartCount = Object.values(writerLocks).filter((lock) => lock?.locked).length;
  const focusedProtectionBar = (
    <div className="border-b border-black/10 bg-white/40 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-black/45">
          <ShieldCheck size={13} aria-hidden />
          {lockedStoryPartCount} locked
        </span>
        <button
          type="button"
          disabled={!selectedIssueId}
          onClick={() => {
            setActiveTab('outline');
            focusWriterElement('writer-issue-synopsis');
          }}
          className="rounded-md border border-black/15 bg-white/85 px-2.5 py-1.5 text-[11px] font-bold text-black hover:bg-white disabled:opacity-45"
        >
          Edit issue
        </button>
        <button
          type="button"
          disabled={!selectedPageId}
          onClick={() => setActiveTab(selectedPage?.beats_json ? 'dialogue' : 'beats')}
          className="rounded-md border border-black/15 bg-white/85 px-2.5 py-1.5 text-[11px] font-bold text-black hover:bg-white disabled:opacity-45"
        >
          Edit page
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('visual_canon')}
          className="rounded-md border border-amber-800/25 bg-amber-50 px-2.5 py-1.5 text-[11px] font-black text-black hover:bg-amber-100"
        >
          Visual Canon
        </button>
        {writerSafetyMessage ? (
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-emerald-950">
            {writerSafetyMessage}
          </span>
        ) : null}
      </div>
    </div>
  );
  const writerPhaseRail = (
    <div className="flex flex-col gap-1">
      {productionStages.map((stage, index) => (
        <button
          key={stage.id}
          type="button"
          onClick={() => setActiveTab(stage.tab)}
          className={`group grid grid-cols-[1.35rem_minmax(0,1fr)] gap-2 border-l-2 px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/40 ${
            stage.current
              ? 'border-amber-700 bg-amber-100/85 text-black shadow-sm'
              : stage.done
                ? 'border-emerald-500/70 bg-white/45 text-black/75 hover:bg-white/70'
                : 'border-black/10 bg-white/25 text-black/58 hover:bg-white/50'
          }`}
        >
          <span className="pt-0.5 text-[10px] font-black tabular-nums text-black/45">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              {stage.done ? (
                <CheckCircle2 size={13} className="shrink-0 text-emerald-700" aria-hidden />
              ) : (
                <Circle size={12} className="shrink-0 text-black/30" aria-hidden />
              )}
              <span className="truncate text-[11px] font-black uppercase tracking-wide">{stage.label}</span>
            </span>
            <span className="mt-0.5 block truncate text-[10px] font-semibold text-black/50">
              {stage.eyebrow} · {stage.detail}
            </span>
          </span>
        </button>
      ))}
    </div>
  );

  const focusedWorkflowStages = productionStages.filter((stage) =>
    ['dashboard', 'foundation', 'visual_canon', 'outline', 'beats', 'dialogue', 'audit', 'export'].includes(stage.id),
  );

  const focusedWorkflowRail = (
    <div className="flex-shrink-0 overflow-x-auto border-b border-white/25 bg-white/25 px-3 py-2 backdrop-blur-md [-webkit-overflow-scrolling:touch]">
      <div className="flex min-w-max gap-1" aria-label="Focused Writer workflow">
        {focusedWorkflowStages.map((stage) => (
          <Tooltip
            key={stage.id}
            content={`${stage.label}: ${stage.detail}`}
            side="bottom"
          >
            <button
              type="button"
              onClick={() => setActiveTab(stage.tab)}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                stage.current
                  ? 'border-amber-800/45 bg-amber-100 text-black shadow-sm'
                  : stage.done
                    ? 'border-emerald-700/35 bg-emerald-50 text-emerald-950 hover:bg-white'
                    : 'border-black/12 bg-white/55 text-black/58 hover:bg-white hover:text-black'
              }`}
            >
              {stage.done ? <CheckCircle2 size={13} aria-hidden /> : null}
              {stage.label}
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );

  const seriesMenuOptions: WriterMenuOption[] = seriesList.map((series) => ({
    id: series.id,
    label: series.title || 'Untitled series',
    meta: compactWriterMenuMeta(series.logline),
    searchText: series.logline || undefined,
  }));
  const issueMenuOptions: WriterMenuOption[] = issues.map((issue) => ({
    id: issue.id,
    label: `#${issue.issue_number}${issue.title ? ` - ${issue.title}` : ''}`,
    meta: compactWriterMenuMeta(issue.synopsis),
    searchText: issue.synopsis || undefined,
  }));
  const pageMenuOptions: WriterMenuOption[] = sortedPages.map((page) => ({
    id: page.id,
    label: `Page ${page.page_number}`,
    meta: page.script_text?.trim()
      ? 'Dialogue saved'
      : page.beats_json
        ? 'Beats saved'
        : 'No saved beats',
  }));

  const writerSelectionStrip = (
    <div className="relative z-40 flex-shrink-0 border-b border-black/10 bg-white/55 px-3 py-2 backdrop-blur-md">
      <div className="grid gap-2 lg:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_minmax(120px,0.65fr)_auto] lg:items-end">
        <div className="flex min-w-0 gap-1.5">
          <div className="min-w-0 flex-1">
            <WriterSearchableMenu
              label="Series"
              value={selectedSeriesId}
              onChange={(next) => {
                setSelectedSeriesId(next);
                setSelectedIssueId(null);
                setSelectedPageId(null);
              }}
              options={seriesMenuOptions}
              disabled={!supabaseOk || seriesList.length === 0}
              placeholder="Type to search series..."
              ariaLabel="Select Writer series"
            />
          </div>
            <Tooltip content="Add a new series" side="bottom">
              <button
                type="button"
                disabled={!supabaseOk || createSeriesBusy}
                onClick={() => void handleCreateSeries()}
                className="rounded-md border border-black/15 bg-white px-2 py-1.5 text-xs font-black text-black disabled:opacity-45"
                aria-label="Add series"
              >
                +
              </button>
            </Tooltip>
        </div>
        <div className="flex min-w-0 gap-1.5">
          <div className="min-w-0 flex-1">
            <WriterSearchableMenu
              label="Issue"
              value={selectedIssueId}
              onChange={(next) => {
                setSelectedIssueId(next);
                setSelectedPageId(null);
              }}
              options={issueMenuOptions}
              disabled={!supabaseOk || !selectedSeriesId || issues.length === 0}
              placeholder="Type to search issues..."
              ariaLabel="Select Writer issue"
            />
          </div>
            <Tooltip content="Add an issue to the selected series" side="bottom">
              <button
                type="button"
                disabled={!supabaseOk || !selectedSeriesId || createIssueBusy}
                onClick={() => void handleAddWriterIssue()}
                className="rounded-md border border-black/15 bg-white px-2 py-1.5 text-xs font-black text-black disabled:opacity-45"
                aria-label="Add issue"
              >
                +
              </button>
            </Tooltip>
        </div>
        <WriterSearchableMenu
          label="Page"
          value={selectedPageId}
          onChange={setSelectedPageId}
          options={pageMenuOptions}
          disabled={!selectedIssueId || sortedPages.length === 0}
          placeholder="Type to search pages..."
          ariaLabel="Select Writer page"
        />
        <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
          <Tooltip content={quickGenerateNextHint} side="bottom">
            <button
              type="button"
              disabled={quickGenerateDisabled}
              onClick={() => void quickGenerate()}
              className="inline-flex min-h-[34px] items-center gap-2 rounded-md border border-amber-900/30 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-black shadow-sm transition hover:-translate-y-px hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
              style={{ background: ACCENT_GOLD_GRADIENT }}
            >
              {quickGenerateLoading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
              {quickGenerateLabel}
            </button>
          </Tooltip>
          <Tooltip content={writerFocusedMode ? 'Show every Writer tool, ribbon, JSON editor, and batch action' : 'Return to the calmer Writer workflow'} side="bottom">
            <button
              type="button"
              onClick={() => setWriterFocusedMode((mode) => !mode)}
              className="rounded-md border border-black/15 bg-white/80 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-black/65 hover:bg-white hover:text-black"
            >
              {writerFocusedMode ? 'All Tools' : 'Focused'}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );

  const visualCanonCounts = writerVisualReferences.reduce(
    (counts, ref) => ({
      ...counts,
      [ref.kind]: counts[ref.kind] + 1,
    }),
    { character: 0, location: 0, prop: 0 } as Record<WriterVisualReferenceKind, number>,
  );
  const writerVisualProfileMenuOptions: WriterMenuOption[] = writerVisualReferenceProfileOptions.map((profile) => ({
    id: profile,
    label: profile,
  }));
  const writerVisualCollectionMenuOptions: WriterMenuOption[] = writerVisualReferenceCollectionOptions.map(
    (collection) => ({
      id: collection,
      label: collection,
    }),
  );
  const writerVisualReferenceRows =
    writerVisualReferenceSource === 'character_vault'
      ? visibleWriterCharacterReferenceOptions.map((option) => ({
          id: option.id,
          label: option.label,
          meta: option.album.profileName,
          imageUrl: option.item.image_url,
        }))
      : visibleWriterAssetReferenceOptions.map((option) => ({
          id: option.id,
          label: option.label,
          meta: option.album.collectionName,
          imageUrl: option.item.image_url,
        }));

  const visualCanonControls = (
    <div className="border-l-2 border-amber-800/35 bg-amber-50/55 px-3 py-3 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-black/55">
              Visual Canon
            </p>
            <Tooltip content="Attach saved Character Vault and Asset Vault images so page-beat AI uses those designs instead of inventing new ones." side="bottom">
              <button
                type="button"
                className="rounded p-0.5 text-black/42 hover:bg-black/10 hover:text-black"
                aria-label="About Visual Canon"
              >
                <HelpCircle size={13} aria-hidden />
              </button>
            </Tooltip>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-black/60">
            Attached vault images are sent with page-beat AI calls as visual canon.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-white/75 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black/55">
            {writerVisualReferences.length} attached
          </span>
          <button
            type="button"
            disabled={!selectedIssueId || writerVisualReferencesLoading}
            onClick={() => void refreshWriterVisualReferenceAlbums()}
            className="rounded-md border border-black/15 bg-white/80 px-2 py-1 text-[10px] font-bold text-black disabled:opacity-45"
          >
            {writerVisualReferencesLoading ? 'Loading...' : 'Refresh vault'}
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          ['Characters', visualCanonCounts.character],
          ['Locations', visualCanonCounts.location],
          ['Props', visualCanonCounts.prop],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-black/10 bg-white/60 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-wider text-black/42">{label}</p>
            <p className="text-lg font-black text-black">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-[0.8fr_1fr_0.75fr]">
        <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
          Vault
          <select
            aria-label="Choose visual canon vault source"
            value={writerVisualReferenceSource}
            onChange={(e) =>
              setWriterVisualReferenceSource(e.target.value as 'character_vault' | 'asset_vault')
            }
            disabled={!selectedIssueId || writerVisualReferencesBusy}
            className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black disabled:opacity-50"
          >
            <option value="character_vault">Character Vault</option>
            <option value="asset_vault">Asset Vault</option>
          </select>
        </label>
        {writerVisualReferenceSource === 'character_vault' ? (
          <WriterSearchableMenu
            label="Profile"
            value={writerVisualReferenceProfile || null}
            onChange={(next) => setWriterVisualReferenceProfile(next ?? '')}
            options={writerVisualProfileMenuOptions}
            disabled={!selectedIssueId || writerVisualReferencesBusy}
            placeholder="Type to search profiles..."
            ariaLabel="Filter visual canon by character profile"
          />
        ) : (
          <WriterSearchableMenu
            label="Collection"
            value={writerVisualReferenceCollection || null}
            onChange={(next) => setWriterVisualReferenceCollection(next ?? '')}
            options={writerVisualCollectionMenuOptions}
            disabled={!selectedIssueId || writerVisualReferencesBusy}
            placeholder="Type to search collections..."
            ariaLabel="Filter visual canon by asset collection"
          />
        )}
        <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
          Role
          <select
            aria-label="Choose visual canon reference role"
            value={writerVisualReferenceKind}
            onChange={(e) =>
              setWriterVisualReferenceKind(e.target.value as WriterVisualReferenceKind)
            }
            disabled={
              !selectedIssueId ||
              writerVisualReferencesBusy ||
              writerVisualReferenceSource === 'character_vault'
            }
            className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black disabled:opacity-50"
          >
            <option value="character">Character</option>
            <option value="location">Location / set</option>
            <option value="prop">Prop / asset</option>
          </select>
        </label>
      </div>

      <div className="rounded-lg border border-black/10 bg-white/50 p-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-black/55">
              {writerVisualReferenceSource === 'character_vault' ? 'Cast images' : 'Asset images'}
            </p>
            <p className="text-[11px] leading-snug text-black/55">
              Tick one or more saved images to attach them to this issue.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={writerVisualReferenceRows.length === 0 || writerVisualReferencesBusy}
              onClick={() => setWriterVisualReferenceIds(writerVisualReferenceRows.map((row) => row.id))}
              className="rounded border border-black/15 bg-white/80 px-2 py-1 text-[10px] font-bold text-black disabled:opacity-45"
            >
              Select visible
            </button>
            <button
              type="button"
              disabled={writerVisualReferenceIds.length === 0 || writerVisualReferencesBusy}
              onClick={() => setWriterVisualReferenceIds([])}
              className="rounded border border-black/15 bg-white/80 px-2 py-1 text-[10px] font-bold text-black disabled:opacity-45"
            >
              Clear
            </button>
          </div>
        </div>
        {writerVisualReferenceRows.length > 0 ? (
          <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {writerVisualReferenceRows.map((row) => {
              const selected = writerVisualReferenceIds.includes(row.id);
              return (
                <label
                  key={row.id}
                  className={`flex cursor-pointer gap-2 rounded-lg border p-2 transition ${
                    selected
                      ? 'border-amber-800/45 bg-amber-100/80'
                      : 'border-black/10 bg-white/70 hover:bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={writerVisualReferencesBusy}
                    onChange={(event) =>
                      setWriterVisualReferenceIds((prev) =>
                        event.target.checked
                          ? [...new Set([...prev, row.id])]
                          : prev.filter((id) => id !== row.id),
                      )
                    }
                    className="mt-1"
                  />
                  <span className="h-14 w-11 shrink-0 overflow-hidden rounded border border-black/10 bg-black/10">
                    <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-black text-black">{row.label}</span>
                    <span className="block truncate text-[9px] font-bold uppercase tracking-wide text-black/45">
                      {row.meta}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="rounded-md bg-white/70 px-2 py-2 text-[11px] font-semibold text-black/50">
            {writerVisualReferencesLoading
              ? 'Loading vault images...'
              : writerVisualReferenceSource === 'character_vault'
                ? 'No character images match this profile.'
                : 'No asset images match this collection.'}
          </p>
        )}
      </div>

      <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
        Note
        <input
          type="text"
          value={writerVisualReferenceNote}
          onChange={(e) => setWriterVisualReferenceNote(e.target.value)}
          disabled={!selectedIssueId || writerVisualReferencesBusy}
          className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black disabled:opacity-50"
          placeholder="e.g. use the cloak silhouette; keep the bronze mask"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!selectedIssueId || writerVisualReferenceIds.length === 0 || writerVisualReferencesBusy}
          onClick={() => void attachWriterVisualReference()}
          className="rounded-lg border border-amber-800/35 bg-amber-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-black shadow-sm hover:bg-amber-200 disabled:opacity-45"
        >
          {writerVisualReferencesBusy
            ? 'Saving...'
            : `Attach ${writerVisualReferenceIds.length || ''} to issue`}
        </button>
        <button
          type="button"
          disabled={!selectedIssueId}
          onClick={() => setActiveTab('beats')}
          className="rounded-lg border border-black/15 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white disabled:opacity-45"
        >
          Continue to beats
        </button>
      </div>

      {writerVisualReferencesError ? (
        <p className="rounded-md bg-red-100/90 px-2 py-1.5 text-[11px] text-red-800">
          {writerVisualReferencesError}
        </p>
      ) : null}

      {writerVisualReferences.length > 0 ? (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {writerVisualReferences.map((ref) => (
              <div
                key={ref.id}
                className="flex gap-2 rounded-lg border border-black/10 bg-white/65 p-2"
              >
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded border border-black/10 bg-black/10">
                  <img
                    src={ref.imageUrl}
                    alt={ref.label}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-black text-black">{ref.label}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-black/45">
                        {ref.kind} / {ref.source === 'character_vault' ? 'Character Vault' : 'Asset Vault'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={writerVisualReferencesBusy}
                      onClick={() => void removeWriterVisualReference(ref)}
                      className="rounded border border-black/15 bg-white/80 px-2 py-0.5 text-[9px] font-bold text-black disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                  {ref.note ? (
                    <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-black/60">
                      {ref.note}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {!writerFocusedMode ? (
            <details className="rounded-lg border border-black/10 bg-white/45 px-3 py-2">
              <summary className="cursor-pointer text-[10px] font-black uppercase tracking-wide text-black/55">
                AI context preview
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] leading-snug text-black/70">
                {writerVisualReferenceDigest}
              </pre>
            </details>
          ) : null}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-black/15 bg-white/45 px-3 py-2 text-[11px] text-black/55">
          No issue visual references attached yet.
        </p>
      )}
    </div>
  );

  const pageEditReviewPanel = (
    <div className="rounded-xl border border-amber-800/20 bg-amber-50/75 p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-950/70">
            Edit current page review
          </p>
          <p className="mt-1 text-xs leading-snug text-black/65">
            Stage outline, beats, or dialogue edits here first. The review flags likely repetition,
            canon drift, neighbor overlap, and layer mismatch before you save or regenerate.
          </p>
        </div>
        <span className="rounded bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black/55">
          {selectedPage ? `Page ${selectedPage.page_number}` : 'No page'}
        </span>
      </div>
      {!selectedPage || !pageEditLayer || !pageEditReview ? (
        <p className="mt-3 text-[11px] text-black/55">
          Select a page and open the Outline, Beats, or Dialogue editor tab to review staged page edits.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div
            className={`rounded-lg border px-3 py-2 text-xs ${
              pageEditReview.status === 'clear'
                ? 'border-emerald-500/40 bg-emerald-50 text-emerald-950'
                : 'border-amber-700/35 bg-white/75 text-amber-950'
            }`}
          >
            <p className="font-bold">
              {pageEditReview.status === 'clear'
                ? 'No obvious conflicts detected.'
                : 'Review before applying this edit.'}
            </p>
            <p className="mt-1 leading-snug">{summarizeWriterPageEditReview(pageEditReview)}</p>
          </div>
          {pageEditReview.findings.length > 0 ? (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {pageEditReview.findings.map((finding) => (
                <li
                  key={finding.kind}
                  className="rounded-md border border-black/10 bg-white/70 px-2 py-1.5 text-[11px] leading-snug text-black/68"
                >
                  <span className="font-black uppercase tracking-wide text-black/50">
                    {finding.kind.replace(/_/g, ' ')}
                  </span>
                  : {finding.message}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!supabaseOk || scriptsBusy}
              onClick={() => {
                if (pageEditLayer === 'outline') void saveOutlineEdit();
                else if (pageEditLayer === 'beats') void saveBeatsEdit();
                else void saveDialogueEdit();
              }}
              className="rounded-md px-3 py-1.5 text-[11px] font-black text-black shadow-sm disabled:opacity-45"
              style={{ background: ACCENT_GOLD_GRADIENT }}
            >
              Save staged {pageEditLayer}
            </button>
            <button
              type="button"
              disabled={!supabaseOk || !selectedIssueId || canonLoading}
              onClick={() => void runCanonFromRibbon()}
              className="rounded-md border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-45"
            >
              {canonLoading ? 'Checking…' : 'Run canon check'}
            </button>
            <button
              type="button"
              disabled={!supabaseOk || !selectedPageId || beatsLoading}
              onClick={() => void runSelectedPageBeatsGeneration()}
              className="rounded-md border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-45"
            >
              {beatsLoading ? 'Regenerating…' : 'Regenerate beats'}
            </button>
            <button
              type="button"
              disabled={!supabaseOk || !selectedPageId || dialogueLoading}
              onClick={() => void runSelectedPageDialogueGeneration()}
              className="rounded-md border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-45"
            >
              {dialogueLoading ? 'Regenerating…' : 'Regenerate dialogue'}
            </button>
            <button
              type="button"
              disabled={!supabaseOk || !selectedPageId || pacingPreviewBusy}
              onClick={async () => {
                if (!selectedPageId) return;
                setSelectedPageIdsForBatch([selectedPageId]);
                await runPacingRegenerationPreview([selectedPageId]);
                setActiveTab('arc');
              }}
              className="rounded-md border border-amber-800/30 bg-amber-100/90 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-45"
            >
              {pacingPreviewBusy ? 'Previewing…' : 'Preview affected page'}
            </button>
          </div>
          <p className="text-[10px] leading-snug text-black/52">
            Generated previews open on Audit and still require per-page apply. Nothing here silently
            rewrites another layer.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="flex-1 min-h-0 flex flex-col text-sm overflow-hidden"
      style={{ background: WRITERS_WORKSHOP_BG }}
    >
      <header
        className="flex-shrink-0 border-b border-black/10"
        style={{ background: WRITERS_GOLD_SLANT }}
      >
        <div className="grid gap-2 px-3 py-2 lg:grid-cols-[minmax(240px,1.1fr)_minmax(360px,1.5fr)_minmax(220px,auto)] lg:items-center">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-black/45">
              Narrative Production System
            </p>
            <h1 className="truncate text-lg font-black tracking-tight" style={titleTextStyle}>
              Writers&apos; Workshop
            </h1>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-black/55">
              {selectedSeries?.title?.trim() || 'No series selected'} ·{' '}
              {selectedIssue ? `Issue ${selectedIssue.issue_number}${selectedIssue.title ? `: ${selectedIssue.title}` : ''}` : 'No issue selected'} ·{' '}
              {selectedPageLabel}
            </p>
          </div>

          <div className={`${writerFocusedMode ? 'hidden' : 'grid'} grid-cols-4 gap-1.5 md:grid-cols-8`}>
            {[
              { label: 'Stages', value: `${completedStageCount}/${productionStages.length}` },
              { label: 'Pages', value: sortedPages.length || targetPageCount },
              { label: 'Beats', value: pagesWithBeatsCount },
              { label: 'Script', value: pagesWithScriptCount },
              { label: 'Canon', value: loreCards.length },
              { label: 'Shots', value: latestShotPlan ? 1 : 0 },
              { label: 'Audit', value: reviewReady ? 1 : 0 },
              { label: 'Tab', value: activeStage?.label ?? workspaceHeading },
            ].map((item) => (
              <div
                key={item.label}
                className="min-w-0 border-l border-black/15 bg-white/30 px-2 py-1 text-black/75"
              >
                <p className="truncate text-[8px] font-black uppercase tracking-wider text-black/42">{item.label}</p>
                <p className="truncate text-[12px] font-black leading-tight text-black">{item.value}</p>
              </div>
            ))}
          </div>

          <div className={`${writerFocusedMode ? 'hidden' : 'flex'} min-w-0 items-center gap-2 lg:justify-end`}>
            <div className="hidden min-w-0 text-right lg:block">
              <p className="truncate text-[10px] font-bold uppercase tracking-wide text-black/45">Next action</p>
              <p className="max-w-[260px] truncate text-[11px] font-semibold text-black/65">{quickGenerateNextHint}</p>
            </div>
            <div className="inline-flex rounded-md border border-black/15 bg-white/35 p-0.5">
              {(['Focused', 'All Tools'] as const).map((mode) => {
                const active = writerFocusedMode ? mode === 'Focused' : mode === 'All Tools';
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setWriterFocusedMode(mode === 'Focused')}
                    className={`rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide transition ${
                      active ? 'bg-black text-white' : 'text-black/55 hover:bg-white/70 hover:text-black'
                    }`}
                    aria-pressed={active}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={quickGenerateDisabled}
              onClick={() => void quickGenerate()}
              className="inline-flex min-h-[34px] shrink-0 items-center gap-2 rounded-md border border-amber-900/30 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-black shadow-sm transition hover:-translate-y-px hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
              style={{ background: ACCENT_GOLD_GRADIENT }}
            >
              {quickGenerateLoading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
              {quickGenerateLabel}
            </button>
          </div>
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

      {writerSelectionStrip}

      {!writerFocusedMode ? (
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
      ) : null}

      {writerFocusedMode ? focusedProtectionBar : editProtectionBar}

      {writerFocusedMode ? focusedWorkflowRail : null}

      {isPhone ? (
        <div
          className="flex-shrink-0 overflow-x-auto border-b border-white/20 bg-teal-950/15 px-2 py-2 [-webkit-overflow-scrolling:touch]"
          aria-label="Narrative production stages"
        >
          <div className="flex min-w-max gap-1">
            {productionStages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveTab(stage.tab)}
                className={`shrink-0 rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                  stage.current
                    ? 'border-amber-700 bg-amber-100 text-black'
                    : stage.done
                      ? 'border-emerald-600/50 bg-emerald-100/60 text-black/80'
                      : 'border-black/15 bg-white/50 text-black/65'
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
        {!isPhone && !writerFocusedMode ? (
          <aside
            className="hidden w-[236px] shrink-0 border-r border-white/25 bg-white/[0.12] p-2 backdrop-blur-md xl:block"
            aria-label="Narrative production navigator"
          >
            <div className="mb-2 border-b border-black/10 px-2 pb-2">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/42">Production map</p>
              <p className="mt-1 text-[11px] font-semibold leading-snug text-black/62">
                Structured path from foundation to export.
              </p>
            </div>
            {writerPhaseRail}
          </aside>
        ) : null}
        <WriterContextMenu items={contextItems}>
          <section className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
            <div
              className={`flex-1 min-h-0 overflow-y-scroll overscroll-y-contain scrollbar-gutter-stable custom-scrollbar min-w-0 ${
                isPhone ? 'p-3 pb-28' : 'p-4 pb-10'
              }`}
            >
              <div className="w-full min-w-0 space-y-4 text-slate-900/90">
                <div className="border-b border-black/10 pb-3">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-black/42">
                        {activeStage?.eyebrow ?? 'Workspace'} · {activeStage?.detail ?? 'Focus mode'}
                      </p>
                      <h2 className="mt-0.5 text-xl font-black tracking-tight text-slate-950">
                        {workspaceHeading}
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-black/55">
                      <span className="border-l border-black/15 bg-white/35 px-2 py-1">
                        {selectedIssue ? `Issue ${selectedIssue.issue_number}` : 'No issue'}
                      </span>
                      <span className="border-l border-black/15 bg-white/35 px-2 py-1">
                        {selectedPageLabel}
                      </span>
                      <span className="border-l border-black/15 bg-white/35 px-2 py-1">
                        {completedStageCount}/{productionStages.length} ready
                      </span>
                    </div>
                  </div>
                </div>
                {imageWorkshopError ? (
                  <p className="mb-3 rounded-lg bg-red-100/90 px-3 py-2 text-xs text-red-800">
                    {imageWorkshopError}
                  </p>
                ) : null}
                {activeTab === 'dashboard' && (
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                    <div className={`${WRITER_GLASS_CARD} p-4 space-y-3`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-black/55">Current issue</p>
                          <h3 className="mt-1 text-lg font-black leading-tight text-black">
                            {selectedIssue
                              ? `Issue ${selectedIssue.issue_number}${selectedIssue.title ? `: ${selectedIssue.title}` : ''}`
                              : 'No issue selected'}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-black/55">
                            {selectedSeries?.title || 'Select a series'} / {selectedPageLabel}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={quickGenerateDisabled}
                          onClick={() => void quickGenerate()}
                          className="rounded-md border border-amber-900/30 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-black shadow-sm disabled:opacity-45"
                          style={{ background: ACCENT_GOLD_GRADIENT }}
                        >
                          {quickGenerateLabel}
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-4">
                        {[
                          ['Outline', latestOutline ? 'Ready' : 'Needed'],
                          ['Pages', `${sortedPages.length || 0}/${targetPageCount}`],
                          ['Beats', `${pagesWithBeatsCount}/${Math.max(sortedPages.length, targetPageCount)}`],
                          ['Dialogue', `${pagesWithScriptCount}/${Math.max(pagesWithBeatsCount, sortedPages.length)}`],
                        ].map(([label, value]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              if (label === 'Outline') setActiveTab('outline');
                              else if (label === 'Dialogue') setActiveTab('dialogue');
                              else setActiveTab('beats');
                            }}
                            className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-left hover:bg-white"
                          >
                            <p className="text-[9px] font-black uppercase tracking-wider text-black/42">{label}</p>
                            <p className="text-sm font-black text-black">{value}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`${WRITER_GLASS_CARD} p-4 space-y-3`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-black/55">Visual Canon</p>
                          <p className="mt-1 text-xs font-semibold text-black/60">
                            {writerVisualReferences.length} attached / {visualCanonCounts.character} characters /{' '}
                            {visualCanonCounts.location} locations / {visualCanonCounts.prop} props
                          </p>
                        </div>
                        <Image size={18} className="shrink-0 text-black/45" aria-hidden />
                      </div>
                      {writerVisualReferences.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {writerVisualReferences.slice(0, 5).map((ref) => (
                            <div key={ref.id} className="w-16 shrink-0">
                              <div className="h-16 overflow-hidden rounded-md border border-black/10 bg-black/10">
                                <img src={ref.imageUrl} alt={ref.label} className="h-full w-full object-cover" />
                              </div>
                              <p className="mt-1 truncate text-[9px] font-bold text-black/55">{ref.label}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-lg border border-dashed border-black/15 bg-white/55 px-3 py-2 text-xs text-black/55">
                          No references attached.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab('visual_canon')}
                        className="w-full rounded-md border border-amber-800/35 bg-amber-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-black hover:bg-amber-50"
                      >
                        Open Visual Canon
                      </button>
                    </div>

                    <div className={`${WRITER_GLASS_CARD} p-4 space-y-3 xl:col-span-2`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-black/55">Protected story parts</p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('outline')}
                          className="rounded-md border border-black/15 bg-white/80 px-2.5 py-1 text-[10px] font-bold text-black"
                        >
                          Manage locks
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          { label: 'Synopsis', lock: writerLocks['issue.synopsis'] },
                          { label: 'Outline instructions', lock: writerLocks['issue.outline_instructions'] },
                          { label: 'Outline', lock: writerLocks['outline.latest'] },
                          { label: 'Page beats', lock: selectedPage ? writerLocks[writerPageBeatsLockKey(selectedPage.id)] : null },
                          { label: 'Dialogue', lock: selectedPage ? writerLocks[writerPageDialogueLockKey(selectedPage.id)] : null },
                        ] satisfies Array<{ label: string; lock: WriterLockEntry | null | undefined }>).map(({ label, lock }) => (
                          <span
                            key={label}
                            className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                              lock?.locked
                                ? 'border-emerald-700/35 bg-emerald-50 text-emerald-950'
                                : 'border-black/10 bg-white/55 text-black/45'
                            }`}
                          >
                            {label}: {lock?.locked ? 'Locked' : 'Open'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'visual_canon' && (
                  <div className="space-y-4">
                    <div className={`${WRITER_GLASS_CARD} p-4 space-y-2`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-black/55">Visual Canon</p>
                          <h3 className="mt-1 text-lg font-black text-black">Issue reference images</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('beats')}
                          className="rounded-md border border-black/15 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white"
                        >
                          Continue to beats
                        </button>
                      </div>
                    </div>
                    {visualCanonControls}
                  </div>
                )}
                {activeTab === 'cockpit' && (
                  <div className="space-y-4">
                    <div className={`${WRITER_GLASS_CARD} p-4 space-y-3`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/55">
                            Writers&apos; cockpit
                          </p>
                          <p className="text-xs text-black/70 leading-snug max-w-3xl">
                            Compare up to three read-only views side-by-side. Beats/Dialogue/Shot plan digests follow your{' '}
                            <strong className="text-black/80">Library → selected page</strong>. Use{' '}
                            <strong className="text-black/80">Idea assist</strong> for non-destructive brainstorming — then copy
                            or append into drafts on other tabs.
                          </p>
                          {!selectedIssueId ? (
                            <p className="text-xs text-amber-900/90 bg-amber-50/80 border border-amber-200/70 rounded-lg px-3 py-2">
                              Select an issue in Library to load story context.
                            </p>
                          ) : null}
                          {!selectedPageId ? (
                            <p className="text-xs text-black/55">
                              Tip: select a page in Library for page-scoped previews (beats/dialogue).
                            </p>
                          ) : (
                            <p className="text-xs text-black/55">
                              Selected page:{' '}
                              <span className="font-bold text-black/75">
                                Page {selectedPage?.page_number ?? '?'}
                              </span>
                            </p>
                          )}
                        </div>
                        <WriterSectionTip tipKey="cockpitTab" label="About the cockpit" />
                      </div>
                    </div>

                    <div className={`${WRITER_GLASS_CARD} p-4 space-y-3`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-black/55">Idea assist</p>
                        <button
                          type="button"
                          className="text-[10px] font-bold uppercase tracking-wide rounded-full border border-black/15 bg-white/40 px-3 py-1 hover:bg-white/70"
                          onClick={() => setCockpitAiBarCollapsed((c) => !c)}
                        >
                          {cockpitAiBarCollapsed ? 'Show' : 'Hide'}
                        </button>
                      </div>

                      {!cockpitAiBarCollapsed ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-black/70">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={cockpitIncludeLeft}
                                onChange={(e) => setCockpitIncludeLeft(e.target.checked)}
                              />
                              Include left digest
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={cockpitIncludeMiddle}
                                onChange={(e) => setCockpitIncludeMiddle(e.target.checked)}
                              />
                              Include middle digest
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={cockpitIncludeRight}
                                onChange={(e) => setCockpitIncludeRight(e.target.checked)}
                              />
                              Include right digest
                            </label>
                          </div>

                          <label className="flex flex-col gap-1 text-[11px] font-semibold text-black/70" htmlFor="writer-cockpit-idea-prompt">
                            Prompt
                            <textarea
                              id="writer-cockpit-idea-prompt"
                              value={cockpitIdeaPromptDraft}
                              onChange={(e) => setCockpitIdeaPromptDraft(e.target.value)}
                              rows={4}
                              disabled={!supabaseOk || !selectedIssueId}
                              className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y min-h-[96px] disabled:opacity-50 disabled:cursor-not-allowed"
                              placeholder="Ask for alternates, tighten a scene beat, check continuity, brainstorm covers…"
                            />
                          </label>

                          <div className="flex flex-wrap gap-2 text-[10px] text-black/55">
                            <span className="font-bold text-black/45 uppercase tracking-wide">Focus for page_id</span>
                            <button
                              type="button"
                              className={`rounded-full px-2 py-0.5 border ${
                                cockpitIdeaFocus === 'left'
                                  ? 'border-amber-700 bg-amber-100 text-black'
                                  : 'border-black/10 bg-white/40 text-black/70 hover:bg-white/70'
                              }`}
                              onClick={() => setCockpitIdeaFocus('left')}
                            >
                              Left
                            </button>
                            <button
                              type="button"
                              className={`rounded-full px-2 py-0.5 border ${
                                cockpitIdeaFocus === 'middle'
                                  ? 'border-amber-700 bg-amber-100 text-black'
                                  : 'border-black/10 bg-white/40 text-black/70 hover:bg-white/70'
                              }`}
                              onClick={() => setCockpitIdeaFocus('middle')}
                            >
                              Middle
                            </button>
                            <button
                              type="button"
                              className={`rounded-full px-2 py-0.5 border ${
                                cockpitIdeaFocus === 'right'
                                  ? 'border-amber-700 bg-amber-100 text-black'
                                  : 'border-black/10 bg-white/40 text-black/70 hover:bg-white/70'
                              }`}
                              onClick={() => setCockpitIdeaFocus('right')}
                            >
                              Right
                            </button>
                            <span className="text-black/45">
                              (Used when the focused column is Beats or Dialogue — sends optional <code className="font-mono">page_id</code>
                              )
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!cockpitIdeaOutput.trim()}
                              onClick={() => void navigator.clipboard.writeText(cockpitIdeaOutput)}
                              className="rounded-lg border border-black/15 bg-white/70 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white disabled:opacity-40"
                            >
                              Copy output
                            </button>
                            <button
                              type="button"
                              disabled={!cockpitIdeaOutput.trim()}
                              onClick={() => appendTextToField(setOutlineSupplementDraft, cockpitIdeaOutput)}
                              className="rounded-lg border border-black/15 bg-white/70 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white disabled:opacity-40"
                            >
                              Append to outline supplement draft
                            </button>
                            <button
                              type="button"
                              disabled={!cockpitIdeaOutput.trim() || !selectedPageId}
                              onClick={() => appendTextToField(setBeatsEditDraft, cockpitIdeaOutput)}
                              className="rounded-lg border border-black/15 bg-white/70 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white disabled:opacity-40"
                            >
                              Append to beats JSON draft
                            </button>
                            <button
                              type="button"
                              disabled={!cockpitIdeaOutput.trim() || !selectedPageId}
                              onClick={() => appendTextToField(setDialogueEditDraft, cockpitIdeaOutput)}
                              className="rounded-lg border border-black/15 bg-white/70 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white disabled:opacity-40"
                            >
                              Append to dialogue draft
                            </button>
                          </div>

                          {cockpitIdeaError ? (
                            <p className="rounded-lg bg-red-100/90 px-3 py-2 text-xs text-red-800">{cockpitIdeaError}</p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-[11px] text-black/55">Idea assist bar hidden — use ribbon <strong>Run Idea assist</strong> (⌥⌘1) when ready.</p>
                      )}
                    </div>

                    <div className="grid min-w-0 gap-3 lg:grid-cols-3">
                      {(
                        [
                          {
                            key: 'left' as const,
                            label: 'Left',
                            view: cockpitLeftView,
                            setView: setCockpitLeftView,
                          },
                          {
                            key: 'middle' as const,
                            label: 'Middle',
                            view: cockpitMiddleView,
                            setView: setCockpitMiddleView,
                          },
                          {
                            key: 'right' as const,
                            label: 'Right',
                            view: cockpitRightView,
                            setView: setCockpitRightView,
                          },
                        ] as const
                      ).map((col) => (
                        <div key={col.key} className={`${WRITER_GLASS_CARD} p-3 space-y-2 min-h-[260px] flex flex-col`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-black/55">
                              {col.label}
                              <select
                                value={col.view}
                                onChange={(e) => col.setView(e.target.value as WriterCockpitPanelView)}
                                className="ml-2 rounded-md border border-black/15 bg-white px-2 py-1 text-[11px] font-bold text-black"
                              >
                                {COCKPIT_VIEW_OPTIONS.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${
                                cockpitIdeaFocus === col.key
                                  ? 'border-amber-700 bg-amber-100 text-black'
                                  : 'border-black/10 bg-white/40 text-black/70 hover:bg-white/70'
                              }`}
                              onClick={() => setCockpitIdeaFocus(col.key)}
                            >
                              Focus
                            </button>
                          </div>
                          <pre className={`${preShell} ${preFont} flex-1 min-h-[200px] max-h-[min(520px,55vh)]`}>
                            <WriterHighlightedText
                              text={cockpitColumnPreview(col.view)}
                              query={findQuery}
                              activeMatchIndex={findActiveIndex}
                            />
                          </pre>
                        </div>
                      ))}
                    </div>

                    {cockpitIdeaOutput.trim() ? (
                      <div className={`${WRITER_GLASS_CARD} p-4 space-y-2`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-black/55">Idea assist output</p>
                        <pre className={`${preShell} ${preFont} max-h-[min(520px,55vh)]`}>
                          <WriterHighlightedText
                            text={cockpitIdeaOutput}
                            query={findQuery}
                            activeMatchIndex={findActiveIndex}
                          />
                        </pre>
                      </div>
                    ) : null}
                  </div>
                )}
                {activeTab === 'outline' && (
                  <div className="flex min-w-0 flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(300px,40%)] xl:items-start xl:gap-4">
                    <div className="min-w-0 space-y-4">
                    {!supabaseOk ? (
                      <div
                        className={`${WRITER_GLASS_CARD} p-4 space-y-2 border-amber-400/40 bg-amber-50/30`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900/80">Foundation Hub</p>
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
                            Foundation Hub → story context
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
                        {!writerFocusedMode ? (
                          visualCanonControls
                        ) : (
                          <div className="border-l-2 border-amber-800/35 bg-amber-50/60 px-3 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-black/55">
                                  Visual Canon moved
                                </p>
                                <p className="mt-1 text-[11px] leading-snug text-black/60">
                                  Attach character, location, and prop references in the Visual Canon workspace.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setActiveTab('visual_canon')}
                                className="rounded-md border border-amber-800/35 bg-amber-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-black"
                              >
                                Open Visual Canon
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="border-l-2 border-black/30 bg-white/45 px-3 py-3 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-black/55">
                                Foundation Hub / production defaults
                              </p>
                              <p className="mt-1 text-[11px] leading-snug text-black/60">
                                Saved in existing notes metadata. Issue defaults override series defaults and are sent
                                to outline, beats, dialogue, visual planning, and issue pack exports.
                              </p>
                            </div>
                            <span className="rounded bg-black/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black/55">
                              notes.production_defaults
                            </span>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
                              Medium type
                              <select
                                value={productionDefaultsDraft.mediumType}
                                onChange={(e) =>
                                  setProductionDefaultsDraft((p) => ({
                                    ...p,
                                    mediumType: e.target.value as WriterProductionDefaults['mediumType'],
                                  }))
                                }
                                disabled={!selectedSeriesId}
                                className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black disabled:opacity-50"
                              >
                                <option value="comic">Comic</option>
                                <option value="book">Book</option>
                                <option value="screenplay">Screenplay</option>
                                <option value="video">Video</option>
                                <option value="wiki">Lore wiki</option>
                              </select>
                            </label>
                            <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
                              Narrative scope
                              <select
                                value={productionDefaultsDraft.narrativeScope}
                                onChange={(e) =>
                                  setProductionDefaultsDraft((p) => ({
                                    ...p,
                                    narrativeScope: e.target.value as WriterProductionDefaults['narrativeScope'],
                                  }))
                                }
                                disabled={!selectedSeriesId}
                                className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black disabled:opacity-50"
                              >
                                <option value="single_issue">Single issue</option>
                                <option value="multi_issue_arc">Multi-issue arc</option>
                                <option value="book">Book</option>
                                <option value="episode">Episode</option>
                                <option value="shared_universe">Shared universe</option>
                              </select>
                            </label>
                            <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
                              Comic panel density
                              <select
                                value={productionDefaultsDraft.comicPanelDensity}
                                onChange={(e) =>
                                  setProductionDefaultsDraft((p) => ({
                                    ...p,
                                    comicPanelDensity: e.target.value as WriterProductionDefaults['comicPanelDensity'],
                                  }))
                                }
                                disabled={!selectedSeriesId}
                                className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black disabled:opacity-50"
                              >
                                <option value="sparse">Sparse</option>
                                <option value="standard">Standard</option>
                                <option value="dense">Dense</option>
                              </select>
                            </label>
                            <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
                              Character consistency
                              <select
                                value={productionDefaultsDraft.characterConsistency}
                                onChange={(e) =>
                                  setProductionDefaultsDraft((p) => ({
                                    ...p,
                                    characterConsistency: e.target.value as WriterProductionDefaults['characterConsistency'],
                                  }))
                                }
                                disabled={!selectedSeriesId}
                                className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black disabled:opacity-50"
                              >
                                <option value="strict">Strict</option>
                                <option value="standard">Standard</option>
                              </select>
                            </label>
                            <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
                              Preferred export
                              <select
                                value={productionDefaultsDraft.outputFormat}
                                onChange={(e) =>
                                  setProductionDefaultsDraft((p) => ({
                                    ...p,
                                    outputFormat: e.target.value as WriterProductionDefaults['outputFormat'],
                                  }))
                                }
                                disabled={!selectedSeriesId}
                                className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black disabled:opacity-50"
                              >
                                <option value="issue_pack_json">Issue pack JSON</option>
                                <option value="comic_script_markdown">Comic script markdown</option>
                                <option value="guided_comic_handoff">Guided Comics handoff</option>
                                <option value="fountain_screenplay">Fountain screenplay</option>
                                <option value="prose_manuscript">Prose manuscript</option>
                                <option value="lore_wiki">Lore wiki</option>
                              </select>
                            </label>
                          </div>
                          <label className="flex flex-col gap-1 text-[10px] font-semibold text-black/70">
                            Art style
                            <input
                              type="text"
                              value={productionDefaultsDraft.artStyle}
                              onChange={(e) =>
                                setProductionDefaultsDraft((p) => ({ ...p, artStyle: e.target.value }))
                              }
                              disabled={!selectedSeriesId}
                              className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black disabled:opacity-50"
                              placeholder="e.g. consistent comic-book line art"
                            />
                          </label>
                          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-black/70">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={productionDefaultsDraft.strictCanon}
                                disabled={!selectedSeriesId}
                                onChange={(e) =>
                                  setProductionDefaultsDraft((p) => ({ ...p, strictCanon: e.target.checked }))
                                }
                              />
                              Strict canon
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={productionDefaultsDraft.noVideoAssumptions}
                                disabled={!selectedSeriesId}
                                onChange={(e) =>
                                  setProductionDefaultsDraft((p) => ({
                                    ...p,
                                    noVideoAssumptions: e.target.checked,
                                  }))
                                }
                              />
                              No video assumptions
                            </label>
                          </div>
                          {productionDefaultsError ? (
                            <p className="rounded-md bg-red-100/90 px-2 py-1.5 text-[11px] text-red-800">
                              {productionDefaultsError}
                            </p>
                          ) : null}
                          <button
                            type="button"
                            disabled={!supabaseOk || !selectedSeriesId || productionDefaultsBusy}
                            onClick={() => void saveProductionDefaultsToNotes()}
                            className="rounded-md border border-black/20 bg-white/85 px-3 py-1.5 text-[11px] font-bold text-black shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                          >
                            {productionDefaultsBusy
                              ? 'Saving…'
                              : selectedIssueId
                                ? 'Save issue defaults'
                                : 'Save series defaults'}
                          </button>
                        </div>
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
                              const synopsisChanged =
                                issueSynopsisDraft.trim() !== (selectedIssue?.synopsis ?? '').trim();
                              if (synopsisChanged && !guardWriterLock('issue.synopsis', 'Issue synopsis')) {
                                setContextSaveLoading(false);
                                return;
                              }
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
	                        onBlur={() => void persistWriterDrafts({ outline_instructions: outlineSupplementDraft })}
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
	                        onClick={() => {
	                          if (latestOutline) setActiveTab('beats');
	                          else void runOutlineGenerate();
	                        }}
	                        className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
	                        style={{ background: ACCENT_GOLD_GRADIENT }}
	                      >
	                        {outlineGenLoading ? 'Generating…' : latestOutline ? 'Continue to Beats' : 'Generate outline'}
	                      </button>
	                      {latestOutline ? (
	                        <button
	                          type="button"
	                          disabled={!supabaseOk || !selectedIssueId || outlineGenLoading}
	                          onClick={() => void runOutlineGenerate()}
	                          className="rounded-lg border border-black/20 bg-white/80 px-3 py-2 text-[11px] font-semibold text-black disabled:opacity-40"
	                        >
	                          Regenerate outline
	                        </button>
	                      ) : null}
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
                    {renderScopePreview(outlineRegenerationScope)}
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
	                              onClick={() => focusWriterElement('writer-outline-inline-editor')}
	                              className="rounded-md border border-amber-800/35 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-black shadow-sm hover:bg-amber-100 disabled:opacity-40"
	                            >
	                              Edit outline
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
	                                    if (!guardWriterLock('outline.latest', 'Latest outline')) return;
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
	                          <div className="border-l-2 border-amber-800/35 bg-white/55 px-3 py-3">
	                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
	                              <p className="text-[10px] font-black uppercase tracking-wider text-black/55">
	                                Direct edit outline
	                              </p>
	                              {renderLockButton('outline.latest', 'Latest outline')}
	                            </div>
	                            <textarea
	                              id="writer-outline-inline-editor"
	                              value={outlineEditDraft}
	                              onChange={(e) => setOutlineEditDraft(e.target.value)}
	                              rows={8}
	                              className="w-full resize-y rounded-lg border border-black/15 bg-white px-2 py-1.5 font-mono text-xs text-black disabled:opacity-50"
	                              disabled={!latestOutline}
	                            />
	                            <div className="mt-2 flex flex-wrap gap-2">
	                              <button
	                                type="button"
	                                disabled={!supabaseOk || scriptsBusy || !latestOutline}
	                                onClick={() => void saveOutlineEdit()}
	                                className="rounded-md px-3 py-1.5 text-[11px] font-black text-black shadow-sm disabled:opacity-45"
	                                style={{ background: ACCENT_GOLD_GRADIENT }}
	                              >
	                                {scriptsBusy ? 'Saving…' : 'Save outline edit'}
	                              </button>
	                              <button
	                                type="button"
	                                disabled={!latestOutline}
	                                onClick={() => openSavedOutputEditor('outline')}
	                                className="rounded-md border border-black/15 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-45"
	                              >
	                                Advanced editor
	                              </button>
	                            </div>
	                          </div>
	                        ) : null}
	                        {latestOutline ? (
	                          <div className="space-y-2">
	                            <pre
	                              className={`${preShell} font-sans max-h-[min(360px,42vh)] min-h-[10rem] xl:max-h-[min(420px,calc(100dvh-18rem))]`}
	                            >
	                              <WriterHighlightedText
	                                text={formatOutlineAsText(latestOutline.outline_json)}
	                                query={findQuery}
	                                activeMatchIndex={findActiveIndex}
	                              />
	                            </pre>
	                            <details className="rounded-lg border border-black/10 bg-white/50 px-3 py-2">
	                              <summary className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-black/50">
	                                Advanced JSON
	                              </summary>
	                              <pre
	                                className={`${preShell} ${preFont} mt-2 max-h-[min(360px,42vh)] min-h-[10rem]`}
	                              >
	                                <WriterHighlightedText
	                                  text={outlineJsonString}
	                                  query={findQuery}
	                                  activeMatchIndex={findActiveIndex}
	                                />
	                              </pre>
	                            </details>
	                          </div>
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
                        Canon gate
                      </p>
                      <WriterSectionTip tipKey="loreTab" label="About lore cards" />
                    </div>
                    {!selectedSeriesId ? (
                      <p className="text-xs text-black/50">{WRITER_UI_TIPS.seriesLibrary}</p>
                    ) : (
                      <>
                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                          <div className="border-l-2 border-amber-700 bg-amber-50/70 px-3 py-2.5">
                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-950/65">
                              Pre-lore intake
                            </p>
                            <p className="mt-1 text-xs leading-snug text-black/70">
                              Add canonical descriptions before regenerating outline or page beats. If a school,
                              device, species, character appearance, faction, or rule is missing here, the model can
                              invent it. Included canon cards are sent to <strong>Generate outline</strong> and{' '}
                              <strong>page beats</strong>.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={!supabaseOk || !selectedIssueId || loreAssistLoading}
                                onClick={() => void runLoreGapAssist()}
                                className="rounded-md px-3 py-1.5 text-[11px] font-black text-black shadow-sm disabled:opacity-45"
                                style={{ background: ACCENT_GOLD_GRADIENT }}
                              >
                                {loreAssistLoading ? 'Scanning…' : 'Suggest missing lore'}
                              </button>
                              <button
                                type="button"
                                disabled={!supabaseOk || !selectedIssueId || canonLoading}
                                onClick={() => void runCanonFromRibbon()}
                                className="rounded-md border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-45"
                              >
                                {canonLoading ? 'Checking…' : 'Post-lore canon check'}
                              </button>
                            </div>
                          </div>
                          <div className="border-l-2 border-emerald-600 bg-emerald-50/60 px-3 py-2.5">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-950/65">
                              Generation contract
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] font-bold uppercase tracking-wide text-black/55">
                              <span className="bg-white/60 px-2 py-1">Outline uses canon</span>
                              <span className="bg-white/60 px-2 py-1">Beats use canon</span>
                              <span className="bg-white/60 px-2 py-1">No video assumptions</span>
                              <span className="bg-white/60 px-2 py-1">Visual details explicit</span>
                            </div>
                            <p className="mt-2 text-[11px] leading-snug text-black/58">
                              Foundation Hub defaults now travel with generation so comic medium, panel density,
                              style, canon, and character consistency do not have to be retyped on each prompt.
                            </p>
                          </div>
                        </div>
                        {loreAssistError ? (
                          <p className="rounded-lg bg-red-100/90 px-3 py-2 text-xs text-red-800">{loreAssistError}</p>
                        ) : null}
                        {loreAssistOutput.trim() ? (
                          <div className="border border-black/10 bg-white/45 p-3 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[10px] font-black uppercase tracking-wider text-black/50">
                                AI lore suggestions
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void navigator.clipboard.writeText(loreAssistOutput)}
                                  className="rounded-md border border-black/20 bg-white/80 px-2 py-1 text-[10px] font-bold text-black"
                                >
                                  Copy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => appendTextToField(setLoreDraftBody, loreAssistOutput)}
                                  className="rounded-md border border-black/20 bg-white/80 px-2 py-1 text-[10px] font-bold text-black"
                                >
                                  Append to card body
                                </button>
                              </div>
                            </div>
                            <pre className={`${preShell} ${preFont} max-h-[min(300px,38vh)]`}>
                              <WriterHighlightedText
                                text={loreAssistOutput}
                                query={findQuery}
                                activeMatchIndex={findActiveIndex}
                              />
                            </pre>
                          </div>
                        ) : null}
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
                        <div className="border border-black/10 bg-white/45 p-3 space-y-3 max-w-5xl">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-black/50">
                                Import from Obsidian
                              </p>
                              <p className="mt-1 max-w-2xl text-xs leading-snug text-black/62">
                                Select Markdown notes, images, or a vault folder. Notes stay in Markdown, wiki links are
                                detected, and image embeds become visual references on the imported lore card.
                              </p>
                            </div>
                            <label className="flex items-center gap-2 text-[11px] font-bold text-black/65">
                              Type filter
                              <select
                                value={loreObsidianTypeFilter}
                                onChange={(e) => setLoreObsidianTypeFilter(e.target.value)}
                                className="rounded-md border border-black/15 bg-white px-2 py-1 text-xs text-black"
                              >
                                <option value="">All types</option>
                                {OBSIDIAN_LORE_TYPE_OPTIONS.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <input
                            ref={loreObsidianFileInputRef}
                            type="file"
                            multiple
                            accept=".md,.markdown,.png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => void handleLoreObsidianFiles(e.currentTarget.files)}
                          />
                          <input
                            ref={loreObsidianFolderInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            {...{ webkitdirectory: '', directory: '' }}
                            onChange={(e) => void handleLoreObsidianFiles(e.currentTarget.files)}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={loreImportBusy}
                              onClick={() => loreObsidianFileInputRef.current?.click()}
                              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-black text-black shadow-sm transition hover:-translate-y-0.5 disabled:opacity-45"
                              style={{ background: ACCENT_GOLD_GRADIENT }}
                            >
                              <FileUp className="h-4 w-4" />
                              Select notes/images
                            </button>
                            <button
                              type="button"
                              disabled={loreImportBusy}
                              onClick={() => loreObsidianFolderInputRef.current?.click()}
                              className="inline-flex items-center gap-2 rounded-md border border-black/20 bg-white/85 px-3 py-2 text-xs font-bold text-black transition hover:bg-white disabled:opacity-45"
                            >
                              <FolderOpen className="h-4 w-4" />
                              Select vault folder
                            </button>
                            {loreObsidianEntries.length > 0 ? (
                              <button
                                type="button"
                                disabled={loreImportBusy}
                                onClick={() => {
                                  setLoreObsidianEntries([]);
                                  setLoreObsidianSelectedIds([]);
                                  setLoreObsidianError(null);
                                  setLoreObsidianResult(null);
                                }}
                                className="rounded-md border border-black/15 bg-white/70 px-3 py-2 text-xs font-bold text-black/65 transition hover:bg-white disabled:opacity-45"
                              >
                                Clear preview
                              </button>
                            ) : null}
                          </div>
                          {loreObsidianError ? (
                            <p className="flex items-start gap-2 bg-red-100/80 px-3 py-2 text-xs text-red-900">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>{loreObsidianError}</span>
                            </p>
                          ) : null}
                          {loreObsidianResult ? (
                            <div className="bg-emerald-100/75 px-3 py-2 text-xs text-emerald-950">
                              Imported {loreObsidianResult.imported}. Updated {loreObsidianResult.updated}. Skipped{' '}
                              {loreObsidianResult.skipped}. Failed {loreObsidianResult.failed}. Stored images{' '}
                              {loreObsidianResult.storedImages}.
                              {loreObsidianResult.warnings.length > 0 ? (
                                <ul className="mt-1 list-disc pl-4 text-amber-950">
                                  {loreObsidianResult.warnings.slice(0, 5).map((warning) => (
                                    <li key={warning}>{warning}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ) : null}
                          {loreObsidianEntries.length > 0 ? (
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-black/50">
                                  Preview {loreObsidianSelectedIds.length}/{loreObsidianEntries.length} selected
                                </p>
                                <button
                                  type="button"
                                  disabled={!supabaseOk || loreImportBusy || loreObsidianSelectedIds.length === 0}
                                  onClick={() => void runLoreObsidianImport()}
                                  className="rounded-md px-4 py-2 text-xs font-black text-black shadow-sm disabled:opacity-45"
                                  style={{ background: ACCENT_GOLD_GRADIENT }}
                                >
                                  {loreImportBusy ? 'Importing…' : 'Confirm import'}
                                </button>
                              </div>
                              <ul className="grid gap-2">
                                {loreObsidianEntries.map((entry) => {
                                  const selected = loreObsidianSelectedIds.includes(entry.id);
                                  return (
                                    <li
                                      key={entry.id}
                                      className={`border px-3 py-2 transition ${
                                        selected
                                          ? 'border-amber-500/70 bg-amber-50/75'
                                          : 'border-black/10 bg-white/35 opacity-70'
                                      }`}
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                                          <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() => toggleLoreObsidianEntry(entry.id)}
                                            className="mt-1 rounded border-black/30"
                                          />
                                          <span className="min-w-0">
                                            <span className="block truncate text-sm font-black text-black">
                                              {entry.title}
                                              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-black/45">
                                                {entry.category}
                                              </span>
                                            </span>
                                            <span className="mt-0.5 block truncate text-[11px] text-black/48">
                                              {entry.sourcePath}
                                            </span>
                                          </span>
                                        </label>
                                        {entry.duplicateOf ? (
                                          <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-black/55">
                                            Duplicate
                                            <select
                                              value={entry.duplicateAction}
                                              onChange={(e) =>
                                                setLoreObsidianEntryAction(
                                                  entry.id,
                                                  e.target.value as ObsidianLoreDuplicateAction,
                                                )
                                              }
                                              className="rounded-md border border-black/15 bg-white px-2 py-1 text-[11px] normal-case tracking-normal text-black"
                                            >
                                              <option value="skip">skip</option>
                                              <option value="overwrite">overwrite</option>
                                              <option value="merge">merge</option>
                                              <option value="create_duplicate">create duplicate</option>
                                            </select>
                                          </label>
                                        ) : null}
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-black/58">
                                        {entry.tags.slice(0, 6).map((tag) => (
                                          <span key={tag} className="bg-white/70 px-2 py-1">
                                            #{tag}
                                          </span>
                                        ))}
                                        <span className="inline-flex items-center gap-1 bg-white/70 px-2 py-1">
                                          {entry.links.length} links
                                        </span>
                                        <span className="inline-flex items-center gap-1 bg-white/70 px-2 py-1">
                                          <Image className="h-3 w-3" />
                                          {entry.images.filter((image) => image.status === 'resolved').length}/
                                          {entry.images.length} images
                                        </span>
                                        {entry.linkedLoreReferences.length > 0 ? (
                                          <span className="bg-emerald-100/90 px-2 py-1 text-emerald-950">
                                            {entry.linkedLoreReferences.length} matched refs
                                          </span>
                                        ) : null}
                                        {entry.warnings.length > 0 ? (
                                          <span className="bg-amber-100/90 px-2 py-1 text-amber-950">
                                            {entry.warnings.length} warnings
                                          </span>
                                        ) : null}
                                      </div>
                                      {entry.links.length > 0 || entry.images.length > 0 || entry.warnings.length > 0 ? (
                                        <div className="mt-2 grid gap-2 text-[11px] text-black/62 md:grid-cols-3">
                                          <p>
                                            <strong>Links:</strong>{' '}
                                            {entry.links.map((link) => link.target).join(', ') || 'none'}
                                          </p>
                                          <p>
                                            <strong>Images:</strong>{' '}
                                            {entry.images.map((image) => image.fileName).join(', ') || 'none'}
                                          </p>
                                          <p className={entry.warnings.length > 0 ? 'text-amber-950' : ''}>
                                            <strong>Warnings:</strong> {entry.warnings.join(' ') || 'none'}
                                          </p>
                                        </div>
                                      ) : null}
                                    </li>
                                  );
                                })}
                              </ul>
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
                              {loreCards.map((c) => {
                                const importMetadata = readLoreImportMetadataFromBody(c.body);
                                const cleanBody = stripLoreImportMetadataFromBody(c.body);
                                const storedImageCount =
                                  importMetadata?.images?.filter((image) => Boolean(image.storageUrl)).length ?? 0;
                                return (
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
                                      {importMetadata ? (
                                        <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-bold text-black/52">
                                          <span className="bg-white/70 px-2 py-0.5">Obsidian</span>
                                          <span className="bg-white/70 px-2 py-0.5 truncate max-w-[280px]">
                                            {importMetadata.sourcePath}
                                          </span>
                                          {importMetadata.tags?.slice(0, 4).map((tag) => (
                                            <span key={tag} className="bg-white/70 px-2 py-0.5">
                                              #{tag}
                                            </span>
                                          ))}
                                          {importMetadata.images && importMetadata.images.length > 0 ? (
                                            <span className="inline-flex items-center gap-1 bg-white/70 px-2 py-0.5">
                                              <Image className="h-3 w-3" />
                                              {storedImageCount}/{importMetadata.images.length} visual refs
                                            </span>
                                          ) : null}
                                        </div>
                                      ) : null}
                                      <p className="text-xs text-black/75 whitespace-pre-wrap mt-1">
                                        {cleanBody || '(empty body)'}
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
                                );
                              })}
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
	                            onBlur={() => void persistWriterDrafts({ beats_director_notes: beatsDirectorNotesDraft })}
	                            disabled={!selectedIssueId}
                            placeholder="e.g. Pages 3–4 = double-page spread (council); vary panel sizes; more props/lighting detail. Not sent to outline — only page_beats."
                            className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm text-black resize-y min-h-[72px] disabled:opacity-50"
                          />
                        </div>
                        {selectedPage ? (
                          <div className="grid gap-2 rounded-xl border border-black/10 bg-white/45 p-3 sm:grid-cols-3">
                            {[
                              ['Characters', selectedPageMetadata.characters],
                              ['Locations', selectedPageMetadata.locations],
                              ['Art style', selectedPageMetadata.artStyle],
                            ].map(([label, value]) => (
                              <div key={label} className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-wider text-black/45">
                                  {label}
                                </p>
                                <p className="mt-1 text-[11px] font-semibold leading-snug text-black/75 break-words">
                                  {value}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
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
	                            onClick={() => {
	                              if (selectedPage?.beats_json) setActiveTab('dialogue');
	                              else void runSelectedPageBeatsGeneration();
	                            }}
	                            className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
	                            style={{ background: ACCENT_GOLD_GRADIENT }}
	                          >
	                            {beatsLoading ? 'Generating…' : selectedPage?.beats_json ? 'Continue to Dialogue' : 'Generate page beats'}
	                          </button>
	                          {selectedPage?.beats_json ? (
	                            <button
	                              type="button"
	                              disabled={!supabaseOk || !selectedPageId || beatsLoading || beatsBatchBusy}
	                              onClick={() => void runSelectedPageBeatsGeneration()}
	                              className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
	                            >
	                              Regenerate page beats
	                            </button>
	                          ) : null}
	                          <button
	                            type="button"
	                            disabled={!selectedPageId}
	                            onClick={() => focusWriterElement('writer-beats-inline-editor')}
	                            className="rounded-lg border border-amber-800/35 bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-black shadow-sm hover:bg-amber-100 disabled:opacity-40"
	                          >
	                            Edit this page&apos;s beats
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
	                        {renderScopePreview(selectedBeatsScope)}
	                        {selectedPage ? (
	                          <div className="border-l-2 border-amber-800/35 bg-white/55 px-3 py-3">
	                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
	                              <p className="text-[10px] font-black uppercase tracking-wider text-black/55">
	                                Direct edit Page {selectedPage.page_number} beats
	                              </p>
	                              {renderLockButton(
	                                writerPageBeatsLockKey(selectedPage.id),
	                                `Page ${selectedPage.page_number} beats`,
	                              )}
	                            </div>
	                            <textarea
	                              id="writer-beats-inline-editor"
	                              value={beatsEditDraft}
	                              onChange={(e) => setBeatsEditDraft(e.target.value)}
	                              rows={9}
	                              className="w-full resize-y rounded-lg border border-black/15 bg-white px-2 py-1.5 font-mono text-xs text-black disabled:opacity-50"
	                            />
	                            <div className="mt-2 flex flex-wrap gap-2">
	                              <button
	                                type="button"
	                                disabled={!supabaseOk || scriptsBusy || !selectedPageId}
	                                onClick={() => void saveBeatsEdit()}
	                                className="rounded-md px-3 py-1.5 text-[11px] font-black text-black shadow-sm disabled:opacity-45"
	                                style={{ background: ACCENT_GOLD_GRADIENT }}
	                              >
	                                {scriptsBusy ? 'Saving…' : 'Save beats edit'}
	                              </button>
	                              <button
	                                type="button"
	                                disabled={!selectedPageId}
	                                onClick={() => openSavedOutputEditor('beats')}
	                                className="rounded-md border border-black/15 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-45"
	                              >
	                                Advanced editor
	                              </button>
	                            </div>
	                          </div>
	                        ) : null}
	                        {pageEditReviewPanel}
	                      </div>
                      <aside
                        className="min-w-0 flex flex-col xl:sticky xl:top-2 xl:max-h-[min(calc(100dvh-10rem),920px)] xl:min-h-[min(280px,40vh)]"
                        aria-label="Beats preview"
                      >
                        <div className="mb-1 flex shrink-0 flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                            Beats for selected page
                          </p>
	                          <button
	                            type="button"
	                            disabled={!selectedPageId}
	                            onClick={() => focusWriterElement('writer-beats-inline-editor')}
	                            className="rounded-md border border-black/15 bg-white/75 px-2 py-1 text-[10px] font-bold text-black hover:bg-white disabled:opacity-40"
	                          >
	                            Edit beats
	                          </button>
                        </div>
	                        {selectedPage?.beats_json ? (
	                          <div className="space-y-2">
	                            <pre
	                              className={`${preShell} font-sans flex-1 min-h-[min(200px,28vh)] max-h-[min(360px,45vh)] xl:min-h-[min(280px,38vh)]`}
	                            >
	                              <WriterHighlightedText
	                                text={formatBeatsBundleAsText([
	                                  { page_number: selectedPage.page_number, beats_json: selectedPage.beats_json },
	                                ])}
	                                query={findQuery}
	                                activeMatchIndex={findActiveIndex}
	                              />
	                            </pre>
	                            <details className="rounded-lg border border-black/10 bg-white/50 px-3 py-2">
	                              <summary className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-black/50">
	                                Advanced JSON
	                              </summary>
	                              <pre className={`${preShell} ${preFont} mt-2 max-h-[min(320px,42vh)]`}>
	                                <WriterHighlightedText
	                                  text={beatsJsonString}
	                                  query={findQuery}
	                                  activeMatchIndex={findActiveIndex}
	                                />
	                              </pre>
	                            </details>
	                          </div>
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
	                        onClick={() => {
	                          if (selectedPage?.script_text?.trim()) setActiveTab('video');
	                          else void runSelectedPageDialogueGeneration();
	                        }}
	                        className="rounded-lg px-4 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-45 disabled:pointer-events-none"
	                        style={{ background: ACCENT_GOLD_GRADIENT }}
	                      >
	                        {dialogueLoading
	                          ? 'Drafting…'
	                          : selectedPage?.script_text?.trim()
	                            ? 'Continue to Visual Prep'
	                            : 'Draft dialogue'}
	                      </button>
	                      {selectedPage?.script_text?.trim() ? (
	                        <button
	                          type="button"
	                          disabled={!supabaseOk || !selectedPageId || dialogueLoading || libraryPagesBusy}
	                          onClick={() => void runSelectedPageDialogueGeneration()}
	                          className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
	                        >
	                          Regenerate dialogue
	                        </button>
	                      ) : null}
	                      <button
	                        type="button"
	                        disabled={!selectedPageId}
	                        onClick={() => focusWriterElement('writer-dialogue-inline-editor')}
	                        className="rounded-lg border border-amber-800/35 bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-black shadow-sm hover:bg-amber-100 disabled:opacity-40"
	                      >
	                        Edit this page&apos;s dialogue
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
	                    {renderScopePreview(selectedDialogueScope)}
	                    {selectedPage ? (
	                      <div className="border-l-2 border-amber-800/35 bg-white/55 px-3 py-3">
	                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
	                          <p className="text-[10px] font-black uppercase tracking-wider text-black/55">
	                            Direct edit Page {selectedPage.page_number} dialogue
	                          </p>
	                          {renderLockButton(
	                            writerPageDialogueLockKey(selectedPage.id),
	                            `Page ${selectedPage.page_number} dialogue`,
	                          )}
	                        </div>
	                        <textarea
	                          id="writer-dialogue-inline-editor"
	                          value={dialogueEditDraft}
	                          onChange={(e) => setDialogueEditDraft(e.target.value)}
	                          rows={10}
	                          className="w-full resize-y rounded-lg border border-black/15 bg-white px-2 py-1.5 font-mono text-xs text-black disabled:opacity-50"
	                        />
	                        <div className="mt-2 flex flex-wrap gap-2">
	                          <button
	                            type="button"
	                            disabled={!supabaseOk || scriptsBusy || !selectedPageId}
	                            onClick={() => void saveDialogueEdit()}
	                            className="rounded-md px-3 py-1.5 text-[11px] font-black text-black shadow-sm disabled:opacity-45"
	                            style={{ background: ACCENT_GOLD_GRADIENT }}
	                          >
	                            {scriptsBusy ? 'Saving…' : 'Save dialogue edit'}
	                          </button>
	                          <button
	                            type="button"
	                            disabled={!selectedPageId}
	                            onClick={() => openSavedOutputEditor('dialogue')}
	                            className="rounded-md border border-black/15 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-45"
	                          >
	                            Advanced editor
	                          </button>
	                        </div>
	                      </div>
	                    ) : null}
	                    {pageEditReviewPanel}
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
                    {pacingLengthAlignment ? (
                      <div className="space-y-2 rounded-xl border border-amber-800/25 bg-amber-50/80 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-950/90">
                          Length recommendation (last pacing run)
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
                            Recommended pages:{' '}
                            {'exact' in pacingLengthAlignment.recommended_pages
                              ? pacingLengthAlignment.recommended_pages.exact
                              : `${pacingLengthAlignment.recommended_pages.min}–${pacingLengthAlignment.recommended_pages.max}`}
                          </li>
                          {pacingLengthAlignment.recommended_action ? (
                            <li>Recommendation if target differs: {pacingLengthAlignment.recommended_action}</li>
                          ) : null}
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
                        {pacingRecommendedTarget != null ? (
                          <div className="border-l-2 border-amber-700 bg-white/65 px-3 py-2 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-amber-950/75">
                                  Apply recommendation
                                </p>
                                <p className="mt-0.5 text-[11px] leading-snug text-black/65">
                                  Target becomes {pacingRecommendedTarget} pages. {pacingAffectedPageSummary}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={!supabaseOk || !selectedIssueId || pacingApplyBusy || outlineGenLoading}
                                  onClick={() => void runApplyPacingRecommendation()}
                                  className="rounded-md border border-black/20 bg-white/85 px-3 py-1.5 text-[11px] font-bold text-black shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                                >
                                  {pacingApplyBusy ? 'Applying…' : 'Stage plan'}
                                </button>
                                <button
                                  type="button"
                                  disabled={!supabaseOk || !selectedIssueId || pacingApplyBusy || outlineGenLoading}
                                  onClick={() => void runApplyPacingRecommendation({ regenerateOutline: true })}
                                  className="rounded-md px-3 py-1.5 text-[11px] font-black text-black shadow-sm hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                                  style={{ background: ACCENT_GOLD_GRADIENT }}
                                >
                                  {pacingApplyBusy || outlineGenLoading ? 'Applying…' : 'Apply + regenerate outline'}
                                </button>
                              </div>
                            </div>
                            <p className="text-[10px] leading-snug text-black/50">
                              This updates the planning target, creates or trims affected page rows, and adds the pacing
                              instructions to the outline supplement. Regenerate page beats/dialogue for selected affected
                              pages after the outline changes.
                            </p>
                            {selectedPagesForBatchExport.length > 0 ? (
                              <div className="rounded-lg border border-amber-900/15 bg-white/70 px-3 py-2 space-y-2">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-950/75">
                                      Preview affected pages before overwrite
                                    </p>
                                    <p className="mt-0.5 text-[10px] leading-snug text-black/55">
                                      These pages are queued from the pacing change. Regeneration only happens when you
                                      explicitly run beats or dialogue.
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={beatsBatchBusy || selectedPagesForBatchExport.length === 0}
                                      onClick={() => {
                                        setBeatsPickPageIds(
                                          selectedPagesForBatchExport
                                            .slice(0, WRITER_PAGE_BEATS_ISSUE_MAX)
                                            .map((p) => p.id),
                                        );
                                        setActiveTab('beats');
                                      }}
                                      className="rounded-md border border-black/20 bg-white/85 px-3 py-1.5 text-[11px] font-bold text-black shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                                    >
                                      Review beats batch
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!supabaseOk || dialogueBatchBusy || selectedPagesForBatchExport.length === 0}
                                      onClick={() => void runBatchDialogueForSelectedPages()}
                                      className="rounded-md border border-black/20 bg-white/85 px-3 py-1.5 text-[11px] font-bold text-black shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                                    >
                                      {dialogueBatchBusy ? dialogueBatchLabel || 'Dialogue…' : 'Regenerate dialogue'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={
                                        !supabaseOk ||
                                        pacingPreviewBusy ||
                                        selectedPagesForBatchExport.length === 0
                                      }
                                      onClick={() => void runPacingRegenerationPreview()}
                                      className="rounded-md px-3 py-1.5 text-[11px] font-black text-black shadow-sm hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                                      style={{ background: ACCENT_GOLD_GRADIENT }}
                                    >
                                      {pacingPreviewBusy ? 'Previewing…' : 'Preview AI replacements'}
                                    </button>
                                  </div>
                                </div>
                                <div className="grid gap-1 sm:grid-cols-2">
                                  {selectedPagesForBatchExport.slice(0, 8).map((p) => (
                                    <button
                                      key={`pacing-preview-${p.id}`}
                                      type="button"
                                      onClick={() => {
                                        setSelectedPageId(p.id);
                                        setActiveTab('beats');
                                      }}
                                      className="rounded-md border border-black/10 bg-white/80 px-2 py-1.5 text-left text-[10px] text-black/65 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                                    >
                                      <span className="font-black text-black">Page {p.page_number}</span>
                                      <span className="ml-1">
                                        {pageRowHasPanelBeats(p) ? 'has beats' : 'no beats'} ·{' '}
                                        {(p.script_text ?? '').trim() ? 'has dialogue' : 'no dialogue'}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                                {selectedPagesForBatchExport.length > 8 ? (
                                  <p className="text-[10px] text-black/45">
                                    +{selectedPagesForBatchExport.length - 8} more affected page(s) in the Library batch.
                                  </p>
                                ) : null}
                                {pacingPreviewError ? (
                                  <p className="rounded-md bg-red-100/90 px-2 py-1.5 text-[11px] text-red-800">
                                    {pacingPreviewError}
                                  </p>
                                ) : null}
                                {pacingPreviewPages.length ? (
                                  <div className="space-y-2 border-t border-black/10 pt-2">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-950/75">
                                      AI replacement preview
                                    </p>
                                    {pacingPreviewPages.map((preview) => {
                                      const currentPage = pages.find((p) => p.id === preview.page_id);
                                      return (
                                        <div
                                          key={`pacing-preview-proposal-${preview.page_id}`}
                                          className="rounded-md border border-black/10 bg-white/85 p-2 text-[10px] text-black/65"
                                        >
                                          <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                              <p className="font-black text-black">Page {preview.page_number}</p>
                                              {preview.reason ? <p>{preview.reason}</p> : null}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                              <button
                                                type="button"
                                                disabled={pacingPreviewBusy || !preview.proposed_beats_json}
                                                onClick={() => void applyPacingPreviewPage(preview, 'beats')}
                                                className="rounded border border-black/15 bg-white px-2 py-1 font-bold text-black/70 disabled:opacity-40"
                                              >
                                                Apply beats
                                              </button>
                                              <button
                                                type="button"
                                                disabled={pacingPreviewBusy || preview.proposed_script_text == null}
                                                onClick={() => void applyPacingPreviewPage(preview, 'dialogue')}
                                                className="rounded border border-black/15 bg-white px-2 py-1 font-bold text-black/70 disabled:opacity-40"
                                              >
                                                Apply dialogue
                                              </button>
                                              <button
                                                type="button"
                                                disabled={
                                                  pacingPreviewBusy ||
                                                  (!preview.proposed_beats_json && preview.proposed_script_text == null)
                                                }
                                                onClick={() => void applyPacingPreviewPage(preview, 'both')}
                                                className="rounded bg-black px-2 py-1 font-black text-white disabled:opacity-40"
                                              >
                                                Apply both
                                              </button>
                                            </div>
                                          </div>
                                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                                            <div>
                                              <p className="font-bold uppercase text-black/45">Current</p>
                                              <pre className="mt-1 max-h-36 overflow-y-auto rounded bg-black/10 p-2 whitespace-pre-wrap">
                                                {JSON.stringify(
                                                  {
                                                    beats_json: currentPage?.beats_json ?? null,
                                                    script_text: currentPage?.script_text ?? null,
                                                  },
                                                  null,
                                                  2,
                                                )}
                                              </pre>
                                            </div>
                                            <div>
                                              <p className="font-bold uppercase text-black/45">Proposed</p>
                                              <pre className="mt-1 max-h-36 overflow-y-auto rounded bg-amber-50 p-2 whitespace-pre-wrap">
                                                {JSON.stringify(
                                                  {
                                                    beats_json: preview.proposed_beats_json ?? null,
                                                    script_text: preview.proposed_script_text ?? null,
                                                  },
                                                  null,
                                                  2,
                                                )}
                                              </pre>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                            {pacingApplyError ? (
                              <p className="rounded-md bg-red-100/90 px-2 py-1.5 text-[11px] text-red-800">
                                {pacingApplyError}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        {pacingLengthAlignment.assumptions?.length ? (
                          <div className="pt-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-black/45">
                              Assumptions
                            </p>
                            <ul className="mt-1 text-[11px] text-black/75 list-disc list-inside space-y-0.5">
                              {pacingLengthAlignment.assumptions.slice(0, 12).map((s, idx) => (
                                <li key={`assumption-${idx}`}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {pacingLengthAlignment.cut_suggestions?.length ? (
                          <div className="pt-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-black/45">Cut suggestions</p>
                            <ul className="mt-1 text-[11px] text-black/75 list-disc list-inside space-y-0.5">
                              {pacingLengthAlignment.cut_suggestions.slice(0, 12).map((s, idx) => (
                                <li key={`cut-${idx}`}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {pacingLengthAlignment.add_suggestions?.length ? (
                          <div className="pt-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-black/45">Add suggestions</p>
                            <ul className="mt-1 text-[11px] text-black/75 list-disc list-inside space-y-0.5">
                              {pacingLengthAlignment.add_suggestions.slice(0, 12).map((s, idx) => (
                                <li key={`add-${idx}`}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
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
                    <div className="space-y-3 rounded-xl border border-black/10 bg-white/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                            Expanded audits
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-black/60">
                            These modes ride the existing pacing and canon tools, then save structured audit branches in
                            the review cache.
                          </p>
                        </div>
                        <span className="rounded bg-black/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black/55">
                          continuity · emotion · character · world
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {auditSummaries.map((option) => {
                          const usesPacing = option.id === 'emotional_arc';
                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={
                                !supabaseOk ||
                                !selectedIssueId ||
                                pacingLoading ||
                                canonLoading ||
                                arcBatchBusy
                              }
                              onClick={() => (usesPacing ? void runPacingFromRibbon() : void runCanonFromRibbon())}
                              className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-left hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-black text-black">{option.label}</span>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                                    option.ready ? 'bg-emerald-100 text-emerald-900' : 'bg-black/10 text-black/45'
                                  }`}
                                >
                                  {option.ready ? 'saved' : option.source === 'pacing_review' ? 'pacing' : 'canon'}
                                </span>
                              </span>
                              <span className="mt-1 block text-[10px] leading-snug text-black/58">
                                {option.summary}
                              </span>
                            </button>
                          );
                        })}
                      </div>
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
                    <div className="space-y-3 rounded-xl border border-black/10 bg-white/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                            Production branches
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-black/60">
                            Branch from the same issue pack into visual prep, dialogue, exports, or Guided Comics handoff.
                          </p>
                        </div>
                        <span className="rounded bg-black/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black/55">
                          branch-ready
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {productionBranchSummaries.map((option) => {
                          return (
                            <div
                              key={option.id}
                              className="space-y-2 rounded-lg border border-black/10 bg-white/70 px-3 py-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-[11px] font-black text-black">{option.label}</p>
                                  <p className="mt-0.5 text-[10px] leading-snug text-black/55">{option.summary}</p>
                                </div>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                                    option.ready ? 'bg-emerald-100 text-emerald-900' : 'bg-black/10 text-black/45'
                                  }`}
                                >
                                  {option.ready ? 'ready' : 'prep'}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (option.id === 'dialogue') {
                                      setActiveTab('dialogue');
                                    } else if (option.id === 'exports') {
                                      setActiveTab('scripts');
                                      setScriptsEditorTab('synopsis');
                                    } else if (option.id === 'guided_comics_handoff') {
                                      setProductionDefaultsDraft((p) => ({
                                        ...p,
                                        outputFormat: 'guided_comic_handoff',
                                      }));
                                      setActiveTab('scripts');
                                    } else {
                                      setActiveTab('video');
                                    }
                                  }}
                                  className="rounded-md border border-black/15 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black/70 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                                >
                                  {option.actionLabel}
                                </button>
                                {option.id === 'visual_prep' ? (
                                  <button
                                    type="button"
                                    disabled={!selectedIssueId || imageWorkshopBusy || (!latestShotPlan && !selectedPage?.beats_json)}
                                    onClick={() => void openImageWorkshopFromWriter(latestShotPlan ? 'shot-plan' : 'page')}
                                    className="rounded-md border border-black/15 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black/70 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                                  >
                                    Imageshop
                                  </button>
                                ) : null}
                                {option.id === 'exports' ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={!selectedIssueId}
                                      onClick={() => downloadPreferredWriterExport()}
                                      className="rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-black shadow-sm hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                                      style={{ background: ACCENT_GOLD_GRADIENT }}
                                    >
                                      Preferred
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        downloadJsonFile('writer-issue-pack.json', issuePackObject);
                                        pushHistory('downloaded issue pack');
                                      }}
                                      className="rounded-md border border-black/15 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black/70 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                                    >
                                      JSON
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => downloadIssuePackMarkdown()}
                                      className="rounded-md border border-black/15 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black/70 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                                    >
                                      Markdown
                                    </button>
                                  </>
                                ) : null}
                                {option.id === 'guided_comics_handoff' ? (
                                  <button
                                    type="button"
                                    disabled={sortedPages.length === 0}
                                    onClick={() => downloadGuidedComicsHandoff()}
                                    className="rounded-md border border-black/15 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black/70 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                                  >
                                    Handoff JSON
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <label className="flex flex-col gap-1 text-[11px] font-semibold text-black/70">
                      Creative brief (optional)
	                      <textarea
	                        value={shotsBrief}
	                        onChange={(e) => setShotsBrief(e.target.value)}
	                        onBlur={() => void persistWriterDrafts({ visual_creative_brief: shotsBrief })}
	                        rows={3}
                        placeholder="e.g. 90s trailer, handheld doc feel, emphasize the chase on pages 8–12…"
                        className="rounded-lg border border-black/15 bg-white/90 px-2 py-1.5 text-sm text-black resize-y min-h-[72px]"
                      />
                    </label>
                    <button
                      type="button"
	                      disabled={!supabaseOk || !selectedIssueId || shotsLoading}
	                      onClick={() => void quickGenerate()}
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
                        disabled={!latestOutline}
                        onClick={() => {
                          if (!latestOutline) return;
                          const body = formatOutlineAsText(latestOutline.outline_json);
                          downloadTextFile(
                            `writer-outline-v${latestOutline.version}.txt`,
                            body,
                            'text/plain;charset=utf-8',
                          );
                        }}
                        className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                      >
                        Outline .txt
                      </button>
                      <button
                        type="button"
                        disabled={!latestOutline}
                        onClick={() => {
                          if (!latestOutline) return;
                          const body = formatOutlineAsMarkdown(latestOutline.outline_json);
                          downloadTextFile(
                            `writer-outline-v${latestOutline.version}.md`,
                            body,
                            'text/markdown;charset=utf-8',
                          );
                        }}
                        className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                      >
                        Outline .md
                      </button>
                      <button
                        type="button"
                        disabled={!latestOutline && !latestShotPlan && pages.length === 0}
                        onClick={() => {
                          downloadJsonFile('writer-issue-pack.json', issuePackObject);
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
	                {activeTab === 'export' && (
	                  <div className={`${WRITER_GLASS_CARD} p-4 space-y-4`}>
	                    <div className="flex flex-wrap items-start justify-between gap-3">
	                      <div>
	                        <p className="text-lg font-black text-black">Export issue</p>
	                        <p className="mt-0.5 text-xs leading-snug text-black/58">
	                          Download the production package without digging through Synopsis helper or advanced editors.
	                        </p>
	                      </div>
	                      <span className="rounded bg-white/70 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-black/55">
	                        Preferred: {preferredWriterExport.label}
	                      </span>
	                    </div>
	                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
	                      <button
	                        type="button"
	                        disabled={!selectedIssueId}
	                        onClick={() => downloadPreferredWriterExport()}
	                        className="rounded-md px-3 py-2 text-left text-xs font-black text-black shadow-sm disabled:opacity-45"
	                        style={{ background: ACCENT_GOLD_GRADIENT }}
	                      >
	                        Preferred export
	                        <span className="mt-1 block text-[10px] font-bold normal-case text-black/62">
	                          {preferredWriterExport.filename}
	                        </span>
	                      </button>
	                      <button
	                        type="button"
	                        disabled={!selectedIssueId}
	                        onClick={() => downloadJsonFile('writer-issue-pack.json', issuePackObject)}
	                        className="rounded-md border border-black/15 bg-white/85 px-3 py-2 text-left text-xs font-black text-black hover:bg-white disabled:opacity-45"
	                      >
	                        Issue pack JSON
	                        <span className="mt-1 block text-[10px] font-bold normal-case text-black/55">
	                          Full structured bundle
	                        </span>
	                      </button>
	                      <button
	                        type="button"
	                        disabled={!selectedIssueId}
	                        onClick={() => downloadIssuePackMarkdown()}
	                        className="rounded-md border border-black/15 bg-white/85 px-3 py-2 text-left text-xs font-black text-black hover:bg-white disabled:opacity-45"
	                      >
	                        Markdown script
	                        <span className="mt-1 block text-[10px] font-bold normal-case text-black/55">
	                          Readable creator handoff
	                        </span>
	                      </button>
	                      <button
	                        type="button"
	                        disabled={sortedPages.length === 0}
	                        onClick={() => downloadGuidedComicsHandoff()}
	                        className="rounded-md border border-black/15 bg-white/85 px-3 py-2 text-left text-xs font-black text-black hover:bg-white disabled:opacity-45"
	                      >
	                        Guided Comics handoff
	                        <span className="mt-1 block text-[10px] font-bold normal-case text-black/55">
	                          Sendable production payload
	                        </span>
	                      </button>
	                    </div>
	                    <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
	                      <div className="border-l-2 border-emerald-700 bg-emerald-50/70 px-3 py-3">
	                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-950/65">
	                          Readiness
	                        </p>
	                        <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
	                          {[
	                            ['Outline', latestOutline ? `v${latestOutline.version}` : 'missing'],
	                            ['Pages', `${sortedPages.length}/${targetPageCount}`],
	                            ['Beats', `${pagesWithBeatsCount}/${sortedPages.length || targetPageCount}`],
	                            ['Dialogue', `${pagesWithScriptCount}/${sortedPages.length || targetPageCount}`],
	                            ['Visual Prep', latestShotPlan ? `v${latestShotPlan.version}` : 'missing'],
	                            ['Audit', reviewReady ? 'available' : 'not run'],
	                          ].map(([label, value]) => (
	                            <div key={label} className="bg-white/65 px-2 py-1">
	                              <dt className="text-[9px] font-black uppercase tracking-wide text-black/42">{label}</dt>
	                              <dd className="mt-0.5 font-bold text-black/75">{value}</dd>
	                            </div>
	                          ))}
	                        </dl>
	                      </div>
	                      <div className="border-l-2 border-black/25 bg-white/50 px-3 py-3">
	                        <p className="text-[10px] font-black uppercase tracking-wider text-black/55">
	                          Edit before export
	                        </p>
	                        <div className="mt-2 flex flex-wrap gap-2">
	                          <button
	                            type="button"
	                            disabled={!selectedIssueId}
	                            onClick={() => {
	                              setActiveTab('outline');
	                              focusWriterElement('writer-issue-synopsis');
	                            }}
	                            className="rounded-md border border-black/15 bg-white/85 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-45"
	                          >
	                            Edit synopsis
	                          </button>
	                          <button
	                            type="button"
	                            disabled={!latestOutline}
	                            onClick={() => {
	                              setActiveTab('outline');
	                              focusWriterElement('writer-outline-inline-editor');
	                            }}
	                            className="rounded-md border border-black/15 bg-white/85 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-45"
	                          >
	                            Edit outline
	                          </button>
	                          <button
	                            type="button"
	                            disabled={!selectedPageId}
	                            onClick={() => {
	                              setActiveTab('beats');
	                              focusWriterElement('writer-beats-inline-editor');
	                            }}
	                            className="rounded-md border border-black/15 bg-white/85 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-45"
	                          >
	                            Edit page beats
	                          </button>
	                          <button
	                            type="button"
	                            disabled={!selectedPageId}
	                            onClick={() => {
	                              setActiveTab('dialogue');
	                              focusWriterElement('writer-dialogue-inline-editor');
	                            }}
	                            className="rounded-md border border-black/15 bg-white/85 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-45"
	                          >
	                            Edit page dialogue
	                          </button>
	                        </div>
	                      </div>
	                    </div>
	                  </div>
	                )}
	                {activeTab === 'scripts' && (
                  <div className={`${WRITER_GLASS_CARD} p-4 space-y-6`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-lg font-bold text-black">Synopsis helper</p>
                        <p className="mt-0.5 text-xs text-black/58">
                          Put your author outline/source structure here before AI starts filling gaps.
                        </p>
                      </div>
                      <WriterSectionTip tipKey="scriptsTab" label="About synopsis helper and exports" />
                    </div>
                    {!selectedIssueId ? (
                      <p className="text-sm text-black/55">Select an issue in the Library to use this tab.</p>
                    ) : (
                      <>
                        {scriptsError && (
                          <p className="text-xs text-red-800 bg-red-100/80 rounded-lg px-3 py-2">{scriptsError}</p>
                        )}
                        {pageEditReviewPanel}
                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                          <div className="border-l-2 border-black/60 bg-white/55 px-3 py-3 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-black/55">
                                  Author outline intake
                                </p>
                                <p className="mt-1 text-xs leading-snug text-black/68">
                                  Paste your real outline here. It is saved separately from the issue synopsis and is
                                  sent directly to <strong>Generate outline</strong> so AI restructures your story
                                  instead of inventing a replacement.
                                </p>
                              </div>
                              <span className="rounded bg-black/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black/55">
                                notes.author_outline
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5" aria-label="Author outline generation mode">
                              {(
                                [
                                  ['preserve', 'Preserve', 'Keep order and named events strict.'],
                                  ['structure', 'Structure', 'Organize into production beats.'],
                                  ['expand', 'Expand', 'Add connective tissue around your spine.'],
                                ] as const
                              ).map(([id, label, description]) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => setAuthorOutlineMode(id)}
                                  title={description}
                                  className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                                    authorOutlineMode === id
                                      ? 'border-black/60 bg-black text-white'
                                      : 'border-black/15 bg-white/75 text-black/65 hover:bg-white'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            <textarea
                              value={authorOutlineText}
                              onChange={(e) => setAuthorOutlineText(e.target.value)}
                              rows={8}
                              className="w-full min-h-[180px] rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-black shadow-inner resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                              placeholder={'Paste or draft your issue/book outline here…\n\nExample:\nPage 1: Opening classroom misfire.\nPage 2: Vision escalates.\nPage 3: Mentor interrupts.'}
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={!supabaseOk || scriptsBusy}
                                onClick={() => void saveAuthorOutlineToNotes()}
                                className="rounded-md px-3 py-1.5 text-[11px] font-black text-black shadow-sm hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                                style={{ background: ACCENT_GOLD_GRADIENT }}
                              >
                                {scriptsBusy ? 'Saving…' : 'Save author outline'}
                              </button>
                              <button
                                type="button"
                                disabled={!authorOutlineText.trim()}
                                onClick={() => appendTextToField(setOutlineSupplementDraft, authorOutlineText)}
                                className="rounded-md border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                              >
                                Copy into outline instructions
                              </button>
                            </div>
                          </div>
                          <div className="border-l-2 border-emerald-700 bg-emerald-50/65 px-3 py-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-950/65">
                              Generation contract
                            </p>
                            <div className="mt-2 space-y-2 text-[11px] leading-snug text-black/66">
                              <p>
                                <strong>Issue synopsis</strong> is the short pitch/logline context.
                              </p>
                              <p>
                                <strong>Author outline</strong> is the source structure AI must preserve, structure, or
                                expand when generating the saved Issue Outline.
                              </p>
                              <p>
                                <strong>Canon cards</strong> still supply visual/world facts before beats are generated.
                              </p>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px] font-bold uppercase tracking-wide text-black/55">
                              <span className="bg-white/65 px-2 py-1">Source first</span>
                              <span className="bg-white/65 px-2 py-1">Canon checked</span>
                              <span className="bg-white/65 px-2 py-1">AI structures</span>
                              <span className="bg-white/65 px-2 py-1">User owns story</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
                          <div className="space-y-3 rounded-xl border border-black/10 bg-black/[0.03] p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                                  Hierarchy tree import
                                </p>
                                <p className="mt-1 text-[11px] leading-snug text-black/60">
                                  Paste .txt, .md, or JSON structure. It normalizes into arc → book/issue/episode →
                                  chapter/page/scene → beat metadata on the issue notes.
                                </p>
                              </div>
                              <span className="rounded bg-black/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black/55">
                                notes.hierarchy_tree
                              </span>
                            </div>
                            <textarea
                              value={hierarchyImportDraft}
                              onChange={(e) => setHierarchyImportDraft(e.target.value)}
                              rows={7}
                              className="w-full min-h-[150px] rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-black shadow-inner resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                              placeholder={'# Arc: Haunted semester\n## Issue 1: First misfire\n### Page 1\n- Beat: Classroom spell goes wrong\n- Beat: Mentor interrupts'}
                            />
                            <label className="inline-flex w-fit cursor-pointer items-center rounded-md border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white focus-within:ring-2 focus-within:ring-black/25">
                              Import .txt/.md/JSON file
                              <input
                                type="file"
                                accept=".txt,.md,.markdown,.json,application/json,text/plain,text/markdown"
                                className="sr-only"
                                onChange={(event) => {
                                  const file = event.currentTarget.files?.[0];
                                  if (!file) return;
                                  void file.text().then((text) => {
                                    setHierarchyImportDraft(text);
                                    setHierarchyImportError(null);
                                  });
                                  event.currentTarget.value = '';
                                }}
                              />
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={!authorOutlineText.trim()}
                                onClick={() => {
                                  setHierarchyImportDraft(authorOutlineText);
                                  setHierarchyImportError(null);
                                }}
                                className="rounded-md border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                              >
                                Use author outline
                              </button>
                              <button
                                type="button"
                                disabled={!buildSynopsisDocumentFromParts(synopsisHelperParts)}
                                onClick={() => {
                                  setHierarchyImportDraft(buildSynopsisDocumentFromParts(synopsisHelperParts));
                                  setHierarchyImportError(null);
                                }}
                                className="rounded-md border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                              >
                                Use synopsis helper
                              </button>
                              <button
                                type="button"
                                disabled={!supabaseOk || scriptsBusy || !hierarchyImportDraft.trim()}
                                onClick={() => void saveHierarchyToNotes()}
                                className="rounded-md px-3 py-1.5 text-[11px] font-black text-black shadow-sm hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                                style={{ background: ACCENT_GOLD_GRADIENT }}
                              >
                                {scriptsBusy ? 'Saving…' : 'Import/save tree'}
                              </button>
                            </div>
                            {hierarchyImportError ? (
                              <p className="rounded-md bg-red-100/90 px-2 py-1.5 text-[11px] text-red-800">
                                {hierarchyImportError}
                              </p>
                            ) : null}
                          </div>
                          <div className="space-y-3 rounded-xl border border-black/10 bg-white/45 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                              Saved hierarchy tree
                            </p>
                            {hierarchyNodes.length ? (
                              <>
                                <div className="max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                                  {renderEditableHierarchyNodes(hierarchyEditNodes, setHierarchyEditNodes)}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={!supabaseOk || scriptsBusy || hierarchyEditNodes.length === 0}
                                    onClick={() => void saveEditedHierarchyToNotes()}
                                    className="rounded-md px-3 py-1.5 text-[11px] font-black text-black shadow-sm hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-45"
                                    style={{ background: ACCENT_GOLD_GRADIENT }}
                                  >
                                    {scriptsBusy ? 'Saving…' : 'Save tree edits'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHierarchyEditNodes(hierarchyNodes);
                                      setHierarchyEditError(null);
                                    }}
                                    className="rounded-md border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                                  >
                                    Reset edits
                                  </button>
                                </div>
                                {hierarchyEditError ? (
                                  <p className="rounded-md bg-red-100/90 px-2 py-1.5 text-[11px] text-red-800">
                                    {hierarchyEditError}
                                  </p>
                                ) : null}
                                <details className="text-[10px] text-black/45">
                                  <summary className="cursor-pointer font-bold uppercase tracking-wide">
                                    Read-only outline view
                                  </summary>
                                  <div className="mt-2 rounded-md bg-white/55 p-2">
                                    {renderHierarchyNodes(hierarchyNodes)}
                                  </div>
                                </details>
                              </>
                            ) : (
                              <p className="text-xs text-black/50">
                                No hierarchy saved yet. Import from your outline or helper before generation.
                              </p>
                            )}
                          </div>
                        </div>
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
                                disabled={!selectedIssueId}
                                onClick={() => downloadPreferredWriterExport()}
                                className="rounded-lg px-3 py-1.5 text-[11px] font-black text-black shadow-sm disabled:opacity-40"
                                style={{ background: ACCENT_GOLD_GRADIENT }}
                              >
                                {preferredWriterExport.label}
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
                                onClick={() => downloadIssuePackMarkdown()}
                                className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black"
                              >
                                Download issue pack .md
                              </button>
                              <button
                                type="button"
                                disabled={sortedPages.length === 0}
                                onClick={() => downloadGuidedComicsHandoff()}
                                className="rounded-lg border border-black/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-40"
                              >
                                Download Guided Comics handoff
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
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-black/55">
                                  Author outline source
                                </p>
                                <pre
                                  className={`${preShell} ${preFont} max-h-[min(220px,30vh)] text-xs whitespace-pre-wrap`}
                                >
                                  {authorOutlineText.trim() || '(empty — paste your source outline above)'}
                                </pre>
                              </div>
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
                                  <div className="rounded-xl border border-black/10 bg-white/45 p-3 space-y-2">
                                    <div className="flex flex-wrap items-end gap-2">
                                      <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-black/55">
                                        Panel
                                        <input
                                          type="number"
                                          min={1}
                                          value={beatPanelIndexDraft}
                                          onChange={(e) => setBeatPanelIndexDraft(e.target.value)}
                                          className="w-20 rounded-md border border-black/15 bg-white px-2 py-1.5 text-sm font-semibold text-black"
                                        />
                                      </label>
                                      {(
                                        [
                                          ['insert', 'Insert after'],
                                          ['remove', 'Remove'],
                                          ['merge', 'Merge next'],
                                          ['split', 'Split'],
                                          ['up', 'Move up'],
                                          ['down', 'Move down'],
                                        ] as const
                                      ).map(([operation, label]) => (
                                        <button
                                          key={operation}
                                          type="button"
                                          onClick={() => updateBeatsPanelsDraft(operation)}
                                          className="rounded-md border border-black/15 bg-white/80 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-black/70 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                                        >
                                          {label}
                                        </button>
                                      ))}
                                    </div>
                                    <p className="text-[10px] leading-snug text-black/50">
                                      These controls rewrite only the page <code className="rounded bg-black/10 px-1">panels</code>{' '}
                                      array in the draft. Page-level characters, locations, and art style stay intact
                                      unless you edit the JSON directly.
                                    </p>
                                  </div>
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
