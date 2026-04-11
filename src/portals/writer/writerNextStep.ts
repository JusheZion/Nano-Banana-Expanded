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
    case 'outline':
      if (!ctx.hasOutline) {
        return 'Next: generate outline, then sync pages to match target count → Page Beats (⌘2).';
      }
      if (ctx.pageCount < ctx.targetPageCount) {
        return 'Next: use “Sync pages to target” so every page row exists, then Page Beats (⌘2).';
      }
      return 'Next: open Page Beats (⌘2) and generate panel beats per page or run “Generate all beats”.';
    case 'beats':
      if (ctx.pageCount === 0) {
        return 'Next: sync pages from Issue Outline (target pages) or add pages in the Library.';
      }
      if (ctx.pagesWithBeats < ctx.pageCount) {
        return 'Next: finish beats, then Dialogue (⌘3) to draft script from beats.';
      }
      return 'Next: Dialogue tab (⌘3) to draft script, or Video (⌘4) for shot planning.';
    case 'dialogue':
      if (ctx.pageCount === 0) return 'Next: add pages and beats before dialogue.';
      if (ctx.pagesWithBeats === 0) return 'Next: generate page beats first (⌘2).';
      if (ctx.pagesWithScript < ctx.pagesWithBeats) {
        return 'Next: draft dialogue per page, then Video (⌘4) or Arc (⌘5) for review.';
      }
      return 'Next: Video (⌘4) for shot list, or Arc (⌘5) for pacing / canon review.';
    case 'video':
      return 'Next: Arc tab (⌘5) for pacing review and canon check on the full issue.';
    case 'arc':
      return 'Use Review menu for pacing and canon anytime. ⌘1 returns to Outline.';
    default:
      return '';
  }
}
