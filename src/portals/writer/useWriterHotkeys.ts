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

      if (e.key === 'Escape') {
        onClearFind?.();
        return;
      }

      if (mod && e.key === 'f') {
        e.preventDefault();
        onFocusFind();
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === 'h' && dockEnabled && onToggleDock) {
        e.preventDefault();
        onToggleDock();
        return;
      }

      if (mod && !e.shiftKey && !e.altKey && !isTypingTarget(e.target)) {
        const n = Number(e.key);
        if (n >= 1 && n <= 5) {
          e.preventDefault();
          onWorkspaceTab(TAB_ORDER[n - 1]!);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onWorkspaceTab, onFocusFind, onClearFind, onToggleDock, dockEnabled]);
}
