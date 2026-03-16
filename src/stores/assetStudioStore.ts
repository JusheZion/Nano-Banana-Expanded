/**
 * Asset Reference Studio: local state + persisted library (custom styles, set dressing).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChipTag } from '@/shared/utils/PromptCompiler';
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

export type GenerationStatus = 'idle' | 'pending' | 'safety_blocked' | 'error';
export type OnyxModelId = 'flash' | 'pro';
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
  diversifyStyle: boolean;
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
  assetModifiers: Record<
    AssetModifierCategory,
    { color: string; material: 'matte' | 'gloss' | 'glow' }
  >;

  setTags: (tags: ChipTag[] | ((prev: ChipTag[]) => ChipTag[])) => void;
  setCurrentLiveImageUrl: (url: string | null) => void;
  setCurrentGenerationSeed: (seed: number | null) => void;
  setDiversifyStyle: (value: boolean) => void;
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
      diversifyStyle: false,
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
      aspectRatio: '9:16',
      referenceImageUrls: [],
      selectedOnyxModelId: 'flash',
      generationStatus: 'idle',
      generationStatusMessage: null,
      assetModifiers: defaultAssetModifiers(),

      setTags: (payload) =>
        set((s) => ({
          tags: typeof payload === 'function' ? payload(s.tags) : payload,
        })),
      setCurrentLiveImageUrl: (url) => set({ currentLiveImageUrl: url }),
      setCurrentGenerationSeed: (seed) => set({ currentGenerationSeed: seed }),
      setDiversifyStyle: (value) => set({ diversifyStyle: value }),
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
          if (s.referenceImageUrls.length >= REFERENCE_IMAGE_SLOTS) return s;
          return {
            referenceImageUrls: [...s.referenceImageUrls, url].slice(
              0,
              REFERENCE_IMAGE_SLOTS
            ),
          };
        }),
      removeReferenceImage: (index) =>
        set((s) => ({
          referenceImageUrls: s.referenceImageUrls.filter((_, i) => i !== index),
        })),
      setReferenceImageAt: (index, url) =>
        set((s) => {
          const next = [...s.referenceImageUrls];
          if (url === null) {
            next.splice(index, 1);
          } else {
            next[index] = url;
            if (next.length > REFERENCE_IMAGE_SLOTS) next.length = REFERENCE_IMAGE_SLOTS;
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
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => ({
        getItem: (name: string) => localStorage.getItem(name),
        setItem: (name: string, value: string) =>
          localStorage.setItem(name, value),
        removeItem: (name: string) => localStorage.removeItem(name),
      })),
      partialize: (state) => ({
        tags: state.tags,
        currentGenerationSeed: state.currentGenerationSeed,
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
        referenceImageUrls: state.referenceImageUrls,
        selectedOnyxModelId: state.selectedOnyxModelId,
        assetModifiers: state.assetModifiers,
      }),
    }
  )
);
