/**
 * One-shot handoff from Storyline Studio → Character or Assets studio (live image + optional prompt hint).
 * Not persisted. App.tsx consumes portalToOpen; target studio consumes importPayload on mount.
 */
import { create } from 'zustand';
import type { Portal } from '@/shared/portals';

export type StudioImportTarget = 'studio' | 'assets';

export interface StudioImportPayload {
  target: StudioImportTarget;
  imageUrl: string;
  promptHint?: string;
}

interface StudioImportBridgeState {
  portalToOpen: Portal | null;
  importPayload: StudioImportPayload | null;
  requestOpenInStudio: (target: StudioImportTarget, imageUrl: string, promptHint?: string) => void;
  clearPortalRequest: () => void;
  consumeImportForTarget: (
    target: StudioImportTarget
  ) => { imageUrl: string; promptHint?: string } | null;
}

export const useStudioImportBridge = create<StudioImportBridgeState>((set, get) => ({
  portalToOpen: null,
  importPayload: null,

  requestOpenInStudio: (target, imageUrl, promptHint) => {
    const portal: Portal = target === 'studio' ? 'studio' : 'assets';
    set({
      importPayload: { target, imageUrl, promptHint },
      portalToOpen: portal,
    });
  },

  clearPortalRequest: () => set({ portalToOpen: null }),

  consumeImportForTarget: (target) => {
    const p = get().importPayload;
    if (!p || p.target !== target) return null;
    const out = { imageUrl: p.imageUrl, promptHint: p.promptHint };
    // Defer clear so React Strict Mode's double mount both see the same payload.
    queueMicrotask(() => set({ importPayload: null }));
    return out;
  },
}));
