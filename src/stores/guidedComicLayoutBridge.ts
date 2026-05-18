import { create } from 'zustand';
import type { GuidedComicLayoutIntent, GuidedComicPanelGeometry } from '@/portals/guided-comic/guidedComicLayoutPlan';
import type { GuidedComicBalloonSeed, GuidedComicVisualPageMetadata } from '@/portals/guided-comic/writersWorkshopBridge';

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
  imageId?: string;
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

export type GuidedComicNormalizedPanelRect = {
  panelId: string;
  order: number;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type GuidedComicPanelShapeDefaults = {
  shapeType: 'rect';
  isVisible?: boolean;
  isLocked?: boolean;
};

export type GuidedComicLayoutHandoff = {
  source: 'guided-comic';
  target: 'advanced-comics-studio';
  pageId?: string;
  pageNumber: number;
  layoutTemplate: GuidedComicLayoutTemplate;
  layoutIntent?: GuidedComicLayoutIntent;
  panelCount: number;
  orderedPanelIds: string[];
  normalizedPanelRects?: GuidedComicNormalizedPanelRect[];
  panelGeometry: GuidedComicPanelGeometry[];
  panelArtImages: Record<string, GuidedComicLayoutPanelImage>;
  panelShapeDefaults?: GuidedComicPanelShapeDefaults;
  panelBeats?: GuidedComicLayoutPanelBeat[];
  visualStoryMetadata?: GuidedComicVisualPageMetadata;
  balloonSeeds?: GuidedComicBalloonSeed[];
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
