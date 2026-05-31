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
        return 'Next: use Synopsis (⌥⌘2) for source outline, Canon (⌥⌘3) for lore, then generate the issue outline.';
      }
      if (ctx.pageCount < ctx.targetPageCount) {
        return 'Next: use “Sync pages to target” so every page row exists, then Canon (⌥⌘3) or Page Beats (⌥⌘4).';
      }
      return 'Next: Page Beats (⌥⌘4 / Alt+Ctrl+4) — pick pages, generate per page, or run “Generate all beats”.';
    case 'scripts':
      return 'Use Synopsis helper for author outline/source structure, then Canon (⌥⌘3) before regenerating outline or beats.';
    case 'lore':
      return 'Canon cards marked “Include in AI prompts” are sent to Generate outline and page beats. Next: Page Beats (⌥⌘4).';
    case 'beats':
      if (ctx.pageCount === 0) {
        return 'Next: sync pages from Issue Outline (target pages) or add pages in the Library.';
      }
      if (ctx.pagesWithBeats < ctx.pageCount) {
        return 'Next: finish beats, then Dialogue (⌥⌘5 / Alt+Ctrl+5) to draft script from beats.';
      }
      return 'Next: Dialogue tab (⌥⌘5 / Alt+Ctrl+5) to draft script, or Video (⌥⌘6 / Alt+Ctrl+6) for shot planning.';
    case 'dialogue':
      if (ctx.pageCount === 0) return 'Next: add pages and beats before dialogue.';
      if (ctx.pagesWithBeats === 0) return 'Next: generate page beats first (⌥⌘4 / Alt+Ctrl+4).';
      if (ctx.pagesWithScript < ctx.pagesWithBeats) {
        return 'Next: draft dialogue per page, then Video (⌥⌘6 / Alt+Ctrl+6) or Arc (⌥⌘7 / Alt+Ctrl+7) for review.';
      }
      return 'Next: Video (⌥⌘6 / Alt+Ctrl+6) for shot list, or Arc (⌥⌘7 / Alt+Ctrl+7) for pacing / canon review.';
    case 'video':
      return 'Next: Arc tab (⌥⌘7 / Alt+Ctrl+7) for pacing/canon, or Cockpit (⌥⌘8 / Alt+Ctrl+8) to compare outputs.';
    case 'arc':
      return 'Run pacing/canon on the Library issue, or batch-select issues above. Next: Cockpit (⌥⌘8 / Alt+Ctrl+8) for compare/review.';
    case 'cockpit':
      return 'Compare outline / beats / dialogue side-by-side, then use Idea assist for late-stage review and targeted fixes.';
    default:
      return '';
  }
}
