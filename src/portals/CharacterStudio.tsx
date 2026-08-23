import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive,
  Copy,
  Dna,
  Expand,
  ExternalLink,
  ImagePlus,
  LayoutGrid,
  Pin,
  PinOff,
  Shirt,
  Sparkles,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useTheme } from '@/shared/context/ThemeContext';
import { useResponsiveLayout } from '@/shared/context/ResponsiveLayoutContext';
import { HybridTagBar } from '@/components/HybridTagBar';
import { CopyButton } from '@/shared/components/CopyButton';
import { SearchableVaultSelect } from '@/shared/components/SearchableVaultSelect';
import { Tooltip, PinnedHelpTooltip } from '@/shared/components/Tooltip';
import {
  useCharacterStudioStore,
  type WardrobeModifierCategory,
} from '@/stores/characterStudioStore';
import { useStudioImportBridge } from '@/stores/studioImportBridge';
import { usePromptLibraryBridge } from '@/stores/promptLibraryBridge';
import { buildCharacterStudioPromptForApi } from '@/shared/utils/buildCharacterStudioPromptForApi';
import {
  CHARACTER_STUDIO_BG_V4,
  ACCENT_GOLD_GRADIENT,
  CHARACTER_STUDIO_EMERALD_TEXT,
  GEM_EMERALD,
} from '@/shared/theme/Phase12DesignTokens';
import { getSlotLabel } from '@/shared/constants/referenceSlots';
import {
  ART_STYLE_FLAGSHIP,
  ART_STYLE_LIBRARY,
  FACIAL_EXPRESSION_TAGS,
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
import { generateImage, referenceUrlToBase64WithMimeRetry } from '@/shared/api/geminiImageApi';
import { generateGeminiTextFromImage } from '@/shared/api/geminiTextApi';
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
import {
  studioPreviewFrameStyle,
  type StudioPreviewAspectId,
} from '@/shared/utils/studioPreviewLayout';
import { ArcsStorageImg } from '@/components/ui/ArcsStorageImg';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { resolveArcsGenerationsDisplayUrl } from '@/shared/lib/arcsGenerationsUrls';
import { readBlobAsDataUrl } from '@/shared/utils/blobDataUrl';
import { Chip, ChipWithOptionalRemove, MultiChip, SectionAddToLibrary } from '@/portals/character-studio/CharacterTagControls';

/** Gradient gold text (match Comics Studio); use with style for background. */
const goldTextStyle: React.CSSProperties = {
  background: ACCENT_GOLD_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

export const CharacterStudio: React.FC = () => {
  const { setTheme } = useTheme();
  const { isPhone } = useResponsiveLayout();
  const phoneCompact = isPhone;
  const store = useCharacterStudioStore();
  const [customStyleInput, setCustomStyleInput] = useState('');
  const [facialExpressionCustomInput, setFacialExpressionCustomInput] = useState('');
  const [statusStep, setStatusStep] = useState(0);
  const [showZoomModal, setShowZoomModal] = useState(false);
  /** 1 = fit-to-viewport baseline; lower zooms out, higher zooms in (fullscreen modal). */
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomModalNatural, setZoomModalNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoomModalViewport, setZoomModalViewport] = useState({ w: 0, h: 0 });
  const [compareSplit, setCompareSplit] = useState(false);
  const [recallSlotIndex, setRecallSlotIndex] = useState<number | null>(null);
  /** Single focused slot drives the shared Upload / Archive / Clear toolbar. */
  const [focusedReferenceSlotIndex, setFocusedReferenceSlotIndex] = useState(0);
  type CharacterLeftModule = 'hub' | 'dna' | 'style';
  const [leftModule, setLeftModule] = useState<CharacterLeftModule>('hub');
  const [promptPinned, setPromptPinned] = useState(true);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const uploadSlotIndexRef = useRef<number | null>(null);
  const [showSaveCharacterModal, setShowSaveCharacterModal] = useState(false);
  const [saveCharacterProfileName, setSaveCharacterProfileName] = useState('');
  const [saveCharacterCastName, setSaveCharacterCastName] = useState('');
  const [saveCharacterIsEditProfile, setSaveCharacterIsEditProfile] = useState(false);
  const [saveCharacterError, setSaveCharacterError] = useState<string | null>(null);
  const [saveCharacterSubmitting, setSaveCharacterSubmitting] = useState(false);
  const [vaultProfileOptions, setVaultProfileOptions] = useState<string[]>([]);
  const [vaultProfileLoading, setVaultProfileLoading] = useState(false);
  const [recentCharacters, setRecentCharacters] = useState<RecentGeneration[]>([]);
  const [promptPanelTab, setPromptPanelTab] = useState<'auto' | 'reference' | 'edit' | 'refine'>('auto');
  const [snippetNameInput, setSnippetNameInput] = useState('');
  const [snippetTextInput, setSnippetTextInput] = useState('');
  /** Vision model: text prompt describing the current live frame (Reference Prompt tab). */
  const [aiReferencePrompt, setAiReferencePrompt] = useState('');
  const [aiReferencePromptLoading, setAiReferencePromptLoading] = useState(false);
  const [aiReferencePromptError, setAiReferencePromptError] = useState<string | null>(null);
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
    if (!phoneCompact) return;
    setLeftModule('hub');
    setPromptPanelTab('edit');
    setPromptPinned(true);
  }, [phoneCompact]);

  const consumeImportForTarget = useStudioImportBridge((s) => s.consumeImportForTarget);
  const requestReturnToSourceIfNeeded = useStudioImportBridge((s) => s.requestReturnToSourceIfNeeded);
  const clearActiveImportForTarget = useStudioImportBridge((s) => s.clearActiveImportForTarget);
  const requestPromptLibrarySave = usePromptLibraryBridge((s) => s.requestSavePrompt);
  const consumePromptLibraryUseRequest = usePromptLibraryBridge((s) => s.consumeUseRequest);

  useEffect(() => {
    return () => {
      clearActiveImportForTarget('studio', 'unmount');
    };
  }, [clearActiveImportForTarget]);

  useEffect(() => {
    const chunk = consumeImportForTarget('studio');
    if (!chunk) return;
    if (chunk.imageUrl) {
      useCharacterStudioStore.getState().setCurrentLiveImageUrl(chunk.imageUrl);
    }
    if (chunk.promptHint?.trim()) {
      useCharacterStudioStore.getState().setLastUsedPrompt(chunk.promptHint.trim());
    }
  }, [consumeImportForTarget]);

  useEffect(() => {
    const request = consumePromptLibraryUseRequest('studio');
    if (!request?.promptText.trim()) return;
    useCharacterStudioStore.getState().setVaultPromptOverride(request.promptText.trim());
    setPromptPanelTab('edit');
    setPromptPinned(true);
  }, [consumePromptLibraryUseRequest]);

  useEffect(() => {
    setRecentCharacters(getRecentCharacters());
  }, []);

  useEffect(() => {
    if (store.generationStatus !== 'pending') return;
    const id = setInterval(() => {
      setStatusStep((s) => (s + 1) % STATUS_BREADCRUMBS.length);
    }, 2500);
    return () => clearInterval(id);
  }, [store.generationStatus, STATUS_BREADCRUMBS.length]);

  useEffect(() => {
    setAiReferencePrompt('');
    setAiReferencePromptError(null);
  }, [store.currentLiveImageUrl]);

  const generateCharacterRef = useRef<() => Promise<void>>(async () => {});

  const artStyleLabel =
    store.artStyleId === 'flagship'
      ? ART_STYLE_FLAGSHIP
      : store.artStyleId;
  const hasReferenceImage = !!store.currentLiveImageUrl;
  const dnaAndPhysicalDisabled = hasReferenceImage && !store.diversifyLikeness;

  const selectedPoseForPrompt = store.selectedPoseId
    ? store.poses.find((p) => p.id === store.selectedPoseId)
    : null;
  const selectedPoseNameForPrompt = selectedPoseForPrompt?.name?.trim() || null;
  const selectedGalleryPoseActiveForPrompt = Boolean(
    selectedPoseForPrompt?.imageUrl && store.selectedPoseId
  );

  const { promptForApi: referencePromptText } = buildCharacterStudioPromptForApi({
    tags: store.tags,
    vaultPromptOverride: store.vaultPromptOverride,
    artStyleId: store.artStyleId,
    diversifyLikeness: store.diversifyLikeness,
    currentLiveImageUrl: store.currentLiveImageUrl,
    heritageSelection: store.heritageSelection,
    genderSelection: store.genderSelection,
    physicalSelections: store.physicalSelections,
    wardrobeSelections: store.wardrobeSelections,
    wardrobeModifiers: store.wardrobeModifiers,
    cinematic: store.cinematic,
    facialExpressionSelection: store.facialExpressionSelection,
    referenceImageUrls: store.referenceImageUrls,
    ageModifier: store.ageModifier,
    selectedPoseName: selectedPoseNameForPrompt,
    selectedGalleryPoseActive: selectedGalleryPoseActiveForPrompt,
    outputAspectRatio: store.aspectRatio,
  });

  const displayPrompt =
    store.currentGenerationSeed != null
      ? `${referencePromptText}\n\nUse seed: ${store.currentGenerationSeed} for consistency with the reference image.`
      : referencePromptText;

  const copyPromptText =
    promptPanelTab === 'auto'
      ? displayPrompt
      : promptPanelTab === 'reference'
        ? aiReferencePrompt.trim()
        : promptPanelTab === 'edit'
          ? store.vaultPromptOverride
          : store.refinementPromptOverride;

  const saveCurrentPromptToLibrary = () => {
    const promptText = copyPromptText.trim() || displayPrompt.trim();
    if (!promptText) return;
    requestPromptLibrarySave({
      sourcePortal: 'studio',
      sourceLabel: 'Character Studio',
      title: selectedPoseNameForPrompt ? `Character prompt · ${selectedPoseNameForPrompt}` : 'Character Studio prompt',
      promptText,
      category: 'character',
      tags: ['character-studio', promptPanelTab],
      collections: ['ARCS handoffs'],
      sourceContext: {
        promptPanelTab,
        aspectRatio: store.aspectRatio,
        hasLiveImage: Boolean(store.currentLiveImageUrl),
        selectedPoseName: selectedPoseNameForPrompt,
      },
      promptSections: {
        compiled: displayPrompt,
        reference: aiReferencePrompt,
        editOverride: store.vaultPromptOverride,
        refinement: store.refinementPromptOverride,
      },
    });
  };

  const activeReferenceForCompare =
    store.referenceImageUrls.find((u) => Boolean(u)) ?? store.currentLiveImageUrl ?? null;

  const selectedPoseForSummary = selectedPoseForPrompt;
  const poseSessionLabel = selectedPoseForSummary
    ? selectedPoseForSummary.name?.trim() || 'Untitled pose'
    : 'No pose selected';
  const aspectSessionLabel =
    store.aspectRatio === '9:16'
      ? 'Portrait 9:16'
      : store.aspectRatio === '21:9'
        ? 'Cinematic 21:9'
        : 'Square 1:1';
  const previewAspectId = store.aspectRatio as StudioPreviewAspectId;
  const previewFrameCompare = studioPreviewFrameStyle(previewAspectId, 'stageCompare');
  /** Live + one pose tile — larger portrait box now that a third column was removed */
  const dualSlotFrameStyle: React.CSSProperties = {
    width: 280,
    height: 497,
    maxWidth: '100%',
    flexShrink: 0,
    boxSizing: 'border-box',
    position: 'relative',
  };
  const cameraSessionLabel = store.cinematic.angle?.trim()
    ? `Cam: ${store.cinematic.angle}`
    : 'Cam: —';

  const handleGenerateAiReferencePrompt = async () => {
    const url = store.currentLiveImageUrl;
    if (!url?.trim()) {
      setAiReferencePromptError('Generate or load a live image first.');
      return;
    }
    if (store.generationStatus === 'pending') return;
    setAiReferencePromptLoading(true);
    setAiReferencePromptError(null);
    try {
      const { base64, mimeType } = await referenceUrlToBase64WithMimeRetry(url);
      const res = await generateGeminiTextFromImage({
        systemPrompt:
          'You write dense, generation-ready image prompts for character portrait models. Stay faithful to what is visible in the image; do not invent identity or heritage details that are not shown. Plain text only, no markdown.',
        userText:
          'Write one detailed text-to-image prompt describing this portrait: visible appearance, clothing, pose, expression, lighting, framing, and rendering style. Optimize for use with Gemini / Nano Banana image generation.',
        imageBase64: base64,
        mimeType: mimeType || 'image/jpeg',
      });
      if (!res.ok) {
        setAiReferencePromptError(res.error);
        return;
      }
      setAiReferencePrompt(res.text);
    } catch (e) {
      setAiReferencePromptError(e instanceof Error ? e.message : 'Could not describe image.');
    } finally {
      setAiReferencePromptLoading(false);
    }
  };

  const sendPoseImageToFirstEmptyReferenceSlot = (imageUrl: string | undefined) => {
    if (!imageUrl?.trim()) {
      store.setGenerationStatus('error', 'This pose has no image to add.');
      return;
    }
    const urls = useCharacterStudioStore.getState().referenceImageUrls;
    const emptyIdx = urls.findIndex((u) => !u);
    if (emptyIdx < 0) {
      store.setGenerationStatus('error', 'All reference slots are full. Clear a slot first.');
      return;
    }
    store.setReferenceImageAt(emptyIdx, imageUrl);
    store.setCurrentLiveImageUrl(imageUrl);
    setFocusedReferenceSlotIndex(emptyIdx);
  };

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

  const getMatchedExistingProfile = useCallback((typed: string): string | null => {
    const q = typed.trim();
    if (!q) return null;
    const lower = q.toLowerCase();
    return vaultProfileOptions.find((p) => p.toLowerCase() === lower) ?? null;
  }, [vaultProfileOptions]);

  const handleGenerateCharacter = async () => {
    try {
      const st = useCharacterStudioStore.getState();
      st.setGenerationStatus('pending');
      const seed = pickGenerationSeed(st.seedMode ?? 'randomized', st.currentGenerationSeed);
      st.setCurrentGenerationSeed(seed);
      const poseForGen = st.selectedPoseId
        ? st.poses.find((p) => p.id === st.selectedPoseId)
        : null;
      const selectedGalleryPoseActive = Boolean(poseForGen?.imageUrl && st.selectedPoseId);
      const { promptForApi, refUrlsForApi } =
        buildCharacterStudioPromptForApi({
          tags: st.tags,
          vaultPromptOverride: st.vaultPromptOverride,
          artStyleId: st.artStyleId,
          diversifyLikeness: st.diversifyLikeness,
          currentLiveImageUrl: st.currentLiveImageUrl,
          heritageSelection: st.heritageSelection,
          genderSelection: st.genderSelection,
          physicalSelections: st.physicalSelections,
          wardrobeSelections: st.wardrobeSelections,
          wardrobeModifiers: st.wardrobeModifiers,
          cinematic: st.cinematic,
          facialExpressionSelection: st.facialExpressionSelection,
          referenceImageUrls: st.referenceImageUrls,
          ageModifier: st.ageModifier,
          selectedPoseName: poseForGen?.name?.trim() || null,
          selectedGalleryPoseActive,
          outputAspectRatio: st.aspectRatio,
        });
      const isVaultOverride = Boolean(st.vaultPromptOverride.trim());
      const result = await generateImage({
        prompt: promptForApi,
        referenceImageUrls: refUrlsForApi,
        seed,
        aspectRatio: st.aspectRatio,
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
      const poseForGen = st.selectedPoseId
        ? st.poses.find((p) => p.id === st.selectedPoseId)
        : null;
      const selectedGalleryPoseActive = Boolean(poseForGen?.imageUrl && st.selectedPoseId);
      const { promptForApi: basePrompt, refUrlsForApi } = buildCharacterStudioPromptForApi({
        tags: st.tags,
        vaultPromptOverride: st.vaultPromptOverride,
        artStyleId: st.artStyleId,
        diversifyLikeness: st.diversifyLikeness,
        currentLiveImageUrl: st.currentLiveImageUrl,
        heritageSelection: st.heritageSelection,
        genderSelection: st.genderSelection,
        physicalSelections: st.physicalSelections,
        wardrobeSelections: st.wardrobeSelections,
        wardrobeModifiers: st.wardrobeModifiers,
        cinematic: st.cinematic,
        facialExpressionSelection: st.facialExpressionSelection,
        referenceImageUrls: st.referenceImageUrls,
        ageModifier: st.ageModifier,
        selectedPoseName: poseForGen?.name?.trim() || null,
        selectedGalleryPoseActive,
        outputAspectRatio: st.aspectRatio,
      });
      const promptForApi = `${basePrompt} Alternate pose, same character.`;
      const isVaultOverride = Boolean(st.vaultPromptOverride.trim());
      const result = await generateImage({
        prompt: promptForApi,
        referenceImageUrls: refUrlsForApi,
        seed,
        aspectRatio: st.aspectRatio,
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
      const ar = st0.aspectRatio;
      const aspectWords =
        ar === '9:16' ? 'portrait 9:16' : ar === '1:1' ? 'square 1:1' : 'cinematic 21:9';
      const promptForApi = `Apply this art style to the entire image. Art style: ${artStyleLabel}. Output framing: ${aspectWords}. Refine this character image according to these instructions while preserving identity and overall style: ${refinement}`;
      const result = await generateImage({
        prompt: promptForApi,
        referenceImageUrls: refUrlsForApi,
        seed,
        aspectRatio: st0.aspectRatio,
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

  const openSaveCharacterModal = (isEditProfile: boolean) => {
    setSaveCharacterProfileName('');
    setSaveCharacterCastName('');
    setSaveCharacterIsEditProfile(isEditProfile);
    setSaveCharacterError(null);
    setShowSaveCharacterModal(true);

    setVaultProfileLoading(true);
    getCharacterAlbums()
      .then((albums) => setVaultProfileOptions(albums.map((a) => a.profileName)))
      .catch(() => setVaultProfileOptions([]))
      .finally(() => setVaultProfileLoading(false));
  };

  const handleSaveCharacterModalConfirm = async () => {
    if (saveCharacterSubmitting) return;
    const typedProfileDisplay = saveCharacterProfileName.trim();
    if (!typedProfileDisplay) {
      return;
    }

    if (saveCharacterIsEditProfile) {
      const matched = getMatchedExistingProfile(typedProfileDisplay);
      if (!matched) {
        setSaveCharacterError('Select an existing profile from the list. Use “Save new character” to create a new one.');
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
    setSaveCharacterSubmitting(true);
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
        requestReturnToSourceIfNeeded('studio', result.imageUrl, castName);
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
        requestReturnToSourceIfNeeded('studio', url, castName);
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
    } finally {
      setSaveCharacterSubmitting(false);
    }
  };

  const handleSaveCharacterModalConfirmRef = useRef(handleSaveCharacterModalConfirm);
  handleSaveCharacterModalConfirmRef.current = handleSaveCharacterModalConfirm;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'Enter' && store.generationStatus !== 'pending') {
        e.preventDefault();
        void generateCharacterRef.current();
      }
      if (e.key === 'Enter' && !mod && showZoomModal) {
        e.preventDefault();
        setShowZoomModal(false);
        return;
      }
      if (e.key === 'Enter' && !mod && showSaveCharacterModal) {
        const t = e.target;
        if (
          t instanceof HTMLInputElement ||
          t instanceof HTMLTextAreaElement ||
          t instanceof HTMLSelectElement
        ) {
          return;
        }
        e.preventDefault();
        const dis =
          saveCharacterIsEditProfile
            ? saveCharacterSubmitting ||
              vaultProfileLoading ||
              !getMatchedExistingProfile(saveCharacterProfileName)
            : saveCharacterSubmitting || !saveCharacterProfileName.trim();
        if (!dis) void handleSaveCharacterModalConfirmRef.current();
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
  }, [
    store.generationStatus,
    showZoomModal,
    showSaveCharacterModal,
    saveCharacterIsEditProfile,
    saveCharacterSubmitting,
    saveCharacterProfileName,
    vaultProfileLoading,
    vaultProfileOptions,
    getMatchedExistingProfile,
  ]);

  useEffect(() => {
    if (!showZoomModal) {
      setZoomModalNatural(null);
      return;
    }
    const measure = () =>
      setZoomModalViewport({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [showZoomModal]);

  const zoomModalLayout = useMemo(() => {
    const vw = zoomModalViewport.w || (typeof window !== 'undefined' ? window.innerWidth : 1200);
    const vh = zoomModalViewport.h || (typeof window !== 'undefined' ? window.innerHeight : 800);
    const maxW = Math.max(160, vw - 32);
    const maxH = Math.max(160, vh - 100);
    if (!zoomModalNatural?.w || !zoomModalNatural?.h) {
      return { fit: 1, displayW: null as number | null };
    }
    const fit = Math.min(1, maxW / zoomModalNatural.w, maxH / zoomModalNatural.h);
    const displayW = Math.max(1, Math.round(zoomModalNatural.w * fit * zoomLevel));
    return { fit, displayW };
  }, [zoomModalNatural, zoomModalViewport.w, zoomModalViewport.h, zoomLevel]);

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
      className="flex flex-col h-full min-h-0 overflow-hidden p-3 animate-fade-in"
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

      {/* Main: 60% module column | 40% visual stage (stacked on phone) */}
      <div className="flex flex-col md:flex-row gap-3 w-full flex-1 min-h-0 min-w-0 overflow-hidden">
        <div className="w-full min-w-0 flex flex-col gap-2 flex-shrink-0 min-h-0 overflow-hidden md:flex-[0_0_60%] md:max-w-[60%]">
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md flex flex-1 min-h-0 flex-col overflow-hidden shadow-lg shadow-black/20">
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar p-3 space-y-4">
            {leftModule === 'hub' && (
            <>
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-amber-500/20 pb-1 mb-2 shrink-0">
              <h2 className="text-base font-bold uppercase tracking-widest" style={goldTextStyle}>
                Reference images
              </h2>
              <Tooltip
                variant="character"
                content="Clear every reference slot but keep the current live preview image."
                side="left"
              >
                <button
                  type="button"
                  onClick={() => store.clearReferenceSlotsKeepLive()}
                  className="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide border border-amber-500/35 text-amber-200/90 hover:bg-amber-500/15"
                >
                  Clear slots
                </button>
              </Tooltip>
            </div>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const slotIndex = uploadSlotIndexRef.current;
                if (slotIndex == null) return;
                try {
                  const url = await readBlobAsDataUrl(file);
                  store.setReferenceImageAt(slotIndex, url);
                  store.setCurrentLiveImageUrl(url);
                } catch {
                  store.setGenerationStatus('error', 'Could not read the uploaded image.');
                } finally {
                  uploadSlotIndexRef.current = null;
                  e.target.value = '';
                }
              }}
            />
            <div className="rounded-lg border border-amber-500/30 bg-black/35 px-2 py-2 mb-2 shrink-0 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <div className="text-[10px] text-white/85 min-w-0 flex-1 basis-[140px]">
                <span className="font-bold text-amber-200/90">
                  Slot {focusedReferenceSlotIndex + 1}
                </span>
                <span className="text-white/45"> · </span>
                <span className="text-white/75">{getSlotLabel(focusedReferenceSlotIndex)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    store.clearAllReferenceSlots();
                    store.setCurrentLiveImageUrl(null);
                  }}
                  className="px-2 py-1 rounded-md text-[9px] border border-white/25 hover:bg-white/10"
                >
                  Clear all
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
                            const url = await readBlobAsDataUrl(blob);
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
                  className="px-2 py-1 rounded-md text-[9px] border border-amber-500/40 hover:bg-amber-500/10"
                >
                  Paste first empty
                </button>
                <Tooltip variant="character" content="Upload an image into the focused slot" side="bottom">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border border-amber-500/35 text-amber-200/95 hover:bg-amber-500/15"
                    onClick={() => {
                      uploadSlotIndexRef.current = focusedReferenceSlotIndex;
                      uploadInputRef.current?.click();
                    }}
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    Upload
                  </button>
                </Tooltip>
                <Tooltip variant="character" content="Choose from archive for the focused slot" side="bottom">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border border-amber-500/35 text-amber-200/95 hover:bg-amber-500/15"
                    onClick={() => setRecallSlotIndex(focusedReferenceSlotIndex)}
                  >
                    <Archive className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    Archive
                  </button>
                </Tooltip>
                <Tooltip variant="character" content="Remove image from the focused slot" side="bottom">
                  <button
                    type="button"
                    disabled={!store.referenceImageUrls[focusedReferenceSlotIndex]}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border border-white/20 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none"
                    onClick={() => {
                      const i = focusedReferenceSlotIndex;
                      const url = store.referenceImageUrls[i];
                      if (!url) return;
                      const wasLive = store.currentLiveImageUrl === url;
                      store.removeReferenceImage(i);
                      if (wasLive) {
                        const nextUrls = useCharacterStudioStore.getState().referenceImageUrls;
                        const still = nextUrls.filter(Boolean);
                        store.setCurrentLiveImageUrl(still[0] ?? null);
                      }
                    }}
                  >
                    Clear
                  </button>
                </Tooltip>
              </div>
            </div>
            <p className="text-[10px] text-white/50 mb-1 shrink-0">
              Click a thumbnail to focus a slot. Labels show slot role in the API stack.
            </p>
            <div className="mt-1 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              {!Array.from({ length: 14 }, (_, i) => store.referenceImageUrls[i]).some(Boolean) && (
                <p className="text-xs text-amber-200/70 mb-2">
                  No references yet. Pick a slot, use Upload or Archive, or paste an image.
                </p>
              )}
              <div className="grid grid-cols-7 gap-x-1 gap-y-1.5 w-full justify-items-center">
                {Array.from({ length: 14 }, (_, i) => {
                  const url = store.referenceImageUrls[i];
                  const isFocused = focusedReferenceSlotIndex === i;
                  return (
                    <div key={i} className="flex flex-col items-center gap-0.5 min-w-0 max-w-[4.5rem] group/slot">
                      <div className="relative h-[106px] w-[60px] shrink-0 mx-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setFocusedReferenceSlotIndex(i);
                            if (url) store.setCurrentLiveImageUrl(url);
                          }}
                          className={`absolute inset-0 rounded-md bg-black/40 flex items-center justify-center overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-amber-400/90 ${
                            url
                              ? 'border-2 border-amber-500/55'
                              : 'border-2 border-dashed border-white/25'
                          } ${isFocused ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-black/70' : ''}`}
                          aria-pressed={isFocused}
                          aria-label={`Reference slot ${i + 1}, ${getSlotLabel(i)}`}
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
                            <ArcsStorageImg src={url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] text-white/40">{i + 1}</span>
                          )}
                        </button>
                        {url ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const wasLive = store.currentLiveImageUrl === url;
                              store.removeReferenceImage(i);
                              if (wasLive) {
                                const nextUrls =
                                  useCharacterStudioStore.getState().referenceImageUrls;
                                const still = nextUrls.filter(Boolean);
                                store.setCurrentLiveImageUrl(still[0] ?? null);
                              }
                            }}
                            className="absolute -top-0.5 -right-0.5 z-10 w-3.5 h-3.5 rounded-full bg-black/85 text-white text-[9px] leading-none flex items-center justify-center opacity-0 group-hover/slot:opacity-100 hover:!opacity-100 focus:opacity-100 pointer-events-auto border border-white/20"
                            aria-label={`Remove slot ${i + 1}`}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                      <span className="text-[7px] text-center text-white/60 max-w-full leading-tight line-clamp-2">
                        {getSlotLabel(i)}
                      </span>
                    </div>
                  );
                })}
              </div>
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
            </>
            )}

            {leftModule === 'dna' && (
            <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-black/25 px-2 py-1.5 mb-2 shrink-0">
              <span className="text-[10px] text-white/65 uppercase tracking-wide">DNA tab</span>
              <button
                type="button"
                onClick={() => {
                  store.clearDnaModuleSelections();
                  setPromptPanelTab('auto');
                }}
                className="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide border border-amber-500/35 text-amber-200/90 hover:bg-amber-500/15"
                title="Clear heritage, gender, expression, and physical selections; turn off DNA lock; reset age and Diversify Likeness."
              >
                Clear DNA tab
              </button>
            </div>
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

            {/* Facial Expressions */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Facial Expressions
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {[...FACIAL_EXPRESSION_TAGS, ...store.facialExpressionLibrary]
                      .sort((a, b) => a.localeCompare(b))
                      .map((tag) => (
                        <ChipWithOptionalRemove
                          key={tag}
                          label={tag}
                          active={store.facialExpressionSelection.includes(tag)}
                          onClick={() => store.toggleFacialExpression(tag)}
                          isCustom={store.facialExpressionLibrary.includes(tag)}
                          onRemove={
                            store.facialExpressionLibrary.includes(tag)
                              ? () => store.removeFacialExpressionOption(tag)
                              : undefined
                          }
                        />
                      ))}
                  </div>
                </div>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={facialExpressionCustomInput}
                    onChange={(e) => setFacialExpressionCustomInput(e.target.value)}
                    placeholder="Custom expression..."
                    className="flex-1 bg-black/40 text-white placeholder-white/40 px-3 py-2 rounded-lg border border-white/10 text-sm"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const t = facialExpressionCustomInput.trim();
                      if (!t) return;
                      store.addFacialExpressionOption(t);
                      setFacialExpressionCustomInput('');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const t = facialExpressionCustomInput.trim();
                      if (!t) return;
                      store.addFacialExpressionOption(t);
                      setFacialExpressionCustomInput('');
                    }}
                    className="px-3 py-2 rounded-lg text-black text-xs font-bold border border-amber-600/50"
                    style={{ background: ACCENT_GOLD_GRADIENT }}
                  >
                    Save as Tag
                  </button>
                </div>
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
            </>
            )}

            {leftModule === 'style' && (
            <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-black/25 px-2 py-1.5 mb-2 shrink-0">
              <span className="text-[10px] text-white/65 uppercase tracking-wide">Style tab</span>
              <button
                type="button"
                onClick={() => {
                  store.clearStyleModuleSelections();
                  setPromptPanelTab('auto');
                }}
                className="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide border border-amber-500/35 text-amber-200/90 hover:bg-amber-500/15"
                title="Reset art style, wardrobe, cinematic suite, and active pose selection (saved poses list kept)."
              >
                Clear Style tab
              </button>
            </div>
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
                {(Object.keys(CINEMATIC_OPTIONS) as CinematicKey[])
                  .filter((key) => key !== 'angle')
                  .map((key) => (
                    <div key={key}>
                      <h3 className="text-xs mb-2 inline-block" style={goldTextStyle}>
                        {key}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {[...CINEMATIC_OPTIONS[key], ...(store.cinematicLibraries[key] ?? [])].map(
                          (opt) => (
                            <ChipWithOptionalRemove
                              key={opt}
                              label={opt}
                              active={(store.cinematic[key] || '') === opt}
                              onClick={() => store.setCinematic(key, opt)}
                              isCustom={(store.cinematicLibraries[key] ?? []).includes(opt)}
                              onRemove={
                                (store.cinematicLibraries[key] ?? []).includes(opt)
                                  ? () => store.removeCinematicOption(key, opt)
                                  : undefined
                              }
                            />
                          )
                        )}
                      </div>
                    </div>
                  ))}
                <SectionAddToLibrary
                  categories={(Object.keys(CINEMATIC_OPTIONS) as CinematicKey[])
                    .filter((k) => k !== 'angle')
                    .map((k) => ({ id: k, label: k }))}
                  onSave={(cat, v) => store.addCinematicOption(cat as CinematicKey, v)}
                />
              </div>
            </section>

            {/* Tag bar */}
            <section>
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-amber-500/20 pb-1 mb-3">
                <h2 className="text-base font-bold uppercase tracking-widest" style={goldTextStyle}>
                  Prompt Tags
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    store.clearPromptTagsOnly();
                    setPromptPanelTab('auto');
                  }}
                  className="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide border border-amber-500/35 text-amber-200/90 hover:bg-amber-500/15 shrink-0"
                  title="Reset tag chips to defaults (portrait + cinematic-lighting)."
                >
                  Reset tags
                </button>
              </div>
              <HybridTagBar
                tags={store.tags}
                setTags={store.setTags}
              />
            </section>
            </>
            )}
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-white/10 bg-black/30 p-2 flex flex-col min-h-0 max-h-[min(48vh,420px)] overflow-hidden">
            <div className="mb-1 shrink-0 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-widest" style={goldTextStyle}>
                Live Prompt
              </h2>
              {!phoneCompact && (
                <button
                  type="button"
                  onClick={() => {
                    store.clearLivePromptOverridesOnly();
                    setPromptPanelTab('auto');
                  }}
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border border-white/20 text-white/75 hover:bg-white/10"
                  title="Clear Edit override and Refine text only. Keeps tags and compiled prompt."
                >
                  Clear overrides
                </button>
              )}
            </div>
            {!promptPinned ? (
              <p
                className="text-[11px] font-mono text-emerald-100/85 truncate border border-white/10 rounded-lg px-2 py-1.5 bg-black/50 min-h-[2rem]"
                title={displayPrompt || undefined}
              >
                {(displayPrompt || '// Pin to expand — full prompt, tabs, and DNA lock').split('\n')[0].slice(0, 140)}
                {displayPrompt && (displayPrompt.length > 140 || displayPrompt.includes('\n')) ? '…' : ''}
              </p>
            ) : (
            <>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {!phoneCompact && (
            <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2 mb-2 shrink-0">
              {(
                [
                  { id: 'auto' as const, label: 'Prompt' },
                  { id: 'reference' as const, label: 'Reference Prompt' },
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
                    {id === 'reference' &&
                      'AI-generated prompt from the live portrait (vision). Use Describe live image. Different from the Prompt tab, which shows the tag-built compile.'}
                    {id === 'edit' &&
                      'Edit the raw prompt override. Model is in the bottom bar. Overrides the tag-built prompt when the override field is non-empty.'}
                    {id === 'refine' &&
                      'Describe changes to the current live image; Refine sends it as reference. Use Suggest chips or type freely.'}
                  </PinnedHelpTooltip>
                </span>
              ))}
            </div>
            )}
            {!phoneCompact && promptPanelTab === 'auto' && (
              <div className="bg-black/60 p-2 rounded-lg font-mono text-xs text-emerald-100/85 break-words flex-1 min-h-[80px] max-h-[min(22vh,200px)] overflow-y-auto custom-scrollbar transition-opacity duration-200">
                {displayPrompt || '// Prompt is empty...'}
              </div>
            )}
            {!phoneCompact && promptPanelTab === 'reference' && (
              <div className="flex-1 flex flex-col gap-2 min-h-[80px] max-h-[min(22vh,200px)] overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Tooltip
                    variant="character"
                    content="Calls Gemini vision on the image currently shown in the live frame (right panel). Use after Generate or when you load a portrait."
                    side="bottom"
                  >
                    <button
                      type="button"
                      onClick={() => void handleGenerateAiReferencePrompt()}
                      disabled={
                        aiReferencePromptLoading ||
                        !store.currentLiveImageUrl ||
                        store.generationStatus === 'pending'
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-500/50 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: ACCENT_GOLD_GRADIENT }}
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      {aiReferencePromptLoading ? 'Describing…' : 'Describe live image'}
                    </button>
                  </Tooltip>
                  {aiReferencePromptError ? (
                    <span className="text-[10px] text-red-300/95 max-w-[12rem]">{aiReferencePromptError}</span>
                  ) : null}
                </div>
                <div className="flex-1 min-h-[48px] overflow-y-auto rounded-lg bg-black/60 p-2 font-mono text-xs text-emerald-100/85 break-words custom-scrollbar">
                  {aiReferencePrompt.trim()
                    ? aiReferencePrompt
                    : '// Click “Describe live image” to generate an AI reference prompt from the portrait in the live frame. The Prompt tab still shows the tag-built compile for Generate.'}
                </div>
              </div>
            )}
            {(phoneCompact || promptPanelTab === 'edit') && (
              <div className="flex-1 flex flex-col gap-2 min-h-[80px] max-h-[min(22vh,200px)] overflow-y-auto">
                <textarea
                  value={store.vaultPromptOverride}
                  onChange={(e) => store.setVaultPromptOverride(e.target.value)}
                  placeholder="Override prompt…"
                  className="w-full flex-1 min-h-[120px] bg-black/60 text-white/90 p-3 rounded-lg border border-amber-500/20 text-sm font-mono resize-y"
                />
                <div className="flex flex-wrap gap-2 items-center">
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
              </div>
            )}
            {!phoneCompact && promptPanelTab === 'refine' && (
              <div className="flex min-h-[80px] flex-1 flex-col gap-2 overflow-hidden">
                {!store.currentLiveImageUrl ? (
                  <p className="text-sm text-amber-200/80">Generate or load an image first, then describe refinements here.</p>
                ) : (
                  <>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 pb-2">
                      <button
                        type="button"
                        disabled
                        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs opacity-50 cursor-not-allowed"
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
                        className="rounded-lg border border-amber-600/50 px-4 py-1.5 text-xs font-bold text-black disabled:opacity-50"
                        style={{ background: ACCENT_GOLD_GRADIENT }}
                      >
                        Refine
                      </button>
                      <select
                        className="rounded border border-white/20 bg-black/50 px-2 py-1 text-xs text-white"
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
                    <p className="shrink-0 text-[10px] text-white/45">
                      Suggest chips — scroll if the list is long.
                    </p>
                    <div className="max-h-[5.5rem] min-h-0 shrink-0 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-1.5 custom-scrollbar">
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
                            className="rounded-full border border-white/20 px-2 py-1 text-xs hover:border-amber-500/50"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={store.refinementPromptOverride}
                      onChange={(e) => store.setRefinementPromptOverride(e.target.value)}
                      placeholder="Type a refinement or tap Suggest chips above."
                      className="min-h-[96px] w-full flex-1 resize-y bg-black/60 p-3 text-sm text-white/90 placeholder:text-white/40 border border-amber-500/20 rounded-lg"
                    />
                  </>
                )}
              </div>
            )}
            </div>
            </>
            )}
            <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center gap-x-2 gap-y-1.5 shrink-0">
              <CopyButton text={copyPromptText} labelStyle={goldTextStyle} />
              <button
                type="button"
                onClick={saveCurrentPromptToLibrary}
                disabled={!copyPromptText.trim() && !displayPrompt.trim()}
                className="px-2 py-1 rounded-full text-[10px] border border-amber-500/40 hover:bg-amber-500/20 disabled:opacity-45"
              >
                Save to Prompt Library
              </button>
              {!phoneCompact && promptPinned && promptPanelTab === 'auto' && (
                <button
                  type="button"
                  onClick={() => {
                    store.clearLivePromptOverridesOnly();
                    setPromptPanelTab('auto');
                  }}
                  className="px-2 py-1 rounded-full text-[10px] border border-amber-500/40 hover:bg-amber-500/20"
                >
                  Refresh
                </button>
              )}
              {!phoneCompact && (
              <button
                type="button"
                onClick={() => {
                  store.clearLivePromptOverridesOnly();
                  setPromptPanelTab('auto');
                }}
                className="px-2 py-1 rounded-full text-[10px] border border-amber-500/40 hover:bg-amber-500/20"
              >
                Reset to tags
              </button>
              )}
              {!phoneCompact && (
                <button
                  type="button"
                  onClick={() => {
                    store.resetWorkspaceFreshSlate();
                    setPromptPanelTab('auto');
                  }}
                  className="px-2 py-1 rounded-full text-[10px] border border-rose-500/45 text-rose-200/90 hover:bg-rose-500/15"
                  title="Clear tags, refs, style selections, and prompt overrides. Keeps live image, seed, and session history."
                >
                  Clear workspace
                </button>
              )}
              {!phoneCompact && (
              <button
                type="button"
                onClick={() => setPromptPinned((p) => !p)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border border-amber-500/40 text-amber-200/90 hover:bg-amber-500/10"
                aria-pressed={promptPinned}
              >
                {promptPinned ? <Pin className="w-3 h-3 shrink-0" aria-hidden /> : <PinOff className="w-3 h-3 shrink-0" aria-hidden />}
                {promptPinned ? 'Pinned' : 'Pin'}
              </button>
              )}
              {!phoneCompact && store.lastUsedPrompt ? (
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
                  className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-200/90 hover:bg-emerald-500/10 truncate max-w-[120px]"
                  title="Copy full prompt to clipboard; append summary to Refine tab"
                >
                  Last prompt
                </button>
              ) : null}
              <span className="text-[9px] text-white/55 uppercase tracking-wider">Model</span>
              <select
                value={store.selectedOnyxModelId}
                onChange={(e) => store.setSelectedOnyxModelId(e.target.value as 'flash' | 'pro')}
                className="max-w-[9.5rem] bg-black/55 text-white border border-amber-500/25 rounded-md px-1.5 py-0.5 text-[10px]"
              >
                <option value="flash">Nano Banana 2</option>
                <option value="pro">Nano Banana Pro</option>
              </select>
              <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-full border border-amber-500/30 bg-black/20 hover:border-amber-500/60 transition-all ml-auto">
                <span className="text-[10px] font-bold tracking-widest inline-block" style={goldTextStyle}>
                  DNA LOCK
                </span>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Toggle DNA lock"
                  aria-pressed={store.dnaLock}
                  onClick={() => store.setDnaLock(!store.dnaLock)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    store.setDnaLock(!store.dnaLock);
                  }}
                  className="w-9 h-4 rounded-full p-0.5 transition-colors duration-300 bg-white/10"
                  style={store.dnaLock ? { background: ACCENT_GOLD_GRADIENT } : undefined}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                      store.dnaLock ? 'translate-x-[1.125rem]' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>
          </div>

          {!phoneCompact && (
          <div
            className="shrink-0 flex rounded-lg border border-white/15 bg-black/45 p-1 gap-0.5"
            role="tablist"
            aria-label="Studio modules"
          >
            {(
              [
                { id: 'hub' as const, label: 'Refs', Icon: LayoutGrid },
                { id: 'dna' as const, label: 'DNA', Icon: Dna },
                { id: 'style' as const, label: 'Style', Icon: Shirt },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={leftModule === id}
                onClick={() => setLeftModule(id)}
                className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-2 rounded-md text-[9px] font-bold uppercase tracking-wide border transition-colors min-w-0 ${
                  leftModule === id
                    ? 'text-black border-amber-500/60 shadow-sm'
                    : 'border-transparent text-emerald-200/75 hover:bg-white/10'
                }`}
                style={leftModule === id ? { background: ACCENT_GOLD_GRADIENT } : undefined}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 opacity-90" aria-hidden />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
          )}
        </div>

        {/* Right column — visual stage */}
        <div className="w-full min-w-0 min-h-[min(42vh,360px)] md:min-h-0 flex flex-1 flex-col gap-2 overflow-hidden overflow-x-hidden md:flex-[0_0_40%] md:max-w-[40%]">
          {/* Generation + gallery — single workspace panel */}
          <div className="flex-1 min-h-0 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md flex flex-col overflow-hidden shadow-lg shadow-black/15">
            <h2 className="text-sm font-bold uppercase tracking-widest px-3 pt-2.5 pb-1.5 flex-shrink-0 border-b border-white/10" style={goldTextStyle}>
              Reference workspace
            </h2>
            <div className="flex-1 min-h-[120px] min-w-0 flex flex-col items-stretch justify-center p-2 overflow-y-auto overflow-x-hidden">
              {compareSplit && store.currentLiveImageUrl ? (
                  <>
                    <div className="flex w-full max-w-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-4">
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center lg:max-w-[min(100%,calc(50%-0.5rem))]">
                        <div
                          className="group/ref mx-auto cursor-zoom-in overflow-hidden rounded-xl border border-amber-500/20 bg-black/55 shadow-inner"
                          style={previewFrameCompare}
                        >
                          <div className="pointer-events-none absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/30 bg-black/50 text-amber-200/90">
                            Reference
                          </div>
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-2 transition-transform duration-300 ease-out will-change-transform origin-center group-hover/ref:scale-[1.08] group-hover/ref:z-10">
                            {activeReferenceForCompare ? (
                              <ArcsStorageImg
                                src={activeReferenceForCompare}
                                alt="Reference slot image"
                                className="max-h-full max-w-full object-contain object-center"
                              />
                            ) : (
                              <div className="flex max-h-full w-full items-center justify-center px-3 text-center text-white/50 text-xs">
                                No reference image in slots — add one on the left
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center lg:max-w-[min(100%,calc(50%-0.5rem))]">
                        <div
                          className="group/live mx-auto cursor-zoom-in overflow-hidden rounded-xl border border-amber-500/35 bg-black/55 shadow-inner"
                          style={previewFrameCompare}
                        >
                          <div className="pointer-events-none absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/30 bg-black/50 text-amber-200/90">
                            Generated
                          </div>
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-2 transition-transform duration-300 ease-out will-change-transform origin-center group-hover/live:scale-[1.08] group-hover/live:z-10">
                            <ArcsStorageImg
                              src={store.currentLiveImageUrl}
                              alt="Live character"
                              className="max-h-full max-w-full object-contain object-center"
                            />
                          </div>
                          {store.generationStatus !== 'idle' && (
                            <div
                              className={`absolute inset-0 z-[25] flex flex-col items-center justify-center gap-1 bg-black/65 px-2 text-center ${
                                store.generationStatus === 'pending' ? 'pointer-events-auto' : 'pointer-events-none'
                              }`}
                            >
                              {store.generationStatus === 'pending' && (
                                <span className="text-[9px] font-mono animate-pulse" style={goldTextStyle}>
                                  {STATUS_BREADCRUMBS[statusStep]}
                                </span>
                              )}
                              {store.generationStatus === 'safety_blocked' && (
                                <span className="text-[9px] text-amber-200/90 leading-snug">
                                  Prompt restricted by safety filters. Adjust and try again.
                                </span>
                              )}
                              {store.generationStatus === 'error' && store.generationStatusMessage && (
                                <span className="text-[9px] text-red-200/90 leading-snug">
                                  {store.generationStatusMessage}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="pointer-events-auto absolute bottom-2 right-2 z-30 flex items-center gap-1">
                            <Tooltip variant="character" content="View full size with zoom" side="left">
                              <button
                                type="button"
                                onClick={() => {
                                  setZoomModalNatural(null);
                                  setZoomLevel(1);
                                  setShowZoomModal(true);
                                }}
                                className="p-2 rounded-lg bg-black/60 border border-amber-500/40 hover:bg-amber-500/20"
                              >
                                <Expand
                                  className="w-4 h-4"
                                  style={{ color: 'var(--color-gold, #fcf6ba)' }}
                                />
                              </button>
                            </Tooltip>
                            <Tooltip variant="character" content="Delete this image" side="left">
                              <button
                                type="button"
                                onClick={() => discardLiveCharacterImage()}
                                className="p-2 rounded-lg bg-black/60 border border-amber-500/40 hover:bg-amber-500/20"
                                aria-label="Delete image"
                              >
                                <Trash2
                                  className="w-4 h-4"
                                  style={{ color: 'var(--color-gold, #fcf6ba)' }}
                                />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 max-w-xl text-center text-[10px] text-emerald-200/60">
                      Compare on — hover either panel to zoom ({aspectSessionLabel}). Turn Compare off for Live + pose slot.
                    </p>
                  </>
              ) : (
                <>
                  <div className="flex w-full flex-1 min-h-[104px] flex-row flex-wrap items-center justify-center gap-2 py-0.5">
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <div
                        className="group/live relative cursor-zoom-in overflow-hidden rounded-xl border border-amber-500/35 bg-black/55 shadow-inner"
                        style={dualSlotFrameStyle}
                      >
                        <div className="pointer-events-none absolute top-1 left-1 z-20 rounded-full border border-amber-500/30 bg-black/50 px-1.5 py-0.5 text-[8px] font-bold text-amber-200/90">
                          Live
                        </div>
                        {store.currentLiveImageUrl ? (
                          <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center p-1.5 transition-transform duration-300 ease-out will-change-transform origin-center group-hover/live:scale-[1.06] group-hover/live:z-10">
                            <ArcsStorageImg
                              src={store.currentLiveImageUrl}
                              alt="Live character"
                              className="max-h-full max-w-full object-contain object-center"
                            />
                          </div>
                        ) : (
                          <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center px-1.5 text-center">
                            <span className="text-[8px] leading-tight text-white/45">
                              {store.dnaLock ? 'DNA locked' : 'No live image'}
                            </span>
                          </div>
                        )}
                        {store.generationStatus !== 'idle' && (
                          <div
                            className={`absolute inset-0 z-[25] flex flex-col items-center justify-center gap-0.5 bg-black/65 px-1 text-center ${
                              store.generationStatus === 'pending' ? 'pointer-events-auto' : 'pointer-events-none'
                            }`}
                          >
                            {store.generationStatus === 'pending' && (
                              <span className="text-[8px] font-mono animate-pulse leading-tight" style={goldTextStyle}>
                                {STATUS_BREADCRUMBS[statusStep]}
                              </span>
                            )}
                            {store.generationStatus === 'safety_blocked' && (
                              <span className="text-[8px] leading-tight text-amber-200/90">Safety blocked — adjust prompt</span>
                            )}
                            {store.generationStatus === 'error' && store.generationStatusMessage && (
                              <span className="text-[8px] leading-tight break-words text-red-200/90">
                                {store.generationStatusMessage}
                              </span>
                            )}
                          </div>
                        )}
                        {store.currentLiveImageUrl ? (
                          <div className="pointer-events-auto absolute bottom-1 right-1 z-30 flex items-center gap-0.5">
                            <Tooltip variant="character" content="View full size" side="left">
                              <button
                                type="button"
                                onClick={() => {
                                  setZoomModalNatural(null);
                                  setZoomLevel(1);
                                  setShowZoomModal(true);
                                }}
                                className="rounded-md border border-amber-500/40 bg-black/60 p-1 hover:bg-amber-500/20"
                              >
                                <Expand className="h-3 w-3" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
                              </button>
                            </Tooltip>
                            <Tooltip variant="character" content="Delete live image" side="left">
                              <button
                                type="button"
                                onClick={() => discardLiveCharacterImage()}
                                className="rounded-md border border-amber-500/40 bg-black/60 p-1 hover:bg-amber-500/20"
                                aria-label="Delete image"
                              >
                                <Trash2 className="h-3 w-3" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
                              </button>
                            </Tooltip>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {([0] as const).map((poseSlotIdx) => {
                      const pose = store.poses[poseSlotIdx];
                      const selected = Boolean(pose && store.selectedPoseId === pose.id);
                      return (
                        <div key={poseSlotIdx} className="flex flex-col items-center gap-0.5 shrink-0">
                          <div
                            className={`relative overflow-hidden rounded-xl border bg-black/50 shadow-inner ${
                              selected ? 'border-amber-500 ring-2 ring-amber-500/40' : 'border-white/20'
                            }`}
                            style={dualSlotFrameStyle}
                          >
                            <div className="pointer-events-none absolute top-1 left-1 z-20 rounded-full border border-amber-500/30 bg-black/50 px-1.5 py-0.5 text-[8px] font-bold text-amber-200/90">
                              Pose {poseSlotIdx + 1}
                            </div>
                            {pose ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    store.setSelectedPoseId(pose.id);
                                    if (pose.imageUrl) {
                                      store.setCurrentLiveImageUrl(pose.imageUrl);
                                    }
                                  }}
                                  className="absolute inset-0 z-0 block text-left"
                                  aria-label={pose.name ?? `Pose ${poseSlotIdx + 1}`}
                                />
                                {pose.imageUrl ? (
                                  <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden">
                                    <ArcsStorageImg
                                      src={pose.imageUrl}
                                      alt={pose.name ?? 'Pose'}
                                      className="h-full w-full object-cover object-center"
                                    />
                                  </div>
                                ) : (
                                  <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center text-[8px] text-white/45">
                                    Empty
                                  </div>
                                )}
                                <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between gap-0.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-0.5">
                                  <div className="pointer-events-auto flex gap-0.5">
                                    <Tooltip variant="character" content="Duplicate" side="top">
                                      <button
                                        type="button"
                                        className="rounded border border-white/20 bg-black/75 p-0.5 text-white/90 hover:bg-amber-500/25"
                                        aria-label="Duplicate pose"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          store.addPose({
                                            name: pose.name?.trim() ? `Copy · ${pose.name}` : 'Copy · Pose',
                                            imageUrl: pose.imageUrl,
                                          });
                                        }}
                                      >
                                        <Copy className="h-2.5 w-2.5" />
                                      </button>
                                    </Tooltip>
                                    <Tooltip variant="character" content="To reference slot" side="top">
                                      <button
                                        type="button"
                                        className="rounded border border-white/20 bg-black/75 p-0.5 text-white/90 hover:bg-amber-500/25 disabled:opacity-40"
                                        aria-label="Send to reference"
                                        disabled={!pose.imageUrl}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          sendPoseImageToFirstEmptyReferenceSlot(pose.imageUrl);
                                        }}
                                      >
                                        <ImagePlus className="h-2.5 w-2.5" />
                                      </button>
                                    </Tooltip>
                                    <Tooltip variant="character" content="Open in new tab" side="top">
                                      <button
                                        type="button"
                                        className="rounded border border-white/20 bg-black/75 p-0.5 text-white/90 hover:bg-amber-500/25 disabled:opacity-40"
                                        aria-label="Open image"
                                        disabled={!pose.imageUrl}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const raw = pose.imageUrl;
                                          if (!raw) return;
                                          void (async () => {
                                            const url =
                                              isSupabaseConfigured() && supabase
                                                ? await resolveArcsGenerationsDisplayUrl(
                                                    supabase,
                                                    raw
                                                  )
                                                : raw;
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                          })();
                                        }}
                                      >
                                        <ExternalLink className="h-2.5 w-2.5" />
                                      </button>
                                    </Tooltip>
                                  </div>
                                  <Tooltip variant="character" content="Delete pose" side="top">
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
                                      className="pointer-events-auto rounded border border-amber-500/40 bg-black/75 p-0.5 hover:bg-amber-500/20"
                                      aria-label="Delete pose"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
                                    </button>
                                  </Tooltip>
                                </div>
                              </>
                            ) : (
                              <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center px-1.5 text-center text-[8px] text-white/40">
                                <span>No pose card</span>
                                <span className="mt-0.5 text-[7px] text-white/35">Add empty pose below</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {store.poses.length > 1 ? (
                    <div className="mt-1 w-full shrink-0 border-t border-white/10 px-1 pt-1.5">
                      <span className="mb-1 block px-1 text-[8px] uppercase tracking-wider text-white/45">
                        More poses ({store.poses.length - 1})
                      </span>
                      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                        {store.poses.slice(1).map((pose) => (
                          <div
                            key={pose.id}
                            className={`relative h-[106px] w-[60px] shrink-0 overflow-hidden rounded-md border ${
                              store.selectedPoseId === pose.id
                                ? 'border-amber-500 ring-1 ring-amber-500/50'
                                : 'border-white/20'
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
                              className="absolute inset-0 z-0 block"
                            />
                            {pose.imageUrl ? (
                              <ArcsStorageImg src={pose.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[7px] text-white/40">Empty</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                    <p className="mt-1 max-w-[14rem] px-2 text-center text-[9px] text-emerald-200/55">
                    {aspectSessionLabel} — Live + one pose slot; extra poses in the strip below when present. Hover Live to zoom.
                  </p>
                </>
              )}
            </div>

            <div className="shrink-0 min-h-0 max-h-[min(32vh,280px)] flex flex-col border-t border-white/10 bg-black/20">
              <div className="px-3 pt-2 pb-1 shrink-0 space-y-1.5">
                <p className="text-[9px] text-white/50 line-clamp-2 leading-snug">
                  <span className="text-amber-200/80 font-medium">Generate</span> uses tags, refs, and framing below.{' '}
                  <span className="text-white/70">Live preview</span> merges into refs when not in slots.{' '}
                  <span className="text-amber-200/80 font-medium">Alternate pose</span> reuses the stack.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'pose', label: poseSessionLabel },
                    { key: 'aspect', label: aspectSessionLabel },
                    { key: 'cam', label: cameraSessionLabel },
                    { key: 'age', label: `Age ${store.ageModifier}` },
                  ].map(({ key, label }) => (
                    <span
                      key={key}
                      className="inline-flex items-center rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[10px] text-white/80"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                {!phoneCompact &&
                  ((recentCharacters.length > 0) || (getCachedGenerations('character').length > 0)) && (
                  <div className="rounded-lg border border-white/10 bg-black/25 p-2 space-y-2">
                    {recentCharacters.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-white/60 block mb-1">Recent (saved)</span>
                        <div className="flex flex-wrap gap-2">
                          {recentCharacters.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              title={item.displayName ?? item.profileName ?? 'Character'}
                              onClick={() => {
                                store.setCurrentLiveImageUrl(item.imageUrl);
                                if (item.seed != null) store.setCurrentGenerationSeed(item.seed);
                              }}
                              className={`rounded border border-amber-500/30 overflow-hidden hover:border-amber-500/60 transition-transform hover:scale-105 ${
                                store.galleryDensity === 'compact' ? 'w-10 h-10' : 'w-12 h-12'
                              }`}
                            >
                              <ArcsStorageImg src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {getCachedGenerations('character').length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-white/60 block mb-1">This session</span>
                        <div className="flex flex-wrap gap-2">
                          {getCachedGenerations('character').map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                store.setCurrentLiveImageUrl(item.url);
                                if (item.seed != null) store.setCurrentGenerationSeed(item.seed);
                              }}
                              className={`rounded border border-amber-500/30 overflow-hidden hover:border-amber-500/60 transition-transform hover:scale-105 ${
                                store.galleryDensity === 'compact' ? 'w-10 h-10' : 'w-12 h-12'
                              }`}
                            >
                              <ArcsStorageImg src={item.url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-white/10 bg-black/35 p-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {!phoneCompact && (
                  <>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/90">Thumbnails</span>
                <button
                  type="button"
                  aria-pressed={store.galleryDensity === 'compact'}
                  onClick={() => store.setGalleryDensity('compact')}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border-2 transition-all ${
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
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border-2 transition-all ${
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
                  </>
                )}
                <button
                  type="button"
                  aria-pressed={compareSplit}
                  onClick={() => setCompareSplit((v) => !v)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border-2 transition-all ${
                    compareSplit
                      ? 'text-emerald-950 border-amber-500 shadow-md'
                      : 'text-emerald-200/80 border-emerald-700/50 hover:border-amber-500/60 bg-black/30'
                  }`}
                  style={compareSplit ? { background: ACCENT_GOLD_GRADIENT } : undefined}
                >
                  Compare {compareSplit ? 'On' : 'Off'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Tooltip
                  variant="character"
                  content="Adds a blank pose card only (no API call). To generate, use the gold Generate image button. After a good result, use Save New Pose to store the live frame on a card."
                  side="top"
                >
                  <button
                    type="button"
                    onClick={() => store.addPose({})}
                    className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-amber-500/40 hover:bg-amber-500/20"
                  >
                    <span className="inline-block" style={goldTextStyle}>Add empty pose</span>
                  </button>
                </Tooltip>
                <Tooltip
                  variant="character"
                  content="Runs the image API using Tags & Style, all Reference slots (left), the live preview merged into refs if needed, plus gallery framing (aspect ratio, age slider, pose name). Main action for new images. Shortcut: ⌘/Ctrl+Enter."
                  side="top"
                >
                  <button
                    type="button"
                    onClick={handleGenerateCharacter}
                    disabled={store.generationStatus === 'pending'}
                    className="px-2.5 py-1 rounded-full text-[10px] font-medium text-black border border-amber-600/50 hover:text-emerald-400 transition-colors disabled:opacity-90 disabled:cursor-wait"
                    style={
                      store.generationStatus === 'pending'
                        ? { background: GEM_EMERALD, boxShadow: `0 0 16px ${GEM_EMERALD}` }
                        : { background: ACCENT_GOLD_GRADIENT }
                    }
                  >
                    {store.generationStatus === 'pending' ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block w-3.5 h-3.5 rounded-sm rotate-45 animate-pulse"
                          style={{ background: GEM_EMERALD, boxShadow: `0 0 10px ${GEM_EMERALD}` }}
                          aria-label="Generating..."
                        />
                        <span className="animate-pulse">Working…</span>
                      </span>
                    ) : (
                      'Generate image'
                    )}
                  </button>
                </Tooltip>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] uppercase tracking-wider text-emerald-200/60">Seed</span>
                  <button
                    type="button"
                    onClick={() => store.setSeedMode('randomized')}
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${
                      (store.seedMode ?? 'randomized') === 'randomized'
                        ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                        : 'border-white/20 text-emerald-200/70 hover:bg-white/10'
                    }`}
                  >
                    Random
                  </button>
                  <button
                    type="button"
                    onClick={() => store.setSeedMode('locked')}
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${
                      store.seedMode === 'locked'
                        ? 'border-amber-500/60 bg-amber-500/15'
                        : 'border-white/20 text-emerald-200/70 hover:bg-white/10'
                    }`}
                  >
                    <span className="inline-block" style={goldTextStyle}>Lock</span>
                  </button>
                </div>
                <Tooltip
                  variant="character"
                  content="Same pipeline as Generate image (tags, refs, live preview merge, gallery framing), then adds “alternate pose, same character.” Requires a live preview and/or at least one reference slot."
                  side="top"
                >
                  <button
                    type="button"
                    onClick={handleGenerateAlternate}
                    disabled={
                      store.generationStatus === 'pending' ||
                      (!store.currentLiveImageUrl && !store.referenceImageUrls.some(Boolean))
                    }
                    className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-amber-500/40 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="inline-block" style={goldTextStyle}>Alt pose</span>
                  </button>
                </Tooltip>
                <button
                  type="button"
                  onClick={() => void handleGenerateCharacter()}
                  disabled={store.generationStatus === 'pending'}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-emerald-500/40 hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  <span className="inline-block text-emerald-200/90">Run again</span>
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
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-white/25 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Undo gen
                </button>
                <button
                  type="button"
                  onClick={() => openSaveCharacterModal(false)}
                  disabled={!store.currentLiveImageUrl}
                  className="px-2.5 py-1 rounded-full border border-amber-500/50 font-medium text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="inline-block" style={goldTextStyle}>Save character</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewPose}
                  disabled={!store.currentLiveImageUrl}
                  className="px-2.5 py-1 rounded-full border border-amber-500/50 font-medium text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="inline-block" style={goldTextStyle}>Save pose</span>
                </button>
                <button
                  type="button"
                  onClick={() => openSaveCharacterModal(true)}
                  disabled={!store.selectedPoseId || !store.currentLiveImageUrl}
                  className="px-2.5 py-1 rounded-full border border-amber-500/50 font-medium text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="inline-block" style={goldTextStyle}>Save profile</span>
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
                    className="px-2.5 py-1 rounded-full border border-white/20 font-medium text-[10px] cursor-not-allowed opacity-60"
                  >
                    <span className="inline-block" style={goldTextStyle}>Cast</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="text-[9px] uppercase tracking-wider text-white/55 shrink-0">Age</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={store.ageModifier}
                  onChange={(e) => store.setAgeModifier(Number(e.target.value))}
                  className="w-20 sm:w-28 accent-amber-500 shrink-0"
                />
                <span className="text-[10px] w-6 tabular-nums inline-block shrink-0" style={goldTextStyle}>
                  {store.ageModifier}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-white/55 shrink-0 ml-1">Aspect</span>
                <div className="flex flex-wrap gap-1">
                  {(['9:16', '1:1', '21:9'] as AspectRatioId[]).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => store.setAspectRatio(ratio)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-medium border transition-all ${
                        store.aspectRatio === ratio
                          ? 'text-black border-amber-600/80'
                          : 'bg-white/5 border border-white/20 hover:border-amber-500/50 text-emerald-200/80'
                      }`}
                      style={store.aspectRatio === ratio ? { background: ACCENT_GOLD_GRADIENT } : undefined}
                    >
                      {ratio === '9:16' ? '9:16' : ratio === '21:9' ? '21:9' : '1:1'}
                    </button>
                  ))}
                </div>
                <span className="text-[9px] uppercase tracking-wider text-white/55 shrink-0">Cam</span>
                <div className="flex flex-wrap gap-1">
                  {CINEMATIC_OPTIONS.angle.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => store.setCinematic('angle', opt)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-medium border transition-all ${
                        (store.cinematic.angle || '') === opt
                          ? 'text-black border-amber-600/80'
                          : 'bg-white/5 border border-white/20 hover:border-amber-500/50 text-emerald-200/80'
                      }`}
                      style={(store.cinematic.angle || '') === opt ? { background: ACCENT_GOLD_GRADIENT } : undefined}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
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
        selectedUrl={
          recallSlotIndex != null ? store.referenceImageUrls[recallSlotIndex] ?? null : null
        }
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
            <p className="text-[10px] text-white/45 mb-2">
              Press Enter in a field to save, or focus the dialog (click the heading) and press Enter when Save is enabled.
              Escape cancels.
            </p>
            <SearchableVaultSelect
              id="save-character-profile"
              label="Profile name (required)"
              value={saveCharacterProfileName}
              onChange={(v) => {
                setSaveCharacterProfileName(v);
                if (saveCharacterError) setSaveCharacterError(null);
              }}
              options={vaultProfileOptions}
              loading={vaultProfileLoading}
              placeholder={
                saveCharacterIsEditProfile
                  ? 'Search existing profiles…'
                  : 'New profile name, or pick an existing one…'
              }
              autoFocus
              onEnterPress={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const dis =
                  saveCharacterIsEditProfile
                    ? saveCharacterSubmitting ||
                      vaultProfileLoading ||
                      !getMatchedExistingProfile(saveCharacterProfileName)
                    : saveCharacterSubmitting || !saveCharacterProfileName.trim();
                if (!dis) void handleSaveCharacterModalConfirm();
              }}
              helperSlot={
                <p className="text-[11px] text-white/55">
                  {vaultProfileLoading
                    ? 'Loading profiles…'
                    : vaultProfileOptions.length === 0
                      ? saveCharacterIsEditProfile
                        ? 'No existing profiles found. Use “Save new character” with a typed name, or create a profile elsewhere first.'
                        : 'No existing profiles yet — enter a new profile name.'
                      : saveCharacterIsEditProfile
                        ? saveCharacterProfileName.trim() &&
                            !getMatchedExistingProfile(saveCharacterProfileName)
                          ? 'Choose an existing profile from the list (or type until it matches exactly). “Save new character” creates a new profile.'
                          : '\u00A0'
                        : 'Click a row to pick an existing profile, or type a new profile name.'}
                </p>
              }
            />
            <label className="block text-sm font-medium text-white/80 mb-1">Cast name (optional)</label>
            <input
              type="text"
              value={saveCharacterCastName}
              onChange={(e) => setSaveCharacterCastName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const dis =
                  saveCharacterIsEditProfile
                    ? saveCharacterSubmitting ||
                      vaultProfileLoading ||
                      !getMatchedExistingProfile(saveCharacterProfileName)
                    : saveCharacterSubmitting || !saveCharacterProfileName.trim();
                if (!dis) void handleSaveCharacterModalConfirm();
              }}
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
                    ? saveCharacterSubmitting ||
                      vaultProfileLoading ||
                      !getMatchedExistingProfile(saveCharacterProfileName)
                    : saveCharacterSubmitting || !saveCharacterProfileName.trim()
                }
                className="px-3 py-2 rounded-lg text-sm font-medium text-black border border-amber-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: ACCENT_GOLD_GRADIENT }}
              >
                {saveCharacterSubmitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-size image modal — fit-to-viewport baseline, zoom relative to fit, top-aligned scroll */}
      {showZoomModal && store.currentLiveImageUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="View image full size"
        >
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-black/95 px-4 py-2 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.15, z - 0.25))}
                className="p-2 rounded-lg border border-amber-500/40 hover:bg-amber-500/20"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-5 h-5" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
              </button>
              <span className="min-w-[4rem] text-sm tabular-nums" style={goldTextStyle}>
                {Math.round(zoomLevel * 100)}% of fit
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
                className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
              >
                <span className="inline-block" style={goldTextStyle}>
                  Fit
                </span>
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
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-4">
            <ArcsStorageImg
              src={store.currentLiveImageUrl}
              alt="Full size character reference"
              onLoad={(e) => {
                const el = e.currentTarget;
                if (el.naturalWidth > 0 && el.naturalHeight > 0) {
                  setZoomModalNatural({ w: el.naturalWidth, h: el.naturalHeight });
                }
              }}
              className="h-auto w-auto rounded object-contain shadow-lg"
              style={
                zoomModalLayout.displayW != null
                  ? {
                      width: zoomModalLayout.displayW,
                      maxWidth: 'min(calc(100vw - 1.5rem), 100%)',
                      height: 'auto',
                    }
                  : {
                      maxHeight: 'calc(100dvh - 6rem)',
                      maxWidth: 'min(calc(100vw - 1.5rem), 100%)',
                    }
              }
            />
          </div>
        </div>
      )}

    {refHoverPreview &&
      typeof document !== 'undefined' &&
      createPortal(
        <div
          className="pointer-events-none fixed z-[9999] w-56 overflow-hidden rounded-xl border-2 border-amber-400 bg-neutral-950 shadow-2xl ring-2 ring-black/50"
          style={{
            left: Math.min(refHoverPreview.x, window.innerWidth - 200),
            top: Math.min(refHoverPreview.y, window.innerHeight - 320),
            maxHeight: 'min(80vh, 520px)',
          }}
        >
          <ArcsStorageImg
            src={refHoverPreview.url}
            alt=""
            className="h-full max-h-[min(80vh,520px)] w-full object-contain"
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
