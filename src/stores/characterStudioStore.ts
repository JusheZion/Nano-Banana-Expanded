/**
 * Reference Character Studio: local state + persisted library (custom styles, wardrobe).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChipTag } from '@/shared/utils/PromptCompiler';
import {
  type WardrobeCategory,
  type CinematicKey,
  type SurgicalPhysicalKey,
  type AspectRatioId,
  WARDROBE_PRESETS,
  CINEMATIC_OPTIONS,
  SURGICAL_PHYSICAL,
} from '@/data/character_studio_spec';

const ONYX_PASSWORD = 'onyx';
const STORAGE_KEY = 'arcs-character-studio';

export type WardrobeModifierCategory = 'tops' | 'bottoms' | 'outerwear' | 'accessories';

const WARDROBE_MODIFIER_CATEGORIES: WardrobeModifierCategory[] = [
  'tops',
  'bottoms',
  'outerwear',
  'accessories',
];

function defaultWardrobeModifiers(): Record<
  WardrobeModifierCategory,
  { color: string; material: 'matte' | 'gloss' | 'glow' }
> {
  return WARDROBE_MODIFIER_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = { color: '#888888', material: 'matte' };
      return acc;
    },
    {} as Record<WardrobeModifierCategory, { color: string; material: 'matte' | 'gloss' | 'glow' }>
  );
}

export interface CharacterPose {
  id: string;
  name?: string;
  imageUrl?: string;
}

function emptyWardrobeLibraries(): Record<WardrobeCategory, string[]> {
  return Object.keys(WARDROBE_PRESETS).reduce(
    (acc, k) => {
      acc[k as WardrobeCategory] = [];
      return acc;
    },
    {} as Record<WardrobeCategory, string[]>
  );
}

function emptyCinematic(): Record<CinematicKey, string> {
  return Object.keys(CINEMATIC_OPTIONS).reduce(
    (acc, k) => {
      acc[k as CinematicKey] = '';
      return acc;
    },
    {} as Record<CinematicKey, string>
  );
}

function emptyPhysicalLibraries(): Record<string, string[]> {
  return (Object.keys(SURGICAL_PHYSICAL) as SurgicalPhysicalKey[]).reduce(
    (acc, k) => {
      acc[k] = [];
      return acc;
    },
    {} as Record<string, string[]>
  );
}

function emptyCinematicLibraries(): Record<CinematicKey, string[]> {
  return (Object.keys(CINEMATIC_OPTIONS) as CinematicKey[]).reduce(
    (acc, k) => {
      acc[k] = [];
      return acc;
    },
    {} as Record<CinematicKey, string[]>
  );
}

export type GenerationStatus = 'idle' | 'pending' | 'safety_blocked' | 'error';
export type OnyxModelId = 'flash' | 'pro';

const REFERENCE_IMAGE_SLOTS = 14;

export interface CharacterStudioState {
  tags: ChipTag[];
  dnaLock: boolean;
  artStyleId: string;
  customStyles: string[];
  wardrobeLibraries: Record<WardrobeCategory, string[]>;
  wardrobeSelections: Record<WardrobeCategory, string[]>;
  wardrobeModifiers: Record<
    WardrobeModifierCategory,
    { color: string; material: 'matte' | 'gloss' | 'glow' }
  >;
  cinematic: Record<CinematicKey, string>;
  vaultUnlocked: boolean;
  vaultPromptOverride: string;
  ageModifier: number;
  aspectRatio: AspectRatioId;
  diversifyLikeness: boolean;
  poses: CharacterPose[];
  selectedPoseId: string | null;
  physicalSelections: Record<string, string[]>;
  heritageSelection: string[];
  genderSelection: string[];
  currentLiveImageUrl: string | null;
  currentGenerationSeed: number | null;
  heritageLibrary: string[];
  genderLibrary: string[];
  physicalLibraries: Record<string, string[]>;
  cinematicLibraries: Record<CinematicKey, string[]>;
  /** Reference images for API (max 14 slots). */
  referenceImageUrls: string[];
  selectedOnyxModelId: OnyxModelId;
  generationStatus: GenerationStatus;
  generationStatusMessage: string | null;

  setTags: (tags: ChipTag[] | ((prev: ChipTag[]) => ChipTag[])) => void;
  setDnaLock: (locked: boolean) => void;
  setArtStyle: (id: string) => void;
  addCustomStyle: (style: string) => void;
  addWardrobeOption: (category: WardrobeCategory, value: string) => void;
  setCinematic: (key: CinematicKey, value: string) => void;
  unlockVault: (password: string) => boolean;
  setVaultPromptOverride: (value: string) => void;
  setAgeModifier: (value: number) => void;
  setAspectRatio: (value: AspectRatioId) => void;
  setDiversifyLikeness: (value: boolean) => void;
  addPose: (pose: Omit<CharacterPose, 'id'>) => void;
  updatePose: (id: string, updates: Partial<CharacterPose>) => void;
  removePose: (id: string) => void;
  setSelectedPoseId: (id: string | null) => void;
  setPhysicalSelection: (category: string, values: string[]) => void;
  setHeritageSelection: (values: string[]) => void;
  setGenderSelection: (values: string[]) => void;
  setWardrobeSelection: (category: WardrobeCategory, values: string[]) => void;
  setWardrobeModifierColor: (category: WardrobeModifierCategory, hex: string) => void;
  setWardrobeModifierMaterial: (
    category: WardrobeModifierCategory,
    material: 'matte' | 'gloss' | 'glow'
  ) => void;
  resetWardrobeModifiers: () => void;
  setCurrentLiveImageUrl: (url: string | null) => void;
  setCurrentGenerationSeed: (seed: number | null) => void;
  addHeritageOption: (value: string) => void;
  addGenderOption: (value: string) => void;
  addPhysicalOption: (category: string, value: string) => void;
  addCinematicOption: (key: CinematicKey, value: string) => void;
  setReferenceImageUrls: (urls: string[]) => void;
  addReferenceImage: (url: string) => void;
  removeReferenceImage: (index: number) => void;
  setReferenceImageAt: (index: number, url: string | null) => void;
  setSelectedOnyxModelId: (id: OnyxModelId) => void;
  setGenerationStatus: (status: GenerationStatus, message?: string | null) => void;
}

export const useCharacterStudioStore = create<CharacterStudioState>()(
  persist(
    (set) => ({
      tags: [
        { id: '1', text: 'portrait', polarity: 'positive' },
        { id: '2', text: 'cinematic-lighting', polarity: 'positive' },
      ],
      dnaLock: false,
      artStyleId: 'flagship',
      customStyles: [],
      wardrobeLibraries: emptyWardrobeLibraries(),
      wardrobeSelections: Object.keys(WARDROBE_PRESETS).reduce(
        (acc, k) => {
          acc[k as WardrobeCategory] = [];
          return acc;
        },
        {} as Record<WardrobeCategory, string[]>
      ),
      wardrobeModifiers: defaultWardrobeModifiers(),
      cinematic: emptyCinematic(),
      vaultUnlocked: false,
      vaultPromptOverride: '',
      ageModifier: 0,
      aspectRatio: '9:16',
      diversifyLikeness: false,
      poses: [],
      selectedPoseId: null,
      physicalSelections: {},
      heritageSelection: [],
      genderSelection: [],
      currentLiveImageUrl: null,
      currentGenerationSeed: null,
      heritageLibrary: [],
      genderLibrary: [],
      physicalLibraries: emptyPhysicalLibraries(),
      cinematicLibraries: emptyCinematicLibraries(),
      referenceImageUrls: [],
      selectedOnyxModelId: 'flash',
      generationStatus: 'idle',
      generationStatusMessage: null,

      setTags: (payload) =>
        set((s) => ({
          tags: typeof payload === 'function' ? payload(s.tags) : payload,
        })),
      setDnaLock: (locked) => set({ dnaLock: locked }),
      setArtStyle: (id) => set({ artStyleId: id }),
      addCustomStyle: (style) =>
        set((s) => {
          const trimmed = style.trim();
          if (!trimmed || s.customStyles.includes(trimmed)) return s;
          return { customStyles: [...s.customStyles, trimmed] };
        }),
      addWardrobeOption: (category, value) =>
        set((s) => {
          const trimmed = value.trim();
          if (!trimmed) return s;
          const list = s.wardrobeLibraries[category] ?? [];
          if (list.includes(trimmed)) return s;
          return {
            wardrobeLibraries: {
              ...s.wardrobeLibraries,
              [category]: [...list, trimmed],
            },
          };
        }),
      setCinematic: (key, value) =>
        set((s) => ({
          cinematic: { ...s.cinematic, [key]: value },
        })),
      unlockVault: (password) => {
        if (password.trim().toLowerCase() !== ONYX_PASSWORD) return false;
        set({ vaultUnlocked: true });
        return true;
      },
      setVaultPromptOverride: (value) => set({ vaultPromptOverride: value }),
      setAgeModifier: (value) => set({ ageModifier: value }),
      setAspectRatio: (value) => set({ aspectRatio: value }),
      setDiversifyLikeness: (value) => set({ diversifyLikeness: value }),
      addPose: (pose) =>
        set((s) => ({
          poses: [...s.poses, { ...pose, id: crypto.randomUUID() }],
        })),
      updatePose: (id, updates) =>
        set((s) => ({
          poses: s.poses.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      removePose: (id) =>
        set((s) => ({
          poses: s.poses.filter((p) => p.id !== id),
          selectedPoseId: s.selectedPoseId === id ? null : s.selectedPoseId,
        })),
      setSelectedPoseId: (id) => set({ selectedPoseId: id }),
      setPhysicalSelection: (category, values) =>
        set((s) => ({
          physicalSelections: { ...s.physicalSelections, [category]: values },
        })),
      setHeritageSelection: (values) => set({ heritageSelection: values }),
      setGenderSelection: (values) => set({ genderSelection: values }),
      setWardrobeSelection: (category, values) =>
        set((s) => ({
          wardrobeSelections: {
            ...s.wardrobeSelections,
            [category]: values,
          },
        })),
      setWardrobeModifierColor: (category, hex) =>
        set((s) => ({
          wardrobeModifiers: {
            ...s.wardrobeModifiers,
            [category]: { ...s.wardrobeModifiers[category], color: hex },
          },
        })),
      setWardrobeModifierMaterial: (category, material) =>
        set((s) => ({
          wardrobeModifiers: {
            ...s.wardrobeModifiers,
            [category]: { ...s.wardrobeModifiers[category], material },
          },
        })),
      resetWardrobeModifiers: () =>
        set({ wardrobeModifiers: defaultWardrobeModifiers() }),
      setCurrentLiveImageUrl: (url) => set({ currentLiveImageUrl: url }),
      setCurrentGenerationSeed: (seed) => set({ currentGenerationSeed: seed }),
      addHeritageOption: (value) =>
        set((s) => {
          const t = value.trim();
          if (!t || s.heritageLibrary.includes(t)) return s;
          return { heritageLibrary: [...s.heritageLibrary, t] };
        }),
      addGenderOption: (value) =>
        set((s) => {
          const t = value.trim();
          if (!t || s.genderLibrary.includes(t)) return s;
          return { genderLibrary: [...s.genderLibrary, t] };
        }),
      addPhysicalOption: (category, value) =>
        set((s) => {
          const t = value.trim();
          if (!t) return s;
          const list = s.physicalLibraries[category] ?? [];
          if (list.includes(t)) return s;
          return {
            physicalLibraries: {
              ...s.physicalLibraries,
              [category]: [...list, t],
            },
          };
        }),
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
        dnaLock: state.dnaLock,
        artStyleId: state.artStyleId,
        customStyles: state.customStyles,
        wardrobeLibraries: state.wardrobeLibraries,
        wardrobeSelections: state.wardrobeSelections,
        wardrobeModifiers: state.wardrobeModifiers,
        cinematic: state.cinematic,
        vaultPromptOverride: state.vaultPromptOverride,
        ageModifier: state.ageModifier,
        aspectRatio: state.aspectRatio,
        diversifyLikeness: state.diversifyLikeness,
        poses: state.poses,
        physicalSelections: state.physicalSelections,
        heritageSelection: state.heritageSelection,
        genderSelection: state.genderSelection,
        currentGenerationSeed: state.currentGenerationSeed,
        heritageLibrary: state.heritageLibrary,
        genderLibrary: state.genderLibrary,
        physicalLibraries: state.physicalLibraries,
        cinematicLibraries: state.cinematicLibraries,
        referenceImageUrls: state.referenceImageUrls,
        selectedOnyxModelId: state.selectedOnyxModelId,
      }),
    }
  )
);
