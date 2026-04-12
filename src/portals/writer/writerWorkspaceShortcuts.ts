import { WRITER_WORKSPACE_TAB_ORDER, type WriterWorkspaceTabId } from '@/portals/writer/writerSearch';

/** Tooltip: avoid ⌘1–9 (browser tab switching on macOS). */
export function workspaceTabShortcutHint(tabId: WriterWorkspaceTabId): string {
  const n = WRITER_WORKSPACE_TAB_ORDER.indexOf(tabId) + 1;
  return `⌥⌘${n} (Mac) · Alt+Ctrl+${n} (Win/Linux)`;
}
