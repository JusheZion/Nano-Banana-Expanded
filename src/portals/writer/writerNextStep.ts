import type { WriterWorkspaceTabId } from '@/portals/writer/writerSearch';

export type WriterNextStepContext = {
  hasSeries: boolean;
  hasIssue: boolean;
  hasOutline: boolean;
  pageCount: number;
  targetPageCount: number;
  pagesWithBeats: number;
  pagesWithScript: number;
};

/** Short hint for ribbon “primary AI” tooltip: what to do next in the pipeline. */
export function getWriterQuickGenerateNextHint(
  tab: WriterWorkspaceTabId,
  ctx: WriterNextStepContext,
): string {
  if (!ctx.hasSeries) return 'Create or select a series in the Library first.';
  if (!ctx.hasIssue) return 'Select or add an issue, then save story context if needed.';

  switch (tab) {
    case 'dashboard':
      return 'Use the dashboard to confirm the series, issue, page, locks, and Visual Canon before continuing.';
    case 'outline':
      if (!ctx.hasOutline) {
        return 'Next: complete Foundation basics and Visual Canon, then generate the issue outline.';
      }
      if (ctx.pageCount < ctx.targetPageCount) {
        return 'Next: use “Sync pages to target” so every page row exists, then Page Beats.';
      }
      return 'Next: Page Beats — pick pages, generate per page, or run “Generate all beats”.';
    case 'visual_canon':
      return 'Attach character, location, and prop images the AI should keep consistent before writing beats.';
    case 'scripts':
      return 'Paste your outline (any format) in My Outline, then use the mode buttons to tell ARCS how closely to follow it.';
    case 'lore':
      return 'Story Canon cards marked “Include in AI prompts” are sent to Generate outline and page beats. Next: Page Beats.';
    case 'beats':
      if (ctx.pageCount === 0) {
        return 'Next: sync pages from Issue Outline (target pages) or add pages in the Library.';
      }
      if (ctx.pagesWithBeats < ctx.pageCount) {
        return 'Next: finish page beats, then open Dialogue to draft script from beats.';
      }
      return 'Beats are complete. Continue to Dialogue or Imageshop Prep; regenerate only if you want to replace this page.';
    case 'dialogue':
      if (ctx.pageCount === 0) return 'Next: add pages and beats before dialogue.';
      if (ctx.pagesWithBeats === 0) return 'Next: generate page beats first.';
      if (ctx.pagesWithScript < ctx.pagesWithBeats) {
        return 'Next: draft missing dialogue, then Imageshop Prep or Story Review.';
      }
      return 'Dialogue is complete. Continue to Imageshop Prep, Story Review, or Export; regenerate only if you want to replace this page.';
    case 'video':
      return 'Next: Story Review for pacing/canon, Compare & Review for saved outputs, or Export when the issue is ready.';
    case 'arc':
      return 'Run pacing/canon on the selected issue, then continue to Compare & Review or Export.';
    case 'cockpit':
      return 'Compare outline / beats / dialogue side-by-side, then export or use Idea assist for late-stage review.';
    case 'export':
      return 'Download the preferred issue pack, readable script, full project data file, or Guided Comics handoff.';
    default:
      return '';
  }
}
