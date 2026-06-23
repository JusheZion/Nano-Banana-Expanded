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
  { id: 'setup', label: 'Setup', sublabel: 'Sign-in & AI', Icon: Plug },
  { id: 'workflow', label: 'Workflow', sublabel: 'Story path', Icon: FileText },
  { id: 'pages_tools', label: 'Pages', sublabel: 'Beats & video', Icon: LayoutGrid },
  { id: 'review_export', label: 'Review', sublabel: 'Arc & exports', Icon: Scale },
  { id: 'keyboard', label: 'Keys', sublabel: 'Shortcuts', Icon: Keyboard },
];

/** Single source for inline tooltips (mirror longer form in Help categories). */
export const WRITER_UI_TIPS = {
  seriesSupabase:
    'Project setup is required before Writer data can save. Ask an operator to check the app connection settings.',
  seriesEmpty:
    'No series yet. Use Create first series to start a Writer project.',
  seriesLibrary:
    'Use “+ Add series” in the Library to add another series after the first. Click a series to load its issues; switching series clears the active issue until you pick one again.',
  issuesStoryContext:
    'With a series selected, Library → Issues shows “Add issue #N” at the top. Each row is one comic issue; add as many as you need, then pick one to edit. After you pick an issue, use Foundation to save the story context.',
  pagesLibrary:
    'Beats and dialogue attach to pages. Use “Sync pages to target” on Outline to create the page list, or Add page under Library → Pages. Generating an outline alone does not create pages. Multi-select pages for batch delete, clear, or download actions; single-page actions live on the Beats and Dialogue tabs.',
  syncPagesToTarget:
    'Creates a page list from 1 up to Target pages, skipping pages that already exist. Run this before “Generate all beats” so each page can receive panel beats.',
  batchPageBeats:
    'Runs the page-beats model on up to 5 pages per server batch (sequential for story continuity). The app repeats until all pages are done or you cancel. If “Skip pages that already have beats” is off (regenerate all), each batch advances through the issue in order. Pick up to 5 pages to run only those in one batch. Each page is one model call — large issues may take several minutes.',
  beatsMultiPick:
    'Check up to 5 pages (issue order), then “Generate beats for selected”. Respects “Skip pages that already have beats” when checked. Use “Clear picks” to reset the checkboxes.',
  clearLatestOutline:
    'Deletes only the newest saved outline version for this issue. Older versions, page rows, and beats stay unchanged.',
  clearPageBeats:
    'Removes panel beats for the selected page. Does not delete the page itself. Regenerate beats when you are ready.',
  clearPageDialogue:
    'Clears dialogue for the selected page. Beats stay intact so you can re-run dialogue from the same panels.',
  arcMultiIssueBatch:
    'Check which issues to include, then run pacing or canon in one pass (one AI call per issue, in issue-number order). Each result is saved on that issue’s row. Use Library to focus an issue and read the combined review block below. “Library issue only” resets the checkboxes to the issue you’re editing. Batch pacing sends the same Outline tab target page count to every selected issue (not per-issue saved targets).',
  storyContextSupabase:
    'Project setup is required before these fields can save. Ask an operator to check the app connection settings, then reload.',
  dockLibraryHidden:
    'Library is hidden — use ⌘⇧H or the book icon on the right edge to show it again.',
  outlineInstructionsOptional:
    'Optional. Sent only when you click Generate outline or Regenerate with coverage boost. Use for pacing, tone, structure, or coverage hints.',
  outlinePreview:
    'Latest saved outline for this issue. Generate a new version from Outline → Target pages → Generate outline.',
  cockpitTab:
    'Compare & Review shows three read-only columns for outline, beats, dialogue, story review notes, lore, or shot plan. The Idea assist bar can include any combination of column digests in one prompt; use other tabs to edit and save.',
  loreTab:
    'Series-scoped lore cards for world, characters, places, and rules. Cards marked “Include in AI prompts” are loaded into Generate outline and page beats as reference text.',
  beatsTab:
    'Page Beats writes panel-level story beats for the selected page. It uses the latest outline, included Story Canon cards, and Visual Canon references attached to the issue. Director notes are optional and apply only to beat generation.',
  beatsDirectorNotes:
    'Optional text sent only when generating page beats (not outlines). Use for double-page spreads (which page is left/right), requested panel shapes (tall strip, hero panel, inset), tone, or “more environmental detail / less talking heads.” Applies to Generate page beats, Generate all beats batches, and the ribbon quick-generate on the Beats tab.',
  beatsNeedPage: 'Select an issue that has pages, then choose a page in the Library.',
  dialogueTab:
    'Draft dialogue from the page’s beats and outline. Pick comic script or screenplay style, then run on the selected page.',
  arcTab:
    'Story Review runs pacing and canon checks on the selected issue. Results save automatically; there is no separate save step.',
  videoTab:
    'Imageshop Prep creates shot plans from the latest outline and page digests. Use it before sending visual context to Illustrator’s Imageshop or exporting shot-plan files.',
  scriptsTab:
    'Author Source shapes your outline and source notes before outline or beat generation. Save helper notes when you want its rules and source structure included in later AI calls.',
  fileRibbon:
    'Open Synopsis Helper or Export from here. AI tools need a signed-in session.',
  insertRibbon: 'Snippets and templates can be added here in a future update.',
  reviewPacing:
    'Run pacing review for the selected issue. Uses the Outline target page count so ARCS can compare plan vs script length. On success, the result is saved to the issue with page-count and cut/add suggestions.',
  reviewCanon:
    'Run canon / continuity check for the selected issue. On success, the result is saved automatically with the issue.',
  aiQuickGenerate: 'Runs the primary AI action for the current workspace tab (outline, beats, dialogue, etc.).',
  activityPanel: 'A short log of AI tool runs. Open Ribbon → Help for full workflow guides.',
  dockShortcutsBlurb:
    'Workspace tabs 1–9: use ⌥⌘ plus the number on Mac, or Alt+Ctrl plus the number on Windows/Linux. Tabs after 9 are opened from the workspace tabs. ⌘F: Find. ⌘⇧H: panels. Esc: clear find.',
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
          {h('Project connection')}
          <p>
            If controls stay faded, the app is missing its project connection. Use the signed-in live site or ask an
            operator to reconnect the local workspace.
          </p>
          <details className="rounded-lg border border-black/10 bg-white/45 p-2 text-xs text-black/65">
            <summary className="cursor-pointer font-bold text-black/70">Technical details</summary>
            <p className="mt-2">
              Local development needs{' '}
              <code className="rounded bg-black/10 px-1">VITE_SUPABASE_URL</code> and{' '}
              <code className="rounded bg-black/10 px-1">VITE_SUPABASE_ANON_KEY</code>, then a restart of{' '}
              <code className="rounded bg-black/10 px-1">npm run dev</code>.
            </p>
            <p className="mt-2 text-black/55">
              Diagnostic: URL present={String(supabaseDiag.urlPresent)}, anon key length={supabaseDiag.anonKeyLength}.
            </p>
          </details>
          {h('AI tools & session')}
          <p>
            AI actions need a <strong>signed-in</strong> account session and the Writers&apos; Workshop AI service. If
            AI buttons stay unavailable on the live site, ask an operator to check the AI service connection.
          </p>
          <details className="rounded-lg border border-black/10 bg-white/45 p-2 text-xs text-black/65">
            <summary className="cursor-pointer font-bold text-black/70">Operator details</summary>
            <p className="mt-2">
              The AI service is the <code className="rounded bg-black/10 px-1">writer-tools</code> Edge Function and it
              needs the Gemini API key. Debug local calls from DevTools Network if the live site works but local tools do
              not.
            </p>
          </details>
          {wikiLink}
        </>
      );
    case 'workflow':
      return (
        <>
          {h('Story setup')}
          <p>
            Start with <strong>Story Settings</strong>: fill the issue title, synopsis, and series logline, then save.
            Those fields guide the later outline, page beats, dialogue, and export steps.
          </p>
          <p>
            Cast, locations, and style bibles are optional. Add them when they help the issue, or leave them empty until
            the story needs them.
          </p>
          {h('Library & selection')}
          <p>
            Use the top <strong>Series / Issue / Page</strong> strip to choose the active work. The Library dock is still
            available in Advanced Tools, but core selection no longer depends on opening it.
          </p>
          <p>
            <strong>Simple Workflow</strong> shows Dashboard, Visual Canon, and the main writing path.{' '}
            <strong>Advanced Tools</strong> restores the ribbon, production map, raw data editors, and batch controls.
          </p>
          {h('Visual Canon')}
          <p>
            Attach Character Vault and Asset Vault images in <strong>Visual Canon</strong> so page-beat AI uses those designs
            instead of inventing new appearances.
          </p>
          {wikiLink}
        </>
      );
    case 'pages_tools':
      return (
        <>
          {h('Pages')}
          <p>
            <strong>Page Beats</strong> and <strong>Dialogue</strong> need a <strong>page</strong> selected in the top strip.
            Outline generation does not create pages by itself — use <strong>Add page</strong> when the list is empty,
            then pick the page and run beats or dialogue.
          </p>
          {h('Beats & dialogue')}
          <p>
            Beats use the latest outline, cast, locations, and attached visual references. Dialogue drafts from beats + outline and saves script text on
            the page.
          </p>
          {h('Video / shot plan')}
          <p>
            Imageshop Prep combines the latest outline and page digests into shot-plan context. Export shot-plan files
            or an issue pack from that workspace.
          </p>
          {wikiLink}
        </>
      );
    case 'review_export':
      return (
        <>
          {h('Pacing & canon')}
          <p>
            <strong>Pacing review</strong> and <strong>canon check</strong> are issue-level Story Review tools. When a run succeeds, results are{' '}
            <strong>saved automatically</strong> with the issue — there is no separate save button.
          </p>
          {h('Exports')}
          <p>
            Download readable issue packs, full project data, and Guided Comics handoff files from the <strong>Export</strong> workspace.
            Advanced Tools keeps the advanced export and raw-output helpers available.
          </p>
          {h('Find')}
          <p>
            Combined review text appears in <strong>Review output</strong>; <strong>Find in view</strong> searches that block.
          </p>
          {wikiLink}
        </>
      );
    case 'keyboard':
      return (
        <>
        <ul className="list-disc pl-4 space-y-2">
          <li>
            <kbd className="rounded bg-black/10 px-1">⌥⌘1</kbd>–<kbd className="rounded bg-black/10 px-1">⌥⌘9</kbd> (Mac) or{' '}
            <kbd className="rounded bg-black/10 px-1">Alt+Ctrl+1</kbd>–<kbd className="rounded bg-black/10 px-1">9</kbd> — first nine workspaces:
            Dashboard, Foundation, Synopsis Helper, Visual Canon, Story Canon, Page Beats, Dialogue, Imageshop Prep, Story Review
          </li>
          <li>
            <strong>File</strong> → <strong>Scripts & exports</strong> — jump to synopsis helper and issue pack
          </li>
          <li>
            <kbd className="rounded bg-black/10 px-1">⌘F</kbd> — focus Find
          </li>
          <li>
            <kbd className="rounded bg-black/10 px-1">⌘⇧H</kbd> — show or hide Library / Activity / Help
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
