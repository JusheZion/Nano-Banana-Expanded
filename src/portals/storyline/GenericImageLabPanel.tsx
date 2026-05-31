import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function formatGeminiClientError(message: string): string {
  if (message.includes('VITE_GEMINI_API_KEY')) {
    return 'Gemini API key is not available in this build. Add VITE_GEMINI_API_KEY to your .env file and restart the dev server (same variable Character and Asset studios use).';
  }
  return message;
}
import { generateGeminiText } from '@/shared/api/geminiTextApi';
import { generateImage, type OnyxModelId } from '@/shared/api/geminiImageApi';
import {
  saveImportedImageToAssetVault,
  saveImportedImageToCharacterVault,
} from '@/shared/api/arcsPersistence';
import { getCharacterAlbums } from '@/shared/api/arcsVault';
import { getAssetAlbums } from '@/shared/api/arcsAssetVault';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { Tooltip } from '@/shared/components/Tooltip';
import { ArcsStorageImg } from '@/components/ui/ArcsStorageImg';
import { SearchableVaultSelect } from '@/shared/components/SearchableVaultSelect';
import { parseJsonFromModel } from '@/portals/storyline/parseDirectorJson';
import type {
  ProductionAssetMember,
  ProductionCastMember,
  ProductionSupportingRefMember,
  StoryBeat,
  StoryBeatAspectRatio,
} from '@/portals/storyline/storylineTypes';
import { buildStorylineReferenceSlots } from '@/portals/storyline/buildStorylineReferenceSlots';
import { useCharacterStudioStore } from '@/stores/characterStudioStore';
import { useAssetStudioStore } from '@/stores/assetStudioStore';
import { pickGenerationSeed } from '@/shared/utils/generationSeed';
import { saveGeneration } from '@/shared/utils/generationOutputRouter';
import { addRecentFromAsset, addRecentFromCharacter } from '@/shared/utils/recentGenerations';
import {
  studioPreviewAspectCss,
  studioPreviewMaxHeightCss,
  type StudioPreviewAspectId,
} from '@/shared/utils/studioPreviewLayout';
import { ImageshopImportPanel } from '@/portals/storyline/ImageshopImportPanel';
import {
  composeImageshopPrompt,
  createDefaultImageshopContinuitySettings,
  createDefaultImageshopPageConfig,
  type ImageshopBorderStyle,
  type ImageshopGenerationMode,
  type ImageshopPageType,
  type ImageshopPromptSectionKey,
} from '@/portals/storyline/imageshopPromptComposer';
import {
  exportImageshopProductionConfig,
  normalizeImageshopJson,
} from '@/portals/storyline/imageshopJsonSchemas';
import {
  buildGuidedImageWorkshopPrompt,
  buildGuidedImageWorkshopPromptForActiveReferences,
  getGuidedImageWorkshopAspectRatio,
  getGuidedImageWorkshopPreload,
  useImageWorkshopBridge,
  type GuidedImageWorkshopHandoff,
  type GuidedImageWorkshopReference,
} from '@/stores/imageWorkshopBridge';
import {
  useImageshopProductionStore,
  type ImageshopProductionItem,
  type ImageshopProductionStatus,
  type ImageshopProductionVersionKind,
} from '@/stores/imageshopProductionStore';
import { useImageshopSessionStore, type ImageshopSessionResult } from '@/stores/imageshopSessionStore';

type LabContext = 'character' | 'asset';
type GeneratedVaultTarget = 'character' | 'asset' | 'npc';
type RefinementTool =
  | 'prompt-edit'
  | 'region-edit'
  | 'character-correction'
  | 'face-correction'
  | 'costume-correction'
  | 'lighting-adjustment'
  | 'color-adjustment'
  | 'dialogue-correction'
  | 'continuity-correction';

const DEFAULT_CONTINUITY = createDefaultImageshopContinuitySettings();
const DEFAULT_PAGE_CONFIG = createDefaultImageshopPageConfig();

const PROMPT_WORKSPACE_FIELDS: Array<{
  key: Exclude<ImageshopPromptSectionKey, 'main'>;
  label: string;
  placeholder: string;
}> = [
  { key: 'negative', label: 'Negative Prompt', placeholder: 'Avoid blurry faces, extra fingers, unreadable text...' },
  { key: 'character', label: 'Character Instructions', placeholder: 'Faces, costume details, silhouettes, expressions...' },
  { key: 'environment', label: 'Environment Instructions', placeholder: 'Location, props, set dressing, world details...' },
  { key: 'artStyle', label: 'Art Style Instructions', placeholder: 'Linework, rendering, palette, medium, finish...' },
  { key: 'camera', label: 'Camera Instructions', placeholder: 'Shot size, lens, angle, panel composition...' },
  { key: 'continuity', label: 'Continuity Instructions', placeholder: 'Rules that should stay stable across pages or shots...' },
];

const PAGE_TYPE_OPTIONS: Array<{ value: ImageshopPageType; label: string }> = [
  { value: 'single-comic-page', label: 'Single Comic Page' },
  { value: 'standard-comic-page', label: 'Standard Comic Page' },
  { value: 'double-page-spread', label: 'Double Page Spread' },
  { value: 'splash-page', label: 'Splash Page' },
  { value: 'cover', label: 'Cover' },
  { value: 'character-sheet', label: 'Character Sheet' },
  { value: 'environment-sheet', label: 'Environment Sheet' },
  { value: 'asset-sheet', label: 'Asset Sheet' },
];

const BORDER_STYLE_OPTIONS: ImageshopBorderStyle[] = ['standard', 'thin', 'thick', 'rounded', 'manga', 'frameless', 'custom'];

const LAYOUT_TEMPLATE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: '3-panel', label: '3 Panel' },
  { value: '4-panel', label: '4 Panel' },
  { value: '6-panel', label: '6 Panel' },
  { value: '9-panel', label: '9 Panel' },
  { value: 'wide-top', label: 'Wide Top' },
  { value: 'wide-bottom', label: 'Wide Bottom' },
  { value: 'double-wide', label: 'Double Wide' },
  { value: 'hero-splash', label: 'Hero Splash' },
  { value: 'manga-dynamic', label: 'Manga Dynamic' },
  { value: 'manga-diagonal', label: 'Manga Diagonal' },
  { value: 'custom', label: 'Custom' },
];

const PRODUCTION_STATUSES: Array<{ value: ImageshopProductionStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'generated', label: 'Generated' },
  { value: 'refined', label: 'Refined' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
];

const REFINEMENT_TOOL_OPTIONS: Array<{ value: RefinementTool; label: string }> = [
  { value: 'prompt-edit', label: 'Prompt Edit' },
  { value: 'region-edit', label: 'Region Edit' },
  { value: 'character-correction', label: 'Character Correction' },
  { value: 'face-correction', label: 'Face Correction' },
  { value: 'costume-correction', label: 'Costume Correction' },
  { value: 'lighting-adjustment', label: 'Lighting Adjustment' },
  { value: 'color-adjustment', label: 'Color Adjustment' },
  { value: 'dialogue-correction', label: 'Dialogue Correction' },
  { value: 'continuity-correction', label: 'Continuity Correction' },
];

export function GenericImageLabPanel({
  selectedBeat,
  productionCast,
  productionAssets,
  productionSupportingRefs,
  onUseAsSelectedBeat,
  onCreateNewBeat,
  seedPrompt,
  onSeedPromptConsumed,
}: {
  selectedBeat: StoryBeat | null;
  productionCast: ProductionCastMember[];
  productionAssets: ProductionAssetMember[];
  productionSupportingRefs: ProductionSupportingRefMember[];
  onUseAsSelectedBeat: (args: {
    imageUrl: string;
    seed: number | null;
    aspectRatio: StoryBeatAspectRatio;
    visualPrompt: string;
  }) => void;
  onCreateNewBeat: (args: {
    imageUrl: string;
    seed: number | null;
    aspectRatio: StoryBeatAspectRatio;
    visualPrompt: string;
  }) => void;
  seedPrompt?: string | null;
  onSeedPromptConsumed?: () => void;
}) {
  const consumeGuidedComicHandoff = useImageWorkshopBridge((s) => s.consumeGuidedComicHandoff);
  const sendGuidedComicPanelImageBack = useImageWorkshopBridge((s) => s.sendGuidedComicPanelImageBack);
  const returnToGuidedComicFlow = useImageWorkshopBridge((s) => s.returnToGuidedComicFlow);
  const [refs, setRefs] = useState<string[]>(() => Array.from({ length: 14 }, () => ''));
  const [context, setContext] = useState<LabContext>('character');
  const [modelId] = useState<OnyxModelId>('pro');
  const [aspectRatio, setAspectRatio] = useState<StoryBeatAspectRatio>('9:16');

  const [promptRaw, setPromptRaw] = useState('');
  const [promptRefined, setPromptRefined] = useState('');
  /** After a successful AI refine, this can be turned on; default false so raw textarea drives generation. */
  const [useRefinedPrompt, setUseRefinedPrompt] = useState(false);

  const [aiBusy, setAiBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [lastImageUrl, setLastImageUrl] = useState<string | null>(null);
  const [lastSeed, setLastSeed] = useState<number | null>(null);
  const [guidedHandoffContext, setGuidedHandoffContext] = useState<GuidedImageWorkshopHandoff | null>(null);
  const [guidedPanelTarget, setGuidedPanelTarget] = useState<GuidedImageWorkshopHandoff | null>(null);
  const [guidedPromptTracksReferences, setGuidedPromptTracksReferences] = useState(false);
  const [generatedVaultTarget, setGeneratedVaultTarget] = useState<GeneratedVaultTarget>('npc');
  const [generatedProfileName, setGeneratedProfileName] = useState('');
  const [generatedCastName, setGeneratedCastName] = useState('');
  const [generatedCollectionName, setGeneratedCollectionName] = useState('');
  const [generatedAssetName, setGeneratedAssetName] = useState('');
  const [generatedNpcLabel, setGeneratedNpcLabel] = useState('Imageshop result');
  const [generatedSavePending, setGeneratedSavePending] = useState(false);
  const [generatedSaveError, setGeneratedSaveError] = useState<string | null>(null);
  const [generatedSaveNotice, setGeneratedSaveNotice] = useState<string | null>(null);
  const [vaultProfileOptions, setVaultProfileOptions] = useState<string[]>([]);
  const [vaultProfileLoading, setVaultProfileLoading] = useState(false);
  const [vaultCollectionOptions, setVaultCollectionOptions] = useState<string[]>([]);
  const [vaultCollectionLoading, setVaultCollectionLoading] = useState(false);
  const supabaseReady = isSupabaseConfigured();
  const sessionResults = useImageshopSessionStore((s) => s.results);
  const activeSessionResultId = useImageshopSessionStore((s) => s.activeResultId);
  const addSessionResult = useImageshopSessionStore((s) => s.addResult);
  const selectSessionResult = useImageshopSessionStore((s) => s.selectResult);
  const removeSessionResult = useImageshopSessionStore((s) => s.removeResult);
  const generationMode = useImageshopProductionStore((s) => s.generationMode);
  const setGenerationMode = useImageshopProductionStore((s) => s.setGenerationMode);
  const promptWorkspace = useImageshopProductionStore((s) => s.promptWorkspace);
  const updatePromptSection = useImageshopProductionStore((s) => s.updatePromptSection);
  const replacePromptWorkspace = useImageshopProductionStore((s) => s.replacePromptWorkspace);
  const selectedArtStyleId = useImageshopProductionStore((s) => s.selectedArtStyleId);
  const savedArtStyles = useImageshopProductionStore((s) => s.savedArtStyles);
  const selectArtStyle = useImageshopProductionStore((s) => s.selectArtStyle);
  const saveArtStyle = useImageshopProductionStore((s) => s.saveArtStyle);
  const continuity = useImageshopProductionStore((s) => s.continuity);
  const updateContinuity = useImageshopProductionStore((s) => s.updateContinuity);
  const pageConfig = useImageshopProductionStore((s) => s.pageConfig);
  const updatePageConfig = useImageshopProductionStore((s) => s.updatePageConfig);
  const savedLayoutTemplates = useImageshopProductionStore((s) => s.savedLayoutTemplates);
  const saveLayoutTemplate = useImageshopProductionStore((s) => s.saveLayoutTemplate);
  const productionItems = useImageshopProductionStore((s) => s.productionItems);
  const selectedProductionItemId = useImageshopProductionStore((s) => s.selectedProductionItemId);
  const dashboardStatusFilter = useImageshopProductionStore((s) => s.dashboardStatusFilter);
  const addProductionItem = useImageshopProductionStore((s) => s.addProductionItem);
  const selectProductionItem = useImageshopProductionStore((s) => s.selectProductionItem);
  const updateProductionItemStatus = useImageshopProductionStore((s) => s.updateProductionItemStatus);
  const addProductionVersion = useImageshopProductionStore((s) => s.addProductionVersion);
  const importBatch = useImageshopProductionStore((s) => s.importBatch);
  const setDashboardStatusFilter = useImageshopProductionStore((s) => s.setDashboardStatusFilter);
  const saveExportPanelRef = useRef<HTMLDivElement | null>(null);
  const [jsonImportText, setJsonImportText] = useState('');
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [customStyleName, setCustomStyleName] = useState('');
  const [customStylePrompt, setCustomStylePrompt] = useState('');
  const [customLayoutName, setCustomLayoutName] = useState('');
  const [refinementTool, setRefinementTool] = useState<RefinementTool>('prompt-edit');
  const [continuitySourceImageUrl, setContinuitySourceImageUrl] = useState('');
  const [continuityTargetImageUrl, setContinuityTargetImageUrl] = useState('');
  const [correctionOptions, setCorrectionOptions] = useState({
    character: true,
    costume: true,
    lighting: false,
    artStyle: true,
    environment: false,
  });

  const activeSessionResult = useMemo(
    () =>
      sessionResults.find((result) => result.id === activeSessionResultId) ??
      sessionResults[0] ??
      null,
    [activeSessionResultId, sessionResults],
  );

  useEffect(() => {
    const next = seedPrompt?.trim();
    if (!next) return;
    setPromptRaw(next);
    updatePromptSection('main', next);
    setGuidedPromptTracksReferences(false);
    setUseRefinedPrompt(false);
    setError(null);
    setNotice('Visual Prep seeded Image Lab with the selected prompt.');
    onSeedPromptConsumed?.();
  }, [seedPrompt, onSeedPromptConsumed, updatePromptSection]);

  const loadProfileOptions = useCallback(() => {
    if (!supabaseReady) return;
    setVaultProfileLoading(true);
    getCharacterAlbums()
      .then((albums) => setVaultProfileOptions(albums.map((album) => album.profileName)))
      .catch(() => setVaultProfileOptions([]))
      .finally(() => setVaultProfileLoading(false));
  }, [supabaseReady]);

  const loadCollectionOptions = useCallback(() => {
    if (!supabaseReady) return;
    setVaultCollectionLoading(true);
    getAssetAlbums()
      .then((albums) => setVaultCollectionOptions(albums.map((album) => album.collectionName)))
      .catch(() => setVaultCollectionOptions([]))
      .finally(() => setVaultCollectionLoading(false));
  }, [supabaseReady]);

  useEffect(() => {
    if (generatedVaultTarget === 'character') void loadProfileOptions();
  }, [generatedVaultTarget, loadProfileOptions]);

  useEffect(() => {
    if (generatedVaultTarget === 'asset') void loadCollectionOptions();
  }, [generatedVaultTarget, loadCollectionOptions]);

  const getMatchedProfile = useCallback(
    (typed: string): string | null => {
      const q = typed.trim();
      if (!q) return null;
      const lower = q.toLowerCase();
      return vaultProfileOptions.find((profile) => profile.toLowerCase() === lower) ?? null;
    },
    [vaultProfileOptions],
  );

  const getMatchedCollection = useCallback(
    (typed: string): string | null => {
      const q = typed.trim();
      if (!q) return null;
      const lower = q.toLowerCase();
      return vaultCollectionOptions.find((collection) => collection.toLowerCase() === lower) ?? null;
    },
    [vaultCollectionOptions],
  );

  const stableRefs = useMemo(
    () => Array.from({ length: 14 }, (_, i) => refs[i] ?? ''),
    [refs]
  );

  const activeReferenceMetadata = useMemo((): GuidedImageWorkshopReference[] => {
    const activeUrls = new Set(stableRefs.map((url) => url.trim()).filter(Boolean));

    const guidedReferences = guidedHandoffContext
      ? getGuidedImageWorkshopPreload(guidedHandoffContext).allReferences.filter((reference) =>
          activeUrls.has(reference.imageUrl.trim()),
        )
      : [];

    const knownUrls = new Set(guidedReferences.map((reference) => reference.imageUrl.trim()));
    const manualReferences = stableRefs
      .map((url, index): GuidedImageWorkshopReference | null => {
        const trimmed = url.trim();
        if (!trimmed || knownUrls.has(trimmed)) return null;
        return {
          name: `reference-${index + 1}`,
          displayName: `Reference ${index + 1}`,
          imageUrl: trimmed,
          sourceType: context === 'character' ? 'character' : 'asset',
          sourceLabel: 'Imageshop slot',
        };
      })
      .filter((reference): reference is GuidedImageWorkshopReference => Boolean(reference));

    const approvedProductionReferences = productionItems
      .filter((item) => item.status === 'approved' || item.status === 'published')
      .map((item): GuidedImageWorkshopReference | null => {
        const imageUrl = item.versions[0]?.imageUrl?.trim();
        if (!imageUrl || activeUrls.has(imageUrl)) return null;
        return {
          name: item.id,
          displayName: item.label,
          imageUrl,
          sourceType: 'asset',
          sourceLabel: item.status === 'published' ? 'Published production reference' : 'Approved production reference',
          imageLabel: item.sourceKind,
        };
      })
      .filter((reference): reference is GuidedImageWorkshopReference => Boolean(reference));

    return [...guidedReferences, ...manualReferences, ...approvedProductionReferences];
  }, [context, guidedHandoffContext, productionItems, stableRefs]);

  const guidedPanelContextLabel =
    guidedHandoffContext?.pageNumber != null && guidedHandoffContext.panelNumber != null
      ? `Page ${guidedHandoffContext.pageNumber}, Panel ${guidedHandoffContext.panelNumber}`
      : guidedHandoffContext?.pageNumber != null
        ? `Page ${guidedHandoffContext.pageNumber}`
        : guidedHandoffContext?.panelNumber != null
          ? `Panel ${guidedHandoffContext.panelNumber}`
          : null;

  const selectedArtStyle = useMemo(
    () => savedArtStyles.find((style) => style.id === selectedArtStyleId) ?? null,
    [savedArtStyles, selectedArtStyleId],
  );

  const layoutTemplateOptions = useMemo(
    () => [
      ...LAYOUT_TEMPLATE_OPTIONS,
      ...savedLayoutTemplates.map((template) => ({
        value: template.id,
        label: template.name,
      })),
    ],
    [savedLayoutTemplates],
  );

  const structuredWorkspace = useMemo(
    () => ({
      ...promptWorkspace,
      main: (useRefinedPrompt && promptRefined.trim() ? promptRefined : promptRaw).trim() || promptWorkspace.main,
    }),
    [promptRaw, promptRefined, promptWorkspace, useRefinedPrompt],
  );

  const hasProductionPromptControls = useMemo(() => {
    const hasExtraPromptSections = PROMPT_WORKSPACE_FIELDS.some(({ key }) => Boolean(promptWorkspace[key].trim()));
    const continuityChanged = JSON.stringify(continuity) !== JSON.stringify(DEFAULT_CONTINUITY);
    const pageConfigChanged = JSON.stringify(pageConfig) !== JSON.stringify(DEFAULT_PAGE_CONFIG);
    return generationMode === 'comic-pages' || hasExtraPromptSections || Boolean(selectedArtStyle) || continuityChanged || pageConfigChanged;
  }, [continuity, generationMode, pageConfig, promptWorkspace, selectedArtStyle]);

  const composedProductionPrompt = useMemo(
    () =>
      composeImageshopPrompt({
        mode: generationMode,
        workspace: structuredWorkspace,
        artStyle: selectedArtStyle,
        continuity,
        references: activeReferenceMetadata,
        pageConfig,
      }),
    [activeReferenceMetadata, continuity, generationMode, pageConfig, selectedArtStyle, structuredWorkspace],
  );

  /** Prefer refined text when enabled and present; otherwise use raw (avoids empty refined + default toggle blocking generation). */
  const effectivePrompt = useMemo(() => {
    const raw = promptRaw.trim();
    const refined = promptRefined.trim();
    const basePrompt = useRefinedPrompt && refined ? refined : raw || refined || promptWorkspace.main.trim();
    if (!basePrompt) return '';
    if (hasProductionPromptControls) return composedProductionPrompt;
    return basePrompt;
  }, [composedProductionPrompt, hasProductionPromptControls, promptRaw, promptRefined, promptWorkspace.main, useRefinedPrompt]);

  useEffect(() => {
    if (!guidedPromptTracksReferences || !guidedHandoffContext) return;
    const nextPrompt = buildGuidedImageWorkshopPromptForActiveReferences(guidedHandoffContext, stableRefs);
    setPromptRaw(nextPrompt);
    updatePromptSection('main', nextPrompt);
    setPromptRefined('');
    setUseRefinedPrompt(false);
  }, [guidedHandoffContext, guidedPromptTracksReferences, stableRefs, updatePromptSection]);

  const generatedSaveProcessing = useMemo((): Record<string, unknown> => {
    const guidedTarget =
      guidedPanelTarget?.currentStep === 'art'
        ? {
            panelId: guidedPanelTarget.panelId,
            pageNumber: guidedPanelTarget.pageNumber,
            panelNumber: guidedPanelTarget.panelNumber,
          }
        : undefined;

    return {
      source: 'imageshop_generated',
      prompt: effectivePrompt,
      aspectRatio,
      context,
      modelId,
      ...(guidedTarget ? { guidedComicPanel: guidedTarget } : {}),
    };
  }, [aspectRatio, context, effectivePrompt, guidedPanelTarget, modelId]);

  const restoreSessionResult = useCallback(
    (result: ImageshopSessionResult) => {
      setLastImageUrl(result.imageUrl);
      setLastSeed(result.seed);
      setAspectRatio(result.aspectRatio);
      setContext(result.context);
      if (result.prompt.trim()) {
        setPromptRaw(result.prompt);
        updatePromptSection('main', result.prompt);
        setGuidedPromptTracksReferences(false);
        setUseRefinedPrompt(false);
      }
      setGeneratedSaveError(null);
      setGeneratedSaveNotice(null);
      selectSessionResult(result.id);
      setNotice('Restored an Imageshop result from this session.');
    },
    [selectSessionResult, updatePromptSection],
  );

  useEffect(() => {
    if (lastImageUrl || !activeSessionResult) return;
    restoreSessionResult(activeSessionResult);
  }, [activeSessionResult, lastImageUrl, restoreSessionResult]);

  const applyRefs = useCallback((incoming: string[], nextContext: LabContext) => {
    const next = Array.from({ length: 14 }, (_, i) => incoming[i] ?? '');
    setRefs(next);
    setContext(nextContext);
    setNotice(null);
  }, []);

  useEffect(() => {
    const handoff = consumeGuidedComicHandoff();
    if (!handoff) return;

    setGuidedHandoffContext(handoff);
    setGuidedPromptTracksReferences(false);
    const preload = getGuidedImageWorkshopPreload(handoff);
    const preloadSuffix =
      preload.allReferences.length > preload.slotUrls.length
        ? `, first ${preload.slotUrls.length} preloaded into Imageshop slots, ${preload.overflowReferences.length} additional kept in the handoff`
        : '';

    if (handoff.currentStep === 'art') {
      setGuidedPanelTarget(handoff);
      if (preload.slotUrls.length > 0) {
        applyRefs(preload.slotUrls, preload.context);
      }
      const nextPrompt = buildGuidedImageWorkshopPrompt(handoff);
      setPromptRaw(nextPrompt);
      updatePromptSection('main', nextPrompt);
      setPromptRefined('');
      setUseRefinedPrompt(false);
      setGuidedPromptTracksReferences(true);
      setAspectRatio(getGuidedImageWorkshopAspectRatio(handoff));
      setGenerationMode('comic-pages');
      setError(null);
      setNotice(
        `Loaded panel from Guided Comic Flow: Page ${handoff.pageNumber ?? '?'}, Panel ${handoff.panelNumber ?? '?'} with ${preload.allReferences.length} reference${preload.allReferences.length === 1 ? '' : 's'}${preloadSuffix}.`,
      );
      return;
    }

    if (preload.slotUrls.length === 0) return;

    applyRefs(preload.slotUrls, preload.context);
    setNotice(
      `Loaded ${preload.allReferences.length} reference${preload.allReferences.length === 1 ? '' : 's'} from Guided Comic Flow${preloadSuffix}.`,
    );
  }, [applyRefs, consumeGuidedComicHandoff, setGenerationMode, updatePromptSection]);

  const sendBackToGuidedComicFlow = useCallback(() => {
    if (!guidedPanelTarget || !lastImageUrl || !guidedPanelTarget.pageNumber || !guidedPanelTarget.panelNumber) return;

    sendGuidedComicPanelImageBack({
      panelId: guidedPanelTarget.panelId,
      pageNumber: guidedPanelTarget.pageNumber,
      panelNumber: guidedPanelTarget.panelNumber,
      imageUrl: lastImageUrl,
      seed: lastSeed,
      prompt: effectivePrompt,
    });
  }, [effectivePrompt, guidedPanelTarget, lastImageUrl, lastSeed, sendGuidedComicPanelImageBack]);

  const scrollToSaveExport = useCallback(() => {
    saveExportPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const getStudioRefs = useCallback((source: 'character' | 'asset'): string[] => {
    if (source === 'character') return useCharacterStudioStore.getState().referenceImageUrls;
    return useAssetStudioStore.getState().referenceImageUrls;
  }, []);

  const replaceFromStudio = useCallback(
    (source: 'character' | 'asset') => {
      const urls = getStudioRefs(source);
      if (!urls.some(Boolean)) {
        setNotice(
          source === 'character'
            ? 'No references in Character Studio yet. Add refs there first, then try again.'
            : 'No references in Assets Studio yet. Add refs there first, then try again.'
        );
        return;
      }
      applyRefs(urls, source === 'character' ? 'character' : 'asset');
    },
    [applyRefs, getStudioRefs]
  );

  const addFromStudio = useCallback(
    (source: 'character' | 'asset') => {
      const urls = getStudioRefs(source).filter(Boolean);
      if (urls.length === 0) {
        setNotice(
          source === 'character'
            ? 'No references in Character Studio yet. Add refs there first, then try again.'
            : 'No references in Assets Studio yet. Add refs there first, then try again.'
        );
        return;
      }
      setNotice(null);
      setRefs((prev) => {
        const next = Array.from({ length: 14 }, (_, i) => prev[i] ?? '');
        for (const u of urls) {
          const idx = next.findIndex((x) => !x);
          if (idx < 0) break;
          next[idx] = u;
        }
        return next;
      });
    },
    [getStudioRefs]
  );

  const fillFromSelectedBeat = useCallback(() => {
    if (!selectedBeat) return;
    const linkedCast = productionCast.filter((c) =>
      selectedBeat.linkedVaultCharacterIds.includes(c.vaultCharacterId)
    );
    const linkedSupporting = productionSupportingRefs.filter((r) =>
      selectedBeat.linkedSupportingRefIds.includes(r.supportingRefId)
    );
    const linkedAssets = productionAssets.filter((a) =>
      selectedBeat.linkedVaultAssetIds.includes(a.vaultAssetId)
    );
    const packed = buildStorylineReferenceSlots(linkedCast, linkedSupporting, linkedAssets);
    setRefs(packed);
    setContext('character');
  }, [productionAssets, productionCast, productionSupportingRefs, selectedBeat]);

  const clearRefs = useCallback(() => {
    setRefs(Array.from({ length: 14 }, () => ''));
  }, []);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      setError(null);
      setRefs((prev) => {
        const next = Array.from({ length: 14 }, (_, i) => prev[i] ?? '');
        let slot = 0;
        for (const file of Array.from(files)) {
          if (!file.type.startsWith('image/')) continue;
          while (slot < 14 && next[slot]) slot++;
          if (slot >= 14) break;
          const url = URL.createObjectURL(file);
          next[slot] = url;
          slot++;
        }
        return next;
      });
    },
    []
  );

  const pasteFirstEmpty = useCallback(async () => {
    setError(null);
    try {
      const clipItems = await navigator.clipboard.read();
      setRefs((prev) => {
        const next = Array.from({ length: 14 }, (_, i) => prev[i] ?? '');
        for (const item of clipItems) {
          for (const type of item.types) {
            if (!type.startsWith('image/')) continue;
            void (async () => {
              const blob = await item.getType(type);
              const url = URL.createObjectURL(blob);
              const firstEmpty = next.findIndex((u) => !u);
              if (firstEmpty >= 0) next[firstEmpty] = url;
              setRefs([...next]);
            })();
            return next;
          }
        }
        return next;
      });
    } catch {
      setError('Could not paste image from clipboard (permission or no image).');
    }
  }, []);

  const ensureProductionItemForPrompt = useCallback(
    (prompt: string): ImageshopProductionItem => {
      const selectedItem = productionItems.find((item) => item.id === selectedProductionItemId);
      if (selectedItem) return selectedItem;

      return addProductionItem({
        label: guidedPanelContextLabel ? `Imageshop ${guidedPanelContextLabel}` : `Imageshop item ${productionItems.length + 1}`,
        sourceKind: guidedPanelTarget?.currentStep === 'art' ? 'comic-page' : 'manual',
        sourceId: guidedPanelTarget?.panelId,
        prompt,
        promptSections: structuredWorkspace,
        pageConfig: generationMode === 'comic-pages' ? pageConfig : undefined,
      });
    },
    [
      addProductionItem,
      generationMode,
      guidedPanelContextLabel,
      guidedPanelTarget,
      pageConfig,
      productionItems,
      selectedProductionItemId,
      structuredWorkspace,
    ],
  );

  const recordProductionVersion = useCallback(
    (args: {
      item: ImageshopProductionItem;
      imageUrl: string;
      seed: number | null;
      prompt: string;
      kind: ImageshopProductionVersionKind;
    }) => {
      addProductionVersion(args.item.id, {
        imageUrl: args.imageUrl,
        seed: args.seed,
        prompt: args.prompt,
        kind: args.kind,
      });
    },
    [addProductionVersion],
  );

  const refinePrompt = useCallback(async () => {
    const raw = promptRaw.trim();
    if (!raw) return;
    setAiBusy(true);
    setError(null);
    try {
      const res = await generateGeminiText({
        systemPrompt:
          'You are a prompt engineer for an image generation model. Rewrite the user prompt to be specific, concrete, and generation-ready. Output ONLY valid JSON: {"refinedPrompt":"..."}.\n\nNo markdown; no extra keys.',
        userPrompt:
          `User prompt:\n${raw}\n\n` +
          `Rewrite rules:\n` +
          `- Preserve the user's intent.\n` +
          `- Add concrete visual details (subject, scene, lighting, lens/composition cues).\n` +
          `- Keep it short (<= 2200 chars).\n`,
        jsonMode: true,
      });
      if (!res.ok) {
        setError(formatGeminiClientError(res.error));
        return;
      }
      const parsed = parseJsonFromModel<{ refinedPrompt?: string }>(res.text);
      const refined = (parsed?.refinedPrompt ?? '').trim();
      if (!refined) {
        setError('Could not refine prompt.');
        return;
      }
      setPromptRefined(refined);
      setUseRefinedPrompt(true);
    } finally {
      setAiBusy(false);
    }
  }, [promptRaw]);

  const generate = useCallback(async () => {
    const basePrompt = effectivePrompt;
    if (!basePrompt) {
      setError('Enter a prompt before generating.');
      return;
    }
    setError(null);
    setGenBusy(true);
    try {
      const seed = pickGenerationSeed('randomized', null);
      const res = await generateImage({
        prompt: basePrompt,
        referenceImageUrls: stableRefs,
        seed,
        aspectRatio,
        modelId,
        context,
      });
      if (!res.ok) {
        if ('blocked' in res && res.blocked) setError('Blocked by safety filters.');
        else if ('error' in res) setError(formatGeminiClientError(res.error));
        else setError('Failed to generate image.');
        return;
      }
      const stored = addSessionResult({
        imageUrl: res.imageDataUrl,
        seed,
        prompt: basePrompt,
        aspectRatio,
        context,
        modelId,
        sourceLabel: guidedPanelTarget?.sourceLabel,
      });
      const item = ensureProductionItemForPrompt(basePrompt);
      recordProductionVersion({
        item,
        imageUrl: stored.imageUrl,
        seed: stored.seed,
        prompt: basePrompt,
        kind: refinementTool === 'continuity-correction' ? 'continuity-correction' : item.versions.length > 0 ? 'refined' : 'generated',
      });
      setLastImageUrl(stored.imageUrl);
      setLastSeed(stored.seed);
      setGeneratedSaveError(null);
      setGeneratedSaveNotice(null);
    } finally {
      setGenBusy(false);
    }
  }, [
    addSessionResult,
    aspectRatio,
    context,
    effectivePrompt,
    ensureProductionItemForPrompt,
    guidedPanelTarget?.sourceLabel,
    modelId,
    recordProductionVersion,
    refinementTool,
    stableRefs,
  ]);

  const handleSaveGeneratedToVault = useCallback(async () => {
    if (!lastImageUrl) {
      setGeneratedSaveError('Generate an image before saving.');
      return;
    }

    setGeneratedSaveError(null);
    setGeneratedSaveNotice(null);
    setGeneratedSavePending(true);
    try {
      if (generatedVaultTarget === 'npc') {
        const label = generatedNpcLabel.trim() || 'Imageshop result';
        saveGeneration('supporting_reference', lastImageUrl, lastSeed ?? undefined, {
          supportingLabel: label,
        });
        setGeneratedSaveNotice(`Saved to NPC Vault as "${label}".`);
        return;
      }

      if (generatedVaultTarget === 'character') {
        const typed = generatedProfileName.trim();
        if (!typed) {
          setGeneratedSaveError('Enter a profile name.');
          return;
        }
        const matched = getMatchedProfile(typed);
        const profileNameForDb = matched ?? typed;
        const isUnnamed = profileNameForDb.toLowerCase() === 'unnamed';
        const baseNameForId = isUnnamed ? 'Unnamed' : profileNameForDb;
        const profileForInsert = isUnnamed ? undefined : profileNameForDb;
        const cast = generatedCastName.trim() || undefined;

        if (supabaseReady) {
          const result = await saveImportedImageToCharacterVault({
            imageUrl: lastImageUrl,
            baseName: baseNameForId,
            profileName: profileForInsert,
            castName: cast,
            seed: lastSeed,
            processing: generatedSaveProcessing,
          });
          if (!result.ok) {
            setGeneratedSaveError(result.error ?? 'Save failed.');
            return;
          }
          if (result.id && result.imageUrl) {
            addRecentFromCharacter({
              id: result.id,
              image_url: result.imageUrl,
              profile_name: profileForInsert ?? null,
              cast_name: cast ?? null,
              seed: lastSeed,
            });
            saveGeneration('character', result.imageUrl, lastSeed ?? undefined, {
              profileName: profileForInsert,
              castName: cast,
            });
          }
        } else {
          saveGeneration('character', lastImageUrl, lastSeed ?? undefined, {
            profileName: profileForInsert,
            castName: cast,
          });
        }

        setGeneratedSaveNotice(`Saved to Character Vault as "${profileNameForDb}".`);
        return;
      }

      const typed = generatedCollectionName.trim();
      if (!typed) {
        setGeneratedSaveError('Enter a collection name.');
        return;
      }
      const matched = getMatchedCollection(typed);
      const collectionForDb = matched ?? typed;
      const isUnnamed = collectionForDb.toLowerCase() === 'unnamed';
      const baseNameForId = isUnnamed ? 'Unnamed' : collectionForDb;
      const collectionInsert = isUnnamed ? undefined : collectionForDb;
      const asset = generatedAssetName.trim() || undefined;

      if (supabaseReady) {
        const result = await saveImportedImageToAssetVault({
          imageUrl: lastImageUrl,
          baseName: baseNameForId,
          collectionName: collectionInsert,
          assetName: asset,
          seed: lastSeed,
          processing: generatedSaveProcessing,
        });
        if (!result.ok) {
          setGeneratedSaveError(result.error ?? 'Save failed.');
          return;
        }
        if (result.id && result.imageUrl) {
          addRecentFromAsset({
            id: result.id,
            image_url: result.imageUrl,
            collection_name: collectionInsert ?? null,
            asset_name: asset ?? null,
            seed: lastSeed,
          });
          saveGeneration('asset', result.imageUrl, lastSeed ?? undefined, {
            collectionName: collectionInsert,
            assetName: asset,
          });
        }
      } else {
        saveGeneration('asset', lastImageUrl, lastSeed ?? undefined, {
          collectionName: collectionInsert,
          assetName: asset,
        });
      }

      setGeneratedSaveNotice(`Saved to Asset Vault collection "${collectionForDb}".`);
    } finally {
      setGeneratedSavePending(false);
    }
  }, [
    generatedAssetName,
    generatedCastName,
    generatedCollectionName,
    generatedNpcLabel,
    generatedProfileName,
    generatedSaveProcessing,
    generatedVaultTarget,
    getMatchedCollection,
    getMatchedProfile,
    lastImageUrl,
    lastSeed,
    supabaseReady,
  ]);

  const downloadDataUrl = useCallback((dataUrl: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const downloadTextFile = useCallback((text: string, fileName: string, mime = 'application/json') => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportJson = useCallback(
    (text: string) => {
      setJsonImportError(null);
      try {
        const parsed = JSON.parse(text);
        const batch = normalizeImageshopJson(parsed);
        importBatch(batch);
        setJsonImportText('');
        setGenerationMode(batch.kind === 'story-beat-json' ? 'video-beats' : 'comic-pages');
        setNotice(`Imported ${batch.items.length} production item${batch.items.length === 1 ? '' : 's'} from ${batch.title}.`);
      } catch (err) {
        setJsonImportError(err instanceof Error ? err.message : 'Could not import JSON.');
      }
    },
    [importBatch, setGenerationMode],
  );

  const handleJsonFile = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      const text = await file.text();
      setJsonImportText(text);
      handleImportJson(text);
    },
    [handleImportJson],
  );

  const handlePageBackgroundFile = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      updatePageConfig({
        panelStyle: {
          pageBackgroundUrl: URL.createObjectURL(file),
        },
      });
    },
    [updatePageConfig],
  );

  const exportProductionJson = useCallback(() => {
    const payload = exportImageshopProductionConfig({
      title: 'Imageshop production config',
      mode: generationMode,
      pageConfig,
      artStyles: savedArtStyles,
      selectedArtStyleId,
      items:
        productionItems.length > 0
          ? productionItems.map((item) => ({
              id: item.id,
              label: item.label,
              prompt: item.prompt,
              promptSections: item.promptSections,
              pageConfig: item.pageConfig ?? pageConfig,
            }))
          : [
              {
                id: 'current-imageshop-prompt',
                label: 'Current Imageshop Prompt',
                prompt: effectivePrompt,
                promptSections: structuredWorkspace,
                pageConfig,
              },
            ],
    });
    downloadTextFile(payload, 'imageshop-production-config.json');
    setGeneratedSaveNotice('Exported Imageshop production JSON.');
  }, [
    downloadTextFile,
    effectivePrompt,
    generationMode,
    pageConfig,
    productionItems,
    savedArtStyles,
    selectedArtStyleId,
    structuredWorkspace,
  ]);

  const generateBatch = useCallback(async () => {
    const queue = productionItems.filter((item) => item.status === 'draft' || item.status === 'refined');
    if (queue.length === 0) {
      setNotice('No draft or refined production items are queued for batch generation.');
      return;
    }

    setBatchBusy(true);
    setError(null);
    try {
      for (const item of queue) {
        const itemPrompt = composeImageshopPrompt({
          mode: generationMode,
          workspace: {
            ...promptWorkspace,
            ...item.promptSections,
            main: item.promptSections.main?.trim() || item.prompt,
          },
          artStyle: selectedArtStyle,
          continuity,
          references: activeReferenceMetadata,
          pageConfig: item.pageConfig ?? pageConfig,
        });
        const seed = pickGenerationSeed('randomized', null);
        const res = await generateImage({
          prompt: itemPrompt,
          referenceImageUrls: stableRefs,
          seed,
          aspectRatio,
          modelId,
          context,
        });
        if (!res.ok) {
          updateProductionItemStatus(item.id, 'draft');
          setError('A batch item failed to generate; remaining items were left queued.');
          break;
        }
        const stored = addSessionResult({
          imageUrl: res.imageDataUrl,
          seed,
          prompt: itemPrompt,
          aspectRatio,
          context,
          modelId,
          sourceLabel: item.label,
        });
        recordProductionVersion({
          item,
          imageUrl: stored.imageUrl,
          seed: stored.seed,
          prompt: itemPrompt,
          kind: item.versions.length > 0 ? 'refined' : 'generated',
        });
        setLastImageUrl(stored.imageUrl);
        setLastSeed(stored.seed);
      }
    } finally {
      setBatchBusy(false);
    }
  }, [
    activeReferenceMetadata,
    addSessionResult,
    aspectRatio,
    context,
    continuity,
    generationMode,
    modelId,
    pageConfig,
    productionItems,
    promptWorkspace,
    recordProductionVersion,
    selectedArtStyle,
    stableRefs,
    updateProductionItemStatus,
  ]);

  const selectedProductionItem = useMemo(
    () => productionItems.find((item) => item.id === selectedProductionItemId) ?? productionItems[0] ?? null,
    [productionItems, selectedProductionItemId],
  );

  const visibleProductionItems = useMemo(
    () =>
      dashboardStatusFilter === 'all'
        ? productionItems
        : productionItems.filter((item) => item.status === dashboardStatusFilter),
    [dashboardStatusFilter, productionItems],
  );

  const stageProductionItem = useCallback(
    (item: ImageshopProductionItem) => {
      selectProductionItem(item.id);
      setPromptRaw(item.prompt);
      replacePromptWorkspace({
        ...item.promptSections,
        main: item.promptSections.main ?? item.prompt,
      });
      if (item.pageConfig) updatePageConfig(item.pageConfig);
      setNotice(`Loaded ${item.label} into the prompt workspace.`);
    },
    [replacePromptWorkspace, selectProductionItem, updatePageConfig],
  );

  const stageRefinementPrompt = useCallback(() => {
    const target = selectedProductionItem;
    const base = target?.prompt || effectivePrompt;
    const correctionList = [
      correctionOptions.character ? 'match character identity' : '',
      correctionOptions.costume ? 'match costume' : '',
      correctionOptions.lighting ? 'match lighting' : '',
      correctionOptions.artStyle ? 'match art style' : '',
      correctionOptions.environment ? 'match environment' : '',
    ]
      .filter(Boolean)
      .join(', ');
    const instruction =
      refinementTool === 'continuity-correction'
        ? [
            'Continuity correction only. Do not redraw the whole image.',
            continuitySourceImageUrl.trim() ? `Approved source image: ${continuitySourceImageUrl.trim()}` : '',
            continuityTargetImageUrl.trim() ? `Target image: ${continuityTargetImageUrl.trim()}` : '',
            `Apply only these surgical fixes: ${correctionList || 'match selected references'}.`,
          ]
            .filter(Boolean)
            .join(' ')
        : `${REFINEMENT_TOOL_OPTIONS.find((tool) => tool.value === refinementTool)?.label ?? 'Refinement'}: refine the current generated image while preserving composition and production continuity.`;

    const nextPrompt = [base, instruction].filter(Boolean).join('\n\n');
    setPromptRaw(nextPrompt);
    replacePromptWorkspace({
      main: nextPrompt,
      continuity: instruction,
    });
    if (target) {
      selectProductionItem(target.id);
      updateProductionItemStatus(target.id, target.status === 'draft' ? 'generated' : target.status);
    }
    setNotice('Staged a refinement prompt for the selected production item.');
  }, [
    correctionOptions,
    effectivePrompt,
    continuitySourceImageUrl,
    continuityTargetImageUrl,
    refinementTool,
    replacePromptWorkspace,
    selectProductionItem,
    selectedProductionItem,
    updateProductionItemStatus,
  ]);

  const saveCustomArtStyle = useCallback(() => {
    const name = customStyleName.trim();
    const prompt = customStylePrompt.trim();
    if (!name || !prompt) {
      setNotice('Enter a style name and style prompt before saving.');
      return;
    }
    saveArtStyle({
      name,
      description: 'Custom Imageshop art style.',
      prompt,
    });
    setCustomStyleName('');
    setCustomStylePrompt('');
    setNotice(`Saved art style "${name}".`);
  }, [customStyleName, customStylePrompt, saveArtStyle]);

  const saveCurrentLayoutTemplate = useCallback(() => {
    const template = saveLayoutTemplate(customLayoutName.trim() || `Custom layout ${savedLayoutTemplates.length + 1}`);
    setCustomLayoutName('');
    setNotice(`Saved layout template "${template.name}".`);
  }, [customLayoutName, saveLayoutTemplate, savedLayoutTemplates.length]);

  const canUseSelectedBeat = Boolean(selectedBeat && lastImageUrl);
  const labPreviewAspectCss = studioPreviewAspectCss(aspectRatio as StudioPreviewAspectId);
  const labPreviewMaxH = studioPreviewMaxHeightCss(aspectRatio as StudioPreviewAspectId);
  const isCinematic = aspectRatio === '21:9';
  const previewMaxH = isCinematic ? 'min(56vh, 520px)' : labPreviewMaxH;
  const canSendBackToGuidedFlow = Boolean(
    guidedPanelTarget?.currentStep === 'art' &&
      guidedPanelTarget.pageNumber != null &&
      guidedPanelTarget.panelNumber != null &&
      lastImageUrl,
  );

  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-black/20 overflow-visible">
      {guidedHandoffContext ? (
        <header className="sticky top-0 z-40 flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-400/35 bg-[#050814]/95 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex min-w-0 flex-[1_1_18rem] items-center gap-2">
            <button
              type="button"
              onClick={returnToGuidedComicFlow}
              className="inline-flex h-9 max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-300/45 bg-amber-400/10 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-300/20"
            >
              <span aria-hidden="true">&larr;</span>
              <span>Back to Comic Creator</span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-white/80">Loaded from Guided Comic Flow</p>
              {guidedPanelContextLabel ? (
                <p className="truncate text-[10px] text-amber-200/65">{guidedPanelContextLabel}</p>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 flex-[1_1_12rem] text-center">
            <p className="truncate text-sm font-bold text-white">Illustrator&rsquo;s Imageshop</p>
            <p className="mt-0.5 truncate text-[10px] text-white/45">
              Generate, refine, save, and export visual assets
            </p>
          </div>

          <div className="flex min-w-0 flex-[1_1_10rem] items-center justify-end gap-2">
            <button
              type="button"
              disabled={!lastImageUrl}
              onClick={scrollToSaveExport}
              className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-40"
            >
              Save / Export
            </button>
            {canSendBackToGuidedFlow ? (
              <button
                type="button"
                onClick={sendBackToGuidedComicFlow}
                className="inline-flex h-9 min-w-0 items-center justify-center rounded-lg px-3 text-center text-xs font-semibold text-black"
                style={{ background: 'linear-gradient(90deg, #D4AF37, #FBBF24)' }}
              >
                Send back to Guided Flow
              </button>
            ) : null}
          </div>
        </header>
      ) : null}

      <div className="p-3">
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Image Lab</h3>

      <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Generation Mode</p>
            <p className="mt-1 text-[11px] text-white/50">
              Video Beats preserves the current workflow. Comic Pages unlocks page, panel, continuity, and batch controls.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['video-beats', 'comic-pages'] as ImageshopGenerationMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setGenerationMode(mode)}
                className={`px-3 py-2 rounded-lg text-xs border ${
                  generationMode === mode
                    ? 'border-amber-300 bg-amber-400/20 text-amber-100'
                    : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {mode === 'video-beats' ? 'Video Beats' : 'Comic Pages'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ImageshopImportPanel />

      <div className="mt-3 flex flex-col lg:flex-row lg:items-stretch gap-4 lg:gap-5 min-h-0">
      <div className="flex-1 min-w-0 lg:max-w-[min(100%,440px)] space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[11px] border border-white/15 hover:bg-white/10"
          onClick={() => replaceFromStudio('character')}
        >
          Replace with Character refs
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[11px] border border-white/15 hover:bg-white/10"
          onClick={() => replaceFromStudio('asset')}
        >
          Replace with Asset refs
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[11px] border border-white/15 hover:bg-white/10"
          onClick={() => addFromStudio('character')}
        >
          Add Character refs
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[11px] border border-white/15 hover:bg-white/10"
          onClick={() => addFromStudio('asset')}
        >
          Add Asset refs
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[11px] border border-white/15 hover:bg-white/10 disabled:opacity-40"
          disabled={!selectedBeat}
          onClick={() => fillFromSelectedBeat()}
        >
          Use selected beat refs
        </button>
      </div>
      {notice && (
        <p className="text-[11px] text-amber-200/90 border border-amber-500/30 bg-amber-950/20 rounded-lg px-2 py-1">
          {notice}
        </p>
      )}

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className="text-[10px] text-white/45 uppercase">References</label>
          <div className="flex gap-2">
            <label className="text-[10px] text-amber-200/90 hover:text-amber-100 cursor-pointer">
              Upload
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => addFiles(e.target.files)} />
            </label>
            <button
              type="button"
              className="text-[10px] text-white/70 hover:text-white/90"
              onClick={() => void pasteFirstEmpty()}
            >
              Paste
            </button>
            <button
              type="button"
              className="text-[10px] text-white/70 hover:text-white/90"
              onClick={() => clearRefs()}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {stableRefs.map((u, i) => (
            <div
              key={i}
              className={`relative w-14 h-14 rounded-lg border ${
                u ? 'border-fuchsia-400/30' : 'border-white/10'
              } bg-black/20 overflow-hidden`}
            >
              {u ? <ArcsStorageImg src={u} alt="" className="w-full h-full object-cover" /> : null}
              {u ? (
                <button
                  type="button"
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/80 text-white text-xs flex items-center justify-center"
                  onClick={() => setRefs((prev) => prev.map((x, idx) => (idx === i ? '' : x)))}
                  aria-label="Remove reference"
                >
                  ×
                </button>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/25">
                  {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-[10px] text-white/45 uppercase mb-1">Prompt</label>
        <textarea
          className="w-full min-h-[72px] rounded-lg bg-black/30 border border-white/15 p-2 text-xs font-mono"
          value={promptRaw}
          onChange={(e) => {
            setGuidedPromptTracksReferences(false);
            setPromptRaw(e.target.value);
            updatePromptSection('main', e.target.value);
          }}
          placeholder="Describe the image you want..."
        />

        <div className="mt-2 grid grid-cols-1 gap-2">
          {PROMPT_WORKSPACE_FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className="text-[10px] text-white/45 uppercase">{field.label}</span>
              <textarea
                className="mt-0.5 w-full min-h-[54px] resize-y rounded-lg bg-black/25 border border-white/10 p-2 text-[11px] font-mono"
                value={promptWorkspace[field.key]}
                onChange={(e) => updatePromptSection(field.key, e.target.value)}
                placeholder={field.placeholder}
              />
            </label>
          ))}
        </div>

        {hasProductionPromptControls ? (
          <div className="mt-2 rounded-lg border border-fuchsia-400/20 bg-fuchsia-950/10 p-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-fuchsia-100/70">Composed generation prompt</p>
            <p className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap text-[10px] text-white/60">{composedProductionPrompt}</p>
          </div>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip content="Use Gemini to rewrite your prompt into a generation-ready prompt." side="top">
              <button
                type="button"
                disabled={aiBusy || !promptRaw.trim()}
                onClick={() => void refinePrompt()}
                className="px-2 py-1 rounded-lg text-[11px] border border-amber-500/40 hover:bg-amber-500/10 disabled:opacity-40"
              >
                {aiBusy ? 'Refining…' : 'AI prompt helper'}
              </button>
            </Tooltip>
            <button
              type="button"
              disabled={!promptRefined.trim()}
              onClick={() => setUseRefinedPrompt((v) => !v)}
              className="px-2 py-1 rounded-lg text-[11px] border border-white/15 hover:bg-white/10 disabled:opacity-40"
            >
              {useRefinedPrompt ? 'Using refined prompt' : 'Using raw prompt'}
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <label className="text-[10px] text-white/45 uppercase">Context</label>
            <div className="flex gap-2">
              {(['character', 'asset'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setContext(c)}
                  className={`px-2 py-1 rounded-lg text-[11px] border ${
                    context === c ? 'border-fuchsia-400 bg-fuchsia-500/15' : 'border-white/15 bg-white/0'
                  }`}
                >
                  {c === 'character' ? 'Character' : 'Asset'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {promptRefined.trim() ? (
          <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
            <p className="text-[10px] uppercase tracking-[0.1em] text-white/45 mb-1">
              Refined prompt preview
            </p>
            <p className="text-[11px] text-white/70 whitespace-pre-wrap">{promptRefined}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Art Style Library</p>
            <p className="mt-1 text-[11px] text-white/45">Styles stay separate from the main prompt and export with production configs.</p>
          </div>
          <select
            className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
            value={selectedArtStyleId ?? ''}
            onChange={(e) => selectArtStyle(e.target.value || null)}
          >
            <option value="">No saved style</option>
            {savedArtStyles.map((style) => (
              <option key={style.id} value={style.id}>
                {style.name}
              </option>
            ))}
          </select>
        </div>
        {selectedArtStyle ? (
          <p className="mt-2 rounded-lg border border-white/10 bg-black/25 p-2 text-[11px] text-white/60">
            {selectedArtStyle.prompt}
          </p>
        ) : null}
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_auto]">
          <input
            type="text"
            className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs"
            value={customStyleName}
            onChange={(e) => setCustomStyleName(e.target.value)}
            placeholder="Style name"
          />
          <input
            type="text"
            className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs"
            value={customStylePrompt}
            onChange={(e) => setCustomStylePrompt(e.target.value)}
            placeholder="Style definition"
          />
          <button
            type="button"
            className="rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/75 hover:bg-white/10"
            onClick={saveCustomArtStyle}
          >
            Save style
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Continuity Lock</p>
            <p className="mt-1 text-[11px] text-white/45">References can act as source-of-truth guardrails for faces, costumes, props, and settings.</p>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-white/70">
            <input
              type="checkbox"
              checked={continuity.characterBibleMode}
              onChange={(e) => updateContinuity({ characterBibleMode: e.target.checked })}
            />
            Character Bible Mode
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {([
            ['lockFaces', 'Faces'],
            ['lockHairstyles', 'Hairstyles'],
            ['lockCostumes', 'Costumes'],
            ['lockProps', 'Props'],
            ['lockEnvironment', 'Environment'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-white/70">
              <input
                type="checkbox"
                checked={continuity[key]}
                onChange={(e) => updateContinuity({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="flex items-center justify-between text-[10px] uppercase text-white/45">
            <span>Continuity Strength</span>
            <span>{continuity.strength}/100</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={continuity.strength}
            onChange={(e) => updateContinuity({ strength: Number(e.target.value) })}
            className="mt-1 w-full"
          />
        </label>
      </div>

      {generationMode === 'comic-pages' ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Comic Page Configuration</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] uppercase text-white/45">Page Type</span>
              <select
                className="mt-0.5 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
                value={pageConfig.pageType}
                onChange={(e) => updatePageConfig({ pageType: e.target.value as ImageshopPageType })}
              >
                {PAGE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] uppercase text-white/45">Layout Template</span>
              <select
                className="mt-0.5 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
                value={pageConfig.layoutTemplateId}
                onChange={(e) => updatePageConfig({ layoutTemplateId: e.target.value })}
              >
                {layoutTemplateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="text"
              className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs"
              value={customLayoutName}
              onChange={(e) => setCustomLayoutName(e.target.value)}
              placeholder="Custom layout template name"
            />
            <button
              type="button"
              className="rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/75 hover:bg-white/10"
              onClick={saveCurrentLayoutTemplate}
            >
              Save layout template
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {([
              ['includePanelNumbers', 'Panel Numbers'],
              ['includeDialogue', 'Dialogue'],
              ['includeCaptions', 'Captions'],
              ['includeSfx', 'SFX'],
              ['includePageNumbers', 'Page Numbers'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-white/70">
                <input
                  type="checkbox"
                  checked={pageConfig[key]}
                  onChange={(e) => updatePageConfig({ [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label>
              <span className="text-[10px] uppercase text-white/45">Border Style</span>
              <select
                className="mt-0.5 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
                value={pageConfig.panelStyle.borderStyle}
                onChange={(e) => updatePageConfig({ panelStyle: { borderStyle: e.target.value as ImageshopBorderStyle } })}
              >
                {BORDER_STYLE_OPTIONS.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-[10px] uppercase text-white/45">Gutter Width</span>
              <input
                type="range"
                min={0}
                max={48}
                value={pageConfig.panelStyle.gutterWidth}
                onChange={(e) => updatePageConfig({ panelStyle: { gutterWidth: Number(e.target.value) } })}
                className="mt-2 w-full"
              />
            </label>
            <label>
              <span className="text-[10px] uppercase text-white/45">Border Color</span>
              <input
                type="color"
                value={pageConfig.panelStyle.borderColor}
                onChange={(e) => updatePageConfig({ panelStyle: { borderColor: e.target.value } })}
                className="mt-0.5 h-9 w-full rounded-lg border border-white/15 bg-black/30"
              />
            </label>
            <label>
              <span className="text-[10px] uppercase text-white/45">Gutter Color</span>
              <input
                type="color"
                value={pageConfig.panelStyle.gutterColor}
                onChange={(e) => updatePageConfig({ panelStyle: { gutterColor: e.target.value } })}
                className="mt-0.5 h-9 w-full rounded-lg border border-white/15 bg-black/30"
              />
            </label>
          </div>
          <label className="mt-2 block">
            <span className="text-[10px] uppercase text-white/45">Page Background Image URL</span>
            <input
              type="text"
              className="mt-0.5 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs"
              value={pageConfig.panelStyle.pageBackgroundUrl}
              onChange={(e) => updatePageConfig({ panelStyle: { pageBackgroundUrl: e.target.value } })}
              placeholder="Optional image URL behind the panel layout"
            />
          </label>
          <label className="mt-2 inline-flex cursor-pointer rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/75 hover:bg-white/10">
            Upload page background
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePageBackgroundFile(e.target.files)}
            />
          </label>
        </div>
      ) : null}

      <div className="mt-3">
        <label className="block text-[10px] text-white/45 uppercase mb-1">Aspect ratio</label>
        <div className="flex flex-wrap gap-2">
          {(['9:16', '1:1', '21:9'] as StoryBeatAspectRatio[]).map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => setAspectRatio(ratio)}
              className={`px-2 py-1 rounded-lg text-[11px] border ${
                aspectRatio === ratio ? 'border-fuchsia-400 bg-fuchsia-500/15' : 'border-white/15 hover:bg-white/10'
              }`}
            >
              {ratio === '9:16'
                ? 'Portrait'
                : ratio === '1:1'
                  ? 'Square'
                  : 'Cinematic'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">JSON Production Batch</p>
            <p className="mt-1 text-[11px] text-white/45">Import Story Beat, Comic Page, or ARCS Page JSON. Imported items land in the dashboard before generation.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/75 hover:bg-white/10 cursor-pointer">
              Import JSON
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => void handleJsonFile(e.target.files)}
              />
            </label>
            <button
              type="button"
              className="rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/75 hover:bg-white/10"
              onClick={exportProductionJson}
            >
              Export JSON
            </button>
          </div>
        </div>
        <textarea
          className="mt-2 w-full min-h-[72px] resize-y rounded-lg border border-white/10 bg-black/25 p-2 text-[11px] font-mono"
          value={jsonImportText}
          onChange={(e) => setJsonImportText(e.target.value)}
          placeholder='Paste JSON here, then click "Import pasted JSON".'
        />
        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            className="rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/75 hover:bg-white/10 disabled:opacity-40"
            disabled={!jsonImportText.trim()}
            onClick={() => handleImportJson(jsonImportText)}
          >
            Import pasted JSON
          </button>
          <button
            type="button"
            className="rounded-lg border border-amber-500/35 bg-amber-400/10 px-2 py-1.5 text-xs text-amber-100 hover:bg-amber-400/20 disabled:opacity-40"
            disabled={batchBusy || productionItems.length === 0}
            onClick={() => void generateBatch()}
          >
            {batchBusy ? 'Generating batch...' : 'Generate Batch'}
          </button>
        </div>
        {jsonImportError ? <p className="mt-2 text-[11px] text-red-200/90">{jsonImportError}</p> : null}
      </div>

      {error ? <p className="mt-2 text-xs text-red-200/90">{error}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={genBusy || !effectivePrompt}
          onClick={() => void generate()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold text-black disabled:opacity-50"
          style={{ background: 'linear-gradient(90deg, #D4AF37, #FBBF24)' }}
        >
          {genBusy ? 'Generating…' : 'Generate'}
        </button>
      </div>
      </div>

      <div className="flex-1 min-w-0 min-h-[200px] lg:min-h-0 flex flex-col">
        {lastImageUrl ? (
          <div className="flex flex-col h-full min-h-0">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40 mb-2 shrink-0">Large preview</p>
            <div className="rounded-lg border border-white/10 bg-black/30 overflow-hidden flex-1 min-h-[220px] lg:min-h-[280px] flex items-center justify-center p-2">
              <div
                className="relative w-full max-w-full flex items-center justify-center overflow-hidden rounded-md border border-fuchsia-500/25 bg-black/40"
                style={{
                  aspectRatio: labPreviewAspectCss,
                  height: previewMaxH,
                  maxHeight: previewMaxH,
                  width: isCinematic ? '100%' : 'auto',
                  maxWidth: isCinematic ? 'min(100%, 980px)' : '100%',
                }}
              >
                <ArcsStorageImg src={lastImageUrl} alt="" className="h-full w-full object-contain object-center" />
              </div>
            </div>

            {sessionResults.length > 0 ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2 shrink-0">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                    Session results
                  </p>
                  <span className="text-[10px] text-white/35">{sessionResults.length} recoverable</span>
                </div>
                <div className="overflow-x-auto">
                  <div className="flex w-max max-w-none gap-2">
                    {sessionResults.map((result, index) => {
                      const selected = result.imageUrl === lastImageUrl;
                      return (
                        <div
                          key={result.id}
                          className={`relative w-[86px] shrink-0 overflow-hidden rounded-lg border bg-black/35 ${
                            selected ? 'border-amber-300/70' : 'border-white/15'
                          }`}
                        >
                          <button
                            type="button"
                            className="block w-full text-left"
                            title={result.sourceLabel ?? result.prompt}
                            onClick={() => restoreSessionResult(result)}
                          >
                            <ArcsStorageImg
                              src={result.imageUrl}
                              alt={`Session result ${index + 1}`}
                              className="h-[72px] w-full object-cover"
                            />
                            <div className="border-t border-white/10 px-1.5 py-1">
                              <p className="truncate text-[10px] font-bold text-white/80">
                                {selected ? 'Current' : `Result ${index + 1}`}
                              </p>
                              <p className="truncate text-[9px] text-white/38">{result.aspectRatio}</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            aria-label="Remove session result"
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-xs font-black text-white hover:bg-red-500/85"
                            onClick={() => {
                              removeSessionResult(result.id);
                              if (result.imageUrl === lastImageUrl) {
                                setLastImageUrl(null);
                                setLastSeed(null);
                              }
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2 shrink-0">
              {guidedPanelTarget?.currentStep === 'art' ? (
                <button
                  type="button"
                  disabled={!lastImageUrl}
                  onClick={sendBackToGuidedComicFlow}
                  className="px-3 py-2 rounded-full text-xs font-semibold text-black disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg, #D4AF37, #FBBF24)' }}
                >
                  Send back to Guided Comic Flow
                </button>
              ) : null}
              <button
                type="button"
                disabled={!canUseSelectedBeat}
                onClick={() =>
                  selectedBeat &&
                  onUseAsSelectedBeat({
                    imageUrl: lastImageUrl,
                    seed: lastSeed,
                    aspectRatio,
                    visualPrompt: effectivePrompt,
                  })
                }
                className="px-3 py-2 rounded-full text-xs border border-white/20 hover:bg-white/10 disabled:opacity-50"
              >
                Use as selected beat image
              </button>
              <button
                type="button"
                disabled={!lastImageUrl}
                onClick={() =>
                  onCreateNewBeat({
                    imageUrl: lastImageUrl,
                    seed: lastSeed,
                    aspectRatio,
                    visualPrompt: effectivePrompt,
                  })
                }
                className="px-3 py-2 rounded-full text-xs border border-white/20 hover:bg-white/10 disabled:opacity-50"
              >
                Create new B-roll beat
              </button>
            </div>

            <div ref={saveExportPanelRef} className="mt-3 scroll-mt-16 rounded-lg border border-amber-500/25 bg-amber-950/10 p-3 shrink-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/80">
                    Save / Export
                  </p>
                  <p className="mt-1 text-[11px] text-white/50">
                    Save or download the current generated result without leaving Imageshop.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['npc', 'character', 'asset'] as GeneratedVaultTarget[]).map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => {
                        setGeneratedVaultTarget(target);
                        setGeneratedSaveError(null);
                        setGeneratedSaveNotice(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] border ${
                        generatedVaultTarget === target
                          ? 'border-amber-300 bg-amber-400/20 text-amber-100'
                          : 'border-white/15 bg-black/20 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {target === 'npc'
                        ? 'NPC Vault'
                        : target === 'character'
                          ? 'Character Vault'
                          : 'Asset Vault'}
                    </button>
                  ))}
                </div>
              </div>

              {generatedVaultTarget === 'character' ? (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <SearchableVaultSelect
                      id="imageshop-generated-profile"
                      label="Profile name"
                      labelClassName="text-[10px] text-white/45 uppercase"
                      value={generatedProfileName}
                      onChange={setGeneratedProfileName}
                      options={vaultProfileOptions}
                      loading={vaultProfileLoading}
                      placeholder="Type or choose profile"
                      inputClassName="mt-0.5 w-full rounded-lg bg-black/30 border border-white/15 px-2 py-1.5 text-xs"
                      wrapClassName="relative"
                      helperSlot={
                        <p className="text-[10px] text-white/35">
                          {supabaseReady
                            ? 'Type a new profile or choose an existing one.'
                            : 'Supabase unavailable - saving locally.'}
                        </p>
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="imageshop-generated-cast" className="text-[10px] text-white/45 uppercase">
                      Cast name (optional)
                    </label>
                    <input
                      id="imageshop-generated-cast"
                      type="text"
                      className="mt-0.5 w-full rounded-lg bg-black/30 border border-white/15 px-2 py-1.5 text-xs"
                      value={generatedCastName}
                      onChange={(e) => setGeneratedCastName(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              ) : null}

              {generatedVaultTarget === 'asset' ? (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <SearchableVaultSelect
                      id="imageshop-generated-collection"
                      label="Collection name"
                      labelClassName="text-[10px] text-white/45 uppercase"
                      value={generatedCollectionName}
                      onChange={setGeneratedCollectionName}
                      options={vaultCollectionOptions}
                      loading={vaultCollectionLoading}
                      placeholder="Type or choose collection"
                      inputClassName="mt-0.5 w-full rounded-lg bg-black/30 border border-white/15 px-2 py-1.5 text-xs"
                      wrapClassName="relative"
                      helperSlot={
                        <p className="text-[10px] text-white/35">
                          {supabaseReady
                            ? 'Type a new collection or choose an existing one.'
                            : 'Supabase unavailable - saving locally.'}
                        </p>
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="imageshop-generated-asset" className="text-[10px] text-white/45 uppercase">
                      Asset name (optional)
                    </label>
                    <input
                      id="imageshop-generated-asset"
                      type="text"
                      className="mt-0.5 w-full rounded-lg bg-black/30 border border-white/15 px-2 py-1.5 text-xs"
                      value={generatedAssetName}
                      onChange={(e) => setGeneratedAssetName(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              ) : null}

              {generatedVaultTarget === 'npc' ? (
                <div className="mt-3">
                  <label className="text-[10px] text-white/45 uppercase">NPC label</label>
                  <input
                    type="text"
                    className="mt-0.5 w-full rounded-lg bg-black/30 border border-white/15 px-2 py-1.5 text-xs"
                    value={generatedNpcLabel}
                    onChange={(e) => setGeneratedNpcLabel(e.target.value)}
                    placeholder="Imageshop result"
                  />
                </div>
              ) : null}

              {generatedSaveError ? (
                <p className="mt-2 text-[11px] text-red-200/90">{generatedSaveError}</p>
              ) : null}
              {generatedSaveNotice ? (
                <p className="mt-2 text-[11px] text-emerald-200/90">{generatedSaveNotice}</p>
              ) : null}

              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[10px] text-white/40">
                  {supabaseReady
                    ? 'Character and Asset saves use the existing vault persistence helpers.'
                    : 'Supabase is unavailable, so saves use the local recent-generation archive.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!lastImageUrl}
                    onClick={() => {
                      if (!lastImageUrl) return;
                      downloadDataUrl(lastImageUrl, 'image-lab.png');
                      setGeneratedSaveNotice('Downloaded the current generated image.');
                      setGeneratedSaveError(null);
                    }}
                    className="px-3 py-2 rounded-full text-xs border border-white/15 text-white/80 hover:bg-white/10 disabled:opacity-50"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    disabled={generatedSavePending || !lastImageUrl}
                    onClick={() => void handleSaveGeneratedToVault()}
                    className="px-3 py-2 rounded-full text-xs font-semibold text-black disabled:opacity-50"
                    style={{ background: 'linear-gradient(90deg, #D4AF37, #FBBF24)' }}
                  >
                    {generatedSavePending ? 'Saving…' : 'Save to Vault'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-[180px] rounded-lg border border-dashed border-white/15 bg-black/15 flex flex-col items-center justify-center text-center px-4">
            <p className="text-[11px] text-white/40">
              Generated image appears here (portrait / square / cinematic).
            </p>
          </div>
        )}

        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Production Dashboard</p>
              <p className="mt-1 text-[11px] text-white/45">
                Track images/pages from draft through generated, refined, approved, and published states.
              </p>
            </div>
            <select
              className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
              value={dashboardStatusFilter}
              onChange={(e) => setDashboardStatusFilter(e.target.value as ImageshopProductionStatus | 'all')}
            >
              {PRODUCTION_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {visibleProductionItems.length > 0 ? (
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {visibleProductionItems.map((item) => {
                const active = item.id === selectedProductionItem?.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-2 ${
                      active ? 'border-amber-300/60 bg-amber-400/10' : 'border-white/10 bg-black/20'
                    }`}
                  >
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => stageProductionItem(item)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-white/85">{item.label}</p>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase text-white/45">
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] text-white/45">{item.prompt}</p>
                      <p className="mt-1 text-[9px] text-white/35">{item.versions.length} version{item.versions.length === 1 ? '' : 's'}</p>
                    </button>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(['draft', 'generated', 'refined', 'approved', 'published'] as ImageshopProductionStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={`rounded-md border px-1.5 py-1 text-[9px] uppercase ${
                            item.status === status
                              ? 'border-amber-300/55 bg-amber-400/20 text-amber-100'
                              : 'border-white/10 text-white/45 hover:bg-white/10'
                          }`}
                          onClick={() => updateProductionItemStatus(item.id, status)}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-white/10 bg-black/15 p-3 text-center text-[11px] text-white/38">
              No production items yet. Generate an image or import JSON to start the dashboard.
            </p>
          )}
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Refinement Workspace</p>
              <p className="mt-1 text-[11px] text-white/45">
                Stage prompt-based refinements and continuity corrections for the selected production item.
              </p>
            </div>
            <select
              className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
              value={refinementTool}
              onChange={(e) => setRefinementTool(e.target.value as RefinementTool)}
            >
              {REFINEMENT_TOOL_OPTIONS.map((tool) => (
                <option key={tool.value} value={tool.value}>
                  {tool.label}
                </option>
              ))}
            </select>
          </div>
          {refinementTool === 'continuity-correction' ? (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs"
                  value={continuitySourceImageUrl}
                  onChange={(e) => setContinuitySourceImageUrl(e.target.value)}
                  placeholder="Approved source image URL"
                />
                <input
                  type="text"
                  className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs"
                  value={continuityTargetImageUrl}
                  onChange={(e) => setContinuityTargetImageUrl(e.target.value)}
                  placeholder="Target image URL"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['character', 'Match Character'],
                  ['costume', 'Match Costume'],
                  ['lighting', 'Match Lighting'],
                  ['artStyle', 'Match Art Style'],
                  ['environment', 'Match Environment'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-white/70">
                    <input
                      type="checkbox"
                      checked={correctionOptions[key]}
                      onChange={(e) => setCorrectionOptions((prev) => ({ ...prev, [key]: e.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <button
            type="button"
            className="mt-3 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-500/20 disabled:opacity-40"
            disabled={!selectedProductionItem && !effectivePrompt}
            onClick={stageRefinementPrompt}
          >
            Stage refinement prompt
          </button>
        </div>
      </div>
      </div>
      </div>
    </section>
  );
}
