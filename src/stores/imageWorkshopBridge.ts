import { create } from 'zustand';
import type { Portal } from '@/shared/portals';
import type { ImageWorkshopDraft } from '@/portals/storyline/imageWorkshopPlanning';

export type GuidedImageWorkshopReference = {
  name: string;
  displayName: string;
  imageUrl: string;
  referenceId?: string;
  sourceLabel?: string;
  sourceType?: 'character' | 'asset' | 'npc';
  profileName?: string;
  imageLabel?: string;
  castName?: string;
};

export type GuidedImageWorkshopHandoff = {
  source: 'guided-comic';
  currentStep: 'visual-prep' | 'art';
  returnTarget?: 'guided-comic-art';
  sourceLabel: string;
  characters: GuidedImageWorkshopReference[];
  locations: GuidedImageWorkshopReference[];
  npcs: GuidedImageWorkshopReference[];
  pageSummary?: string;
  panelId?: string;
  pageNumber?: number;
  panelNumber?: number;
  panelBeat?: string;
  pageKeyCharacters?: string[];
  pageKeyLocation?: string;
  artDirection?: {
    artStyle: string;
    defaultAspectRatio: string;
    renderingStyle: string;
    colorMood: string;
    lighting: string;
    continuityNotes: string;
    excludeTextFromImages: boolean;
  };
};

const IMAGE_WORKSHOP_REFERENCE_SLOT_COUNT = 14;

export function getGuidedImageWorkshopPreload(handoff: GuidedImageWorkshopHandoff): {
  allReferences: GuidedImageWorkshopReference[];
  slotUrls: string[];
  context: 'character' | 'asset';
} {
  const allReferences = [...handoff.characters, ...handoff.locations, ...handoff.npcs].filter((reference) =>
    reference.imageUrl.trim(),
  );
  return {
    allReferences,
    slotUrls: allReferences
      .slice(0, IMAGE_WORKSHOP_REFERENCE_SLOT_COUNT)
      .map((reference) => reference.imageUrl),
    context: handoff.characters.length > 0 ? 'character' : 'asset',
  };
}

export type GuidedComicPanelImageReturn = {
  source: 'guided-comic';
  returnTarget: 'guided-comic-art';
  panelId?: string;
  pageNumber: number;
  panelNumber: number;
  imageUrl: string;
  seed?: number | null;
  prompt?: string;
  returnedAt: string;
};

interface ImageWorkshopBridgeState {
  portalToOpen: Portal | null;
  draft: ImageWorkshopDraft | null;
  guidedHandoff: GuidedImageWorkshopHandoff | null;
  guidedPanelReturn: GuidedComicPanelImageReturn | null;
  requestWriterHandoff: (draft: ImageWorkshopDraft) => void;
  requestGuidedComicHandoff: (handoff: GuidedImageWorkshopHandoff) => void;
  consumeGuidedComicHandoff: () => GuidedImageWorkshopHandoff | null;
  sendGuidedComicPanelImageBack: (payload: Omit<GuidedComicPanelImageReturn, 'source' | 'returnTarget' | 'returnedAt'>) => void;
  consumeGuidedComicPanelImageReturn: () => GuidedComicPanelImageReturn | null;
  clearPortalRequest: () => void;
  clearDraft: () => void;
}

export const useImageWorkshopBridge = create<ImageWorkshopBridgeState>((set, get) => ({
  portalToOpen: null,
  draft: null,
  guidedHandoff: null,
  guidedPanelReturn: null,
  requestWriterHandoff: (draft) => set({ draft, portalToOpen: 'lab' }),
  requestGuidedComicHandoff: (handoff) => set({ guidedHandoff: handoff, portalToOpen: 'lab' }),
  consumeGuidedComicHandoff: () => {
    const handoff = get().guidedHandoff;
    if (!handoff) return null;
    set({ guidedHandoff: null });
    return handoff;
  },
  sendGuidedComicPanelImageBack: (payload) =>
    set({
      guidedPanelReturn: {
        ...payload,
        source: 'guided-comic',
        returnTarget: 'guided-comic-art',
        returnedAt: new Date().toISOString(),
      },
      portalToOpen: 'comic',
    }),
  consumeGuidedComicPanelImageReturn: () => {
    const payload = get().guidedPanelReturn;
    if (!payload) return null;
    set({ guidedPanelReturn: null });
    return payload;
  },
  clearPortalRequest: () => set({ portalToOpen: null }),
  clearDraft: () => set({ draft: null }),
}));
