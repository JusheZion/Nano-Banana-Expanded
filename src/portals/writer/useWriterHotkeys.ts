import { useEffect } from 'react';
import {
  type WriterWorkspaceTabId,
  WRITER_WORKSPACE_TAB_ORDER,
} from '@/portals/writer/writerSearch';

const TAB_ORDER: WriterWorkspaceTabId[] = WRITER_WORKSPACE_TAB_ORDER;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return el.isContentEditable;
}

function isFindInputTarget(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && el.dataset.writerFindInput === 'true';
}

export function useWriterHotkeys(options: {
  onWorkspaceTab: (id: WriterWorkspaceTabId) => void;
  onFocusFind: () => void;
  onClearFind?: () => void;
  onToggleDock?: () => void;
  dockEnabled?: boolean;
}) {
  const { onWorkspaceTab, onFocusFind, onClearFind, onToggleDock, dockEnabled } = options;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const typing = isTypingTarget(e.target);
      const findInput = isFindInputTarget(e.target);

      if (e.key === 'Escape') {
        if (!typing || findInput) onClearFind?.();
        return;
      }

      if (mod && e.key.toLowerCase() === 'f') {
        if (!typing || findInput) {
          e.preventDefault();
          onFocusFind();
        }
        return;
      }

      if (typing) return;

      if (mod && e.shiftKey && e.key.toLowerCase() === 'h' && dockEnabled && onToggleDock) {
        e.preventDefault();
        onToggleDock();
        return;
      }

      // ⌘/Ctrl+1–9 switch browser tabs on macOS; use ⌥⌘ / Alt+Ctrl + digit for workspace.
      if (mod && e.altKey && !e.shiftKey) {
        const n = Number(e.key);
        if (n >= 1 && n <= TAB_ORDER.length) {
          e.preventDefault();
          onWorkspaceTab(TAB_ORDER[n - 1]!);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onWorkspaceTab, onFocusFind, onClearFind, onToggleDock, dockEnabled]);
}
