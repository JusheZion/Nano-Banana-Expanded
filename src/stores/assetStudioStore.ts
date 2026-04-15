/**
 * Asset Reference Studio: local state + persisted library (custom styles, set dressing).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChipTag } from '@/shared/utils/PromptCompiler';
import type { SeedMode } from '@/shared/utils/generationSeed';
import {
  type SetDressingCategory,
  type AssetCinematicKey,
  type TimeSeasonId,
  type AspectRatioId,
  SET_DRESSING_PRESETS,
  CINEMATIC_OPTIONS,
} from '@/data/asset_studio_spec';

const ONYX_PASSWORD = 'onyx';
const STORAGE_KEY = 'arcs-asset-studio';
const REFERENCE_IMAGE_SLOTS = 14;
const MAX_PERSISTED_DATA_URL_LENGTH = 350_000;

function sanitizeReferenceUrlsForPersist(urls: string[] | undefined): string[] {
  return Array.from({ length: REFERENCE_IMAGE_SLOTS }, (_, i) => {
    const u = urls?.[i] ?? '';
    if (u.startsWith('blob:')) return '';
    if (u.startsWith('data:') && u.length > MAX_PERSISTED_DATA_URL_LENGTH) return '';
    return u;
  });
}

export type GenerationStatus = 'idle' | 'pending' | 'safety_blocked' | 'error';
export type OnyxModelId = 'flash' | 'pro';
export type GalleryDensity = 'compact' | 'comfortable';

/** Top-level Asset Studio workspace (left column on desktop). */
export type AssetStudioWorkspaceMode = 'references' | 'build' | 'prompt' | 'output';

/** Build tab: show fewer sections (Simple) or full taxonomy + libraries (Advanced). */
export type AssetStudioBuildDisclosure = 'simple' | 'advanced';

export interface PromptSnippet {
  id: string;
  name: string;
  text: string;
}
export type AssetModifierCategory = 'structure' | 'furniture' | 'atmospherics';

function emptySetDressingLibraries(): Record<SetDressingCategory, string[]> {
  return (Object.keys(SET_DRESSING_PRESETS) as SetDressingCategory[]).reduce(
    (acc, k) => {
      acc[k] = [];
      return acc;
    },
    {} as Record<SetDressingCategory, string[]>
  );
}

function emptySetDressingSelections(): Record<SetDressingCategory, string[]> {
  return (Object.keys(SET_DRESSING_PRESETS) as SetDressingCategory[]).reduce(
    (acc, k) => {
      acc[k] = [];
      return acc;
    },
    {} as Record<SetDressingCategory, string[]>
  );
}

function emptyCinematic(): Record<AssetCinematicKey, string> {
  return (Object.keys(CINEMATIC_OPTIONS) as AssetCinematicKey[]).reduce(
    (acc, k) => {
      acc[k] = '';
      return acc;
    },
    {} as Record<AssetCinematicKey, string>
  );
}

function emptyCinematicLibraries(): Record<AssetCinematicKey, string[]> {
  return (Object.keys(CINEMATIC_OPTIONS) as AssetCinematicKey[]).reduce(
    (acc, k) => {
      acc[k] = [];
      return acc;
    },
    {} as Record<AssetCinematicKey, string[]>
  );
}

const ASSET_MODIFIER_CATEGORIES: AssetModifierCategory[] = [
  'structure',
  'furniture',
  'atmospherics',
];

function defaultAssetModifiers(): Record<
  AssetModifierCategory,
  { color: string; material: 'matte' | 'gloss' | 'glow' }
> {
  return ASSET_MODIFIER_CATEGORIES.reduce(
    (acc, k) => {
      acc[k] = { color: '#888888', material: 'matte' };
      return acc;
    },
    {} as Record<
      AssetModifierCategory,
      { color: string; material: 'matte' | 'gloss' | 'glow' }
    >
  );
}

export interface AssetStudioState {
  tags: ChipTag[];
  currentLiveImageUrl: string | null;
  currentGenerationSeed: number | null;
  seedMode: SeedMode;
  artStyleId: string;
  customStyles: string[];
  eraStyleSelection: string[];
  locationTypeSelection: string[];
  architecturalDetailSelection: string[];
  eraStyleLibrary: string[];
  locationTypeLibrary: string[];
  architecturalDetailLibrary: string[];
  setDressingLibraries: Record<SetDressingCategory, string[]>;
  setDressingSelections: Record<SetDressingCategory, string[]>;
  cinematic: Record<AssetCinematicKey, string>;
  cinematicLibraries: Record<AssetCinematicKey, string[]>;
  vaultUnlocked: boolean;
  vaultPromptOverride: string;
  architecturalLock: boolean;
  spatialRoomOption: string | null;
  spatialUrbanOption: string | null;
  timeSeason: TimeSeasonId | null;
  aspectRatio: AspectRatioId;
  referenceImageUrls: string[];
  selectedOnyxModelId: OnyxModelId;
  generationStatus: GenerationStatus;
  generationStatusMessage: string | null;
  refinementPromptOverride: string;
  previousLiveImageUrl: string | null;
  previousGenerationSeed: number | null;
  lastUsedPrompt: string;
  promptSnippets: PromptSnippet[];
  galleryDensity: GalleryDensity;
  /** Which primary panel is shown in the left column (References / Build / Prompt / Output). */
  workspaceMode: AssetStudioWorkspaceMode;
  /** Build workspace: progressive disclosure (Simple vs Advanced). */
  buildDisclosure: AssetStudioBuildDisclosure;
  assetModifiers: Record<
    AssetModifierCategory,
    { color: string; material: 'matte' | 'gloss' | 'glow' }
  >;

  setTags: (tags: ChipTag[] | ((prev: ChipTag[]) => ChipTag[])) => void;
  setCurrentLiveImageUrl: (url: string | null) => void;
  setCurrentGenerationSeed: (seed: number | null) => void;
  setSeedMode: (mode: SeedMode) => void;
  setArtStyle: (id: string) => void;
  addCustomStyle: (style: string) => void;
  setEraStyleSelection: (values: string[]) => void;
  setLocationTypeSelection: (values: string[]) => void;
  setArchitecturalDetailSelection: (values: string[]) => void;
  addEraStyleOption: (value: string) => void;
  addLocationTypeOption: (value: string) => void;
  addArchitecturalDetailOption: (value: string) => void;
  addSetDressingOption: (category: SetDressingCategory, value: string) => void;
  setSetDressingSelection: (category: SetDressingCategory, values: string[]) => void;
  setCinematic: (key: AssetCinematicKey, value: string) => void;
  addCinematicOption: (key: AssetCinematicKey, value: string) => void;
  removeEraStyleOption: (value: string) => void;
  removeLocationTypeOption: (value: string) => void;
  removeArchitecturalDetailOption: (value: string) => void;
  removeSetDressingOption: (category: SetDressingCategory, value: string) => void;
  removeCinematicOption: (key: AssetCinematicKey, value: string) => void;
  removeCustomStyle: (value: string) => void;
  unlockVault: (password: string) => boolean;
  setVaultPromptOverride: (value: string) => void;
  setArchitecturalLock: (value: boolean) => void;
  setSpatialRoomOption: (value: string | null) => void;
  setSpatialUrbanOption: (value: string | null) => void;
  setTimeSeason: (value: TimeSeasonId | null) => void;
  setAspectRatio: (value: AspectRatioId) => void;
  setReferenceImageUrls: (urls: string[]) => void;
  addReferenceImage: (url: string) => void;
  removeReferenceImage: (index: number) => void;
  setReferenceImageAt: (index: number, url: string | null) => void;
  setSelectedOnyxModelId: (id: OnyxModelId) => void;
  setGenerationStatus: (status: GenerationStatus, message?: string | null) => void;
  setAssetModifierColor: (category: AssetModifierCategory, hex: string) => void;
  setAssetModifierMaterial: (
    category: AssetModifierCategory,
    material: 'matte' | 'gloss' | 'glow'
  ) => void;
  resetAssetModifiers: () => void;
  setRefinementPromptOverride: (value: string) => void;
  setPreviousLiveSnapshot: (url: string | null, seed: number | null) => void;
  setLastUsedPrompt: (value: string) => void;
  addPromptSnippet: (name: string, text: string) => void;
  removePromptSnippet: (id: string) => void;
  setGalleryDensity: (d: GalleryDensity) => void;
  clearAllReferenceSlots: () => void;
  setWorkspaceMode: (mode: AssetStudioWorkspaceMode) => void;
  setBuildDisclosure: (mode: AssetStudioBuildDisclosure) => void;
}

export const useAssetStudioStore = create<AssetStudioState>()(
  persist(
    (set) => ({
      tags: [
        { id: '1', text: 'environment', polarity: 'positive' },
        { id: '2', text: 'cinematic-lighting', polarity: 'positive' },
      ],
      currentLiveImageUrl: null,
      currentGenerationSeed: null,
      seedMode: 'randomized',
      artStyleId: 'flagship',
      customStyles: [],
      eraStyleSelection: [],
      locationTypeSelection: [],
      architecturalDetailSelection: [],
      eraStyleLibrary: [],
      locationTypeLibrary: [],
      architecturalDetailLibrary: [],
      setDressingLibraries: emptySetDressingLibraries(),
      setDressingSelections: emptySetDressingSelections(),
      cinematic: emptyCinematic(),
      cinematicLibraries: emptyCinematicLibraries(),
      vaultUnlocked: false,
      vaultPromptOverride: '',
      architecturalLock: false,
      spatialRoomOption: null,
      spatialUrbanOption: null,
      timeSeason: null,
      aspectRatio: '21:9',
      referenceImageUrls: [],
      selectedOnyxModelId: 'flash',
      generationStatus: 'idle',
      generationStatusMessage: null,
      refinementPromptOverride: '',
      previousLiveImageUrl: null,
      previousGenerationSeed: null,
      lastUsedPrompt: '',
      promptSnippets: [],
      galleryDensity: 'comfortable',
      assetModifiers: defaultAssetModifiers(),
      workspaceMode: 'references',
      buildDisclosure: 'simple',

      setTags: (payload) =>
        set((s) => ({
          tags: typeof payload === 'function' ? payload(s.tags) : payload,
        })),
      setCurrentLiveImageUrl: (url) => set({ currentLiveImageUrl: url }),
      setCurrentGenerationSeed: (seed) => set({ currentGenerationSeed: seed }),
      setSeedMode: (mode) => set({ seedMode: mode }),
      setArtStyle: (id) => set({ artStyleId: id }),
      addCustomStyle: (style) =>
        set((s) => {
          const trimmed = style.trim();
          if (!trimmed || s.customStyles.includes(trimmed)) return s;
          return { customStyles: [...s.customStyles, trimmed] };
        }),
      setEraStyleSelection: (values) => set({ eraStyleSelection: values }),
      setLocationTypeSelection: (values) => set({ locationTypeSelection: values }),
      setArchitecturalDetailSelection: (values) =>
        set({ architecturalDetailSelection: values }),
      addEraStyleOption: (value) =>
        set((s) => {
          const t = value.trim();
          if (!t || s.eraStyleLibrary.includes(t)) return s;
          return { eraStyleLibrary: [...s.eraStyleLibrary, t] };
        }),
      addLocationTypeOption: (value) =>
        set((s) => {
          const t = value.trim();
          if (!t || s.locationTypeLibrary.includes(t)) return s;
          return { locationTypeLibrary: [...s.locationTypeLibrary, t] };
        }),
      addArchitecturalDetailOption: (value) =>
        set((s) => {
          const t = value.trim();
          if (!t || s.architecturalDetailLibrary.includes(t)) return s;
          return { architecturalDetailLibrary: [...s.architecturalDetailLibrary, t] };
        }),
      addSetDressingOption: (category, value) =>
        set((s) => {
          const trimmed = value.trim();
          if (!trimmed) return s;
          const list = s.setDressingLibraries[category] ?? [];
          if (list.includes(trimmed)) return s;
          return {
            setDressingLibraries: {
              ...s.setDressingLibraries,
              [category]: [...list, trimmed],
            },
          };
        }),
      setSetDressingSelection: (category, values) =>
        set((s) => ({
          setDressingSelections: {
            ...s.setDressingSelections,
            [category]: values,
          },
        })),
      setCinematic: (key, value) =>
        set((s) => ({
          cinematic: { ...s.cinematic, [key]: value },
        })),
      addCinematicOption: (key, value) =>
        set((s) => {
          const t = value.trim();
          if (!t) return s;
          const list = s.cinematicLibraries[key] ?? [];
          if (list.includes(t)) return s;
          return {
            cinematicLibraries: {
              ...s.cinematicLibraries,
              [key]: [...list, t],
            },
          };
        }),
      removeEraStyleOption: (value) =>
        set((s) => {
          if (!s.eraStyleLibrary.includes(value)) return s;
          return {
            eraStyleLibrary: s.eraStyleLibrary.filter((v) => v !== value),
            eraStyleSelection: s.eraStyleSelection.filter((v) => v !== value),
          };
        }),
      removeLocationTypeOption: (value) =>
        set((s) => {
          if (!s.locationTypeLibrary.includes(value)) return s;
          return {
            locationTypeLibrary: s.locationTypeLibrary.filter((v) => v !== value),
            locationTypeSelection: s.locationTypeSelection.filter((v) => v !== value),
          };
        }),
      removeArchitecturalDetailOption: (value) =>
        set((s) => {
          if (!s.architecturalDetailLibrary.includes(value)) return s;
          return {
            architecturalDetailLibrary: s.architecturalDetailLibrary.filter((v) => v !== value),
            architecturalDetailSelection: s.architecturalDetailSelection.filter((v) => v !== value),
          };
        }),
      removeSetDressingOption: (category, value) =>
        set((s) => {
          const list = s.setDressingLibraries[category] ?? [];
          if (!list.includes(value)) return s;
          const nextList = list.filter((v) => v !== value);
          const sel = s.setDressingSelections[category] ?? [];
          const nextSel = sel.filter((v) => v !== value);
          return {
            setDressingLibraries: { ...s.setDressingLibraries, [category]: nextList },
            setDressingSelections: { ...s.setDressingSelections, [category]: nextSel },
          };
        }),
      removeCinematicOption: (key, value) =>
        set((s) => {
          const list = s.cinematicLibraries[key] ?? [];
          if (!list.includes(value)) return s;
          const nextList = list.filter((v) => v !== value);
          const current = s.cinematic[key] === value ? '' : s.cinematic[key];
          return {
            cinematicLibraries: { ...s.cinematicLibraries, [key]: nextList },
            cinematic: { ...s.cinematic, [key]: current },
          };
        }),
      removeCustomStyle: (value) =>
        set((s) => {
          if (!s.customStyles.includes(value)) return s;
          const next = s.customStyles.filter((v) => v !== value);
          const artStyleId = s.artStyleId === value ? 'flagship' : s.artStyleId;
          return { customStyles: next, artStyleId };
        }),
      unlockVault: (password) => {
        if (password.trim().toLowerCase() !== ONYX_PASSWORD) return false;
        set({ vaultUnlocked: true });
        return true;
      },
      setVaultPromptOverride: (value) => set({ vaultPromptOverride: value }),
      setArchitecturalLock: (value) => set({ architecturalLock: value }),
      setSpatialRoomOption: (value) => set({ spatialRoomOption: value }),
      setSpatialUrbanOption: (value) => set({ spatialUrbanOption: value }),
      setTimeSeason: (value) => set({ timeSeason: value }),
      setAspectRatio: (value) => set({ aspectRatio: value }),
      setReferenceImageUrls: (urls) =>
        set({ referenceImageUrls: urls.slice(0, REFERENCE_IMAGE_SLOTS) }),
      addReferenceImage: (url) =>
        set((s) => {
          const next = Array.from(
            { length: REFERENCE_IMAGE_SLOTS },
            (_, i) => s.referenceImageUrls[i] ?? ''
          );
          const firstEmpty = next.findIndex((u) => !u);
          if (firstEmpty < 0) return s;
          next[firstEmpty] = url;
          return { referenceImageUrls: next };
        }),
      removeReferenceImage: (index) =>
        set((s) => {
          const next = Array.from(
            { length: REFERENCE_IMAGE_SLOTS },
            (_, i) => s.referenceImageUrls[i] ?? ''
          );
          next[index] = '';
          return { referenceImageUrls: next };
        }),
      setReferenceImageAt: (index, url) =>
        set((s) => {
          const next = Array.from(
            { length: REFERENCE_IMAGE_SLOTS },
            (_, i) => s.referenceImageUrls[i] ?? ''
          );
          if (url === null || url === '') {
            next[index] = '';
          } else {
            next[index] = url;
          }
          return { referenceImageUrls: next };
        }),
      setSelectedOnyxModelId: (id) => set({ selectedOnyxModelId: id }),
      setGenerationStatus: (status, message) =>
        set({
          generationStatus: status,
          generationStatusMessage: message ?? null,
        }),
      setAssetModifierColor: (category, hex) =>
        set((s) => ({
          assetModifiers: {
            ...s.assetModifiers,
            [category]: { ...s.assetModifiers[category], color: hex },
          },
        })),
      setAssetModifierMaterial: (category, material) =>
        set((s) => ({
          assetModifiers: {
            ...s.assetModifiers,
            [category]: { ...s.assetModifiers[category], material },
          },
        })),
      resetAssetModifiers: () =>
        set({ assetModifiers: defaultAssetModifiers() }),
      setRefinementPromptOverride: (value) => set({ refinementPromptOverride: value }),
      setPreviousLiveSnapshot: (url, seed) =>
        set({ previousLiveImageUrl: url, previousGenerationSeed: seed }),
      setLastUsedPrompt: (value) => set({ lastUsedPrompt: value }),
      addPromptSnippet: (name, text) =>
        set((s) => {
          const t = text.trim();
          const n = name.trim();
          if (!t || !n) return s;
          return {
            promptSnippets: [
              ...s.promptSnippets,
              { id: crypto.randomUUID(), name: n, text: t },
            ],
          };
        }),
      removePromptSnippet: (id) =>
        set((s) => ({
          promptSnippets: s.promptSnippets.filter((x) => x.id !== id),
        })),
      setGalleryDensity: (d) => set({ galleryDensity: d }),
      clearAllReferenceSlots: () =>
        set({ referenceImageUrls: Array.from({ length: REFERENCE_IMAGE_SLOTS }, () => '') }),
      setWorkspaceMode: (mode) => set({ workspaceMode: mode }),
      setBuildDisclosure: (mode) => set({ buildDisclosure: mode }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => ({
        getItem: (name: string) => localStorage.getItem(name),
        setItem: (name: string, value: string) =>
          localStorage.setItem(name, value),
        removeItem: (name: string) => localStorage.removeItem(name),
      })),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AssetStudioState>;
        const merged = { ...current, ...p };
        if (Array.isArray(p.referenceImageUrls)) {
          merged.referenceImageUrls = sanitizeReferenceUrlsForPersist(p.referenceImageUrls);
        }
        return merged;
      },
      partialize: (state) => ({
        tags: state.tags,
        currentGenerationSeed: state.currentGenerationSeed,
        seedMode: state.seedMode,
        artStyleId: state.artStyleId,
        customStyles: state.customStyles,
        eraStyleSelection: state.eraStyleSelection,
        locationTypeSelection: state.locationTypeSelection,
        architecturalDetailSelection: state.architecturalDetailSelection,
        eraStyleLibrary: state.eraStyleLibrary,
        locationTypeLibrary: state.locationTypeLibrary,
        architecturalDetailLibrary: state.architecturalDetailLibrary,
        setDressingLibraries: state.setDressingLibraries,
        setDressingSelections: state.setDressingSelections,
        cinematic: state.cinematic,
        cinematicLibraries: state.cinematicLibraries,
        vaultPromptOverride: state.vaultPromptOverride,
        architecturalLock: state.architecturalLock,
        spatialRoomOption: state.spatialRoomOption,
        spatialUrbanOption: state.spatialUrbanOption,
        timeSeason: state.timeSeason,
        aspectRatio: state.aspectRatio,
        referenceImageUrls: sanitizeReferenceUrlsForPersist(state.referenceImageUrls),
        selectedOnyxModelId: state.selectedOnyxModelId,
        assetModifiers: state.assetModifiers,
        refinementPromptOverride: state.refinementPromptOverride,
        lastUsedPrompt: state.lastUsedPrompt,
        promptSnippets: state.promptSnippets,
        galleryDensity: state.galleryDensity,
        workspaceMode: state.workspaceMode,
        buildDisclosure: state.buildDisclosure,
      }),
    }
  )
);
