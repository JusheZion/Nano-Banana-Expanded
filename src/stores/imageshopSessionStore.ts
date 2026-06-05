import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { OnyxModelId } from '@/shared/api/geminiImageApi';
import type { ImageshopGenerationProvenance } from '@/portals/storyline/imageshopPagePanelQueue';
import type { ImageshopBatchGenerationAttempt } from '@/portals/storyline/imageshopBatchGeneration';
import type { StoryBeatAspectRatio } from '@/portals/storyline/storylineTypes';

export type ImageshopSessionResult = {
  id: string;
  imageUrl: string;
  seed: number | null;
  prompt: string;
  aspectRatio: StoryBeatAspectRatio;
  context: 'character' | 'asset';
  modelId: OnyxModelId;
  generatedAt: string;
  sourceLabel?: string;
  provenance?: ImageshopGenerationProvenance;
  attempt?: ImageshopBatchGenerationAttempt;
};

type AddImageshopSessionResultInput = Omit<ImageshopSessionResult, 'id' | 'generatedAt'>;

type ImageshopSessionState = {
  results: ImageshopSessionResult[];
  activeResultId: string | null;
  addResult: (result: AddImageshopSessionResultInput) => ImageshopSessionResult;
  selectResult: (id: string) => void;
  removeResult: (id: string) => void;
  clearResults: () => void;
};

const MAX_SESSION_RESULTS = 8;

function createResultId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `imageshop_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const useImageshopSessionStore = create<ImageshopSessionState>()(
  persist(
    (set) => ({
      results: [],
      activeResultId: null,

      addResult: (result) => {
        const stored: ImageshopSessionResult = {
          ...result,
          id: createResultId(),
          generatedAt: new Date().toISOString(),
        };

        set((state) => ({
          results: [stored, ...state.results.filter((item) => item.imageUrl !== stored.imageUrl)].slice(0, MAX_SESSION_RESULTS),
          activeResultId: stored.id,
        }));

        return stored;
      },

      selectResult: (id) => set((state) => ({
        activeResultId: state.results.some((result) => result.id === id) ? id : state.activeResultId,
      })),

      removeResult: (id) => set((state) => {
        const results = state.results.filter((result) => result.id !== id);
        const activeResultId = state.activeResultId === id ? results[0]?.id ?? null : state.activeResultId;
        return { results, activeResultId };
      }),

      clearResults: () => set({ results: [], activeResultId: null }),
    }),
    {
      name: 'arcs-imageshop-session-v1',
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
    },
  ),
);
