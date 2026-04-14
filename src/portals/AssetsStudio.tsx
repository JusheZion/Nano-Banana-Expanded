import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive,
  Boxes,
  Expand,
  LayoutGrid,
  Paintbrush,
  Pin,
  PinOff,
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
import { Tooltip, PinnedHelpTooltip } from '@/shared/components/Tooltip';
import { useAssetStudioStore } from '@/stores/assetStudioStore';
import { useStudioImportBridge } from '@/stores/studioImportBridge';
import { buildAssetStudioPrompt } from '@/shared/utils/assetStudioPrompt';
import {
  ASSET_SCENE_EMPTY_OF_FIGURES_CONSTRAINT,
  buildAssetPromptWithReferenceStyle,
  getEffectiveGeminiAspectRatioForAsset,
} from '@/shared/utils/assetGenerationPromptWrappers';
import {
  ASSET_STUDIO_BG,
  ACCENT_GOLD_GRADIENT,
  ASSET_STUDIO_AMETHYST_TEXT,
  GEM_AMETHYST,
} from '@/shared/theme/Phase12DesignTokens';
import { getSlotLabel } from '@/shared/constants/referenceSlots';
import { getSurgicalInstructionsFromReferenceSlots } from '@/shared/utils/buildPrompt';
import {
  ART_STYLE_FLAGSHIP,
  ART_STYLE_LIBRARY,
  ERA_STYLE_TAGS,
  LOCATION_TYPE_TAGS,
  ARCHITECTURAL_DETAIL_TAGS,
  SET_DRESSING_PRESETS,
  CINEMATIC_OPTIONS,
  SPATIAL_ROOM_OPTIONS,
  SPATIAL_URBAN_OPTIONS,
  TIME_SEASON_OPTIONS,
  SPATIAL_GALLERY_CAMERA_ANGLE_OPTIONS,
  type SetDressingCategory,
  type AssetCinematicKey,
  type AspectRatioId,
} from '@/data/asset_studio_spec';
import { saveGeneration } from '@/shared/utils/generationOutputRouter';
import { getStoryPhotoCollections, addCharacterRefToStory } from '@/shared/utils/storyPhotoCollections';
import { generateImage } from '@/shared/api/geminiImageApi';
import { saveAssetToDb } from '@/shared/api/arcsPersistence';
import { getAssetAlbums } from '@/shared/api/arcsAssetVault';
import {
  addCachedGeneration,
  getCachedGenerations,
  removeCachedGenerationByUrl,
} from '@/shared/utils/generationSessionCache';
import {
  studioPreviewFrameStyle,
  type StudioPreviewAspectId,
} from '@/shared/utils/studioPreviewLayout';
import {
  addRecentFromAsset,
  getRecentAssets,
  removeRecentByImageUrl,
  type RecentGeneration,
} from '@/shared/utils/recentGenerations';
import { pickGenerationSeed } from '@/shared/utils/generationSeed';
import { ModifierRibbon } from '@/components/ui/ModifierRibbon';
import { ArchiveRecallModal } from '@/components/ui/ArchiveRecallModal';
import { ArcsStorageImg } from '@/components/ui/ArcsStorageImg';

const goldTextStyle: React.CSSProperties = {
  background: ACCENT_GOLD_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

const chipInactive =
  'bg-white/5 border border-white/20 hover:border-amber-500/50';

/** Shown on spatial expansion chips (Room / Urban / Time). */
const SPATIAL_CHIP_TOOLTIP =
  'Adds this to the live prompt. Use Expand Setting for a new shot from the current preview; Generate Asset runs the full prompt again (often a variation).';

const ASPECT_RATIO_CHIP_TOOLTIP =
  'Output aspect for the next Generate Asset or Expand Setting.';

const CAMERA_ANGLE_CHIP_TOOLTIP =
  'Lens / framing style for the prompt; may combine with aspect for the effective render ratio.';

function Chip({
  label,
  active,
  onClick,
  tooltip,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  /** Optional hover tooltip (Radix). */
  tooltip?: string;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      className={`group px-3.5 py-2 rounded-full text-sm font-medium tracking-wide transition-all duration-200 border ${active ? 'text-black hover:text-violet-300 border-amber-600/80 shadow-[0_0_10px_rgba(191,149,63,0.4)]' : chipInactive}`}
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
  if (!tooltip) return button;
  return (
    <Tooltip variant="asset" content={tooltip} side="top">
      {button}
    </Tooltip>
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
        className="bg-black/40 text-white border border-white/20 rounded px-2 py-2 text-sm min-w-0 flex-1 basis-24"
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
        className="flex-1 min-w-0 bg-black/40 text-white placeholder-white/40 px-2 py-2 rounded text-sm border border-white/10"
      />
      <button
        type="button"
        onClick={handleSave}
        className="px-3 py-2.5 rounded-lg text-black text-sm font-bold border border-amber-600/50"
        style={{ background: ACCENT_GOLD_GRADIENT }}
      >
        Save as Tag
      </button>
    </div>
  );
}

function SetDressingRow({
  category,
  presets,
  selected,
  library,
  onToggle,
  onRemoveLibrary,
}: {
  category: SetDressingCategory;
  presets: readonly string[];
  selected: string[];
  library: string[];
  onToggle: (v: string) => void;
  onRemoveLibrary?: (value: string) => void;
}) {
  const allOptions = [...presets, ...library];
  const label = category.replace(/([A-Z])/g, ' $1').trim();
  return (
    <div>
      <h3 className="text-sm mb-2 inline-block font-semibold" style={goldTextStyle}>{label}</h3>
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

export const AssetsStudio: React.FC = () => {
  const { setTheme } = useTheme();
  const { isPhone } = useResponsiveLayout();
  const phoneCompact = isPhone;
  const store = useAssetStudioStore();
  const [customStyleInput, setCustomStyleInput] = useState('');
  const [statusStep, setStatusStep] = useState(0);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [compareSplit, setCompareSplit] = useState(false);
  const [recallSlotIndex, setRecallSlotIndex] = useState<number | null>(null);
  const [showSaveAssetModal, setShowSaveAssetModal] = useState(false);
  const [saveAssetCollectionName, setSaveAssetCollectionName] = useState('');
  const [saveAssetAssetName, setSaveAssetAssetName] = useState('');
  const [saveAssetMode, setSaveAssetMode] = useState<'new' | 'library'>('new');
  const [vaultCollectionOptions, setVaultCollectionOptions] = useState<string[]>([]);
  const [vaultCollectionLoading, setVaultCollectionLoading] = useState(false);
  const [recentAssets, setRecentAssets] = useState<RecentGeneration[]>([]);
  const [promptPanelTab, setPromptPanelTab] = useState<'auto' | 'edit' | 'refine'>('auto');
  const [snippetNameInput, setSnippetNameInput] = useState('');
  const [snippetTextInput, setSnippetTextInput] = useState('');
  const generateAssetRef = useRef<() => Promise<void>>(async () => {});
  const [refHoverPreview, setRefHoverPreview] = useState<{
    url: string;
    x: number;
    y: number;
  } | null>(null);
  type AssetLeftModule = 'hub' | 'structural' | 'material';
  const [leftModule, setLeftModule] = useState<AssetLeftModule>('hub');
  const [promptPinned, setPromptPinned] = useState(true);
  const [focusedReferenceSlotIndex, setFocusedReferenceSlotIndex] = useState(0);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const uploadSlotIndexRef = useRef<number | null>(null);

  const REFINE_SUGGEST_CHIPS = [
    'Softer ambient light',
    'Wider establishing shot',
    'More detail in foreground',
    'Different time of day',
    'Richer materials',
  ];

  const STATUS_BREADCRUMBS = [
    'Scanning DNA/Architecture...',
    'Contacting Onyx Vault...',
    'Crystallizing Render...',
  ];

  useEffect(() => {
    setTheme('purple');
  }, [setTheme]);

  useEffect(() => {
    if (!phoneCompact) return;
    setLeftModule('hub');
    setPromptPanelTab('edit');
    setPromptPinned(true);
  }, [phoneCompact]);

  const consumeImportForTarget = useStudioImportBridge((s) => s.consumeImportForTarget);

  useEffect(() => {
    const chunk = consumeImportForTarget('assets');
    if (chunk?.imageUrl) {
      useAssetStudioStore.getState().setCurrentLiveImageUrl(chunk.imageUrl);
      if (chunk.promptHint?.trim()) {
        useAssetStudioStore.getState().setLastUsedPrompt(chunk.promptHint.trim());
      }
    }
  }, [consumeImportForTarget]);

  useEffect(() => {
    setRecentAssets(getRecentAssets());
  }, []);

  useEffect(() => {
    if (store.generationStatus !== 'pending') return;
    const id = setInterval(() => {
      setStatusStep((s) => (s + 1) % STATUS_BREADCRUMBS.length);
    }, 2500);
    return () => clearInterval(id);
  }, [store.generationStatus]);

  const effectiveAspectRatio = useMemo(
    () =>
      getEffectiveGeminiAspectRatioForAsset(store.aspectRatio, store.cinematic.angle),
    [store.aspectRatio, store.cinematic.angle]
  );

  const assetSessionChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [
      { key: 'aspect', label: `Aspect ${store.aspectRatio}` },
      { key: 'out', label: `Output ${effectiveAspectRatio}` },
    ];
    if (store.cinematic.angle) {
      chips.push({ key: 'cam', label: store.cinematic.angle });
    }
    if (store.spatialRoomOption) {
      chips.push({ key: 'room', label: store.spatialRoomOption });
    }
    if (store.spatialUrbanOption) {
      chips.push({ key: 'urban', label: store.spatialUrbanOption });
    }
    if (store.timeSeason) {
      chips.push({ key: 'time', label: store.timeSeason });
    }
    return chips;
  }, [
    store.aspectRatio,
    effectiveAspectRatio,
    store.cinematic.angle,
    store.spatialRoomOption,
    store.spatialUrbanOption,
    store.timeSeason,
  ]);

  const settingAndLocationDisabled = store.architecturalLock;

  const extraParts: string[] = [
    store.artStyleId === 'flagship' ? ART_STYLE_FLAGSHIP : store.artStyleId,
    ...(settingAndLocationDisabled ? [] : store.eraStyleSelection),
    ...(settingAndLocationDisabled ? [] : store.locationTypeSelection),
    ...(settingAndLocationDisabled ? [] : store.architecturalDetailSelection),
    ...(settingAndLocationDisabled ? [] : Object.values(store.setDressingSelections).flat()),
    ...Object.values(store.cinematic).filter(Boolean),
    ...(store.spatialRoomOption ? [store.spatialRoomOption] : []),
    ...(store.spatialUrbanOption ? [store.spatialUrbanOption] : []),
    ...(store.timeSeason ? [store.timeSeason] : []),
    ...(effectiveAspectRatio ? [`aspect ratio ${effectiveAspectRatio}`] : []),
  ].filter(Boolean);

  const spatialExpansionLine = [
    store.spatialRoomOption,
    store.spatialUrbanOption,
    store.timeSeason,
  ]
    .filter(Boolean)
    .join(', ');

  const compiledPrompt =
    store.vaultPromptOverride.trim()
      ? [
          store.vaultPromptOverride.trim(),
          spatialExpansionLine ? `Spatial expansion: ${spatialExpansionLine}.` : '',
          effectiveAspectRatio ? `Output aspect ratio ${effectiveAspectRatio}.` : '',
        ]
          .filter(Boolean)
          .join('\n\n')
      : buildAssetStudioPrompt(store.tags, '', extraParts, {
          assetModifiers: store.assetModifiers,
          setDressingSelections: store.setDressingSelections,
        });
  const displayPrompt =
    store.currentGenerationSeed != null
      ? `${compiledPrompt}\n\nUse seed: ${store.currentGenerationSeed} for consistency with the reference image.`
      : compiledPrompt;

  const stories = getStoryPhotoCollections();
  const hasStories = stories.length > 0;

  const artStyleLabel =
    store.artStyleId === 'flagship' ? ART_STYLE_FLAGSHIP : store.artStyleId;

  const discardLiveAssetImage = () => {
    const url = store.currentLiveImageUrl;
    if (url) {
      removeRecentByImageUrl(url, 'asset');
      removeCachedGenerationByUrl('asset', url);
      if (url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
      }
      setRecentAssets(getRecentAssets());
    }
    store.setCurrentLiveImageUrl(null);
  };

  const getMatchedExistingCollection = (typed: string): string | null => {
    const q = typed.trim();
    if (!q) return null;
    const lower = q.toLowerCase();
    return vaultCollectionOptions.find((c) => c.toLowerCase() === lower) ?? null;
  };

  const handleGenerateAsset = async () => {
    store.setGenerationStatus('pending');
    const seed = pickGenerationSeed(store.seedMode ?? 'randomized', store.currentGenerationSeed);
    store.setCurrentGenerationSeed(seed);
    const refUrls = store.referenceImageUrls.length > 0
      ? store.referenceImageUrls
      : store.currentLiveImageUrl
        ? [store.currentLiveImageUrl]
        : [];
    const refUrlsForApi = Array.from(
      { length: 14 },
      (_, i) => (refUrls[i] ?? '')
    );
    const basePrompt =
      refUrls.length > 0
        ? buildAssetPromptWithReferenceStyle(compiledPrompt, artStyleLabel)
        : compiledPrompt;
    const surgical = getSurgicalInstructionsFromReferenceSlots(
      store.referenceImageUrls.length > 0 ? store.referenceImageUrls : refUrlsForApi,
      'asset'
    );
    let promptForApi =
      surgical.length > 0 ? `${basePrompt}\n\n${surgical.join(' ')}` : basePrompt;
    const isVaultOverride = Boolean(store.vaultPromptOverride.trim());
    if (!isVaultOverride) {
      promptForApi = `${promptForApi}\n\n${ASSET_SCENE_EMPTY_OF_FIGURES_CONSTRAINT}`;
    }
    const result = await generateImage({
      prompt: promptForApi,
      referenceImageUrls: refUrlsForApi,
      seed,
      aspectRatio: effectiveAspectRatio,
      modelId: store.selectedOnyxModelId,
      isVaultOverride,
      context: 'asset',
    });
    if (result.ok) {
      if (store.currentLiveImageUrl) {
        store.setPreviousLiveSnapshot(store.currentLiveImageUrl, store.currentGenerationSeed);
      }
      store.setLastUsedPrompt(promptForApi);
      store.setCurrentLiveImageUrl(result.imageDataUrl);
      store.setCurrentGenerationSeed(seed);
      store.setGenerationStatus('idle');
      addCachedGeneration('asset', { url: result.imageDataUrl, seed });
    } else if ('blocked' in result && result.blocked) {
      store.setGenerationStatus('safety_blocked', 'Prompt restricted by safety filters. Please adjust and try again.');
    } else if ('error' in result) {
      store.setGenerationStatus('error', result.error);
    }
  };

  generateAssetRef.current = handleGenerateAsset;

  const handleRefineAsset = async () => {
    const live = store.currentLiveImageUrl;
    const refinement = store.refinementPromptOverride.trim();
    if (!live || !refinement) return;
    store.setGenerationStatus('pending');
    const seed = pickGenerationSeed(store.seedMode ?? 'randomized', store.currentGenerationSeed);
    store.setCurrentGenerationSeed(seed);
    const refUrlsForApi = Array.from({ length: 14 }, (_, i) => (i === 0 ? live : ''));
    const promptForApi = `Apply this art style to the entire image. Art style: ${artStyleLabel}. Refine this environment or asset image according to these instructions while preserving style and readable composition: ${refinement}`;
    const result = await generateImage({
      prompt: promptForApi,
      referenceImageUrls: refUrlsForApi,
      seed,
      aspectRatio: effectiveAspectRatio,
      modelId: store.selectedOnyxModelId,
      isVaultOverride: false,
      context: 'asset',
    });
    if (result.ok) {
      if (store.currentLiveImageUrl) {
        store.setPreviousLiveSnapshot(store.currentLiveImageUrl, store.currentGenerationSeed);
      }
      store.setLastUsedPrompt(promptForApi);
      store.setCurrentLiveImageUrl(result.imageDataUrl);
      store.setCurrentGenerationSeed(seed);
      store.setGenerationStatus('idle');
      addCachedGeneration('asset', { url: result.imageDataUrl, seed });
    } else if ('blocked' in result && result.blocked) {
      store.setGenerationStatus('safety_blocked', 'Prompt restricted by safety filters. Please adjust and try again.');
    } else if ('error' in result) {
      store.setGenerationStatus('error', result.error);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && store.generationStatus !== 'pending') {
        e.preventDefault();
        void generateAssetRef.current();
      }
      if (e.key === 'Escape') {
        setShowZoomModal(false);
        setShowSaveAssetModal(false);
        setRecallSlotIndex(null);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store.generationStatus]);

  const openSaveAssetModal = (mode: 'new' | 'library') => {
    setSaveAssetCollectionName('');
    setSaveAssetAssetName('');
    setSaveAssetMode(mode);
    setShowSaveAssetModal(true);

    if (mode === 'library') {
      setVaultCollectionLoading(true);
      getAssetAlbums()
        .then((albums) => setVaultCollectionOptions(albums.map((a) => a.collectionName)))
        .catch(() => setVaultCollectionOptions([]))
        .finally(() => setVaultCollectionLoading(false));
    }
  };

  const handleSaveAssetModalConfirm = async () => {
    const typedCollectionDisplay = saveAssetCollectionName.trim();
    if (!typedCollectionDisplay) return;

    if (saveAssetMode === 'library') {
      const matched = getMatchedExistingCollection(typedCollectionDisplay);
      if (!matched) return;
    }

    const matchedExistingCollection =
      saveAssetMode === 'library'
        ? getMatchedExistingCollection(typedCollectionDisplay)!
        : typedCollectionDisplay;

    const isUnnamed = matchedExistingCollection.toLowerCase() === 'unnamed';
    const baseNameForId = isUnnamed ? 'Unnamed' : matchedExistingCollection;
    const collectionNameForDb = isUnnamed ? undefined : matchedExistingCollection;
    const url = store.currentLiveImageUrl;
    if (!url) return;
    const assetName = saveAssetAssetName.trim() || undefined;
    const result = await saveAssetToDb(store, baseNameForId, collectionNameForDb, assetName);
    if (result.ok && result.id != null && result.imageUrl != null) {
      saveGeneration('asset', result.imageUrl, store.currentGenerationSeed ?? undefined, {
        collectionName: collectionNameForDb,
        assetName,
      });
      addCachedGeneration('asset', {
        url: result.imageUrl,
        seed: store.currentGenerationSeed ?? undefined,
      });
      addRecentFromAsset({
        id: result.id,
        image_url: result.imageUrl,
        collection_name: matchedExistingCollection,
        asset_name: assetName ?? null,
        seed: store.currentGenerationSeed ?? null,
      });
      setRecentAssets(getRecentAssets());
      setShowSaveAssetModal(false);
    } else if (!result.ok && result.error === 'Supabase not configured') {
      saveGeneration('asset', url, store.currentGenerationSeed ?? undefined, {
        collectionName: collectionNameForDb,
        assetName,
      });
      addCachedGeneration('asset', { url, seed: store.currentGenerationSeed ?? undefined });
      setShowSaveAssetModal(false);
    } else {
      if (result.error && result.error !== 'Supabase not configured') {
        store.setGenerationStatus('error', result.error);
      }
    }
  };

  const handleExpandSetting = async () => {
    const primarySeed = pickGenerationSeed(store.seedMode ?? 'randomized', store.currentGenerationSeed);
    store.setCurrentGenerationSeed(primarySeed);
    const expansionSeed = primarySeed + 1;
    store.setGenerationStatus('pending');
    const refUrls = store.referenceImageUrls.length > 0
      ? store.referenceImageUrls
      : store.currentLiveImageUrl
        ? [store.currentLiveImageUrl]
        : [];
    const refUrlsForApi = Array.from(
      { length: 14 },
      (_, i) => (refUrls[i] ?? '')
    );
    const expansionParts = [
      store.spatialRoomOption,
      store.spatialUrbanOption,
      store.timeSeason,
    ].filter(Boolean);
    const expansionBase =
      refUrls.length > 0
        ? buildAssetPromptWithReferenceStyle(compiledPrompt, artStyleLabel)
        : compiledPrompt;
    const surgical = getSurgicalInstructionsFromReferenceSlots(
      store.referenceImageUrls.length > 0 ? store.referenceImageUrls : refUrlsForApi,
      'asset'
    );
    const baseWithSurgical =
      surgical.length > 0 ? `${expansionBase}\n\n${surgical.join(' ')}` : expansionBase;
    const isVaultOverride = Boolean(store.vaultPromptOverride.trim());
    const alreadyHasSpatialExpansionClause = /spatial expansion:/i.test(baseWithSurgical);
    let expansionPrompt =
      expansionParts.length > 0 && !alreadyHasSpatialExpansionClause
        ? `${baseWithSurgical}, spatial expansion: ${expansionParts.join(', ')}`
        : baseWithSurgical;
    if (!isVaultOverride) {
      expansionPrompt = `${expansionPrompt}\n\n${ASSET_SCENE_EMPTY_OF_FIGURES_CONSTRAINT}`;
    }
    const result = await generateImage({
      prompt: expansionPrompt,
      referenceImageUrls: refUrlsForApi,
      seed: expansionSeed,
      aspectRatio: effectiveAspectRatio,
      modelId: store.selectedOnyxModelId,
      isVaultOverride,
      context: 'asset',
    });
    if (result.ok) {
      if (store.currentLiveImageUrl) {
        store.setPreviousLiveSnapshot(store.currentLiveImageUrl, store.currentGenerationSeed);
      }
      store.setLastUsedPrompt(expansionPrompt);
      store.setCurrentLiveImageUrl(result.imageDataUrl);
      store.setCurrentGenerationSeed(expansionSeed);
      store.setGenerationStatus('idle');
      addCachedGeneration('asset', { url: result.imageDataUrl, seed: expansionSeed });
    } else if ('blocked' in result && result.blocked) {
      store.setGenerationStatus('safety_blocked', 'Prompt restricted by safety filters. Please adjust and try again.');
    } else if ('error' in result) {
      store.setGenerationStatus('error', result.error);
    }
  };

  const handleCastInStory = (storyId: string) => {
    const url = store.currentLiveImageUrl;
    if (url) addCharacterRefToStory(storyId, url);
  };

  const toggleEra = (value: string) => {
    const next = store.eraStyleSelection.includes(value)
      ? store.eraStyleSelection.filter((v) => v !== value)
      : [...store.eraStyleSelection, value];
    store.setEraStyleSelection(next);
  };

  const toggleLocation = (value: string) => {
    const next = store.locationTypeSelection.includes(value)
      ? store.locationTypeSelection.filter((v) => v !== value)
      : [...store.locationTypeSelection, value];
    store.setLocationTypeSelection(next);
  };

  const toggleArchitectural = (value: string) => {
    const next = store.architecturalDetailSelection.includes(value)
      ? store.architecturalDetailSelection.filter((v) => v !== value)
      : [...store.architecturalDetailSelection, value];
    store.setArchitecturalDetailSelection(next);
  };

  const toggleSetDressing = (category: SetDressingCategory, value: string) => {
    const current = store.setDressingSelections[category] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    store.setSetDressingSelection(category, next);
  };

  const previewAspectId = effectiveAspectRatio as StudioPreviewAspectId;
  const previewFrameSingle = studioPreviewFrameStyle(previewAspectId, 'stage');
  const previewFrameCompare = studioPreviewFrameStyle(previewAspectId, 'stageCompare');
  const activeReferenceForCompare =
    store.referenceImageUrls.find((u) => Boolean(u?.trim())) ?? null;

  return (
    <>
    <div
      className="flex flex-col h-full min-h-0 overflow-hidden p-3 animate-fade-in"
      style={{ background: ASSET_STUDIO_BG }}
    >
      <header
        className="flex-shrink-0 flex items-center justify-center w-full mb-3 rounded-lg px-4 py-2"
        style={{ background: ACCENT_GOLD_GRADIENT }}
      >
        <h1
          className="text-center text-2xl font-black text-transparent bg-clip-text tracking-tight truncate min-w-0"
          style={{ background: ASSET_STUDIO_AMETHYST_TEXT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          ASSET REFERENCE STUDIO
        </h1>
      </header>

      <div className="flex flex-col md:flex-row gap-3 w-full flex-1 min-h-0 min-w-0 overflow-hidden">
        <div className="w-full md:flex-[0_0_60%] md:max-w-[60%] min-w-0 flex flex-col gap-2 flex-shrink-0 min-h-0 overflow-hidden">
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md flex flex-1 min-h-0 flex-col overflow-hidden shadow-lg shadow-black/20">
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar p-3 space-y-4">
            {leftModule === 'hub' && (
            <>
            <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-2 shrink-0" style={goldTextStyle}>
              Reference images
            </h2>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const slotIndex = uploadSlotIndexRef.current;
                if (slotIndex == null) return;
                const url = URL.createObjectURL(file);
                store.setReferenceImageAt(slotIndex, url);
                store.setCurrentLiveImageUrl(url);
                uploadSlotIndexRef.current = null;
                e.target.value = '';
              }}
            />
            <div className="rounded-lg border border-amber-500/30 bg-black/35 px-2 py-2 mb-2 shrink-0 flex flex-wrap items-center gap-2">
              <div className="text-sm text-white/85 min-w-0 flex-1 basis-[140px]">
                <span className="font-bold text-amber-200/90">
                  Slot {focusedReferenceSlotIndex + 1}
                </span>
                <span className="text-white/45"> · </span>
                <span className="text-white/75">{getSlotLabel(focusedReferenceSlotIndex, 'asset')}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Tooltip variant="asset" content="Upload an image into the focused slot" side="bottom">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium border border-amber-500/35 text-amber-200/95 hover:bg-amber-500/15"
                    onClick={() => {
                      uploadSlotIndexRef.current = focusedReferenceSlotIndex;
                      uploadInputRef.current?.click();
                    }}
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    Upload
                  </button>
                </Tooltip>
                <Tooltip variant="asset" content="Choose from archive for the focused slot" side="bottom">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium border border-amber-500/35 text-amber-200/95 hover:bg-amber-500/15"
                    onClick={() => setRecallSlotIndex(focusedReferenceSlotIndex)}
                  >
                    <Archive className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    Archive
                  </button>
                </Tooltip>
                <Tooltip variant="asset" content="Remove image from the focused slot" side="bottom">
                  <button
                    type="button"
                    disabled={!store.referenceImageUrls[focusedReferenceSlotIndex]}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium border border-white/20 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none"
                    onClick={() => {
                      const i = focusedReferenceSlotIndex;
                      const url = store.referenceImageUrls[i];
                      if (!url) return;
                      const wasLive = store.currentLiveImageUrl === url;
                      store.removeReferenceImage(i);
                      if (wasLive) {
                        const nextUrls = useAssetStudioStore.getState().referenceImageUrls;
                        const still = nextUrls.filter(Boolean);
                        store.setCurrentLiveImageUrl(still[0] ?? null);
                      }
                    }}
                  >
                    Clear
                  </button>
                </Tooltip>
                <Tooltip
                  variant="asset"
                  content="Clear every reference slot and reset the live preview."
                  side="bottom"
                >
                  <button
                    type="button"
                    onClick={() => {
                      store.clearAllReferenceSlots();
                      store.setCurrentLiveImageUrl(null);
                    }}
                    className="px-2.5 py-1.5 rounded-md text-sm border border-white/20 hover:bg-white/10"
                  >
                    Clear all
                  </button>
                </Tooltip>
                <Tooltip
                  variant="asset"
                  content="Paste an image from the clipboard into the first empty reference slot (browser permission required)."
                  side="bottom"
                >
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
                        store.setGenerationStatus('error', 'Could not paste image from clipboard.');
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-md text-sm border border-amber-500/40 hover:bg-amber-500/10"
                  >
                    Paste first empty
                  </button>
                </Tooltip>
              </div>
            </div>
            <p className="text-sm text-white/50 mb-1 shrink-0">
              Click a thumbnail to focus a slot. Labels show slot role in the API stack.
            </p>
            <div className="mt-1 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              {!Array.from({ length: 14 }, (_, i) => store.referenceImageUrls[i]).some(Boolean) && (
                <p className="text-xs text-amber-200/70 mb-2">
                  No references yet. Pick a slot, use Upload or Archive, or paste an image.
                </p>
              )}
              <div className="grid grid-cols-7 gap-1.5 w-full">
                {Array.from({ length: 14 }, (_, i) => {
                  const url = store.referenceImageUrls[i];
                  const isFocused = focusedReferenceSlotIndex === i;
                  return (
                    <div key={i} className="flex flex-col items-center gap-0.5 min-w-0 group/slot">
                      <div className="relative w-full aspect-square max-h-[4.5rem]">
                        <button
                          type="button"
                          onClick={() => setFocusedReferenceSlotIndex(i)}
                          className={`absolute inset-0 rounded-md bg-black/40 flex items-center justify-center overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-amber-400/90 ${
                            url
                              ? 'border-2 border-amber-500/55'
                              : 'border-2 border-dashed border-white/25'
                          } ${isFocused ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-black/70' : ''}`}
                          aria-pressed={isFocused}
                          aria-label={`Reference slot ${i + 1}, ${getSlotLabel(i, 'asset')}`}
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
                            <span className="text-xs text-white/45 tabular-nums">{i + 1}</span>
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
                                const nextUrls = useAssetStudioStore.getState().referenceImageUrls;
                                const still = nextUrls.filter(Boolean);
                                store.setCurrentLiveImageUrl(still[0] ?? null);
                              }
                            }}
                            className="absolute -top-0.5 -right-0.5 z-10 w-3.5 h-3.5 rounded-full bg-black/85 text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover/slot:opacity-100 hover:!opacity-100 focus:opacity-100 pointer-events-auto border border-white/20"
                            aria-label={`Remove slot ${i + 1}`}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                      <span className="text-[7px] text-center text-white/60 max-w-full leading-tight line-clamp-2">
                        {getSlotLabel(i, 'asset')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            </>
            )}

            {leftModule === 'structural' && (
            <>
            {/* Era / Style */}
            <section
              className={settingAndLocationDisabled ? 'opacity-50 pointer-events-none' : ''}
              aria-disabled={settingAndLocationDisabled}
            >
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Era / Style
              </h2>
              {settingAndLocationDisabled && (
                <p className="text-xs text-white/60 mb-2">
                  Architectural Lock is on. Turn off to edit setting/location tags.
                </p>
              )}
              <MultiChip
                options={[...ERA_STYLE_TAGS, ...store.eraStyleLibrary]}
                selected={store.eraStyleSelection}
                onToggle={toggleEra}
                libraryOptions={store.eraStyleLibrary}
                onRemoveLibrary={(v) => store.removeEraStyleOption(v)}
              />
              <SectionAddToLibrary
                categories={[{ id: 'era', label: 'Era / Style' }]}
                onSave={(_id, v) => store.addEraStyleOption(v)}
              />
            </section>

            {/* Location Type */}
            <section
              className={settingAndLocationDisabled ? 'opacity-50 pointer-events-none' : ''}
              aria-disabled={settingAndLocationDisabled}
            >
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Location Type
              </h2>
              <MultiChip
                options={[...LOCATION_TYPE_TAGS, ...store.locationTypeLibrary]}
                selected={store.locationTypeSelection}
                onToggle={toggleLocation}
                libraryOptions={store.locationTypeLibrary}
                onRemoveLibrary={(v) => store.removeLocationTypeOption(v)}
              />
              <SectionAddToLibrary
                categories={[{ id: 'location', label: 'Location Type' }]}
                onSave={(_id, v) => store.addLocationTypeOption(v)}
              />
            </section>

            {/* Architectural Detail */}
            <section
              className={settingAndLocationDisabled ? 'opacity-50 pointer-events-none' : ''}
              aria-disabled={settingAndLocationDisabled}
            >
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Architectural Detail
              </h2>
              <MultiChip
                options={[...ARCHITECTURAL_DETAIL_TAGS, ...store.architecturalDetailLibrary]}
                selected={store.architecturalDetailSelection}
                onToggle={toggleArchitectural}
                libraryOptions={store.architecturalDetailLibrary}
                onRemoveLibrary={(v) => store.removeArchitecturalDetailOption(v)}
              />
              <SectionAddToLibrary
                categories={[{ id: 'arch', label: 'Architectural Detail' }]}
                onSave={(_id, v) => store.addArchitecturalDetailOption(v)}
              />
            </section>

            {/* Scene Setting & Props */}
            <section
              className={settingAndLocationDisabled ? 'opacity-50 pointer-events-none' : ''}
              aria-disabled={settingAndLocationDisabled}
            >
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Scene Setting & Props
              </h2>
              <div className="space-y-4">
                {(Object.keys(SET_DRESSING_PRESETS) as SetDressingCategory[]).map((cat) => {
                  const isStructure = cat === 'roomType';
                  const isFurniture = cat === 'furniture';
                  const isAtmospherics = cat === 'surfaceTextures';
                  return (
                    <div key={cat}>
                      <SetDressingRow
                        category={cat}
                        presets={SET_DRESSING_PRESETS[cat]}
                        selected={store.setDressingSelections[cat] ?? []}
                        library={store.setDressingLibraries[cat] ?? []}
                        onToggle={(v) => toggleSetDressing(cat, v)}
                        onRemoveLibrary={(v) => store.removeSetDressingOption(cat, v)}
                      />
                      {/* Modifier ribbon directly under this category's tags */}
                      {isStructure && (
                        <div className="mt-2">
                          <ModifierRibbon
                            categoryLabel="Structure"
                            selectedColor={store.assetModifiers.structure.color}
                            material={store.assetModifiers.structure.material}
                            tagLabel={(store.setDressingSelections.roomType ?? []).join(', ') || undefined}
                            onColorChange={(hex) => store.setAssetModifierColor('structure', hex)}
                            onMaterialChange={(m) => store.setAssetModifierMaterial('structure', m)}
                            variant="amethyst"
                          />
                        </div>
                      )}
                      {isFurniture && (
                        <div className="mt-2">
                          <ModifierRibbon
                            categoryLabel="Furniture"
                            selectedColor={store.assetModifiers.furniture.color}
                            material={store.assetModifiers.furniture.material}
                            tagLabel={(store.setDressingSelections.furniture ?? []).join(', ') || undefined}
                            onColorChange={(hex) => store.setAssetModifierColor('furniture', hex)}
                            onMaterialChange={(m) => store.setAssetModifierMaterial('furniture', m)}
                            variant="amethyst"
                          />
                        </div>
                      )}
                      {isAtmospherics && (
                        <div className="mt-2">
                          <ModifierRibbon
                            categoryLabel="Atmospherics"
                            selectedColor={store.assetModifiers.atmospherics.color}
                            material={store.assetModifiers.atmospherics.material}
                            tagLabel={[
                              ...(store.setDressingSelections.lightingFixtures ?? []),
                              ...(store.setDressingSelections.surfaceTextures ?? []),
                            ].join(', ') || undefined}
                            onColorChange={(hex) => store.setAssetModifierColor('atmospherics', hex)}
                            onMaterialChange={(m) => store.setAssetModifierMaterial('atmospherics', m)}
                            variant="amethyst"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => store.resetAssetModifiers()}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-amber-500/40 hover:bg-amber-500/20"
                >
                  <span className="inline-block" style={goldTextStyle}>Clear colors & materials</span>
                </button>
              </div>
              <SectionAddToLibrary
                categories={(Object.keys(SET_DRESSING_PRESETS) as SetDressingCategory[]).map((c) => ({
                  id: c,
                  label: c.replace(/([A-Z])/g, ' $1').trim(),
                }))}
                onSave={(cat, v) => store.addSetDressingOption(cat as SetDressingCategory, v)}
              />
            </section>
            </>
            )}

            {leftModule === 'material' && (
            <>
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Art Style
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
                        store.setArtStyle(store.artStyleId === opt ? 'flagship' : opt)
                      }
                    />
                  ))}
                  {store.customStyles.map((opt) => (
                    <ChipWithOptionalRemove
                      key={opt}
                      label={opt}
                      active={store.artStyleId === opt}
                      onClick={() =>
                        store.setArtStyle(store.artStyleId === opt ? 'flagship' : opt)
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

            {/* Cinematic Suite */}
            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Cinematic Suite
              </h2>
              <div className="space-y-4">
                {(Object.keys(CINEMATIC_OPTIONS) as AssetCinematicKey[]).map((key) => (
                  <div key={key}>
                    <h3 className="text-sm mb-2 inline-block font-semibold" style={goldTextStyle}>{key}</h3>
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
                ))}
                <SectionAddToLibrary
                  categories={(Object.keys(CINEMATIC_OPTIONS) as AssetCinematicKey[]).map((k) => ({ id: k, label: k }))}
                  onSave={(cat, v) => store.addCinematicOption(cat as AssetCinematicKey, v)}
                />
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                The Onyx Vault
              </h2>
              <p className="text-xs text-white/70">
                Edit the raw prompt override in <strong className="text-amber-300/90">Live Prompt → Edit</strong>. Leave it
                empty to use compiled tags; when non-empty it replaces the tag-built prompt for generation.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-3" style={goldTextStyle}>
                Prompt Tags
              </h2>
              <HybridTagBar tags={store.tags} setTags={store.setTags} variant="amethyst" />
            </section>
            </>
            )}
            </div>

          <div className="shrink-0 rounded-xl border border-white/10 bg-black/30 p-2 flex flex-col min-h-0 max-h-[min(42vh,360px)] overflow-hidden">
            <div className="mb-1 shrink-0">
              <h2 className="text-sm font-bold uppercase tracking-widest" style={goldTextStyle}>
                Live Prompt
              </h2>
            </div>
            {!promptPinned ? (
              <p
                className="text-sm font-mono text-violet-100/90 truncate border border-white/10 rounded-lg px-3 py-2 bg-black/50 min-h-[2.5rem]"
                title={displayPrompt || undefined}
              >
                {(displayPrompt || '// Pin to expand — full prompt, tabs, and Architectural Lock').split('\n')[0].slice(0, 140)}
                {displayPrompt && (displayPrompt.length > 140 || displayPrompt.includes('\n')) ? '…' : ''}
              </p>
            ) : (
            <>
              {!phoneCompact && (
              <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2 mb-2 shrink-0">
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
                    <PinnedHelpTooltip variant="asset" title={label}>
                      {id === 'auto' && 'Compiled prompt from tags. ⌘/Ctrl+Enter generates.'}
                      {id === 'edit' &&
                        'Raw prompt override. Model is in the bottom bar. Overrides compiled tags when the override field is non-empty.'}
                      {id === 'refine' && 'Refine the current live image with your instructions.'}
                    </PinnedHelpTooltip>
                  </span>
                ))}
              </div>
              )}
              {!phoneCompact && promptPanelTab === 'auto' && (
                <div className="bg-black/60 p-2 rounded-lg font-mono text-xs text-violet-100/85 break-words flex-1 min-h-[80px] max-h-[min(22vh,200px)] overflow-y-auto custom-scrollbar transition-opacity duration-200">
                  {displayPrompt || '// Prompt is empty...'}
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
                          className="inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-full bg-white/10"
                        >
                          {s.name}
                          <button
                            type="button"
                            className="text-red-300"
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
                <div className="flex-1 flex flex-col gap-2 min-h-[80px] max-h-[min(22vh,200px)] overflow-y-auto">
                  {!store.currentLiveImageUrl ? (
                    <p className="text-sm text-violet-200/80">Generate or load an image first.</p>
                  ) : (
                    <>
                      <textarea
                        value={store.refinementPromptOverride}
                        onChange={(e) => store.setRefinementPromptOverride(e.target.value)}
                        placeholder="Type a refinement or use Suggest chips."
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
                        <button type="button" disabled className="px-3 py-1.5 rounded-lg text-xs border border-white/20 opacity-50">
                          NEW
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRefineAsset()}
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
            </>
            )}
            <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center gap-x-2 gap-y-1.5 shrink-0">
              <CopyButton text={displayPrompt} labelStyle={goldTextStyle} />
              {!phoneCompact && promptPinned && promptPanelTab === 'auto' && (
                <button
                  type="button"
                  onClick={() => {
                    store.setVaultPromptOverride('');
                    store.setRefinementPromptOverride('');
                  }}
                  className="px-2 py-1 rounded-full text-sm border border-amber-500/40 hover:bg-amber-500/20"
                >
                  Refresh
                </button>
              )}
              {!phoneCompact && (
              <button
                type="button"
                onClick={() => {
                  store.setVaultPromptOverride('');
                  store.setRefinementPromptOverride('');
                }}
                className="px-2 py-1 rounded-full text-sm border border-amber-500/40 hover:bg-amber-500/20"
              >
                Reset to tags
              </button>
              )}
              {!phoneCompact && (
              <button
                type="button"
                onClick={() => setPromptPinned((p) => !p)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-bold border border-amber-500/40 text-amber-200/90 hover:bg-amber-500/10"
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
                  className="text-sm px-2 py-0.5 rounded-full border border-violet-500/40 text-violet-200/90 hover:bg-violet-500/10 truncate max-w-[120px]"
                  title="Copy full prompt to clipboard; append summary to Refine tab"
                >
                  Last prompt
                </button>
              ) : null}
              <span className="text-xs text-white/55 uppercase tracking-wider">Model</span>
              <select
                value={store.selectedOnyxModelId}
                onChange={(e) => store.setSelectedOnyxModelId(e.target.value as 'flash' | 'pro')}
                className="max-w-[9.5rem] bg-black/55 text-white border border-amber-500/25 rounded-md px-1.5 py-0.5 text-sm"
              >
                <option value="flash">Nano Banana 2</option>
                <option value="pro">Nano Banana Pro</option>
              </select>
              <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-full border border-amber-500/30 bg-black/20 hover:border-amber-500/60 transition-all ml-auto">
                <span className="text-xs font-bold tracking-wide inline-block max-w-[5.5rem] leading-tight" style={goldTextStyle}>
                  Architectural lock
                </span>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => store.setArchitecturalLock(!store.architecturalLock)}
                  onKeyDown={(e) => e.key === 'Enter' && store.setArchitecturalLock(!store.architecturalLock)}
                  className="w-9 h-4 rounded-full p-0.5 transition-colors duration-300 bg-white/10"
                  style={store.architecturalLock ? { background: ACCENT_GOLD_GRADIENT } : undefined}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                      store.architecturalLock ? 'translate-x-[1.125rem]' : 'translate-x-0'
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
                { id: 'structural' as const, label: 'Build', Icon: Boxes },
                { id: 'material' as const, label: 'Look', Icon: Paintbrush },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={leftModule === id}
                onClick={() => setLeftModule(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-md text-sm font-bold uppercase tracking-wide border transition-colors min-w-0 ${
                  leftModule === id
                    ? 'text-black border-amber-500/60 shadow-sm'
                    : 'border-transparent text-violet-200/75 hover:bg-white/10'
                }`}
                style={leftModule === id ? { background: ACCENT_GOLD_GRADIENT } : undefined}
              >
                <Icon className="w-4 h-4 shrink-0 opacity-90" aria-hidden />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
          )}
        </div>
        </div>

        <div className="w-full min-w-0 min-h-[min(42vh,360px)] md:min-h-0 flex flex-1 flex-col gap-2 overflow-hidden overflow-x-hidden md:flex-[0_0_40%] md:max-w-[40%]">
          <div
            className="flex-shrink-0 rounded-lg border border-white/10 bg-black/30 px-3 py-2 min-h-[2.5rem] flex items-center"
            data-status={store.generationStatus === 'pending' ? STATUS_BREADCRUMBS[statusStep].replace(/\s+/g, '-').toLowerCase() : undefined}
          >
            <span className="text-sm font-mono truncate" style={goldTextStyle}>
              {store.generationStatus === 'safety_blocked'
                ? 'Prompt restricted by safety filters. Please adjust and try again'
                : store.generationStatus === 'error' && store.generationStatusMessage
                  ? store.generationStatusMessage
                  : store.generationStatus === 'pending'
                    ? STATUS_BREADCRUMBS[statusStep]
                    : '\u00A0'}
            </span>
          </div>

          <div className="flex-1 min-h-0 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md flex flex-col overflow-hidden shadow-lg shadow-black/15">
            <h2 className="text-base font-bold uppercase tracking-widest px-3 pt-3 pb-2 flex-shrink-0 border-b border-white/10" style={goldTextStyle}>
              Asset workspace
            </h2>
            <div className="flex-none shrink-0 min-h-0 min-w-0 flex flex-col items-center justify-center p-2 overflow-x-hidden overflow-y-hidden">
              {store.currentLiveImageUrl ? (
                compareSplit ? (
                  <>
                    <div className="flex w-full max-w-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-4">
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center lg:max-w-[min(100%,calc(50%-0.5rem))]">
                        <div
                          className="group/ref relative mx-auto cursor-zoom-in overflow-hidden rounded-xl border border-amber-500/20 bg-black/55 shadow-inner"
                          style={previewFrameCompare}
                        >
                          <div className="pointer-events-none absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full text-sm font-bold border border-amber-500/30 bg-black/50 text-violet-200/90">
                            Reference
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center p-2 transition-transform duration-300 ease-out will-change-transform origin-center group-hover/ref:scale-[1.08] group-hover/ref:z-10">
                            {activeReferenceForCompare ? (
                              <ArcsStorageImg
                                src={activeReferenceForCompare}
                                alt="Reference slot"
                                className="max-h-full max-w-full object-contain object-center"
                              />
                            ) : (
                              <div className="flex max-h-full w-full items-center justify-center px-3 text-center text-white/50 text-xs">
                                No reference slot
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center lg:max-w-[min(100%,calc(50%-0.5rem))]">
                        <div
                          className="group/live relative mx-auto cursor-zoom-in overflow-hidden rounded-xl border border-amber-500/35 bg-black/55 shadow-inner"
                          style={previewFrameCompare}
                        >
                          <div className="pointer-events-none absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full text-sm font-bold border border-amber-500/30 bg-black/50 text-violet-200/90">
                            Generated
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center p-2 transition-transform duration-300 ease-out will-change-transform origin-center group-hover/live:scale-[1.08] group-hover/live:z-10">
                            <ArcsStorageImg
                              src={store.currentLiveImageUrl}
                              alt="Live asset"
                              className="max-h-full max-w-full object-contain object-center"
                            />
                          </div>
                          <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1">
                            <Tooltip variant="asset" content="View full size with zoom" side="left">
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
                            <Tooltip variant="asset" content="Delete this image" side="left">
                              <button
                                type="button"
                                onClick={() => discardLiveAssetImage()}
                                className="p-2 rounded-lg bg-black/60 border border-amber-500/40 hover:bg-amber-500/20"
                                aria-label="Delete image"
                              >
                                <Trash2 className="w-4 h-4" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 max-w-xl text-center text-sm text-violet-200/60">
                      Compare on — hover either panel to zoom in place ({effectiveAspectRatio}). Turn Compare off for one large preview.
                    </p>
                  </>
                ) : (
                  <>
                    <div
                      className="group/live relative mx-auto shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-amber-500/35 bg-black/55 shadow-inner"
                      style={previewFrameSingle}
                    >
                      <div className="absolute inset-0 flex items-center justify-center p-3 transition-transform duration-300 ease-out will-change-transform origin-center group-hover/live:scale-[1.08] group-hover/live:z-10">
                        <ArcsStorageImg
                          src={store.currentLiveImageUrl}
                          alt="Live asset"
                          className="max-h-full max-w-full object-contain object-center"
                        />
                      </div>
                      <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1">
                        <Tooltip variant="asset" content="View full size with zoom" side="left">
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
                        <Tooltip variant="asset" content="Delete this image" side="left">
                          <button
                            type="button"
                            onClick={() => discardLiveAssetImage()}
                            className="p-2 rounded-lg bg-black/60 border border-amber-500/40 hover:bg-amber-500/20"
                            aria-label="Delete image"
                          >
                            <Trash2 className="w-4 h-4" style={{ color: 'var(--color-gold, #fcf6ba)' }} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    <p className="mt-2 max-w-md text-center text-sm text-violet-200/60">
                      {effectiveAspectRatio} output
                      {effectiveAspectRatio !== store.aspectRatio
                        ? ` (effective ${effectiveAspectRatio}; chip ${store.aspectRatio})`
                        : ''}
                      {' '}
                      — hover preview to zoom. Use Compare for side-by-side with references.
                    </p>
                  </>
                )
              ) : (
                <div className="text-center space-y-2 px-4">
                  <div className="w-16 h-16 rounded-full border border-dashed border-amber-500/30 mx-auto flex items-center justify-center bg-black/40">
                    <span className="text-2xl">🌍</span>
                  </div>
                  <p className="font-mono text-sm inline-block" style={goldTextStyle}>
                    {store.architecturalLock ? 'ARCH LOCKED' : 'No live asset'}
                  </p>
                  <p className="text-xs text-white/50 max-w-xs mx-auto">
                    {phoneCompact
                      ? 'Generate your first image with the controls below.'
                      : 'Generate your first image or load from Recent in the workspace below.'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="shrink-0 flex flex-col border-t border-white/10 bg-black/20">
              <div className="px-3 pt-3 pb-2 shrink-0 space-y-2 rounded-b-lg">
                <p className="text-xs leading-snug text-violet-200/65 line-clamp-2">
                  Set <span className="text-amber-200/90">Room / Urban / Time</span>, then{' '}
                  <span className="text-amber-200/90">Expand Setting</span> or{' '}
                  <span className="text-amber-200/90">Generate Asset</span> (full prompt + refs).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {assetSessionChips.map(({ key, label }) => (
                    <span
                      key={key}
                      className="inline-flex items-center rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-sm text-white/80"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                {!phoneCompact &&
                  ((recentAssets.length > 0) || (getCachedGenerations('asset').length > 0)) && (
                  <div className="rounded-lg border border-white/10 bg-black/25 p-2 space-y-2">
                    {recentAssets.length > 0 && (
                      <div>
                        <span className="text-sm uppercase tracking-wider text-white/60 block mb-1">Recent (saved)</span>
                        <div className="flex flex-wrap gap-2">
                          {recentAssets.map((item) => (
                            <Tooltip variant="asset" key={item.id} content={item.displayName ?? item.collectionName ?? 'Asset'}>
                              <button
                                type="button"
                                onClick={() => {
                                  store.setCurrentLiveImageUrl(item.imageUrl);
                                  if (item.seed != null) store.setCurrentGenerationSeed(item.seed);
                                }}
                                className={`rounded border border-amber-500/30 overflow-hidden hover:border-amber-500/60 transition-transform hover:scale-105 ${
                                  store.galleryDensity === 'compact' ? 'w-11 h-11' : 'w-14 h-14'
                                }`}
                              >
                                <ArcsStorageImg src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                              </button>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    )}
                    {getCachedGenerations('asset').length > 0 && (
                      <div>
                        <span className="text-sm uppercase tracking-wider text-white/60 block mb-1">This session</span>
                        <div className="flex flex-wrap gap-2">
                          {getCachedGenerations('asset').map((item) => (
                            <Tooltip
                              variant="asset"
                              key={item.id}
                              content={
                                item.seed != null
                                  ? `Load this session generation (seed ${item.seed}).`
                                  : 'Load this generation from the current session.'
                              }
                              side="top"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  store.setCurrentLiveImageUrl(item.url);
                                  if (item.seed != null) store.setCurrentGenerationSeed(item.seed);
                                }}
                                className={`rounded border border-amber-500/30 overflow-hidden hover:border-amber-500/60 transition-transform hover:scale-105 ${
                                  store.galleryDensity === 'compact' ? 'w-11 h-11' : 'w-14 h-14'
                                }`}
                              >
                                <ArcsStorageImg src={item.url} alt="" className="w-full h-full object-cover" />
                              </button>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="mx-3 mb-3 rounded-xl border border-white/10 bg-black/25 px-3 py-3 space-y-4">
                <div>
                  <label className="text-sm block mb-1.5 inline-block font-semibold" style={goldTextStyle}>Room</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SPATIAL_ROOM_OPTIONS.map((opt) => (
                      <Chip
                        key={opt}
                        label={opt}
                        active={store.spatialRoomOption === opt}
                        onClick={() => store.setSpatialRoomOption(store.spatialRoomOption === opt ? null : opt)}
                        tooltip={SPATIAL_CHIP_TOOLTIP}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm block mb-1.5 inline-block font-semibold" style={goldTextStyle}>Urban</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SPATIAL_URBAN_OPTIONS.map((opt) => (
                      <Chip
                        key={opt}
                        label={opt}
                        active={store.spatialUrbanOption === opt}
                        onClick={() => store.setSpatialUrbanOption(store.spatialUrbanOption === opt ? null : opt)}
                        tooltip={SPATIAL_CHIP_TOOLTIP}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm block mb-1.5 inline-block font-semibold" style={goldTextStyle}>Time / season</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TIME_SEASON_OPTIONS.map((opt) => (
                      <Chip
                        key={opt}
                        label={opt}
                        active={store.timeSeason === opt}
                        onClick={() => store.setTimeSeason(store.timeSeason === opt ? null : opt)}
                        tooltip={SPATIAL_CHIP_TOOLTIP}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm block mb-1.5 inline-block font-semibold" style={goldTextStyle}>Aspect</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['9:16', '1:1', '21:9'] as AspectRatioId[]).map((ratio) => (
                      <Chip
                        key={ratio}
                        label={ratio === '9:16' ? 'Portrait (9:16)' : ratio === '21:9' ? 'Cinematic (21:9)' : 'Square (1:1)'}
                        active={store.aspectRatio === ratio}
                        onClick={() => store.setAspectRatio(ratio)}
                        tooltip={ASPECT_RATIO_CHIP_TOOLTIP}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm block mb-1.5 inline-block font-semibold" style={goldTextStyle}>Camera</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SPATIAL_GALLERY_CAMERA_ANGLE_OPTIONS.map((opt) => (
                      <Chip
                        key={opt}
                        label={opt}
                        active={(store.cinematic.angle || '') === opt}
                        onClick={() => store.setCinematic('angle', opt)}
                        tooltip={CAMERA_ANGLE_CHIP_TOOLTIP}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/10 bg-black/35 px-3 py-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {!phoneCompact && (
                  <>
                <span className="text-sm font-bold uppercase tracking-wider text-violet-200/90">Thumbnails</span>
                <Tooltip
                  variant="asset"
                  content="Smaller gallery thumbnails so more fit on screen."
                  side="top"
                >
                  <button
                    type="button"
                    aria-pressed={store.galleryDensity === 'compact'}
                    onClick={() => store.setGalleryDensity('compact')}
                    className={`text-sm px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border-2 transition-all ${
                      store.galleryDensity === 'compact'
                        ? 'text-violet-950 border-amber-500 shadow-md'
                        : 'text-violet-200/80 border-violet-600/50 hover:border-amber-500/60 bg-black/30'
                    }`}
                    style={
                      store.galleryDensity === 'compact'
                        ? { background: ACCENT_GOLD_GRADIENT }
                        : undefined
                    }
                  >
                    Compact
                  </button>
                </Tooltip>
                <Tooltip
                  variant="asset"
                  content="Larger gallery thumbnails for easier scanning."
                  side="top"
                >
                  <button
                    type="button"
                    aria-pressed={store.galleryDensity === 'comfortable'}
                    onClick={() => store.setGalleryDensity('comfortable')}
                    className={`text-sm px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border-2 transition-all ${
                      store.galleryDensity === 'comfortable'
                        ? 'text-violet-950 border-amber-500 shadow-md'
                        : 'text-violet-200/80 border-violet-600/50 hover:border-amber-500/60 bg-black/30'
                    }`}
                    style={
                      store.galleryDensity === 'comfortable'
                        ? { background: ACCENT_GOLD_GRADIENT }
                        : undefined
                    }
                  >
                    Comfortable
                  </button>
                </Tooltip>
                  </>
                )}
                <Tooltip
                  variant="asset"
                  content={
                    compareSplit
                      ? 'Turn off side-by-side: show only the generated preview at full width.'
                      : 'Show the first reference slot next to the generated image for A/B review.'
                  }
                  side="top"
                >
                  <button
                    type="button"
                    aria-pressed={compareSplit}
                    onClick={() => setCompareSplit((v) => !v)}
                    className={`text-sm px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border-2 transition-all ${
                      compareSplit
                        ? 'text-violet-950 border-amber-500 shadow-md'
                        : 'text-violet-200/80 border-violet-600/50 hover:border-amber-500/60 bg-black/30'
                    }`}
                    style={compareSplit ? { background: ACCENT_GOLD_GRADIENT } : undefined}
                  >
                    Compare {compareSplit ? 'On' : 'Off'}
                  </button>
                </Tooltip>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs uppercase tracking-wider text-violet-200/60">Seed</span>
                  <Tooltip variant="asset" content="Use a new random seed on each generation (more variation)." side="top">
                    <button
                      type="button"
                      onClick={() => store.setSeedMode('randomized')}
                      className={`px-2.5 py-1.5 rounded-full text-sm font-medium border ${
                        (store.seedMode ?? 'randomized') === 'randomized'
                          ? 'border-violet-500/60 bg-violet-500/15 text-violet-200'
                          : 'border-white/20 text-violet-200/70 hover:bg-white/10'
                      }`}
                    >
                      Random
                    </button>
                  </Tooltip>
                  <Tooltip variant="asset" content="Reuse the current seed so successive runs stay more consistent." side="top">
                    <button
                      type="button"
                      onClick={() => store.setSeedMode('locked')}
                      className={`px-2.5 py-1.5 rounded-full text-sm font-medium border ${
                        store.seedMode === 'locked'
                          ? 'border-amber-500/60 bg-amber-500/15'
                          : 'border-white/20 text-violet-200/70 hover:bg-white/10'
                      }`}
                    >
                      <span className="inline-block" style={goldTextStyle}>Lock</span>
                    </button>
                  </Tooltip>
                </div>
                <Tooltip
                  variant="asset"
                  content="Full render from the compiled prompt and your references. When the live preview is used as a reference, results often look like variations of the same scene."
                  side="top"
                >
                  <button
                    type="button"
                    onClick={handleGenerateAsset}
                    disabled={store.generationStatus === 'pending'}
                    className="px-2.5 py-1 rounded-full text-sm font-medium text-black border border-amber-600/50 hover:text-violet-300 transition-colors disabled:opacity-90 disabled:cursor-wait"
                    style={
                      store.generationStatus === 'pending'
                        ? { background: GEM_AMETHYST, boxShadow: `0 0 16px ${GEM_AMETHYST}` }
                        : { background: ACCENT_GOLD_GRADIENT }
                    }
                  >
                    {store.generationStatus === 'pending' ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block w-3.5 h-3.5 rounded-sm rotate-45 animate-pulse"
                          style={{ background: GEM_AMETHYST, boxShadow: `0 0 10px ${GEM_AMETHYST}` }}
                          aria-label="Generating..."
                        />
                        <span className="animate-pulse">Working…</span>
                      </span>
                    ) : (
                      'Generate'
                    )}
                  </button>
                </Tooltip>
                <Tooltip variant="asset" content="Run generation again with the same settings (respects Randomized vs Locked)." side="top">
                  <span className="inline-flex">
                    <button
                      type="button"
                      onClick={() => void handleGenerateAsset()}
                      disabled={store.generationStatus === 'pending'}
                      className="px-2.5 py-1 rounded-full text-sm font-medium border border-violet-500/40 hover:bg-violet-500/10 disabled:opacity-50"
                    >
                      <span className="text-violet-200/90">Again</span>
                    </button>
                  </span>
                </Tooltip>
                <Tooltip variant="asset" content="Restore the previous live preview and seed." side="top">
                  <span className="inline-flex">
                    <button
                      type="button"
                      disabled={!store.previousLiveImageUrl}
                      onClick={() => {
                        if (!store.previousLiveImageUrl) return;
                        store.setCurrentLiveImageUrl(store.previousLiveImageUrl);
                        store.setCurrentGenerationSeed(store.previousGenerationSeed);
                        store.setPreviousLiveSnapshot(null, null);
                      }}
                      className="px-2.5 py-1 rounded-full text-sm font-medium border border-white/25 hover:bg-white/10 disabled:opacity-40"
                    >
                      Undo
                    </button>
                  </span>
                </Tooltip>
                <Tooltip variant="asset" content="Save this image as a new standalone asset." side="top">
                  <span className="inline-flex">
                    <button
                      type="button"
                      onClick={() => openSaveAssetModal('new')}
                      disabled={!store.currentLiveImageUrl}
                      className="px-2.5 py-1 rounded-full border border-amber-500/50 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="inline-block" style={goldTextStyle}>Save new</span>
                    </button>
                  </span>
                </Tooltip>
                <Tooltip
                  variant="asset"
                  content="Derive a new shot from the live preview using Room/Urban/Time and a different seed—not “expand” as in wider framing alone."
                  side="top"
                >
                  <button
                    type="button"
                    onClick={handleExpandSetting}
                    className="px-2.5 py-1 rounded-full border border-amber-500/50 font-medium text-sm"
                  >
                    <span className="inline-block" style={goldTextStyle}>Expand</span>
                  </button>
                </Tooltip>
                <Tooltip variant="asset" content="Save this image into a vault collection you choose." side="top">
                  <span className="inline-flex">
                    <button
                      type="button"
                      onClick={() => openSaveAssetModal('library')}
                      disabled={!store.currentLiveImageUrl}
                      className="px-2.5 py-1 rounded-full border border-amber-500/50 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="inline-block" style={goldTextStyle}>Library</span>
                    </button>
                  </span>
                </Tooltip>
                {hasStories ? (
                  <Tooltip variant="asset" content="Attach this image to a story's photo collection as a reference." side="top">
                    <span className="inline-flex">
                      <CastInStoryButton
                        stories={stories}
                        onSelect={handleCastInStory}
                        disabled={!store.currentLiveImageUrl}
                      />
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip variant="asset" content="Available when you have at least one story with a photo collection." side="top">
                    <span className="inline-flex">
                      <button
                        type="button"
                        disabled
                        className="px-2.5 py-1 rounded-full border border-white/20 font-medium text-sm cursor-not-allowed opacity-60"
                      >
                        <span className="inline-block" style={goldTextStyle}>Cast</span>
                      </button>
                    </span>
                  </Tooltip>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <ArchiveRecallModal
        open={recallSlotIndex !== null}
        onClose={() => setRecallSlotIndex(null)}
        context="asset"
        slotIndex={recallSlotIndex ?? 0}
        onSelect={(url) => {
          if (recallSlotIndex != null) {
            store.setReferenceImageAt(recallSlotIndex, url);
            setRecallSlotIndex(null);
          }
        }}
      />

      {/* Save asset: collection name (required) + optional asset name */}
      {showSaveAssetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Save asset — collection and asset name"
        >
          <div className="rounded-xl border border-violet-500/40 bg-black/90 backdrop-blur-md p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4" style={goldTextStyle}>
              {saveAssetMode === 'new' ? 'Save new asset' : 'Add to library'}
            </h3>
            <label className="block text-sm font-medium text-white/80 mb-1">Collection name (required)</label>
            <input
              type="text"
              value={saveAssetCollectionName}
              onChange={(e) => setSaveAssetCollectionName(e.target.value)}
              placeholder="e.g. City exteriors"
              list={saveAssetMode === 'library' ? 'vault-collection-options' : undefined}
              className="w-full bg-black/40 text-white border border-white/20 rounded-lg px-3 py-2 mb-3 text-sm placeholder-white/40"
              autoFocus
            />
            {saveAssetMode === 'library' && (
              <datalist id="vault-collection-options">
                {vaultCollectionOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            )}
            {saveAssetMode === 'library' && (
              <p className="text-sm text-white/55 -mt-2 mb-3">
                {vaultCollectionLoading
                  ? 'Loading collections…'
                  : vaultCollectionOptions.length === 0
                    ? 'No existing collections found. Use “Save New Asset”.'
                    : saveAssetCollectionName.trim() &&
                        !getMatchedExistingCollection(saveAssetCollectionName)
                      ? 'Type to search, but Save only enables on an exact existing collection.'
                      : '\u00A0'}
              </p>
            )}
            <label className="block text-sm font-medium text-white/80 mb-1">Asset name (optional)</label>
            <input
              type="text"
              value={saveAssetAssetName}
              onChange={(e) => setSaveAssetAssetName(e.target.value)}
              placeholder="e.g. Rooftop at dusk"
              className="w-full bg-black/40 text-white border border-white/20 rounded-lg px-3 py-2 mb-4 text-sm placeholder-white/40"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveAssetModal(false)}
                className="px-3 py-2 rounded-lg text-sm border border-white/20 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssetModalConfirm}
                disabled={
                  saveAssetMode === 'library'
                    ? vaultCollectionLoading || !getMatchedExistingCollection(saveAssetCollectionName)
                    : !saveAssetCollectionName.trim()
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
              <Tooltip variant="asset" content="Delete this image" side="bottom">
                <button
                  type="button"
                  onClick={() => {
                    discardLiveAssetImage();
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
            <ArcsStorageImg
              src={store.currentLiveImageUrl}
              alt="Full size asset"
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
          <ArcsStorageImg
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
          <div className="bg-violet-900/95 border border-amber-500/30 rounded-xl p-4 max-w-sm w-full mx-4">
            <h3 className="text-sm font-bold text-violet-100 mb-3">
              Add asset to story
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
