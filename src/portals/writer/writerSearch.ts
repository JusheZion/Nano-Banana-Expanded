/** Escape user input for safe RegExp construction. */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type WriterWorkspaceTabId =
  | 'cockpit'
  | 'arc'
  | 'outline'
  | 'lore'
  | 'beats'
  | 'dialogue'
  | 'video'
  | 'scripts'
  | 'export';

/** Narrative pipeline order: author source → synopsis → canon → production → review cockpit. */
export const WRITER_WORKSPACE_TAB_ORDER: WriterWorkspaceTabId[] = [
  'outline',
  'scripts',
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
  { ribbon: string; heading: string }
> = {
  cockpit: { ribbon: 'Cockpit', heading: 'Writers’ cockpit' },
  outline: { ribbon: 'Outline', heading: 'Issue outline' },
  scripts: { ribbon: 'Synopsis', heading: 'Synopsis helper' },
  lore: { ribbon: 'Canon', heading: 'Canon & lore' },
  beats: { ribbon: 'Beats', heading: 'Page Beats' },
  dialogue: { ribbon: 'Dialogue', heading: 'Dialogue' },
  video: { ribbon: 'Visual Prep', heading: 'Visual Prep' },
  arc: { ribbon: 'Audit', heading: 'Audit' },
  export: { ribbon: 'Export', heading: 'Export issue' },
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
