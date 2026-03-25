import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Expand, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useTheme } from '@/shared/context/ThemeContext';
import { HybridTagBar } from '@/components/HybridTagBar';
import { CopyButton } from '@/shared/components/CopyButton';
import { Tooltip, PinnedHelpTooltip } from '@/shared/components/Tooltip';
import {
  useCharacterStudioStore,
  type WardrobeModifierCategory,
} from '@/stores/characterStudioStore';
import { buildCharacterStudioPrompt } from '@/shared/utils/characterStudioPrompt';
import {
  CHARACTER_STUDIO_BG_V4,
  ACCENT_GOLD_GRADIENT,
  CHARACTER_STUDIO_EMERALD_TEXT,
  GEM_EMERALD,
} from '@/shared/theme/Phase12DesignTokens';
import { getSlotLabel, REFERENCE_SLOT_DNA_GROUPS } from '@/shared/constants/referenceSlots';
import { getSurgicalInstructionsFromReferenceSlots } from '@/shared/utils/buildPrompt';
import {
  ART_STYLE_FLAGSHIP,
  ART_STYLE_LIBRARY,
  HERITAGE_TAGS,
  GENDER_TAGS,
  SURGICAL_PHYSICAL,
  WARDROBE_PRESETS,
  CINEMATIC_OPTIONS,
  type WardrobeCategory,
  type SurgicalPhysicalKey,
  type CinematicKey,
  type AspectRatioId,
} from '@/data/character_studio_spec';
import { saveGeneration } from '@/shared/utils/generationOutputRouter';
import { getStoryPhotoCollections, addCharacterRefToStory } from '@/shared/utils/storyPhotoCollections';
import { generateImage } from '@/shared/api/geminiImageApi';
import { saveCharacterToDb } from '@/shared/api/arcsPersistence';
import { getCharacterAlbums } from '@/shared/api/arcsVault';
import {
  addCachedGeneration,
  getCachedGenerations,
  removeCachedGenerationByUrl,
} from '@/shared/utils/generationSessionCache';
import {
  addRecentFromCharacter,
  getRecentCharacters,
  removeRecentByImageUrl,
  type RecentGeneration,
} from '@/shared/utils/recentGenerations';
import { pickGenerationSeed } from '@/shared/utils/generationSeed';
import { ModifierRibbon } from '@/components/ui/ModifierRibbon';
import { ArchiveRecallModal } from '@/components/ui/ArchiveRecallModal';

/** Gradient gold text (match Comics Studio); use with style for background. */
const goldTextStyle: React.CSSProperties = {
  background: ACCENT_GOLD_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

const chipInactive =
  'bg-white/5 border border-white/20 hover:border-amber-500/50';

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group px-3 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 border ${active ? 'text-black hover:text-emerald-400 border-amber-600/80 shadow-[0_0_10px_rgba(191,149,63,0.4)]' : chipInactive}`}
      style={active ? { background: ACCENT_GOLD_GRADIENT } : undefined}
    >
      {active ? (
        label
      ) : (
        <span className="inline-block" style={goldTextStyle}>
          {label}
        </span>
      )}
    </button>
  );
}

/** Chip with optional remove button for custom (library) tags only */
function ChipWithOptionalRemove({
  label,
  active,
  onClick,
  isCustom,
  onRemove,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  isCustom: boolean;
  onRemove?: () => void;
}) {
  return (
    <span className={isCustom ? 'inline-flex items-center gap-0.5' : undefined}>
      <Chip label={label} active={active} onClick={onClick} />
      {isCustom && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/20 text-xs leading-none"
          aria-label="Remove custom tag"
        >
          ×
        </button>
      )}
    </span>
  );
}

function MultiChip({
  options,
  selected,
  onToggle,
  libraryOptions,
  onRemoveLibrary,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  libraryOptions?: readonly string[];
  onRemoveLibrary?: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <ChipWithOptionalRemove
          key={opt}
          label={opt}
          active={selected.includes(opt)}
          onClick={() => onToggle(opt)}
          isCustom={!!libraryOptions?.includes(opt)}
          onRemove={libraryOptions?.includes(opt) ? () => onRemoveLibrary?.(opt) : undefined}
        />
      ))}
    </div>
  );
}

/** One dropdown (category) + input + Save as Tag per section */
function SectionAddToLibrary({
  categories,
  onSave,
}: {
  categories: { id: string; label: string }[];
  onSave: (categoryId: string, value: string) => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [input, setInput] = useState('');
  const handleSave = () => {
    if (input.trim() && categoryId) {
      onSave(categoryId, input.trim());
      setInput('');
    }
  };
  return (
    <div className="flex gap-2 mt-2 flex-wrap items-center">
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="bg-black/40 text-white border border-white/20 rounded px-2 py-1.5 text-xs min-w-0 flex-1 basis-24"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Add custom..."
        className="flex-1 min-w-0 bg-black/40 text-white placeholder-white/40 px-2 py-1.5 rounded text-xs border border-white/10"
      />
      <button
        type="button"
        onClick={handleSave}
        className="px-3 py-2 rounded-lg text-black text-xs font-bold border border-amber-600/50"
        style={{ background: ACCENT_GOLD_GRADIENT }}
      >
        Save as Tag
      </button>
    </div>
  );
}

export const CharacterStudio: React.FC = () => {
  const { setTheme } = useTheme();
  const store = useCharacterStudioStore();
  const [vaultPassword, setVaultPassword] = useState('');
  const [customStyleInput, setCustomStyleInput] = useState('');
  const [statusStep, setStatusStep] = useState(0);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [recallSlotIndex, setRecallSlotIndex] = useState<number | null>(null);
  const [showSaveCharacterModal, setShowSaveCharacterModal] = useState(false);
  const [saveCharacterProfileName, setSaveCharacterProfileName] = useState('');
  const [saveCharacterCastName, setSaveCharacterCastName] = useState('');
  const [saveCharacterIsEditProfile, setSaveCharacterIsEditProfile] = useState(false);
  const [saveCharacterError, setSaveCharacterError] = useState<string | null>(null);
  const [vaultProfileOptions, setVaultProfileOptions] = useState<string[]>([]);
  const [vaultProfileLoading, setVaultProfileLoading] = useState(false);
  const [recentCharacters, setRecentCharacters] = useState<RecentGeneration[]>([]);
  const [promptPanelTab, setPromptPanelTab] = useState<'auto' | 'edit' | 'refine'>('auto');
  const [snippetNameInput, setSnippetNameInput] = useState('');
  const [snippetTextInput, setSnippetTextInput] = useState('');
  const [refHoverPreview, setRefHoverPreview] = useState<{
    url: string;
    x: number;
    y: number;
  } | null>(null);

  const REFINE_SUGGEST_CHIPS = [
    'Softer lighting',
    'Different pose',
    'Closer crop',
    'Same style, different angle',
    'More dramatic shadows',
  ];

  const STATUS_BREADCRUMBS = [
    'Scanning DNA/Architecture...',
    'Contacting Onyx Vault...',
    'Crystallizing Render...',
  ];

  useEffect(() => {
    setTheme('teal');
  }, [setTheme]);

  useEffect(() => {
    setRecentCharacters(getRecentCharacters());
  }, []);

  useEffect(() => {
    if (store.generationStatus !== 'pending') return;
    const id = setInterval(() => {
      setStatusStep((s) => (s + 1) % STATUS_BREADCRUMBS.length);
    }, 2500);
    return () => clearInterval(id);
  }, [store.generationStatus]);

  const generateCharacterRef = useRef<() => Promise<void>>(async () => {});

  const dna = {
    heritage: store.heritageSelection,
    gender: store.genderSelection,
  };
  const artStyleLabel =
    store.artStyleId === 'flagship'
      ? ART_STYLE_FLAGSHIP
      : store.artStyleId;
  const hasReferenceImage = !!store.currentLiveImageUrl;
  const dnaAndPhysicalDisabled = hasReferenceImage && !store.diversifyLikeness;

  const extraParts: string[] = [
    artStyleLabel,
    ...(dnaAndPhysicalDisabled ? [] : store.heritageSelection),
    ...(dnaAndPhysicalDisabled ? [] : store.genderSelection),
    ...(dnaAndPhysicalDisabled ? [] : Object.values(store.physicalSelections).flat()),
    ...Object.values(store.wardrobeSelections).flat(),
    ...Object.values(store.cinematic).filter(Boolean),
  ].filter(Boolean);
  const compiledPrompt =
    store.vaultUnlocked && store.vaultPromptOverride.trim()
      ? store.vaultPromptOverride
      : buildCharacterStudioPrompt(store.tags, '', dna, extraParts, {
          appendOfficialRules: true,
          wardrobeModifiers: store.wardrobeModifiers,
          wardrobeSelections: store.wardrobeSelections,
        });
  const displayPrompt =
    store.currentGenerationSeed != null
      ? `${compiledPrompt}\n\nUse seed: ${store.currentGenerationSeed} for consistency with the reference image.`
      : compiledPrompt;

  const stories = getStoryPhotoCollections();
  const hasStories = stories.length > 0;

  const discardLiveCharacterImage = () => {
    const url = store.currentLiveImageUrl;
    if (url) {
      removeRecentByImageUrl(url, 'character');
      removeCachedGenerationByUrl('character', url);
      if (url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
      }
      setRecentCharacters(getRecentCharacters());
    }
    store.setCurrentLiveImageUrl(null);
  };

  const getMatchedExistingProfile = (typed: string): string | null => {
    const q = typed.trim();
    if (!q) return null;
    const lower = q.toLowerCase();
    return vaultProfileOptions.find((p) => p.toLowerCase() === lower) ?? null;
  };

  const handleGenerateCharacter = async () => {
    try {
      const st = useCharacterStudioStore.getState();
      st.setGenerationStatus('pending');
      const seed = pickGenerationSeed(st.seedMode ?? 'randomized', st.currentGenerationSeed);
      st.setCurrentGenerationSeed(seed);
      const rawRefs = st.referenceImageUrls;
      const hasAnyRefSlot = rawRefs.some((u) => Boolean(u));
      const refUrls = hasAnyRefSlot
        ? Array.from({ length: 14 }, (_, i) => rawRefs[i] ?? '')
        : st.currentLiveImageUrl
          ? [st.currentLiveImageUrl]
          : [];
      const refUrlsForApi = Array.from(
        { length: 14 },
        (_, i) => (refUrls[i] ?? '')
      );
      const hasApiRefs = refUrlsForApi.some(Boolean);
      const hasWardrobeDna = [4, 5, 6, 7, 8, 9].some((idx) => Boolean(refUrlsForApi[idx]));
      const basePrompt =
        hasApiRefs
          ? hasWardrobeDna
            ? `Art style ${artStyleLabel}: use it for lighting, palette, and illustration treatment. The person comes from Character DNA refs; their clothing, shoes, hat, bag, and accessories must match Wardrobe DNA reference images literally (same real-world garments), not a fantasy or “inspired” outfit. ${compiledPrompt}`
            : `Apply this art style to the entire image, including the subject (face, skin, hair, body). Do not keep the subject photorealistic—reinterpret the reference in the chosen style so the subject looks like a ${artStyleLabel}, not a photograph. Art style: ${artStyleLabel}. ${compiledPrompt}`
          : compiledPrompt;
      const paddedRefsForSurgical = Array.from({ length: 14 }, (_, i) => rawRefs[i] ?? '');
      const surgical = getSurgicalInstructionsFromReferenceSlots(
        hasAnyRefSlot ? paddedRefsForSurgical : refUrlsForApi
      );
      const promptForApi =
        surgical.length > 0 ? `${basePrompt}\n\n${surgical.join(' ')}` : basePrompt;
      const isVaultOverride = Boolean(st.vaultUnlocked && st.vaultPromptOverride.trim());
      const result = await generateImage({
        prompt: promptForApi,
        referenceImageUrls: refUrlsForApi,
        seed,
        aspectRatio: '9:16',
        modelId: st.selectedOnyxModelId,
        isVaultOverride,
        context: 'character',
      });
      const stAfter = useCharacterStudioStore.getState();
      if (result.ok) {
        if (stAfter.currentLiveImageUrl) {
          stAfter.setPreviousLiveSnapshot(stAfter.currentLiveImageUrl, stAfter.currentGenerationSeed);
        }
        stAfter.setLastUsedPrompt(promptForApi);
        stAfter.setCurrentLiveImageUrl(result.imageDataUrl);
        stAfter.setCurrentGenerationSeed(seed);
        stAfter.setGenerationStatus('idle');
        addCachedGeneration('character', { url: result.imageDataUrl, seed });
      } else if ('blocked' in result && result.blocked) {
        stAfter.setGenerationStatus('safety_blocked', 'Prompt restricted by safety filters. Please adjust and try again.');
      } else if ('error' in result && result.error) {
        stAfter.setGenerationStatus('error', result.error);
      } else {
        stAfter.setGenerationStatus('error', 'Unexpected response from image API.');
      }
    } catch (e) {
      useCharacterStudioStore.getState().setGenerationStatus(
        'error',
        e instanceof Error ? e.message : 'Generation failed'
      );
    }
  };

  generateCharacterRef.current = handleGenerateCharacter;

  const handleGenerateAlternate = async () => {
    try {
      const st = useCharacterStudioStore.getState();
      st.setGenerationStatus('pending');
      const seed = pickGenerationSeed(st.seedMode ?? 'randomized', st.currentGenerationSeed);
      st.setCurrentGenerationSeed(seed);
      const rawRefs = st.referenceImageUrls;
      const hasAnyRefSlot = rawRefs.some((u) => Boolean(u));
      const refUrls = hasAnyRefSlot
        ? Array.from({ length: 14 }, (_, i) => rawRefs[i] ?? '')
        : st.currentLiveImageUrl
          ? [st.currentLiveImageUrl]
          : [];
      const refUrlsForApi = Array.from(
        { length: 14 },
        (_, i) => (refUrls[i] ?? '')
      );
      const hasApiRefs = refUrlsForApi.some(Boolean);
      const hasWardrobeDna = [4, 5, 6, 7, 8, 9].some((idx) => Boolean(refUrlsForApi[idx]));
      const basePrompt =
        hasApiRefs
          ? hasWardrobeDna
            ? `Art style ${artStyleLabel}: lighting and illustration treatment only; keep Wardrobe DNA clothing literal on Character DNA person. ${compiledPrompt}`
            : `Apply this art style to the entire image, including the subject (face, skin, hair, body). Do not keep the subject photorealistic—reinterpret the reference in the chosen style so the subject looks like a ${artStyleLabel}, not a photograph. Art style: ${artStyleLabel}. ${compiledPrompt}`
          : compiledPrompt;
      const paddedRefsForSurgical = Array.from({ length: 14 }, (_, i) => rawRefs[i] ?? '');
      const surgical = getSurgicalInstructionsFromReferenceSlots(
        hasAnyRefSlot ? paddedRefsForSurgical : refUrlsForApi
      );
      const promptForApi =
        surgical.length > 0
          ? `${basePrompt}\n\n${surgical.join(' ')} Alternate pose, same character.`
          : `${basePrompt} Alternate pose, same character.`;
      const isVaultOverride = Boolean(st.vaultUnlocked && st.vaultPromptOverride.trim());
      const result = await generateImage({
        prompt: promptForApi,
        referenceImageUrls: refUrlsForApi,
        seed,
        aspectRatio: '9:16',
        modelId: st.selectedOnyxModelId,
        isVaultOverride,
        context: 'character',
      });
      const stAfter = useCharacterStudioStore.getState();
      if (result.ok) {
        if (stAfter.currentLiveImageUrl) {
          stAfter.setPreviousLiveSnapshot(stAfter.currentLiveImageUrl, stAfter.currentGenerationSeed);
        }
        stAfter.setLastUsedPrompt(promptForApi);
        stAfter.setCurrentLiveImageUrl(result.imageDataUrl);
        stAfter.setCurrentGenerationSeed(seed);
        stAfter.setGenerationStatus('idle');
        addCachedGeneration('character', { url: result.imageDataUrl, seed });
      } else if ('blocked' in result && result.blocked) {
        stAfter.setGenerationStatus('safety_blocked', 'Prompt restricted by safety filters. Please adjust and try again.');
      } else if ('error' in result && result.error) {
        stAfter.setGenerationStatus('error', result.error);
      } else {
        stAfter.setGenerationStatus('error', 'Unexpected response from image API.');
      }
    } catch (e) {
      useCharacterStudioStore.getState().setGenerationStatus(
        'error',
        e instanceof Error ? e.message : 'Generation failed'
      );
    }
  };

  const handleRefineCharacter = async () => {
    const st0 = useCharacterStudioStore.getState();
    const live = st0.currentLiveImageUrl;
    const refinement = st0.refinementPromptOverride.trim();
    if (!live || !refinement) return;
    try {
      st0.setGenerationStatus('pending');
      const seed = pickGenerationSeed(st0.seedMode ?? 'randomized', st0.currentGenerationSeed);
      st0.setCurrentGenerationSeed(seed);
      const refUrlsForApi = Array.from({ length: 14 }, (_, i) => (i === 0 ? live : ''));
      const promptForApi = `Apply this art style to the entire image. Art style: ${artStyleLabel}. Refine this character image according to these instructions while preserving identity and overall style: ${refinement}`;
      const result = await generateImage({
        prompt: promptForApi,
        referenceImageUrls: refUrlsForApi,
        seed,
        aspectRatio: '9:16',
        modelId: st0.selectedOnyxModelId,
        isVaultOverride: false,
        context: 'character',
      });
      const stAfter = useCharacterStudioStore.getState();
      if (result.ok) {
        if (stAfter.currentLiveImageUrl) {
          stAfter.setPreviousLiveSnapshot(stAfter.currentLiveImageUrl, stAfter.currentGenerationSeed);
        }
        stAfter.setLastUsedPrompt(promptForApi);
        stAfter.setCurrentLiveImageUrl(result.imageDataUrl);
        stAfter.setCurrentGenerationSeed(seed);
        stAfter.setGenerationStatus('idle');
        addCachedGeneration('character', { url: result.imageDataUrl, seed });
      } else if ('blocked' in result && result.blocked) {
        stAfter.setGenerationStatus('safety_blocked', 'Prompt restricted by safety filters. Please adjust and try again.');
      } else if ('error' in result && result.error) {
        stAfter.setGenerationStatus('error', result.error);
      } else {
        stAfter.setGenerationStatus('error', 'Unexpected response from image API.');
      }
    } catch (e) {
      useCharacterStudioStore.getState().setGenerationStatus(
        'error',
        e instanceof Error ? e.message : 'Generation failed'
      );
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'Enter' && store.generationStatus !== 'pending') {
        e.preventDefault();
        void generateCharacterRef.current();
      }
      if (e.key === 'Escape') {
        setShowZoomModal(false);
        setShowSaveCharacterModal(false);
        setRecallSlotIndex(null);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store.generationStatus]);

  const openSaveCharacterModal = (isEditProfile: boolean) => {
    setSaveCharacterProfileName('');
    setSaveCharacterCastName('');
    setSaveCharacterIsEditProfile(isEditProfile);
    setSaveCharacterError(null);
    setShowSaveCharacterModal(true);

    if (isEditProfile) {
      setVaultProfileLoading(true);
      getCharacterAlbums()
        .then((albums) => setVaultProfileOptions(albums.map((a) => a.profileName)))
        .catch(() => setVaultProfileOptions([]))
        .finally(() => setVaultProfileLoading(false));
    }
  };

  const handleSaveCharacterModalConfirm = async () => {
    const typedProfileDisplay = saveCharacterProfileName.trim();
    if (!typedProfileDisplay) {
      return;
    }

    if (saveCharacterIsEditProfile) {
      const matched = getMatchedExistingProfile(typedProfileDisplay);
      if (!matched) {
        setSaveCharacterError('Select an existing profile from the dropdown. Use “Save New Character” to create a new one.');
        return;
      }
    }

    const matchedExistingProfile = saveCharacterIsEditProfile
      ? getMatchedExistingProfile(typedProfileDisplay)!
      : typedProfileDisplay;

    const isUnnamed = matchedExistingProfile.toLowerCase() === 'unnamed';
    const baseNameForId = isUnnamed ? 'Unnamed' : matchedExistingProfile;
    const profileNameForDb = isUnnamed ? undefined : matchedExistingProfile;
    const url = store.currentLiveImageUrl;
    if (!url) {
      return;
    }
    const castName = saveCharacterCastName.trim() || undefined;
    try {
      const result = await saveCharacterToDb(store, baseNameForId, profileNameForDb, castName);
      if (result.ok && result.id != null && result.imageUrl != null) {
        if (saveCharacterIsEditProfile && store.selectedPoseId) {
          store.updatePose(store.selectedPoseId, { imageUrl: result.imageUrl });
        }
        saveGeneration('character', result.imageUrl, store.currentGenerationSeed ?? undefined, {
          profileName: profileNameForDb,
        });
        addCachedGeneration('character', {
          url: result.imageUrl,
          seed: store.currentGenerationSeed ?? undefined,
        });
        addRecentFromCharacter({
          id: result.id,
          image_url: result.imageUrl,
          profile_name: matchedExistingProfile,
          cast_name: castName ?? null,
          seed: store.currentGenerationSeed ?? null,
        });
        setRecentCharacters(getRecentCharacters());
        setSaveCharacterError(null);
        setShowSaveCharacterModal(false);
      } else if (!result.ok && result.error === 'Supabase not configured') {
        if (saveCharacterIsEditProfile && store.selectedPoseId) {
          store.updatePose(store.selectedPoseId, { imageUrl: url });
        }
        saveGeneration('character', url, store.currentGenerationSeed ?? undefined, {
          profileName: profileNameForDb,
        });
        addCachedGeneration('character', { url, seed: store.currentGenerationSeed ?? undefined });
        setSaveCharacterError('Supabase not configured — saved in this browser only (will not sync).');
        setShowSaveCharacterModal(false);
      } else if (result.ok) {
        setSaveCharacterError(null);
        setShowSaveCharacterModal(false);
      } else {
        setSaveCharacterError(result.error ?? 'Save failed');
        if (result.error && result.error !== 'Supabase not configured') {
          store.setGenerationStatus('error', result.error);
        }
      }
    } catch (err) {
      setShowSaveCharacterModal(false);
      store.setGenerationStatus('error', err instanceof Error ? err.message : String(err));
    }
  };

  const handleSaveNewPose = () => {
    const url = store.currentLiveImageUrl;
    if (url) {
      store.addPose({ imageUrl: url });
    }
  };

  const handleCastInStory = (storyId: string) => {
    const url = store.currentLiveImageUrl;
    if (url) addCharacterRefToStory(storyId, url);
  };

  const toggleHeritage = (value: string) => {
    const next = store.heritageSelection.includes(value)
      ? store.heritageSelection.filter((v) => v !== value)
      : [...store.heritageSelection, value];
    store.setHeritageSelection(next);
  };

  const toggleGender = (value: string) => {
    const next = store.genderSelection.includes(value)
      ? store.genderSelection.filter((v) => v !== value)
      : [...store.genderSelection, value];
    store.setGenderSelection(next);
  };

  const togglePhysical = (category: SurgicalPhysicalKey, value: string) => {
    const current = store.physicalSelections[category] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    store.setPhysicalSelection(category, next);
  };

  const toggleWardrobe = (category: WardrobeCategory, value: string) => {
    const current = store.wardrobeSelections[category] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    store.setWardrobeSelection(category, next);
  };

  return (
    <>
    <div
      className="flex flex-col min-h-screen p-4 animate-fade-in"
      style={{ background: CHARACTER_STUDIO_BG_V4 }}
    >
      {/* Header: gold strip (Comic Studio style), title in emerald gradient */}
      <header
        className="flex-shrink-0 flex items-center justify-center w-full mb-3 rounded-lg px-4 py-2"
        style={{ background: ACCENT_GOLD_GRADIENT }}
      >
        <h1
          className="text-center text-2xl font-black text-transparent bg-clip-text tracking-tight truncate min-w-0"
          style={{ background: CHARACTER_STUDIO_EMERALD_TEXT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          REFERENCE CHARACTER STUDIO
        </h1>
      </header>

      {/* Main content: left full height + scroll; center+right capped height + 100px */}
      <div className="flex gap-3 w-full flex-1 min-h-0">
        <div className="flex-[0_0_34%] min-w-0 h-[calc(85vh+100px)] flex flex-col gap-3 flex-shrink-0">
          {/* Reference panel — own card + scrollbar */}
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md flex flex-col min-h-[200px] max-h-[min(46vh,440px)] flex-shrink-0 overflow-hidden shadow-lg shadow-black/20">
            <div className="p-2 flex flex-col min-h-0 flex-1 overflow-hidden">
            <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-2 shrink-0" style={goldTextStyle}>
              Reference images
            </h2>
            <Tooltip
              variant="character"
              content="Bulk add: images fill empty slots in order (slots 1–4 Identity, 5–10 Wardrobe, 11–14 Atmospheric). Per-slot Upload still assigns a specific slot."
              side="bottom"
            >
              <label className="flex rounded-lg border border-dashed border-amber-500/50 bg-black/25 px-2 py-2 mb-2 cursor-pointer hover:border-amber-400/70 hover:bg-black/35 transition-colors shrink-0">
                <span className="text-[10px] font-medium text-emerald-200/90">
                  Add image(s) to next empty slots ({Array.from({ length: 14 }, (_, i) => store.referenceImageUrls[i]).filter(Boolean).length}/14)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files?.length) return;
                    const next = Array.from({ length: 14 }, (_, i) => store.referenceImageUrls[i] ?? '');
                    let slot = 0;
                    let lastUrl: string | null = null;
                    for (const file of Array.from(files)) {
                      if (!file.type.startsWith('image/')) continue;
                      while (slot < 14 && next[slot]) slot++;
                      if (slot >= 14) break;
                      const url = URL.createObjectURL(file);
                      next[slot] = url;
                      lastUrl = url;
                      slot++;
                    }
                    store.setReferenceImageUrls(next);
                    if (lastUrl) store.setCurrentLiveImageUrl(lastUrl);
                    e.target.value = '';
                  }}
                />
              </label>
            </Tooltip>
            <div className="flex flex-wrap gap-2 mb-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  store.clearAllReferenceSlots();
                  store.setCurrentLiveImageUrl(null);
                }}
                className="px-2 py-1 rounded-lg text-[10px] border border-white/20 hover:bg-white/10"
              >
                Clear all slots
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const clipItems = await navigator.clipboard.read();
                    for (const item of clipItems) {
                      for (const type of item.types) {
                        if (type.startsWith('image/')) {
                          const blob = await item.getType(type);
                          const url = URL.createObjectURL(blob);
                          const slots = Array.from({ length: 14 }, (_, i) => store.referenceImageUrls[i]);
                          const firstEmpty = slots.findIndex((u) => !u);
                          if (firstEmpty >= 0) {
                            store.setReferenceImageAt(firstEmpty, url);
                            store.setCurrentLiveImageUrl(url);
                          }
                          return;
                        }
                      }
                    }
                  } catch {
                    store.setGenerationStatus('error', 'Could not paste image from clipboard (permission or no image).');
                  }
                }}
                className="px-2 py-1 rounded-lg text-[10px] border border-amber-500/40 hover:bg-amber-500/10"
              >
                Paste in first empty
              </button>
            </div>
            <div className="mt-1 space-y-2 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              {!Array.from({ length: 14 }, (_, i) => store.referenceImageUrls[i]).some(Boolean) && (
                <p className="text-xs text-amber-200/70 mb-2">
                  No references yet. Upload via a slot below or paste an image.
                </p>
              )}
              {REFERENCE_SLOT_DNA_GROUPS.map((group) => (
                <div key={group.id}>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 mb-1">
                    {group.label} <span className="font-normal opacity-80">({group.subtitle})</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: group.end - group.start + 1 }, (_, j) => {
                      const i = group.start + j;
                      const url = store.referenceImageUrls[i];
                      return (
                        <div key={i} className="relative group flex flex-col items-center gap-0.5">
                          <div
                            className={`relative w-10 h-10 rounded bg-black/40 flex items-center justify-center overflow-hidden ${
                              url
                                ? 'border-2 border-amber-500/60'
                                : 'border-2 border-dashed border-white/25'
                            }`}
                            onMouseEnter={
                              url
                                ? (e) =>
                                    setRefHoverPreview({
                                      url,
                                      x: e.clientX + 12,
                                      y: e.clientY + 12,
                                    })
                                : undefined
                            }
                            onMouseMove={
                              url
                                ? (e) =>
                                    setRefHoverPreview({
                                      url,
                                      x: e.clientX + 12,
                                      y: e.clientY + 12,
                                    })
                                : undefined
                            }
                            onMouseLeave={url ? () => setRefHoverPreview(null) : undefined}
                          >
                            {url ? (
                              <>
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    store.removeReferenceImage(i);
                                    if (store.currentLiveImageUrl === url) {
                                      const next = (store.referenceImageUrls as string[]).filter(Boolean);
                                      store.setCurrentLiveImageUrl(next[0] ?? null);
                                    }
                                  }}
                                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100"
                                >
                                  ×
                                </button>
                              </>
                            ) : (
                              <span className="text-[8px] text-white/40">{i + 1}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-white/70">{getSlotLabel(i)}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setRecallSlotIndex(i)}
                              className="text-[10px] text-amber-400/90 hover:text-amber-300"
                            >
                              Archive
                            </button>
                            <label className="text-[10px] text-amber-400/90 hover:text-amber-300 cursor-pointer">
                              Upload
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const url = URL.createObjectURL(file);
                                  store.setReferenceImageAt(i, url);
                                  store.setCurrentLiveImageUrl(url);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {hasReferenceImage && (
              <label className="flex items-center gap-2 cursor-pointer mt-2 shrink-0">
                <input
                  type="checkbox"
                  checked={store.diversifyLikeness}
                  onChange={(e) => store.setDiversifyLikeness(e.target.checked)}
                  className="rounded border-amber-500/50"
                />
                <span className="text-xs inline-block" style={goldTextStyle}>Diversify Likeness</span>
              </label>
            )}
            </div>
          </div>

          {/* Tags panel — separate card, full remaining height + scroll */}
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md flex flex-1 min-h-0 flex-col overflow-hidden shadow-lg shadow-black/20">
            <h2 className="text-sm font-bold uppercase tracking-widest px-3 pt-2 pb-1 shrink-0 border-b border-white/10" style={goldTextStyle}>
              Tags & style
            </h2>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {/* Art Style Engine */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Art Style Engine
              </h2>
              <div className="space-y-2">
                <Chip
                  label={ART_STYLE_FLAGSHIP}
                  active={store.artStyleId === 'flagship'}
                  onClick={() => store.setArtStyle('flagship')}
                />
                <div className="flex flex-wrap gap-2">
                  {ART_STYLE_LIBRARY.map((opt) => (
                    <Chip
                      key={opt}
                      label={opt}
                      active={store.artStyleId === opt}
                      onClick={() =>
                        store.setArtStyle(
                          store.artStyleId === opt ? 'flagship' : opt
                        )
                      }
                    />
                  ))}
                  {store.customStyles.map((opt) => (
                    <ChipWithOptionalRemove
                      key={opt}
                      label={opt}
                      active={store.artStyleId === opt}
                      onClick={() =>
                        store.setArtStyle(
                          store.artStyleId === opt ? 'flagship' : opt
                        )
                      }
                      isCustom
                      onRemove={() => store.removeCustomStyle(opt)}
                    />
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={customStyleInput}
                    onChange={(e) => setCustomStyleInput(e.target.value)}
                    placeholder="Custom style..."
                    className="flex-1 bg-black/40 text-white placeholder-white/40 px-3 py-2 rounded-lg border border-white/10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customStyleInput.trim()) {
                        store.addCustomStyle(customStyleInput.trim());
                        store.setTags([
                          ...store.tags,
                          {
                            id: crypto.randomUUID(),
                            text: customStyleInput.trim().replace(/\s+/g, '-').toLowerCase(),
                            polarity: 'positive',
                          },
                        ]);
                        setCustomStyleInput('');
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-black text-xs font-bold border border-amber-600/50"
                    style={{ background: ACCENT_GOLD_GRADIENT }}
                  >
                    Save as Tag
                  </button>
                </div>
              </div>
            </section>

            {/* DNA Engine */}
            <section
              className={dnaAndPhysicalDisabled ? 'opacity-50 pointer-events-none' : ''}
              aria-disabled={dnaAndPhysicalDisabled}
            >
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                DNA Engine
              </h2>
              {dnaAndPhysicalDisabled && (
                <p className="text-xs text-white/60 mb-2">Uploaded image is absolute reference. Enable &quot;Diversify Likeness&quot; to use tags.</p>
              )}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs mb-2 inline-block" style={goldTextStyle}>Heritage</h3>
                  <div className="flex flex-wrap gap-2">
                    {[...HERITAGE_TAGS, ...store.heritageLibrary].map((tag) => (
                      <ChipWithOptionalRemove
                        key={tag}
                        label={tag}
                        active={store.heritageSelection.includes(tag)}
                        onClick={() => toggleHeritage(tag)}
                        isCustom={store.heritageLibrary.includes(tag)}
                        onRemove={store.heritageLibrary.includes(tag) ? () => store.removeHeritageOption(tag) : undefined}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs mb-2 inline-block" style={goldTextStyle}>Gender</h3>
                  <div className="flex flex-wrap gap-2">
                    {[...GENDER_TAGS, ...store.genderLibrary].map((tag) => (
                      <ChipWithOptionalRemove
                        key={tag}
                        label={tag}
                        active={store.genderSelection.includes(tag)}
                        onClick={() => toggleGender(tag)}
                        isCustom={store.genderLibrary.includes(tag)}
                        onRemove={store.genderLibrary.includes(tag) ? () => store.removeGenderOption(tag) : undefined}
                      />
                    ))}
                  </div>
                </div>
                <SectionAddToLibrary
                  categories={[{ id: 'Heritage', label: 'Heritage' }, { id: 'Gender', label: 'Gender' }]}
                  onSave={(cat, v) => cat === 'Heritage' ? store.addHeritageOption(v) : store.addGenderOption(v)}
                />
              </div>
            </section>

            {/* Surgical Physical */}
            <section
              className={dnaAndPhysicalDisabled ? 'opacity-50 pointer-events-none' : ''}
              aria-disabled={dnaAndPhysicalDisabled}
            >
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Surgical Physical
              </h2>
              <div className="space-y-4">
                {(Object.keys(SURGICAL_PHYSICAL) as SurgicalPhysicalKey[]).map(
                  (key) => (
                    <div key={key}>
                      <h3 className="text-xs mb-2 inline-block" style={goldTextStyle}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <MultiChip
                        options={[...SURGICAL_PHYSICAL[key], ...(store.physicalLibraries[key] ?? [])]}
                        selected={store.physicalSelections[key] ?? []}
                        onToggle={(v) => togglePhysical(key, v)}
                        libraryOptions={store.physicalLibraries[key]}
                        onRemoveLibrary={(v) => store.removePhysicalOption(key, v)}
                      />
                    </div>
                  )
                )}
                <SectionAddToLibrary
                  categories={(Object.keys(SURGICAL_PHYSICAL) as SurgicalPhysicalKey[]).map((k) => ({
                    id: k,
                    label: k.replace(/([A-Z])/g, ' $1').trim(),
                  }))}
                  onSave={(cat, v) => store.addPhysicalOption(cat, v)}
                />
              </div>
            </section>

            {/* Wardrobe Engine */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Wardrobe Engine
              </h2>
              <div className="space-y-4">
                {(Object.keys(WARDROBE_PRESETS) as WardrobeCategory[]).map(
                  (cat) => (
                    <div key={cat}>
                      <WardrobeRow
                        category={cat}
                        presets={WARDROBE_PRESETS[cat]}
                        selected={store.wardrobeSelections[cat] ?? []}
                        library={store.wardrobeLibraries[cat] ?? []}
                        onToggle={(v) => toggleWardrobe(cat, v)}
                        onRemoveLibrary={(v) => store.removeWardrobeOption(cat, v)}
                      />
                      {/* Modifier ribbon directly under this category's tags (except style and material) */}
                      {(['tops', 'bottoms', 'outerwear', 'accessories', 'hats', 'glasses'] as WardrobeModifierCategory[]).includes(cat as WardrobeModifierCategory) && (
                        <div className="mt-2">
                          <ModifierRibbon
                            categoryLabel={cat.charAt(0).toUpperCase() + cat.slice(1)}
                            selectedColor={store.wardrobeModifiers[cat as WardrobeModifierCategory]?.color ?? '#888888'}
                            material={store.wardrobeModifiers[cat as WardrobeModifierCategory]?.material ?? 'matte'}
                            tagLabel={(store.wardrobeSelections[cat] ?? []).join(', ') || undefined}
                            onColorChange={(hex) => store.setWardrobeModifierColor(cat as WardrobeModifierCategory, hex)}
                            onMaterialChange={(material) =>
                              store.setWardrobeModifierMaterial(cat as WardrobeModifierCategory, material)
                            }
                            variant="emerald"
                          />
                        </div>
                      )}
                    </div>
                  )
                )}
                <button
                  type="button"
                  onClick={() => store.resetWardrobeModifiers()}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-amber-500/40 hover:bg-amber-500/20"
                >
                  <span className="inline-block" style={goldTextStyle}>Clear colors & materials</span>
                </button>
              </div>
              <SectionAddToLibrary
                categories={(Object.keys(WARDROBE_PRESETS) as WardrobeCategory[]).map((c) => ({
                  id: c,
                  label: c.replace(/([A-Z])/g, ' $1').trim(),
                }))}
                onSave={(cat, v) => store.addWardrobeOption(cat as WardrobeCategory, v)}
              />
            </section>

            {/* Cinematic Suite (no Shot tags per v4) */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Cinematic Suite
              </h2>
              <div className="space-y-4">
                {(Object.keys(CINEMATIC_OPTIONS) as CinematicKey[]).map(
                  (key) => (
                    <div key={key}>
                      <h3 className="text-xs mb-2 inline-block" style={goldTextStyle}>{key}</h3>
                      <div className="flex flex-wrap gap-2">
                        {[...CINEMATIC_OPTIONS[key], ...(store.cinematicLibraries[key] ?? [])].map((opt) => (
                          <ChipWithOptionalRemove
                            key={opt}
                            label={opt}
                            active={(store.cinematic[key] || '') === opt}
                            onClick={() => store.setCinematic(key, opt)}
                            isCustom={(store.cinematicLibraries[key] ?? []).includes(opt)}
                            onRemove={(store.cinematicLibraries[key] ?? []).includes(opt) ? () => store.removeCinematicOption(key, opt) : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  )
                )}
                <SectionAddToLibrary
                  categories={(Object.keys(CINEMATIC_OPTIONS) as CinematicKey[]).map((k) => ({ id: k, label: k }))}
                  onSave={(cat, v) => store.addCinematicOption(cat as CinematicKey, v)}
                />
              </div>
            </section>

            {/* Onyx Vault — unlock only; edit prompt in center Edit tab */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                The Onyx Vault
              </h2>
              {!store.vaultUnlocked ? (
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    placeholder="Password"
                    className="flex-1 bg-black/40 text-white placeholder-white/40 px-3 py-2 rounded-lg border border-white/10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => store.unlockVault(vaultPassword)}
                    className="px-3 py-2 rounded-lg text-black text-xs font-bold border border-amber-600/50 min-w-[72px]"
                    style={{ background: ACCENT_GOLD_GRADIENT }}
                  >
                    Unlock
                  </button>
                </div>
              ) : (
                <p className="text-xs text-white/70">
                  Unlocked. Edit the full prompt in <strong className="text-amber-300/90">Live Prompt → Edit</strong> tab.
                </p>
              )}
            </section>

            {/* Tag bar */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Prompt Tags
              </h2>
              <HybridTagBar
                tags={store.tags}
                setTags={store.setTags}
              />
            </section>
            </div>
          </div>
        </div>

        {/* Center + Right wrapper: capped height + 100px (85vh + 100px) */}
        <div className="flex-1 flex gap-3 min-w-0 min-h-0 max-h-[calc(85vh+100px)] overflow-hidden">
        {/* Center: full width, Live Prompt (+100px height) then Reference Image Generation (+100px down) then Add Pose + pills */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
          <div className="flex-shrink-0 rounded-xl border border-white/10 bg-black/30 p-3 min-h-[480px] flex flex-col">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-base font-bold uppercase tracking-widest" style={goldTextStyle}>
                Live Prompt
              </h2>
              {store.lastUsedPrompt ? (
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(store.lastUsedPrompt);
                    store.setRefinementPromptOverride(
                      store.refinementPromptOverride
                        ? `${store.refinementPromptOverride}\n${store.lastUsedPrompt.slice(0, 200)}…`
                        : store.lastUsedPrompt.slice(0, 500)
                    );
                    setPromptPanelTab('refine');
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-200/90 hover:bg-emerald-500/10 truncate max-w-[140px]"
                  title="Copy full prompt to clipboard; append summary to Refine tab"
                >
                  Last prompt
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2 mb-2">
              {(
                [
                  { id: 'auto' as const, label: 'Prompt' },
                  { id: 'edit' as const, label: 'Edit' },
                  { id: 'refine' as const, label: 'Refine' },
                ]
              ).map(({ id, label }) => (
                <span key={id} className="inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setPromptPanelTab(id)}
                    className={`px-3 py-1.5 rounded-t-lg text-sm font-medium border-b-2 transition-colors ${
                      promptPanelTab === id
                        ? 'border-amber-500 text-amber-200 bg-black/40'
                        : 'border-transparent text-white/60 hover:text-white/90'
                    }`}
                  >
                    {label}
                  </button>
                  <PinnedHelpTooltip variant="character" title={label}>
                    {id === 'auto' &&
                      'Read-only compiled prompt from tags and references. Use Generate (⌘/Ctrl+Enter) to run.'}
                    {id === 'edit' &&
                      'Unlock the vault with password, then edit the raw prompt override. Overrides tag-built prompt when non-empty.'}
                    {id === 'refine' &&
                      'Describe changes to the current live image; Refine sends it as reference. Use Suggest chips or type freely.'}
                  </PinnedHelpTooltip>
                </span>
              ))}
            </div>
            {promptPanelTab === 'auto' && (
              <div className="bg-black/60 p-3 rounded-lg font-mono text-sm text-emerald-100/85 break-words flex-1 min-h-[360px] overflow-y-auto custom-scrollbar transition-opacity duration-200">
                {displayPrompt || '// Prompt is empty...'}
              </div>
            )}
            {promptPanelTab === 'edit' && (
              <div className="flex-1 flex flex-col gap-2 min-h-[360px]">
                {!store.vaultUnlocked ? (
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={vaultPassword}
                      onChange={(e) => setVaultPassword(e.target.value)}
                      placeholder="Vault password"
                      className="flex-1 bg-black/40 text-white placeholder-white/40 px-3 py-2 rounded-lg border border-white/10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => store.unlockVault(vaultPassword)}
                      className="px-3 py-2 rounded-lg text-black text-xs font-bold border border-amber-600/50"
                      style={{ background: ACCENT_GOLD_GRADIENT }}
                    >
                      Unlock
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-xs text-white/70 mb-1 block">Model</span>
                      <select
                        value={store.selectedOnyxModelId}
                        onChange={(e) => store.setSelectedOnyxModelId(e.target.value as 'flash' | 'pro')}
                        className="w-full bg-black/60 text-white border border-amber-500/20 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="flash">Nano Banana 2 (Speed)</option>
                        <option value="pro">Nano Banana Pro (Detail)</option>
                      </select>
                    </div>
                    <textarea
                      value={store.vaultPromptOverride}
                      onChange={(e) => store.setVaultPromptOverride(e.target.value)}
                      placeholder="Override prompt…"
                      className="w-full flex-1 min-h-[200px] bg-black/60 text-white/90 p-3 rounded-lg border border-amber-500/20 text-sm font-mono resize-y"
                    />
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => store.setVaultPromptOverride('')}
                        className="px-2 py-1 text-xs rounded border border-amber-500/40"
                      >
                        Reset to tags
                      </button>
                      <select
                        className="bg-black/50 text-white text-xs rounded border border-white/20 px-2 py-1 max-w-[160px]"
                        defaultValue=""
                        onChange={(e) => {
                          const s = store.promptSnippets.find((x) => x.id === e.target.value);
                          if (s) {
                            store.setVaultPromptOverride(
                              `${store.vaultPromptOverride}${store.vaultPromptOverride && !store.vaultPromptOverride.endsWith('\n') ? '\n' : ''}${s.text}`
                            );
                          }
                          e.target.value = '';
                        }}
                      >
                        <option value="">Insert snippet…</option>
                        {store.promptSnippets.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={snippetNameInput}
                        onChange={(e) => setSnippetNameInput(e.target.value)}
                        placeholder="Snippet name"
                        className="w-24 bg-black/40 text-white text-xs px-2 py-1 rounded border border-white/15"
                      />
                      <input
                        type="text"
                        value={snippetTextInput}
                        onChange={(e) => setSnippetTextInput(e.target.value)}
                        placeholder="Snippet text"
                        className="flex-1 min-w-[100px] bg-black/40 text-white text-xs px-2 py-1 rounded border border-white/15"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          store.addPromptSnippet(snippetNameInput, snippetTextInput);
                          setSnippetNameInput('');
                          setSnippetTextInput('');
                        }}
                        className="text-xs px-2 py-1 rounded border border-amber-500/40"
                      >
                        Save snippet
                      </button>
                    </div>
                    {store.promptSnippets.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {store.promptSnippets.map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10"
                          >
                            {s.name}
                            <button
                              type="button"
                              className="text-red-300 hover:text-red-100"
                              onClick={() => store.removePromptSnippet(s.id)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {promptPanelTab === 'refine' && (
              <div className="flex-1 flex flex-col gap-2 min-h-[360px]">
                {!store.currentLiveImageUrl ? (
                  <p className="text-sm text-amber-200/80">Generate or load an image first, then describe refinements here.</p>
                ) : (
                  <>
                    <textarea
                      value={store.refinementPromptOverride}
                      onChange={(e) => store.setRefinementPromptOverride(e.target.value)}
                      placeholder="Type a refinement or use Suggest chips below."
                      className="w-full flex-1 min-h-[160px] bg-black/60 text-white/90 p-3 rounded-lg border border-amber-500/20 text-sm resize-y"
                    />
                    <div className="flex flex-wrap gap-1">
                      {REFINE_SUGGEST_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() =>
                            store.setRefinementPromptOverride(
                              store.refinementPromptOverride
                                ? `${store.refinementPromptOverride}, ${chip}`
                                : chip
                            )
                          }
                          className="text-xs px-2 py-1 rounded-full border border-white/20 hover:border-amber-500/50"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1.5 rounded-lg text-xs border border-white/20 opacity-50 cursor-not-allowed"
                        title="Image describe API — coming soon"
                      >
                        NEW
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRefineCharacter()}
                        disabled={
                          store.generationStatus === 'pending' ||
                          !store.refinementPromptOverride.trim()
                        }
                        className="px-4 py-1.5 rounded-lg text-xs font-bold text-black border border-amber-600/50 disabled:opacity-50"
                        style={{ background: ACCENT_GOLD_GRADIENT }}
                      >
                        Refine
                      </button>
                      <select
                        className="bg-black/50 text-white text-xs rounded border border-white/20 px-2 py-1"
                        defaultValue=""
                        onChange={(e) => {
                          const s = store.promptSnippets.find((x) => x.id === e.target.value);
                          if (s) {
                            store.setRefinementPromptOverride(
                              `${store.refinementPromptOverride}${store.refinementPromptOverride ? ', ' : ''}${s.text}`
                            );
                          }
                          e.target.value = '';
                        }}
                      >
                        <option value="">Insert snippet</option>
                        {store.promptSnippets.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
              <CopyButton text={displayPrompt} labelStyle={goldTextStyle} />
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-full border border-amber-500/30 bg-black/20 hover:border-amber-500/60 transition-all group ml-auto">
                <span className="text-xs font-bold tracking-widest inline-block" style={goldTextStyle}>
                  DNA LOCK
                </span>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => store.setDnaLock(!store.dnaLock)}
                  onKeyDown={(e) => e.key === 'Enter' && store.setDnaLock(!store.dnaLock)}
                  className="w-10 h-5 rounded-full p-0.5 transition-colors duration-300 bg-white/10"
                  style={store.dnaLock ? { background: ACCENT_GOLD_GRADIENT } : undefined}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
                      store.dnaLock ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Status breadcrumb: cycle during generation; safety message when blocked */}
          <div
            className="flex-shrink-0 rounded-lg border border-white/10 bg-black/30 px-3 py-2 min-h-[2.5rem] flex items-center"
            data-status={store.generationStatus === 'pending' ? STATUS_BREADCRUMBS[statusStep].replace(/\s+/g, '-').toLowerCase() : undefined}
          >
            <span className="text-xs font-mono" style={goldTextStyle}>
              {store.generationStatus === 'safety_blocked'
                ? 'Prompt restricted by safety filters. Please adjust and try again'
                : store.generationStatus === 'error' && store.generationStatusMessage
                  ? store.generationStatusMessage
                  : store.generationStatus === 'pending'
                    ? STATUS_BREADCRUMBS[statusStep]
                    : '\u00A0'}
            </span>
          </div>

          {/* Reference Image Generation: same gap as gold bar to panels (gap-3); min height so it keeps space */}
          <div className="flex-1 min-h-[280px] rounded-2xl border border-white/10 bg-black/40 flex flex-col overflow-hidden flex-shrink-0">
            <h2 className="text-base font-bold uppercase tracking-widest px-4 pt-3 pb-1 flex-shrink-0" style={goldTextStyle}>
              Reference Image Generation
            </h2>
            <div className="flex-shrink-0 px-2 pb-2 flex flex-wrap items-center justify-end gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/90">
                Thumbnail size
              </span>
              <button
                type="button"
                aria-pressed={store.galleryDensity === 'compact'}
                onClick={() => store.setGalleryDensity('compact')}
                className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wide border-2 transition-all ${
                  store.galleryDensity === 'compact'
                    ? 'text-emerald-950 border-amber-500 shadow-md'
                    : 'text-emerald-200/80 border-emerald-700/50 hover:border-amber-500/60 bg-black/30'
                }`}
                style={
                  store.galleryDensity === 'compact'
                    ? { background: ACCENT_GOLD_GRADIENT }
                    : undefined
                }
              >
                Compact
              </button>
              <button
                type="button"
                aria-pressed={store.galleryDensity === 'comfortable'}
                onClick={() => store.setGalleryDensity('comfortable')}
                className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wide border-2 transition-all ${
                  store.galleryDensity === 'comfortable'
                    ? 'text-emerald-950 border-amber-500 shadow-md'
                    : 'text-emerald-200/80 border-emerald-700/50 hover:border-amber-500/60 bg-black/30'
                }`}
                style={
                  store.galleryDensity === 'comfortable'
                    ? { background: ACCENT_GOLD_GRADIENT }
                    : undefined
                }
              >
                Comfortable
              </button>
            </div>
            {((recentCharacters.length > 0) || (getCachedGenerations('character').length > 0)) && (
              <div className="flex-shrink-0 px-2 pb-2 flex flex-col gap-1.5">
                {recentCharacters.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <span className="text-[10px] uppercase tracking-wider text-white/60">Recent (saved)</span>
                    {recentCharacters.map((item) => (
                      <Tooltip variant="character" key={item.id} content={item.displayName ?? item.profileName ?? 'Character'}>
                        <button
                          type="button"
                          onClick={() => {
                            store.setCurrentLiveImageUrl(item.imageUrl);
                            if (item.seed != null) store.setCurrentGenerationSeed(item.seed);
                          }}
                          className={`flex-shrink-0 rounded border border-amber-500/30 overflow-hidden hover:border-amber-500/60 transition-transform hover:scale-110 hover:z-10 ${
                            store.galleryDensity === 'compact' ? 'w-10 h-10' : 'w-14 h-14'
                          }`}
                        >
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                )}
                {getCachedGenerations('character').length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <span className="text-[10px] uppercase tracking-wider text-white/60">This session</span>
                    {getCachedGenerations('character').map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          store.setCurrentLiveImageUrl(item.url);
                          if (item.seed != null) store.setCurrentGenerationSeed(item.seed);
                        }}
                        className={`flex-shrink-0 rounded border border-amber-500/30 overflow-hidden hover:border-amber-500/60 transition-transform hover:scale-110 hover:z-10 ${
                          store.galleryDensity === 'compact' ? 'w-10 h-10' : 'w-14 h-14'
                        }`}
                      >
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-h-[220px] min-w-0 flex flex-col items-center justify-center p-2">
              {store.currentLiveImageUrl ? (
                <>
                  <div
                    className="group/live relative flex w-full max-w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-amber-500/35 bg-black/55 shadow-inner"
                    style={{
                      aspectRatio: '9/16',
                      height: 'min(76vh, calc(100vh - 22rem))',
                      maxHeight: 'min(76vh, 100%)',
                      width: 'auto',
                      maxWidth: '100%',
                    }}
                  >
                    <img
                      src={store.currentLiveImageUrl}
                      alt="Live character"
                      className="h-full w-full object-contain object-center transition-transform duration-300 ease-out group-hover/live:scale-[1.02]"
                    />
                    <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1">
                      <Tooltip variant="character" content="View full size with zoom" side="left">
                        <button
                          type="button"
                          onClick={() => {
                            setZoomLevel(1);
                            setShowZoomModal(true);
                          }}
                          className="p-2 rounded-lg bg-black/60 border border-amber-500/40 hover:bg-amber-500/20"
                        >
                          <Expand className="w-4 h-4" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
                        </button>
                      </Tooltip>
                      <Tooltip variant="character" content="Delete this image" side="left">
                        <button
                          type="button"
                          onClick={() => discardLiveCharacterImage()}
                          className="p-2 rounded-lg bg-black/60 border border-amber-500/40 hover:bg-amber-500/20"
                          aria-label="Delete image"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                  <p className="mt-1 text-center text-[10px] text-emerald-200/50">
                    9:16 preview — full image fits; open expand for zoom
                  </p>
                </>
              ) : (
                <div className="text-center space-y-2 px-4">
                  <div className="w-16 h-16 rounded-full border border-dashed border-amber-500/30 mx-auto flex items-center justify-center bg-black/40">
                    <span className="text-2xl">&#9889;</span>
                  </div>
                  <p className="font-mono text-sm inline-block" style={goldTextStyle}>
                    {store.dnaLock ? 'DNA LOCKED' : 'No live image'}
                  </p>
                  <p className="text-xs text-white/50 max-w-xs mx-auto">
                    Add a reference or generate your first image.
                  </p>
                </div>
              )}
            </div>
            {/* Add Pose + pill-shaped buttons in one row */}
            <div className="flex flex-wrap items-center gap-3 p-3 border-t border-white/10 flex-shrink-0">
              <button
                type="button"
                onClick={() => store.addPose({})}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-amber-500/40 hover:bg-amber-500/20"
              >
                <span className="inline-block" style={goldTextStyle}>Add Character Pose</span>
              </button>
              <button
                type="button"
                onClick={handleGenerateCharacter}
                disabled={store.generationStatus === 'pending'}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-black border border-amber-600/50 hover:text-emerald-400 transition-colors disabled:opacity-90 disabled:cursor-wait"
                style={
                  store.generationStatus === 'pending'
                    ? { background: GEM_EMERALD, boxShadow: `0 0 16px ${GEM_EMERALD}` }
                    : { background: ACCENT_GOLD_GRADIENT }
                }
              >
                {store.generationStatus === 'pending' ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block w-4 h-4 rounded-sm rotate-45 animate-pulse"
                      style={{ background: GEM_EMERALD, boxShadow: `0 0 10px ${GEM_EMERALD}` }}
                      aria-label="Generating..."
                    />
                    <span className="animate-pulse">Working…</span>
                  </span>
                ) : (
                  'Generate Character'
                )}
              </button>
              <div className="flex items-center gap-1.5 flex-wrap w-full">
                <span className="text-[10px] uppercase tracking-wider text-emerald-200/60">Seed</span>
                <button
                  type="button"
                  onClick={() => store.setSeedMode('randomized')}
                  className={`px-2 py-1 rounded-full text-[10px] font-medium border ${
                    (store.seedMode ?? 'randomized') === 'randomized'
                      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                      : 'border-white/20 text-emerald-200/70 hover:bg-white/10'
                  }`}
                >
                  Randomized
                </button>
                <button
                  type="button"
                  onClick={() => store.setSeedMode('locked')}
                  className={`px-2 py-1 rounded-full text-[10px] font-medium border ${
                    store.seedMode === 'locked'
                      ? 'border-amber-500/60 bg-amber-500/15'
                      : 'border-white/20 text-emerald-200/70 hover:bg-white/10'
                  }`}
                >
                  <span className="inline-block" style={goldTextStyle}>Locked</span>
                </button>
              </div>
              <button
                type="button"
                onClick={handleGenerateAlternate}
                disabled={store.generationStatus === 'pending' || (!store.currentLiveImageUrl && store.referenceImageUrls.length === 0)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-amber-500/40 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="inline-block" style={goldTextStyle}>Generate Alternate</span>
              </button>
              <button
                type="button"
                onClick={() => void handleGenerateCharacter()}
                disabled={store.generationStatus === 'pending'}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/40 hover:bg-emerald-500/10 disabled:opacity-50"
              >
                <span className="inline-block text-emerald-200/90">Generate again</span>
              </button>
              <button
                type="button"
                disabled={!store.previousLiveImageUrl}
                onClick={() => {
                  if (!store.previousLiveImageUrl) return;
                  store.setCurrentLiveImageUrl(store.previousLiveImageUrl);
                  store.setCurrentGenerationSeed(store.previousGenerationSeed);
                  store.setPreviousLiveSnapshot(null, null);
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-white/25 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Undo last gen
              </button>
              <button
                type="button"
                onClick={() => openSaveCharacterModal(false)}
                disabled={!store.currentLiveImageUrl}
                className="px-3 py-1.5 rounded-full border border-amber-500/50 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="inline-block" style={goldTextStyle}>Save New Character</span>
              </button>
              <button
                type="button"
                onClick={handleSaveNewPose}
                disabled={!store.currentLiveImageUrl}
                className="px-3 py-1.5 rounded-full border border-amber-500/50 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="inline-block" style={goldTextStyle}>Save New Pose</span>
              </button>
              <button
                type="button"
                onClick={() => openSaveCharacterModal(true)}
                disabled={!store.selectedPoseId || !store.currentLiveImageUrl}
                className="px-3 py-1.5 rounded-full border border-amber-500/50 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="inline-block" style={goldTextStyle}>Save Edited Profile</span>
              </button>
              {hasStories ? (
                <CastInStoryButton
                  stories={stories}
                  onSelect={handleCastInStory}
                  disabled={!store.currentLiveImageUrl}
                />
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-3 py-1.5 rounded-full border border-white/20 font-medium text-xs cursor-not-allowed opacity-60"
                >
                  <span className="inline-block" style={goldTextStyle}>Cast in Story</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Reference Gallery 28% width (ref 950/3354), same capped height as center */}
        <div className="flex-[0_0_28%] min-w-0 min-h-0 flex flex-col rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
            <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-2" style={goldTextStyle}>
              Reference Gallery
            </h2>
            <p className="text-xs inline-block" style={goldTextStyle}>
              New generations here are derived from the official Full Body Reference.
            </p>
            {/* Pose gallery: click to set as live, trash to delete */}
            {store.poses.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 inline-block" style={goldTextStyle}>
                  Poses ({store.poses.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {store.poses.map((pose) => (
                    <div
                      key={pose.id}
                      className={`relative rounded-lg border overflow-hidden aspect-[9/16] max-h-28 ${
                        store.selectedPoseId === pose.id ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-white/20'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          store.setSelectedPoseId(pose.id);
                          if (pose.imageUrl) {
                            store.setCurrentLiveImageUrl(pose.imageUrl);
                          }
                        }}
                        className="absolute inset-0 w-full h-full block"
                      >
                        {pose.imageUrl ? (
                          <img src={pose.imageUrl} alt={pose.name ?? 'Pose'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-black/50 text-white/50 text-xs">
                            Empty
                          </div>
                        )}
                      </button>
                      <Tooltip variant="character" content="Delete this pose" side="left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            store.removePose(pose.id);
                            if (store.selectedPoseId === pose.id) {
                              store.setSelectedPoseId(null);
                              store.setCurrentLiveImageUrl(null);
                            }
                          }}
                          className="absolute bottom-1 right-1 p-1.5 rounded bg-black/70 border border-amber-500/40 hover:bg-amber-500/20"
                          aria-label="Delete pose"
                        >
                          <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
                        </button>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Age Modifier 0-100 */}
            <div>
              <label className="text-xs block mb-1 inline-block" style={goldTextStyle}>Age Modifier</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={store.ageModifier}
                  onChange={(e) => store.setAgeModifier(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-xs w-8 tabular-nums inline-block" style={goldTextStyle}>{store.ageModifier}</span>
              </div>
            </div>
            {/* Aspect Ratio */}
            <div>
              <label className="text-xs block mb-2 inline-block" style={goldTextStyle}>Aspect Ratio</label>
              <div className="flex flex-wrap gap-2">
                {(['9:16', '1:1', '21:9'] as AspectRatioId[]).map((ratio) => (
                  <Chip
                    key={ratio}
                    label={ratio === '9:16' ? 'Portrait (9:16)' : ratio === '21:9' ? 'Cinematic (21:9)' : 'Square (1:1)'}
                    active={store.aspectRatio === ratio}
                    onClick={() => store.setAspectRatio(ratio)}
                  />
                ))}
              </div>
            </div>
            {/* Camera Angle */}
            <div>
              <label className="text-xs block mb-2 inline-block" style={goldTextStyle}>Camera Angle</label>
              <div className="flex flex-wrap gap-2">
                {CINEMATIC_OPTIONS.angle.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    active={(store.cinematic.angle || '') === opt}
                    onClick={() => store.setCinematic('angle', opt)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <ArchiveRecallModal
        open={recallSlotIndex !== null}
        onClose={() => setRecallSlotIndex(null)}
        context="character"
        slotIndex={recallSlotIndex ?? 0}
        onSelect={(url) => {
          if (recallSlotIndex != null) {
            store.setReferenceImageAt(recallSlotIndex, url);
            setRecallSlotIndex(null);
          }
        }}
      />

      {/* Save character: profile name (required) + optional cast name */}
      {showSaveCharacterModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Save character — profile and cast name"
        >
          <div className="rounded-xl border border-amber-500/40 bg-black/90 backdrop-blur-md p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4" style={goldTextStyle}>
              {saveCharacterIsEditProfile ? 'Save edited profile' : 'Save new character'}
            </h3>
            <label className="block text-sm font-medium text-white/80 mb-1">Profile name (required)</label>
            <input
              type="text"
              value={saveCharacterProfileName}
              onChange={(e) => {
                setSaveCharacterProfileName(e.target.value);
                if (saveCharacterError) setSaveCharacterError(null);
              }}
              placeholder="e.g. Detective Mara"
              list={saveCharacterIsEditProfile ? 'vault-profile-options' : undefined}
              className="w-full bg-black/40 text-white border border-white/20 rounded-lg px-3 py-2 mb-3 text-sm placeholder-white/40"
              autoFocus
            />
            {saveCharacterIsEditProfile && (
              <datalist id="vault-profile-options">
                {vaultProfileOptions.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            )}
            {saveCharacterIsEditProfile && (
              <p className="text-[11px] text-white/55 -mt-2 mb-3">
                {vaultProfileLoading
                  ? 'Loading profiles…'
                  : vaultProfileOptions.length === 0
                    ? 'No existing profiles found. Use “Save New Character”.'
                    : saveCharacterProfileName.trim() &&
                        !getMatchedExistingProfile(saveCharacterProfileName)
                      ? 'Type to search, but Save only enables on an exact existing profile.'
                      : '\u00A0'}
              </p>
            )}
            <label className="block text-sm font-medium text-white/80 mb-1">Cast name (optional)</label>
            <input
              type="text"
              value={saveCharacterCastName}
              onChange={(e) => setSaveCharacterCastName(e.target.value)}
              placeholder="e.g. Mara in ch. 3"
              className="w-full bg-black/40 text-white border border-white/20 rounded-lg px-3 py-2 mb-4 text-sm placeholder-white/40"
            />
            {saveCharacterError && (
              <p className="text-red-400 text-sm mb-4" role="alert">
                {saveCharacterError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setSaveCharacterError(null); setShowSaveCharacterModal(false); }}
                className="px-3 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCharacterModalConfirm}
                disabled={
                  saveCharacterIsEditProfile
                    ? vaultProfileLoading || !getMatchedExistingProfile(saveCharacterProfileName)
                    : !saveCharacterProfileName.trim()
                }
                className="px-3 py-2 rounded-lg text-sm font-medium text-black border border-amber-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: ACCENT_GOLD_GRADIENT }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-size image modal with zoom */}
      {showZoomModal && store.currentLiveImageUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="View image full size"
        >
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.25, z - 0.25))}
                className="p-2 rounded-lg border border-amber-500/40 hover:bg-amber-500/20"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-5 h-5" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
              </button>
              <span className="text-sm tabular-nums min-w-[4rem]" style={goldTextStyle}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(4, z + 0.25))}
                className="p-2 rounded-lg border border-amber-500/40 hover:bg-amber-500/20"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-5 h-5" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="px-2 py-1 text-xs rounded border border-white/20 hover:bg-white/10"
              >
                <span className="inline-block" style={goldTextStyle}>Reset</span>
              </button>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip variant="character" content="Delete this image" side="bottom">
                <button
                  type="button"
                  onClick={() => {
                    discardLiveCharacterImage();
                    setShowZoomModal(false);
                  }}
                  className="p-2 rounded-lg border border-amber-500/40 hover:bg-amber-500/20"
                  aria-label="Delete image"
                >
                  <Trash2 className="w-5 h-5" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
                </button>
              </Tooltip>
              <button
                type="button"
                onClick={() => setShowZoomModal(false)}
                className="p-2 rounded-lg border border-amber-500/40 hover:bg-amber-500/20"
                aria-label="Close"
              >
                <X className="w-5 h-5" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4">
            <img
              src={store.currentLiveImageUrl}
              alt="Full size character reference"
              className="max-w-none transition-transform origin-center"
              style={{ transform: `scale(${zoomLevel})` }}
            />
          </div>
        </div>
      )}

    </div>
    {refHoverPreview &&
      typeof document !== 'undefined' &&
      createPortal(
        <div
          className="pointer-events-none fixed z-[9999] w-48 overflow-hidden rounded-xl border-2 border-amber-400 bg-neutral-950 shadow-2xl ring-2 ring-black/50"
          style={{
            left: Math.min(refHoverPreview.x, window.innerWidth - 200),
            top: Math.min(refHoverPreview.y, window.innerHeight - 320),
            maxHeight: 'min(70vh, 360px)',
          }}
        >
          <img
            src={refHoverPreview.url}
            alt=""
            className="h-full max-h-[min(70vh,360px)] w-full object-contain"
          />
        </div>,
        document.body
      )}
    </>
  );
};

function WardrobeRow({
  category,
  presets,
  selected,
  library,
  onToggle,
  onRemoveLibrary,
}: {
  category: WardrobeCategory;
  presets: readonly string[];
  selected: string[];
  library: string[];
  onToggle: (v: string) => void;
  onRemoveLibrary?: (value: string) => void;
}) {
  const allOptions = [...presets, ...library];
  return (
    <div>
      <h3 className="text-xs mb-2 inline-block" style={goldTextStyle}>{category}</h3>
      <div className="flex flex-wrap gap-2">
        {allOptions.map((opt) => (
          <ChipWithOptionalRemove
            key={opt}
            label={opt}
            active={selected.includes(opt)}
            onClick={() => onToggle(opt)}
            isCustom={library.includes(opt)}
            onRemove={library.includes(opt) ? () => onRemoveLibrary?.(opt) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function CastInStoryButton({
  stories,
  onSelect,
  disabled,
}: {
  stories: { id: string; name?: string }[];
  onSelect: (storyId: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="px-3 py-1.5 rounded-full border border-amber-500/50 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="inline-block" style={goldTextStyle}>Cast in Story</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-emerald-900/95 border border-amber-500/30 rounded-xl p-4 max-w-sm w-full mx-4">
            <h3 className="text-sm font-bold text-emerald-100 mb-3">
              Add character to story
            </h3>
            <ul className="space-y-2 mb-4">
              {stories.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(s.id);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg border border-white/10 hover:bg-amber-500/20 text-white"
                  >
                    {s.name || s.id}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2 rounded-lg border border-white/20 text-white/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
