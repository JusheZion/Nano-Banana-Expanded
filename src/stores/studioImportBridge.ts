/**
 * One-shot handoff from Storyline Studio → Character or Assets studio (live image + optional prompt hint).
 * Not persisted. App.tsx consumes portalToOpen; target studio consumes importPayload on mount.
 */
import { create } from 'zustand';
import type { Portal } from '@/shared/portals';

export type StudioImportTarget = 'studio' | 'assets';

export interface StudioImportOrigin {
  sourcePortal?: 'lab' | 'writer';
  sourceLabel?: string;
  selectedBeatId?: string | null;
  writerSeriesId?: string | null;
  writerIssueId?: string | null;
  writerPageId?: string | null;
  writerPageNumber?: number | null;
}

export interface StudioImportPayload {
  target: StudioImportTarget;
  imageUrl: string;
  promptHint?: string;
  origin?: StudioImportOrigin;
  returnToPortal?: Portal | null;
}

export interface StudioReturnPayload {
  target: StudioImportTarget;
  imageUrl: string;
  promptHint?: string;
  origin?: StudioImportOrigin;
  returnToPortal: Portal;
}

interface StudioImportBridgeState {
  portalToOpen: Portal | null;
  importPayload: StudioImportPayload | null;
  activeImports: Partial<Record<StudioImportTarget, StudioImportPayload>>;
  returnPayload: StudioReturnPayload | null;
  requestOpenInStudio: (
    target: StudioImportTarget,
    imageUrl: string,
    promptHint?: string,
    options?: { origin?: StudioImportOrigin; returnToPortal?: Portal | null }
  ) => void;
  clearPortalRequest: () => void;
  consumeImportForTarget: (
    target: StudioImportTarget
  ) => { imageUrl: string; promptHint?: string } | null;
  clearActiveImportForTarget: (target: StudioImportTarget, reason?: string) => void;
  requestReturnToSourceIfNeeded: (
    target: StudioImportTarget,
    imageUrl: string,
    promptHint?: string
  ) => void;
  consumeReturnPayloadForPortal: (portal: Portal) => StudioReturnPayload | null;
}

export const useStudioImportBridge = create<StudioImportBridgeState>((set, get) => ({
  portalToOpen: null,
  importPayload: null,
  activeImports: {},
  returnPayload: null,

  requestOpenInStudio: (target, imageUrl, promptHint, options) => {
    const portal: Portal = target === 'studio' ? 'studio' : 'assets';
    set({
      importPayload: {
        target,
        imageUrl,
        promptHint,
        origin: options?.origin,
        returnToPortal: options?.returnToPortal ?? null,
      },
      portalToOpen: portal,
    });
  },

  clearPortalRequest: () => set({ portalToOpen: null }),

  consumeImportForTarget: (target) => {
    const p = get().importPayload;
    if (!p || p.target !== target) return null;
    const out = { imageUrl: p.imageUrl, promptHint: p.promptHint };
    set((state) => ({
      activeImports: {
        ...state.activeImports,
        [target]: p,
      },
    }));
    // Defer clear so React Strict Mode's double mount both see the same payload.
    queueMicrotask(() => set({ importPayload: null }));
    return out;
  },

  clearActiveImportForTarget: (target, _reason) => {
    set((state) => ({
      activeImports: Object.fromEntries(
        Object.entries(state.activeImports).filter(([key]) => key !== target),
      ) as Partial<Record<StudioImportTarget, StudioImportPayload>>,
    }));
  },

  requestReturnToSourceIfNeeded: (target, imageUrl, promptHint) => {
    const active = get().activeImports[target];
    const returnToPortal = active?.returnToPortal;
    if (!active || !returnToPortal) return;
    set((state) => ({
      portalToOpen: returnToPortal,
      returnPayload: {
        target,
        imageUrl,
        promptHint: promptHint ?? active.promptHint,
        origin: active.origin,
        returnToPortal,
      },
      activeImports: Object.fromEntries(
        Object.entries(state.activeImports).filter(([key]) => key !== target),
      ) as Partial<Record<StudioImportTarget, StudioImportPayload>>,
    }));
  },

  consumeReturnPayloadForPortal: (portal) => {
    const payload = get().returnPayload;
    if (!payload || payload.returnToPortal !== portal) return null;
    queueMicrotask(() => set({ returnPayload: null }));
    return payload;
  },
}));
