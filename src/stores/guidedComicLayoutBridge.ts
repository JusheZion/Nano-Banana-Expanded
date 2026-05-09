import { create } from 'zustand';
import type { GuidedComicPanelGeometry } from '@/portals/guided-comic/guidedComicLayoutPlan';

export type GuidedComicLayoutTemplate =
  | 'auto'
  | 'three-panel'
  | 'three-panel-wide-top'
  | 'three-panel-wide-bottom'
  | 'four-panel'
  | 'six-panel-grid'
  | 'splash';

export type GuidedComicLayoutPanelImage = {
  panelId: string;
  imageUrl: string;
  prompt?: string;
  returnedAt?: string;
  source?: 'imageshop' | 'vault' | 'upload' | 'paste';
};

export type GuidedComicLayoutPanelBeat = {
  panelId: string;
  panelNumber: number;
  beatText: string;
};

export type GuidedComicLayoutHandoff = {
  source: 'guided-comic';
  target: 'advanced-comics-studio';
  pageNumber: number;
  layoutTemplate: GuidedComicLayoutTemplate;
  panelCount: number;
  orderedPanelIds: string[];
  panelGeometry: GuidedComicPanelGeometry[];
  panelArtImages: Record<string, GuidedComicLayoutPanelImage>;
  panelBeats?: GuidedComicLayoutPanelBeat[];
  requestedAt: string;
};

type GuidedComicLayoutRequest = Omit<GuidedComicLayoutHandoff, 'source' | 'target' | 'requestedAt'>;

interface GuidedComicLayoutBridgeState {
  layoutHandoff: GuidedComicLayoutHandoff | null;
  requestLayoutHandoff: (payload: GuidedComicLayoutRequest) => void;
  consumeLayoutHandoff: () => GuidedComicLayoutHandoff | null;
}

export const useGuidedComicLayoutBridge = create<GuidedComicLayoutBridgeState>((set, get) => ({
  layoutHandoff: null,
  requestLayoutHandoff: (payload) =>
    set({
      layoutHandoff: {
        ...payload,
        source: 'guided-comic',
        target: 'advanced-comics-studio',
        requestedAt: new Date().toISOString(),
      },
    }),
  consumeLayoutHandoff: () => {
    const payload = get().layoutHandoff;
    if (!payload) return null;
    set({ layoutHandoff: null });
    return payload;
  },
}));
