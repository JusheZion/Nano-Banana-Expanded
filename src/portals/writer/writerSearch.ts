/** Escape user input for safe RegExp construction. */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type WriterWorkspaceTabId =
  | 'dashboard'
  | 'cockpit'
  | 'arc'
  | 'outline'
  | 'visual_canon'
  | 'lore'
  | 'beats'
  | 'dialogue'
  | 'video'
  | 'scripts'
  | 'export';

/** Narrative pipeline order: author source → synopsis → canon → production → review cockpit. */
export const WRITER_WORKSPACE_TAB_ORDER: WriterWorkspaceTabId[] = [
  'dashboard',
  'outline',
  'scripts',
  'visual_canon',
  'lore',
  'beats',
  'dialogue',
  'video',
  'arc',
  'cockpit',
  'export',
];

export const WRITER_WORKSPACE_TAB_LABELS: Record<
  WriterWorkspaceTabId,
  { ribbon: string; heading: string; description: string }
> = {
  dashboard: {
    ribbon: 'Dashboard',
    heading: 'Writer dashboard',
    description: 'Check the active issue, next step, locks, and readiness before generating.',
  },
  outline: {
    ribbon: 'Foundation',
    heading: 'Foundation & Outline',
    description: 'Set the story basics, production defaults, outline, and page target.',
  },
  scripts: {
    ribbon: 'Synopsis Helper',
    heading: 'Synopsis helper',
    description: 'Shape author notes and source material before the outline or beats are regenerated.',
  },
  visual_canon: {
    ribbon: 'Visual Canon',
    heading: 'Visual Canon',
    description: 'Attach images the AI should keep consistent when it writes page beats.',
  },
  lore: {
    ribbon: 'Story Canon',
    heading: 'Story Canon (Lore)',
    description: 'Choose the world rules, characters, places, and lore cards included in AI prompts.',
  },
  beats: {
    ribbon: 'Page Beats',
    heading: 'Page Beats',
    description: 'Generate or edit panel-level story beats for the selected page.',
  },
  dialogue: {
    ribbon: 'Dialogue',
    heading: 'Dialogue',
    description: 'Draft or edit script text from the selected page beats and issue outline.',
  },
  video: {
    ribbon: 'Imageshop Prep',
    heading: 'Imageshop Prep',
    description: 'Prepare shot plans and handoff context for Illustrator’s Imageshop.',
  },
  arc: {
    ribbon: 'Story Review',
    heading: 'Story Review',
    description: 'Run pacing and canon checks before comparing or exporting the issue.',
  },
  cockpit: {
    ribbon: 'Compare',
    heading: 'Compare & Review',
    description: 'Compare outline, beats, dialogue, review notes, lore, and shot plans side by side.',
  },
  export: {
    ribbon: 'Export',
    heading: 'Export issue',
    description: 'Download readable scripts, full project data, and handoff files.',
  },
};

export type WriterToolSaved = { at?: string; result?: unknown } | null;

export type WriterSearchContext = {
  activeTab: WriterWorkspaceTabId;
  latestOutlineJson: unknown | null;
  latestShotPlanJson: unknown | null;
  selectedPageBeats: unknown | null;
  scriptText: string | null;
  pacingReview: WriterToolSaved | undefined;
  canonCheck: WriterToolSaved | undefined;
  /** Plain text of lore cards for Find on Lore tab */
  loreCardsFindText?: string;
  /** Plain text for Find on Cockpit tab (3-column preview surface) */
  cockpitFindText?: string;
};

/** Labeled arc output; same string used for Find and the Arc tab preview. */
export function formatArcReviewPlainText(
  pacing: WriterToolSaved | undefined,
  canon: WriterToolSaved | undefined,
): string {
  const parts: string[] = [];
  if (pacing?.result != null) {
    parts.push(
      `PACING${pacing.at ? ` — ${pacing.at}` : ''}\n${stringifyPreview(pacing.result)}`,
    );
  }
  if (canon?.result != null) {
    parts.push(`CANON${canon.at ? ` — ${canon.at}` : ''}\n${stringifyPreview(canon.result)}`);
  }
  return parts.join('\n\n');
}

function stringifyPreview(v: unknown): string {
  if (v == null) return '';
  try {
    return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/** Plain text for in-viewport Find (current tab surface only). */
export function getWriterSearchableText(ctx: WriterSearchContext): string {
  switch (ctx.activeTab) {
    case 'dashboard':
    case 'visual_canon':
      return [
        ctx.loreCardsFindText ?? '',
        stringifyPreview(ctx.latestOutlineJson),
      ]
        .filter(Boolean)
        .join('\n\n');
    case 'cockpit':
      return ctx.cockpitFindText ?? '';
    case 'outline':
      return stringifyPreview(ctx.latestOutlineJson);
    case 'lore':
      return ctx.loreCardsFindText ?? '';
    case 'beats':
      return stringifyPreview(ctx.selectedPageBeats);
    case 'dialogue':
      return ctx.scriptText ?? '';
    case 'video':
      return [stringifyPreview(ctx.latestShotPlanJson)].filter(Boolean).join('\n\n');
    case 'arc':
      return formatArcReviewPlainText(ctx.pacingReview, ctx.canonCheck);
    case 'export':
    case 'scripts':
      return [
        stringifyPreview(ctx.latestOutlineJson),
        ctx.loreCardsFindText ?? '',
        stringifyPreview(ctx.selectedPageBeats),
        ctx.scriptText ?? '',
        stringifyPreview(ctx.latestShotPlanJson),
        formatArcReviewPlainText(ctx.pacingReview, ctx.canonCheck),
      ]
        .filter(Boolean)
        .join('\n\n');
    default:
      return '';
  }
}

export function countFindMatches(haystack: string, needle: string): number {
  const q = needle.trim();
  if (!q || !haystack) return 0;
  const re = new RegExp(escapeRegExp(q), 'gi');
  const m = haystack.match(re);
  return m?.length ?? 0;
}
