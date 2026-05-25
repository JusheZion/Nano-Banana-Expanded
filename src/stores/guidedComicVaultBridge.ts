import { create } from 'zustand';
import type { Portal } from '@/shared/portals';

export type GuidedComicVaultTargetType = 'character' | 'location' | 'npc' | 'prop' | 'panel-art' | 'cover';
export type GuidedComicVaultSourceType = 'character' | 'asset' | 'npc';

export type GuidedComicVaultTarget = {
  type: GuidedComicVaultTargetType;
  name: string;
  pageNumber?: number;
  panelNumber?: number;
};

export type GuidedComicVaultSelection = GuidedComicVaultTarget & {
  referenceId: string;
  imageUrl: string;
  sourceType: GuidedComicVaultSourceType;
  sourceLabel: string;
  displayName: string;
  profileName?: string;
  collectionName?: string;
  imageLabel?: string;
  castName?: string;
};

interface GuidedComicVaultBridgeState {
  portalToOpen: Portal | null;
  pendingTarget: GuidedComicVaultTarget | null;
  selection: GuidedComicVaultSelection | null;
  requestVaultSelection: (target: GuidedComicVaultTarget) => void;
  clearPortalRequest: () => void;
  selectVaultReference: (selection: GuidedComicVaultSelection) => void;
  consumeSelection: () => GuidedComicVaultSelection | null;
  clearPendingTarget: () => void;
  cancelAndReturnToComic: () => void;
}

export const useGuidedComicVaultBridge = create<GuidedComicVaultBridgeState>((set, get) => ({
  portalToOpen: null,
  pendingTarget: null,
  selection: null,

  requestVaultSelection: (target) => {
    set({
      pendingTarget: target,
      portalToOpen: 'reference',
      selection: null,
    });
  },

  clearPortalRequest: () => set({ portalToOpen: null }),

  selectVaultReference: (selection) => {
    const pendingTarget = get().pendingTarget;
    const nextSelection =
      pendingTarget && pendingTarget.type === selection.type && pendingTarget.name === selection.name
        ? { ...pendingTarget, ...selection }
        : selection;

    set({
      selection: nextSelection,
      pendingTarget: null,
      portalToOpen: 'comic',
    });
  },

  consumeSelection: () => {
    const selection = get().selection;
    if (!selection) return null;
    set({ selection: null });
    return selection;
  },

  clearPendingTarget: () => set({ pendingTarget: null }),

  cancelAndReturnToComic: () => set({ pendingTarget: null, selection: null, portalToOpen: 'comic' }),
}));
