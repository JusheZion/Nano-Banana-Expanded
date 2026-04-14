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
        return 'Next: generate outline, then sync pages to match target count → Lore (⌥⌘2) or Page Beats (⌥⌘3).';
      }
      if (ctx.pageCount < ctx.targetPageCount) {
        return 'Next: use “Sync pages to target” so every page row exists, then Lore (⌥⌘2) or Page Beats (⌥⌘3).';
      }
      return 'Next: Page Beats (⌥⌘3 / Alt+Ctrl+3) — pick pages, generate per page, or run “Generate all beats”.';
    case 'lore':
      return 'Lore cards marked “Include in AI prompts” are sent to Generate outline and page beats. Next: Page Beats (⌥⌘3).';
    case 'beats':
      if (ctx.pageCount === 0) {
        return 'Next: sync pages from Issue Outline (target pages) or add pages in the Library.';
      }
      if (ctx.pagesWithBeats < ctx.pageCount) {
        return 'Next: finish beats, then Dialogue (⌥⌘4 / Alt+Ctrl+4) to draft script from beats.';
      }
      return 'Next: Dialogue tab (⌥⌘4 / Alt+Ctrl+4) to draft script, or Video (⌥⌘5 / Alt+Ctrl+5) for shot planning.';
    case 'dialogue':
      if (ctx.pageCount === 0) return 'Next: add pages and beats before dialogue.';
      if (ctx.pagesWithBeats === 0) return 'Next: generate page beats first (⌥⌘3 / Alt+Ctrl+3).';
      if (ctx.pagesWithScript < ctx.pagesWithBeats) {
        return 'Next: draft dialogue per page, then Video (⌥⌘5 / Alt+Ctrl+5) or Arc (⌥⌘6 / Alt+Ctrl+6) for review.';
      }
      return 'Next: Video (⌥⌘5 / Alt+Ctrl+5) for shot list, or Arc (⌥⌘6 / Alt+Ctrl+6) for pacing / canon review.';
    case 'video':
      return 'Next: Arc tab (⌥⌘6 / Alt+Ctrl+6) for pacing/canon, or Scripts (⌥⌘7 / Alt+Ctrl+7) or File → Scripts & exports.';
    case 'arc':
      return 'Run pacing/canon on the Library issue, or batch-select issues above. Scripts (⌥⌘7 / Alt+Ctrl+7) or File → Scripts & exports for synopsis helper and issue pack.';
    case 'scripts':
      return 'Build synopsis from sections, copy or download the issue bundle, or edit saved outline / beats / dialogue JSON.';
    default:
      return '';
  }
}
