/**
 * Storyline Studio (Master Director) — beats, cast, director settings.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  DirectorSettings,
  ProductionAssetMember,
  ProductionCastMember,
  StoryBeat,
  StoryBeatKind,
} from '@/portals/storyline/storylineTypes';

const STORAGE_KEY = 'arcs-storyline-studio';
const PERSIST_VERSION = 1;

function newBeatId(): string {
  return `beat_${crypto.randomUUID().slice(0, 8)}`;
}

function emptyCamera() {
  return { shot: '', angle: '', movement: '' };
}

function emptyAudio() {
  return { dialogue: '', sfx: '' };
}

export interface StorylineStudioState {
  persistVersion: number;
  storyTitle: string;
  rawStoryline: string;
  cleanedStoryline: string;
  beatIntervalSec: number;
  beats: StoryBeat[];
  productionCast: ProductionCastMember[];
  productionAssets: ProductionAssetMember[];
  directorSettings: DirectorSettings;
  selectedBeatId: string | null;
  aiBusy: 'idle' | 'script' | 'beats' | 'interpolation';
  lastError: string | null;

  setStoryTitle: (v: string) => void;
  setRawStoryline: (v: string) => void;
  setCleanedStoryline: (v: string) => void;
  setBeatIntervalSec: (v: number) => void;
  setBeats: (beats: StoryBeat[]) => void;
  setSelectedBeatId: (id: string | null) => void;
  setDirectorSettings: (partial: Partial<DirectorSettings>) => void;
  setAiBusy: (v: StorylineStudioState['aiBusy']) => void;
  setLastError: (v: string | null) => void;

  addProductionCastMember: (m: ProductionCastMember) => void;
  removeProductionCastMember: (vaultCharacterId: string) => void;
  addProductionAssetMember: (m: ProductionAssetMember) => void;
  removeProductionAssetMember: (vaultAssetId: string) => void;

  updateBeat: (id: string, partial: Partial<StoryBeat>) => void;
  insertBeatAfter: (afterIndex: number, kind: StoryBeatKind, text?: string) => void;
  removeBeat: (id: string) => void;
  reorderBeats: (fromIndex: number, toIndex: number) => void;

  resetStory: () => void;
}

function createDefaultBeat(kind: StoryBeatKind, text = ''): StoryBeat {
  return {
    id: newBeatId(),
    kind,
    text,
    durationSec: 5,
    visualPrompt: '',
    camera: emptyCamera(),
    tone: '',
    audio: emptyAudio(),
    linkedVaultCharacterIds: [],
    linkedVaultAssetIds: [],
    tags: [],
    imageUrl: null,
    interpolation: null,
    generationStatus: 'idle',
    generationMessage: null,
    seed: null,
    aspectRatio: '9:16',
  };
}

const defaultDirector: DirectorSettings = {
  highFashionTechwear: false,
  yugiOhComplexity: false,
  strictWardrobeLock: true,
};

const initialState = {
  persistVersion: PERSIST_VERSION,
  storyTitle: 'Untitled story',
  rawStoryline: '',
  cleanedStoryline: '',
  beatIntervalSec: 10,
  beats: [] as StoryBeat[],
  productionCast: [] as ProductionCastMember[],
  productionAssets: [] as ProductionAssetMember[],
  directorSettings: { ...defaultDirector },
  selectedBeatId: null as string | null,
  aiBusy: 'idle' as const,
  lastError: null as string | null,
};

export const useStorylineStudioStore = create<StorylineStudioState>()(
  persist(
    (set) => ({
      ...initialState,

      setStoryTitle: (v) => set({ storyTitle: v }),
      setRawStoryline: (v) => set({ rawStoryline: v }),
      setCleanedStoryline: (v) => set({ cleanedStoryline: v }),
      setBeatIntervalSec: (v) => set({ beatIntervalSec: Math.max(2, Math.min(120, v)) }),
      setBeats: (beats) => set({ beats }),
      setSelectedBeatId: (id) => set({ selectedBeatId: id }),
      setDirectorSettings: (partial) =>
        set((s) => ({
          directorSettings: { ...s.directorSettings, ...partial },
        })),
      setAiBusy: (aiBusy) => set({ aiBusy }),
      setLastError: (lastError) => set({ lastError }),

      addProductionCastMember: (m) =>
        set((s) => {
          if (s.productionCast.some((c) => c.vaultCharacterId === m.vaultCharacterId)) {
            return s;
          }
          return { productionCast: [...s.productionCast, m] };
        }),

      removeProductionCastMember: (vaultCharacterId) =>
        set((s) => ({
          productionCast: s.productionCast.filter((c) => c.vaultCharacterId !== vaultCharacterId),
          beats: s.beats.map((b) => ({
            ...b,
            linkedVaultCharacterIds: b.linkedVaultCharacterIds.filter((id) => id !== vaultCharacterId),
          })),
        })),

      addProductionAssetMember: (m) =>
        set((s) => {
          if (s.productionAssets.some((a) => a.vaultAssetId === m.vaultAssetId)) {
            return s;
          }
          return { productionAssets: [...s.productionAssets, m] };
        }),

      removeProductionAssetMember: (vaultAssetId) =>
        set((s) => ({
          productionAssets: s.productionAssets.filter((a) => a.vaultAssetId !== vaultAssetId),
          beats: s.beats.map((b) => ({
            ...b,
            linkedVaultAssetIds: b.linkedVaultAssetIds.filter((id) => id !== vaultAssetId),
          })),
        })),

      updateBeat: (id, partial) =>
        set((s) => ({
          beats: s.beats.map((b) => (b.id === id ? { ...b, ...partial } : b)),
        })),

      insertBeatAfter: (afterIndex, kind, text) =>
        set((s) => {
          const nb = createDefaultBeat(kind, text ?? '');
          const next = [...s.beats];
          const at = Math.max(0, Math.min(next.length, afterIndex + 1));
          next.splice(at, 0, nb);
          return { beats: next, selectedBeatId: nb.id };
        }),

      removeBeat: (id) =>
        set((s) => ({
          beats: s.beats.filter((b) => b.id !== id),
          selectedBeatId: s.selectedBeatId === id ? null : s.selectedBeatId,
        })),

      reorderBeats: (fromIndex, toIndex) =>
        set((s) => {
          const list = [...s.beats];
          if (fromIndex < 0 || fromIndex >= list.length) return s;
          const [item] = list.splice(fromIndex, 1);
          list.splice(Math.max(0, Math.min(list.length, toIndex)), 0, item!);
          return { beats: list };
        }),

      resetStory: () =>
        set({
          ...initialState,
          persistVersion: PERSIST_VERSION,
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        persistVersion: state.persistVersion,
        storyTitle: state.storyTitle,
        rawStoryline: state.rawStoryline,
        cleanedStoryline: state.cleanedStoryline,
        beatIntervalSec: state.beatIntervalSec,
        beats: state.beats.map((b) => ({
          ...b,
          linkedVaultAssetIds: Array.isArray(b.linkedVaultAssetIds) ? b.linkedVaultAssetIds : [],
          aspectRatio:
            b.aspectRatio === '1:1' || b.aspectRatio === '21:9' || b.aspectRatio === '9:16'
              ? b.aspectRatio
              : '9:16',
          imageUrl:
            b.imageUrl &&
            (b.imageUrl.startsWith('http://') || b.imageUrl.startsWith('https://'))
              ? b.imageUrl
              : null,
          generationStatus: 'idle',
          generationMessage: null,
        })),
        productionCast: state.productionCast,
        productionAssets: state.productionAssets,
        directorSettings: state.directorSettings,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StorylineStudioState>;
        return {
          ...current,
          ...p,
          beats: Array.isArray(p.beats)
            ? p.beats.map((b) => ({
                ...b,
                linkedVaultAssetIds: Array.isArray(b.linkedVaultAssetIds)
                  ? b.linkedVaultAssetIds
                  : [],
                aspectRatio:
                  b.aspectRatio === '1:1' || b.aspectRatio === '21:9' || b.aspectRatio === '9:16'
                    ? b.aspectRatio
                    : '9:16',
              }))
            : current.beats,
          productionCast: Array.isArray(p.productionCast) ? p.productionCast : current.productionCast,
          productionAssets: Array.isArray(p.productionAssets)
            ? p.productionAssets
            : current.productionAssets,
          directorSettings: p.directorSettings
            ? { ...defaultDirector, ...p.directorSettings }
            : current.directorSettings,
        };
      },
    }
  )
);
