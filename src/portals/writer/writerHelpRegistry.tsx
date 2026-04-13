import React from 'react';
import { FileText, HelpCircle, Keyboard, LayoutGrid, Plug, Scale } from 'lucide-react';
import { Tooltip } from '@/shared/components/Tooltip';

type CatIcon = React.ComponentType<{ className?: string; size?: number; 'aria-hidden'?: boolean }>;

export type WriterSupabaseDiagnostic = { urlPresent: boolean; anonKeyLength: number };

/** Ribbon + modal open this category (multi-section document per category). */
export type WriterHelpCategoryId = 'setup' | 'workflow' | 'pages_tools' | 'review_export' | 'keyboard';

/** DOM id on wiki `writer.md` ## headings (must match `rehype-slug` output). */
export function writerHelpCategoryWikiHeadingId(id: WriterHelpCategoryId): string {
  const m: Record<WriterHelpCategoryId, string> = {
    setup: 'setup',
    workflow: 'workflow',
    pages_tools: 'pages-tools',
    review_export: 'review-export',
    keyboard: 'keyboard',
  };
  return m[id];
}

export const WRITER_HELP_CATEGORIES: {
  id: WriterHelpCategoryId;
  label: string;
  sublabel: string;
  Icon: CatIcon;
}[] = [
  { id: 'setup', label: 'Setup', sublabel: 'Env & AI', Icon: Plug },
  { id: 'workflow', label: 'Outline', sublabel: 'Library & story', Icon: FileText },
  { id: 'pages_tools', label: 'Pages', sublabel: 'Beats & video', Icon: LayoutGrid },
  { id: 'review_export', label: 'Review', sublabel: 'Arc & exports', Icon: Scale },
  { id: 'keyboard', label: 'Keys', sublabel: 'Shortcuts', Icon: Keyboard },
];

/** Single source for inline tooltips (mirror longer form in Help categories). */
export const WRITER_UI_TIPS = {
  seriesSupabase:
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart npm run dev. Vite only reads env on startup.',
  seriesEmpty:
    'No series yet. After migration, tables are ready—use Create first series here or insert rows in Supabase.',
  seriesLibrary:
    'Use “+ Add series” in the Library to add another series after the first. Click a series to load its issues; switching series clears the active issue until you pick one again.',
  issuesStoryContext:
    'With a series selected, Library → Issues always shows “Add issue #N” at the top (same idea as Add page). Each row is one comic issue; add as many as you need, then pick one to edit. After you pick an issue: Issue Outline → Story context → Save. Cast / locations / bibles: Table Editor only for now.',
  pagesLibrary:
    'Beats and dialogue attach to a page row. Use “Sync pages to target” on Issue Outline to create rows 1…target, or Add page under Library → Pages. Generating an outline alone still does not create page rows. Check up to 5 pages to batch delete, clear beats or dialogue, or download beats/dialogue as one JSON file; single-page download/clear is on the Beats and Dialogue tabs.',
  syncPagesToTarget:
    'Creates writer_pages rows for every number from 1 up to Target pages (skips numbers that already exist). Run this before “Generate all beats” so each page can get panel beats.',
  batchPageBeats:
    'Runs the page-beats model on up to 5 pages per server batch (sequential for story continuity). The app repeats until all pages are done or you cancel. Each page is one model call — large issues may take several minutes.',
  arcMultiIssueBatch:
    'Check which issues to include, then run pacing or canon in one pass (one AI call per issue, in issue-number order). Each result is saved on that issue’s row. Use Library to focus an issue and read the combined review block below. “Library issue only” resets the checkboxes to the issue you’re editing.',
  storyContextSupabase:
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, restart the dev server, then reload. Inputs appear once the app can reach Supabase.',
  dockLibraryHidden:
    'Library is hidden — use ⌘⇧H or the book icon on the right edge to show it again.',
  outlineInstructionsOptional:
    'Optional. Sent only when you click Generate outline or Regenerate with coverage boost. Not saved to the database. Use for pacing, tone, structure, or coverage hints (the coverage boost button appends a page-mapping line here after a successful run).',
  outlinePreview:
    'Latest saved outline JSON for this issue. Generate a new version from Issue Outline → Target pages → Generate outline.',
  beatsTab:
    'Panel-level beats use the latest issue outline plus cast and locations. Pick a page in Library → Pages, then generate. Results save to writer_pages.beats_json. Rules for the outline from Scripts (saved as notes.synopsis_helper.rules) are included on every page-beats call, including Generate all beats. Optional Director notes for beats apply only to page-beats calls (single page, batch, ribbon) — use for spreads, layout variety, or extra detail; Issue synopsis drives outline_issue.',
  beatsDirectorNotes:
    'Optional text sent only when generating page beats (not outlines). Use for double-page spreads (which page is left/right), requested panel shapes (tall strip, hero panel, inset), tone, or “more environmental detail / less talking heads.” Applies to Generate page beats, Generate all beats batches, and the ribbon quick-generate on the Beats tab.',
  beatsNeedPage: 'Select an issue that has pages, then choose a page in the Library.',
  dialogueTab:
    'Draft dialogue from the page’s beats and outline. Pick comic script or screenplay style, then run on the selected page. Saves to writer_pages.script_text.',
  arcTab:
    'Pacing review and canon check run on the whole Library issue (single-issue buttons), or use Batch arc tools to check multiple issues at once. Results save on each issue under notes.writer_tool_cache (no separate Save step).',
  videoTab:
    'Shot plans use the latest outline and page digests. Versions are stored in writer_video_shot_plans. Use the buttons below to export JSON, CSV, or a full issue pack.',
  scriptsTab:
    'Synopsis helper fields save to notes.synopsis_helper; use Build synopsis to fill the Issue Outline synopsis draft, then Save story context on Issue Outline. Rules for the outline is sent to the page-beats model (single page, batch, ribbon) after you Save helper to issue notes — use it for constraints like “no repeating beats across adjacent pages.” Copy or download a full issue pack (synopsis, outline, shot plan, all page beats & dialogue, arc cache). Edit saved outline / beats / dialogue / shot plan JSON and save to the database (valid JSON required for JSON fields).',
  fileRibbon:
    'Open Scripts & exports from here (or Home → workspace Scripts). Issue pack and exports live there; Video tab has shot plan files too. AI tools need a signed-in Supabase session.',
  insertRibbon: 'Snippets and templates can be added here in a future update.',
  reviewPacing:
    'Run pacing review for the selected issue. On success, the result is saved automatically to the issue notes (writer_tool_cache.pacing_review).',
  reviewCanon:
    'Run canon / continuity check for the selected issue. On success, the result is saved automatically to the issue notes (writer_tool_cache.canon_check).',
  aiQuickGenerate: 'Runs the primary AI action for the current workspace tab (outline, beats, dialogue, etc.).',
  activityPanel: 'A short log of AI tool runs. Open Ribbon → Help for full workflow guides.',
  dockShortcutsBlurb:
    'Workspace tabs: ⌥⌘1–6 (Mac) or Alt+Ctrl+1–6 (Win/Linux) — not plain ⌘1–6 (browser switches tabs). File → Scripts & exports also opens the Scripts tab. ⌘F: Find. ⌘⇧H: panels. Esc: clear find.',
  reviewOutputFind: 'Combined pacing + canon text. The Find in view search includes this block.',
} as const;

export type WriterUiTipKey = keyof typeof WRITER_UI_TIPS;

export function WriterSectionTip({
  tipKey,
  label = 'About this section',
}: {
  tipKey: WriterUiTipKey;
  label?: string;
}) {
  return (
    <Tooltip content={WRITER_UI_TIPS[tipKey]} side="left">
      <button
        type="button"
        className="rounded-md p-1 text-black/45 hover:text-black/75 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 shrink-0"
        aria-label={label}
      >
        <HelpCircle size={15} aria-hidden />
      </button>
    </Tooltip>
  );
}

export function writerHelpCategoryTitle(id: WriterHelpCategoryId): string {
  const c = WRITER_HELP_CATEGORIES.find((x) => x.id === id);
  return c ? `${c.label} · ${c.sublabel}` : 'Help';
}

export function WriterHelpCategoryBody({
  category,
  supabaseDiag,
  onOpenPortalsWiki,
}: {
  category: WriterHelpCategoryId;
  supabaseDiag: WriterSupabaseDiagnostic;
  /** Jump to Portals Wiki → Writers' Workshop with this section slug. */
  onOpenPortalsWiki?: (headingId: string) => void;
}): React.ReactNode {
  const h = (children: React.ReactNode) => (
    <h3 className="text-[11px] font-black uppercase tracking-wider text-black/55 border-b border-black/10 pb-1 mt-4 first:mt-0">
      {children}
    </h3>
  );

  const wikiLink =
    onOpenPortalsWiki != null ? (
      <p className="mt-4 pt-3 border-t border-black/10 text-xs text-black/70">
        <button
          type="button"
          className="font-bold text-teal-900 underline decoration-teal-600/50 hover:decoration-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30 rounded"
          onClick={() => onOpenPortalsWiki(writerHelpCategoryWikiHeadingId(category))}
        >
          Open full chapter in Portals Wiki
        </button>{' '}
        <span className="text-black/50">(Writers&apos; Workshop)</span>
      </p>
    ) : null;

  switch (category) {
    case 'setup':
      return (
        <>
          {h('Supabase & .env')}
          <p>
            If controls stay faded, add{' '}
            <code className="rounded bg-black/10 px-1">VITE_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-black/10 px-1">VITE_SUPABASE_ANON_KEY</code> to{' '}
            <code className="rounded bg-black/10 px-1">.env</code>, then <strong>stop and restart</strong>{' '}
            <code className="rounded bg-black/10 px-1">npm run dev</code>.
          </p>
          <p className="text-xs text-black/60">
            Diagnostic: URL present={String(supabaseDiag.urlPresent)}, anon key length={supabaseDiag.anonKeyLength}.
          </p>
          {h('AI tools & session')}
          <p>
            AI actions need a <strong>signed-in</strong> Supabase user. Deploy the{' '}
            <code className="rounded bg-black/10 px-1">writer-tools</code> Edge Function and set{' '}
            <code className="rounded bg-black/10 px-1">GEMINI_API_KEY</code> (same value as{' '}
            <code className="rounded bg-black/10 px-1">VITE_GEMINI_API_KEY</code>).
          </p>
          {h('DevTools & Network')}
          <p>
            To debug calls, use DevTools <strong>Network</strong> on your <strong>local app</strong> (e.g.{' '}
            <code className="rounded bg-black/10 px-1">localhost</code>), not only the Supabase dashboard.
          </p>
          {wikiLink}
        </>
      );
    case 'workflow':
      return (
        <>
          {h('Issue outline & story context')}
          <p>
            On <strong>Issue Outline</strong>, fill title, synopsis, and series logline, then <strong>Save story context</strong>.
            The app writes to <code className="rounded bg-black/10 px-1">writer_issues</code> and{' '}
            <code className="rounded bg-black/10 px-1">writer_series</code> — no spreadsheet upload.
          </p>
          <p>
            Cast, locations, and style bibles are optional; add rows in the Table Editor if you use them, or leave empty.
          </p>
          {h('Library & selection')}
          <p>
            In <strong>Library</strong> (<kbd className="rounded bg-black/10 px-1">⌘⇧H</kbd> or book icon), choose a series,
            then an issue. Re-click the issue if fields stay disabled.
          </p>
          <p>
            Workspace <kbd className="rounded bg-black/10 px-1">⌘2</kbd> opens <strong>Issue Outline</strong> for story fields.
          </p>
          {wikiLink}
        </>
      );
    case 'pages_tools':
      return (
        <>
          {h('Pages')}
          <p>
            <strong>Page beats</strong> and <strong>dialogue</strong> need a <strong>page</strong> selected under Library →
            Pages. Outline generation does not create <code className="rounded bg-black/10 px-1">writer_pages</code> rows — use{' '}
            <strong>Add page</strong> (next number) in the Library when the list is empty, then pick the page and run beats or
            dialogue.
          </p>
          {h('Beats & dialogue')}
          <p>
            Beats use the latest outline, cast, and locations. Dialogue drafts from beats + outline and saves script text on
            the page.
          </p>
          {h('Video / shot plan')}
          <p>
            Shot plans combine the latest outline and page digests. Export JSON, CSV, or an issue pack from the Video
            workspace.
          </p>
          {wikiLink}
        </>
      );
    case 'review_export':
      return (
        <>
          {h('Pacing & canon')}
          <p>
            <strong>Pacing review</strong> and <strong>canon check</strong> are issue-level. When a run succeeds, results are{' '}
            <strong>saved automatically</strong> on the issue under{' '}
            <code className="rounded bg-black/10 px-1">notes.writer_tool_cache</code> — there is no separate save button.
          </p>
          {h('Exports')}
          <p>
            Download outline JSON, shot plans, and bundles from the <strong>Video</strong> tab or the context menu on the
            reading area. The <strong>File</strong> ribbon summarizes export locations.
          </p>
          {h('Find')}
          <p>
            Combined review text appears in <strong>Review output</strong>; <strong>Find in view</strong> searches that block
            together with other visible JSON.
          </p>
          {wikiLink}
        </>
      );
    case 'keyboard':
      return (
        <>
        <ul className="list-disc pl-4 space-y-2">
          <li>
            <kbd className="rounded bg-black/10 px-1">⌥⌘1</kbd>–<kbd className="rounded bg-black/10 px-1">⌥⌘6</kbd> (Mac) or{' '}
            <kbd className="rounded bg-black/10 px-1">Alt+Ctrl+1</kbd>–<kbd className="rounded bg-black/10 px-1">6</kbd> — workspace:
            Outline, Beats, Dialogue, Video, Arc, Scripts (plain ⌘1–9 is reserved by the browser)
          </li>
          <li>
            <strong>File</strong> → <strong>Scripts & exports</strong> — jump to synopsis helper and issue pack
          </li>
          <li>
            <kbd className="rounded bg-black/10 px-1">⌘F</kbd> — focus Find
          </li>
          <li>
            <kbd className="rounded bg-black/10 px-1">⌘⇧H</kbd> — show or hide Library / Activity / Shortcuts
          </li>
          <li>
            <kbd className="rounded bg-black/10 px-1">Esc</kbd> — clear find (when Find is focused)
          </li>
        </ul>
        {wikiLink}
        </>
      );
    default:
      return null;
  }
}
