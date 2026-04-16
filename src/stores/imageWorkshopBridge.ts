import { create } from 'zustand';
import type { Portal } from '@/shared/portals';
import type { ImageWorkshopDraft } from '@/portals/storyline/imageWorkshopPlanning';

interface ImageWorkshopBridgeState {
  portalToOpen: Portal | null;
  draft: ImageWorkshopDraft | null;
  requestWriterHandoff: (draft: ImageWorkshopDraft) => void;
  clearPortalRequest: () => void;
  clearDraft: () => void;
}

export const useImageWorkshopBridge = create<ImageWorkshopBridgeState>((set) => ({
  portalToOpen: null,
  draft: null,
  requestWriterHandoff: (draft) => set({ draft, portalToOpen: 'lab' }),
  clearPortalRequest: () => set({ portalToOpen: null }),
  clearDraft: () => set({ draft: null }),
}));
