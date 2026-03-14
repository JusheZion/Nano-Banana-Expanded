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
  SET_DRESSING_PRESETS,
  CINEMATIC_OPTIONS,
} from '@/data/asset_studio_spec';

const ONYX_PASSWORD = 'onyx';
const STORAGE_KEY = 'arcs-asset-studio';

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

export interface AssetStudioState {
  tags: ChipTag[];
  currentLiveImageUrl: string | null;
  diversifyStyle: boolean;
  artStyleId: string;
  customStyles: string[];
  eraStyleSelection: string[];
  locationTypeSelection: string[];
  architecturalDetailSelection: string[];
  setDressingLibraries: Record<SetDressingCategory, string[]>;
  setDressingSelections: Record<SetDressingCategory, string[]>;
  cinematic: Record<AssetCinematicKey, string>;
  cinematicLibraries: Record<AssetCinematicKey, string[]>;
  vaultUnlocked: boolean;
  vaultPromptOverride: string;
  spatialRoomOption: string | null;
  spatialUrbanOption: string | null;
  timeSeason: TimeSeasonId | null;

  setTags: (tags: ChipTag[] | ((prev: ChipTag[]) => ChipTag[])) => void;
  setCurrentLiveImageUrl: (url: string | null) => void;
  setDiversifyStyle: (value: boolean) => void;
  setArtStyle: (id: string) => void;
  addCustomStyle: (style: string) => void;
  setEraStyleSelection: (values: string[]) => void;
  setLocationTypeSelection: (values: string[]) => void;
  setArchitecturalDetailSelection: (values: string[]) => void;
  addSetDressingOption: (category: SetDressingCategory, value: string) => void;
  setSetDressingSelection: (category: SetDressingCategory, values: string[]) => void;
  setCinematic: (key: AssetCinematicKey, value: string) => void;
  addCinematicOption: (key: AssetCinematicKey, value: string) => void;
  unlockVault: (password: string) => boolean;
  setVaultPromptOverride: (value: string) => void;
  setSpatialRoomOption: (value: string | null) => void;
  setSpatialUrbanOption: (value: string | null) => void;
  setTimeSeason: (value: TimeSeasonId | null) => void;
}

export const useAssetStudioStore = create<AssetStudioState>()(
  persist(
    (set) => ({
      tags: [
        { id: '1', text: 'environment', polarity: 'positive' },
        { id: '2', text: 'cinematic-lighting', polarity: 'positive' },
      ],
      currentLiveImageUrl: null,
      diversifyStyle: false,
      artStyleId: 'flagship',
      customStyles: [],
      eraStyleSelection: [],
      locationTypeSelection: [],
      architecturalDetailSelection: [],
      setDressingLibraries: emptySetDressingLibraries(),
      setDressingSelections: emptySetDressingSelections(),
      cinematic: emptyCinematic(),
      cinematicLibraries: emptyCinematicLibraries(),
      vaultUnlocked: false,
      vaultPromptOverride: '',
      spatialRoomOption: null,
      spatialUrbanOption: null,
      timeSeason: null,

      setTags: (payload) =>
        set((s) => ({
          tags: typeof payload === 'function' ? payload(s.tags) : payload,
        })),
      setCurrentLiveImageUrl: (url) => set({ currentLiveImageUrl: url }),
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
      setSpatialRoomOption: (value) => set({ spatialRoomOption: value }),
      setSpatialUrbanOption: (value) => set({ spatialUrbanOption: value }),
      setTimeSeason: (value) => set({ timeSeason: value }),
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
        artStyleId: state.artStyleId,
        customStyles: state.customStyles,
        eraStyleSelection: state.eraStyleSelection,
        locationTypeSelection: state.locationTypeSelection,
        architecturalDetailSelection: state.architecturalDetailSelection,
        setDressingLibraries: state.setDressingLibraries,
        setDressingSelections: state.setDressingSelections,
        cinematic: state.cinematic,
        cinematicLibraries: state.cinematicLibraries,
        vaultPromptOverride: state.vaultPromptOverride,
        spatialRoomOption: state.spatialRoomOption,
        spatialUrbanOption: state.spatialUrbanOption,
        timeSeason: state.timeSeason,
      }),
    }
  )
);
