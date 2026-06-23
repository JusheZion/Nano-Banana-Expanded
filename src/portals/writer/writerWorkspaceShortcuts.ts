import { WRITER_WORKSPACE_TAB_ORDER, type WriterWorkspaceTabId } from '@/portals/writer/writerSearch';

/** Tooltip: avoid ⌘1–9 (browser tab switching on macOS). */
export function workspaceTabShortcutHint(tabId: WriterWorkspaceTabId): string {
  const n = WRITER_WORKSPACE_TAB_ORDER.indexOf(tabId) + 1;
  if (n < 1) return 'Open from the workspace tabs';
  if (n > 9) return 'Open from the workspace tabs';
  return `⌥⌘${n} (Mac) · Alt+Ctrl+${n} (Win/Linux)`;
}
