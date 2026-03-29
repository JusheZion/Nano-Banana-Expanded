/**
 * Reference Character Studio: local state + persisted library (custom styles, wardrobe).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChipTag } from '@/shared/utils/PromptCompiler';
import type { SeedMode } from '@/shared/utils/generationSeed';

export type { SeedMode };
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

/** Map legacy heritage chip labels to current HERITAGE_TAGS after renames. */
const HERITAGE_SELECTION_MIGRATION: Record<string, string> = {
  'African-American': 'African American',
  Blatino: 'Black Latino',
};

export type WardrobeModifierCategory = 'tops' | 'bottoms' | 'outerwear' | 'accessories' | 'hats' | 'glasses';

const WARDROBE_MODIFIER_CATEGORIES: WardrobeModifierCategory[] = [
  'tops',
  'bottoms',
  'outerwear',
  'accessories',
  'hats',
  'glasses',
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
export type GalleryDensity = 'compact' | 'comfortable';

export interface PromptSnippet {
  id: string;
  name: string;
  text: string;
}

const REFERENCE_IMAGE_SLOTS = 14;

/** Max length for a persisted `data:` ref — larger values stay in RAM but are omitted from localStorage to avoid multi‑MB JSON.stringify blocking the UI. */
const MAX_PERSISTED_DATA_URL_LENGTH = 350_000;

/** `blob:` URLs are session-only; huge `data:` URLs blow up persist JSON and freeze the main thread on every setState. */
function sanitizeReferenceUrlsForPersist(urls: string[] | undefined): string[] {
  return Array.from({ length: REFERENCE_IMAGE_SLOTS }, (_, i) => {
    const u = urls?.[i] ?? '';
    if (u.startsWith('blob:')) return '';
    if (u.startsWith('data:') && u.length > MAX_PERSISTED_DATA_URL_LENGTH) return '';
    return u;
  });
}

function posesForPersist(poses: CharacterPose[]): CharacterPose[] {
  return poses.map((p) => ({
    ...p,
    imageUrl:
      p.imageUrl &&
      !p.imageUrl.startsWith('blob:') &&
      !p.imageUrl.startsWith('data:')
        ? p.imageUrl
        : undefined,
  }));
}

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
  facialExpressionSelection: string[];
  currentLiveImageUrl: string | null;
  currentGenerationSeed: number | null;
  seedMode: SeedMode; // persisted; default randomized
  heritageLibrary: string[];
  genderLibrary: string[];
  facialExpressionLibrary: string[];
  physicalLibraries: Record<string, string[]>;
  cinematicLibraries: Record<CinematicKey, string[]>;
  /** Reference images for API (max 14 slots). */
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
  setFacialExpressionSelection: (values: string[]) => void;
  setWardrobeSelection: (category: WardrobeCategory, values: string[]) => void;
  setWardrobeModifierColor: (category: WardrobeModifierCategory, hex: string) => void;
  setWardrobeModifierMaterial: (
    category: WardrobeModifierCategory,
    material: 'matte' | 'gloss' | 'glow'
  ) => void;
  resetWardrobeModifiers: () => void;
  setCurrentLiveImageUrl: (url: string | null) => void;
  setCurrentGenerationSeed: (seed: number | null) => void;
  setSeedMode: (mode: SeedMode) => void;
  addHeritageOption: (value: string) => void;
  addGenderOption: (value: string) => void;
  toggleFacialExpression: (value: string) => void;
  addFacialExpressionOption: (value: string) => void;
  removeFacialExpressionOption: (value: string) => void;
  addPhysicalOption: (category: string, value: string) => void;
  addCinematicOption: (key: CinematicKey, value: string) => void;
  removeWardrobeOption: (category: WardrobeCategory, value: string) => void;
  removeHeritageOption: (value: string) => void;
  removeGenderOption: (value: string) => void;
  // facialExpression option removal also unselects it
  removePhysicalOption: (category: string, value: string) => void;
  removeCinematicOption: (key: CinematicKey, value: string) => void;
  removeCustomStyle: (value: string) => void;
  setReferenceImageUrls: (urls: string[]) => void;
  addReferenceImage: (url: string) => void;
  removeReferenceImage: (index: number) => void;
  setReferenceImageAt: (index: number, url: string | null) => void;
  setSelectedOnyxModelId: (id: OnyxModelId) => void;
  setGenerationStatus: (status: GenerationStatus, message?: string | null) => void;
  setRefinementPromptOverride: (value: string) => void;
  setPreviousLiveSnapshot: (url: string | null, seed: number | null) => void;
  setLastUsedPrompt: (value: string) => void;
  addPromptSnippet: (name: string, text: string) => void;
  removePromptSnippet: (id: string) => void;
  setGalleryDensity: (d: GalleryDensity) => void;
  clearAllReferenceSlots: () => void;
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
      facialExpressionSelection: [],
      currentLiveImageUrl: null,
      currentGenerationSeed: null,
      seedMode: 'randomized',
      heritageLibrary: [],
      genderLibrary: [],
      facialExpressionLibrary: [],
      physicalLibraries: emptyPhysicalLibraries(),
      cinematicLibraries: emptyCinematicLibraries(),
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
      setFacialExpressionSelection: (values) => set({ facialExpressionSelection: values }),
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
      setSeedMode: (mode) => set({ seedMode: mode }),
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
      toggleFacialExpression: (value) =>
        set((s) => {
          const t = value.trim();
          if (!t) return s;
          const sel = s.facialExpressionSelection ?? [];
          const next = sel.includes(t) ? sel.filter((v) => v !== t) : [...sel, t];
          return { facialExpressionSelection: next };
        }),
      addFacialExpressionOption: (value) =>
        set((s) => {
          const t = value.trim();
          if (!t || s.facialExpressionLibrary.includes(t)) return s;
          return { facialExpressionLibrary: [...s.facialExpressionLibrary, t] };
        }),
      removeFacialExpressionOption: (value) =>
        set((s) => {
          const t = value.trim();
          if (!t || !s.facialExpressionLibrary.includes(t)) return s;
          return {
            facialExpressionLibrary: s.facialExpressionLibrary.filter((v) => v !== t),
            facialExpressionSelection: (s.facialExpressionSelection ?? []).filter((v) => v !== t),
          };
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
      removeWardrobeOption: (category, value) =>
        set((s) => {
          const list = s.wardrobeLibraries[category] ?? [];
          if (!list.includes(value)) return s;
          const nextList = list.filter((v) => v !== value);
          const sel = s.wardrobeSelections[category] ?? [];
          const nextSel = sel.filter((v) => v !== value);
          return {
            wardrobeLibraries: { ...s.wardrobeLibraries, [category]: nextList },
            wardrobeSelections: { ...s.wardrobeSelections, [category]: nextSel },
          };
        }),
      removeHeritageOption: (value) =>
        set((s) => {
          if (!s.heritageLibrary.includes(value)) return s;
          return {
            heritageLibrary: s.heritageLibrary.filter((v) => v !== value),
            heritageSelection: s.heritageSelection.filter((v) => v !== value),
          };
        }),
      removeGenderOption: (value) =>
        set((s) => {
          if (!s.genderLibrary.includes(value)) return s;
          return {
            genderLibrary: s.genderLibrary.filter((v) => v !== value),
            genderSelection: s.genderSelection.filter((v) => v !== value),
          };
        }),
      removePhysicalOption: (category, value) =>
        set((s) => {
          const list = s.physicalLibraries[category] ?? [];
          if (!list.includes(value)) return s;
          const nextList = list.filter((v) => v !== value);
          const sel = s.physicalSelections[category] ?? [];
          const nextSel = sel.filter((v) => v !== value);
          return {
            physicalLibraries: { ...s.physicalLibraries, [category]: nextList },
            physicalSelections: { ...s.physicalSelections, [category]: nextSel },
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
        const p = (persisted ?? {}) as Partial<CharacterStudioState>;
        const merged = { ...current, ...p };
        if (Array.isArray(p.referenceImageUrls)) {
          merged.referenceImageUrls = sanitizeReferenceUrlsForPersist(p.referenceImageUrls);
        }
        if (Array.isArray(merged.heritageSelection)) {
          merged.heritageSelection = merged.heritageSelection.map(
            (v) => HERITAGE_SELECTION_MIGRATION[v] ?? v
          );
        }
        if (Array.isArray(merged.heritageLibrary)) {
          merged.heritageLibrary = merged.heritageLibrary.map(
            (v) => HERITAGE_SELECTION_MIGRATION[v] ?? v
          );
        }
        return merged;
      },
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
        poses: posesForPersist(state.poses),
        physicalSelections: state.physicalSelections,
        heritageSelection: state.heritageSelection,
        genderSelection: state.genderSelection,
        facialExpressionSelection: state.facialExpressionSelection,
        currentGenerationSeed: state.currentGenerationSeed,
        seedMode: state.seedMode,
        heritageLibrary: state.heritageLibrary,
        genderLibrary: state.genderLibrary,
        facialExpressionLibrary: state.facialExpressionLibrary,
        physicalLibraries: state.physicalLibraries,
        cinematicLibraries: state.cinematicLibraries,
        referenceImageUrls: sanitizeReferenceUrlsForPersist(state.referenceImageUrls),
        selectedOnyxModelId: state.selectedOnyxModelId,
        refinementPromptOverride: state.refinementPromptOverride,
        lastUsedPrompt: state.lastUsedPrompt,
        promptSnippets: state.promptSnippets,
        galleryDensity: state.galleryDensity,
      }),
    }
  )
);
