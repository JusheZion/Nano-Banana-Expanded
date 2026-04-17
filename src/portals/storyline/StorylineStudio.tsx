import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Clapperboard,
  ExternalLink,
  Film,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UserPlus,
  Download,
  RefreshCw,
  Box,
} from 'lucide-react';
import { useTheme } from '@/shared/context/ThemeContext';
import { Tooltip } from '@/shared/components/Tooltip';
import { ArcsStorageImg } from '@/components/ui/ArcsStorageImg';
import { generateGeminiText } from '@/shared/api/geminiTextApi';
import { generateImage } from '@/shared/api/geminiImageApi';
import { STORYLINE_DIRECTOR_SYSTEM, buildInterpolationUserPrompt } from '@/data/storylineDirectorPrompts';
import { parseJsonFromModel } from '@/portals/storyline/parseDirectorJson';
import { buildStorylineReferenceSlots } from '@/portals/storyline/buildStorylineReferenceSlots';
import { compileVisualPromptForBeat } from '@/portals/storyline/compileBeatPrompt';
import type { StoryBeatAspectRatio } from '@/portals/storyline/storylineTypes';
import { GenericImageLabPanel } from '@/portals/storyline/GenericImageLabPanel';
import { useStorylineStudioStore } from '@/stores/storylineStudioStore';
import { getCharacterAlbums, type VaultCharacterItem } from '@/shared/api/arcsVault';
import { getAssetAlbums, type VaultAssetItem } from '@/shared/api/arcsAssetVault';
import { saveStorySequenceToAssetsVault } from '@/shared/api/arcsPersistence';
import { pickGenerationSeed } from '@/shared/utils/generationSeed';
import { firstStoryCoverImageUrl } from '@/shared/utils/storySequencePayload';
import { getGenerations, saveGeneration, type StoredGeneration } from '@/shared/utils/generationOutputRouter';
import { addCachedGeneration } from '@/shared/utils/generationSessionCache';
import { addRecentFromAsset } from '@/shared/utils/recentGenerations';
import { useStudioImportBridge } from '@/stores/studioImportBridge';
import { useImageWorkshopBridge } from '@/stores/imageWorkshopBridge';
import {
  ACCENT_GOLD_GRADIENT,
  STORYLINE_DIRECTOR_BG,
  STORYLINE_MAGENTA_TEXT,
  GEM_MAGENTA,
} from '@/shared/theme/Phase12DesignTokens';

const magentaTitleStyle: React.CSSProperties = {
  background: STORYLINE_MAGENTA_TEXT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

const BROLL_PRESETS: { label: string; text: string }[] = [
  { label: 'Establishing', text: 'Wide atmospheric establishing shot, no dialogue beat.' },
  { label: 'Detail', text: 'Insert: macro detail on hands or object, shallow depth of field.' },
  { label: 'Transition', text: 'Transitional montage beat: motion blur, light streaks.' },
  { label: 'Ambient', text: 'Mood B-roll: texture, weather, environment only.' },
];
const STORY_BEAT_ASPECTS: StoryBeatAspectRatio[] = ['9:16', '1:1', '21:9'];
const CAMERA_SHOT_SUGGESTIONS = [
  'Wide',
  'Medium',
  'Close-up',
  'Extreme close-up',
  'Over-the-shoulder',
  'Establishing',
  'Insert',
];
const CAMERA_ANGLE_SUGGESTIONS = ['Eye level', 'High angle', 'Low angle', 'POV', 'Dutch tilt'];
const CAMERA_MOVEMENT_SUGGESTIONS = ['Static', 'Pan', 'Tilt', 'Dolly in', 'Dolly out', 'Handheld', 'Crane'];

function timelineCardWidthClass(ratio: StoryBeatAspectRatio): string {
  switch (ratio) {
    case '21:9':
      return 'w-[min(260px,38vw)]';
    case '1:1':
      return 'w-[132px]';
    default:
      return 'w-[152px]';
  }
}

function beatAspectBoxClass(ratio: StoryBeatAspectRatio): string {
  switch (ratio) {
    case '9:16':
      return 'aspect-[9/16]';
    case '1:1':
      return 'aspect-square';
    case '21:9':
      return 'aspect-[21/9]';
    default:
      return 'aspect-[9/16]';
  }
}

function displayNameForVaultItem(it: VaultCharacterItem, profileName: string): string {
  const c = (it.cast_name || '').trim();
  const n = (it.name || '').trim();
  if (c) return c;
  if (n) return n;
  if (profileName && profileName !== 'Unnamed') return profileName;
  return 'Character';
}

function tagSummaryFromItem(): string {
  return '';
}

export const StorylineStudio: React.FC = () => {
  const { setTheme } = useTheme();
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultRows, setVaultRows] = useState<
    { item: VaultCharacterItem; profileName: string }[]
  >([]);
  const [assetVaultOpen, setAssetVaultOpen] = useState(false);
  const [assetVaultLoading, setAssetVaultLoading] = useState(false);
  const [assetVaultRows, setAssetVaultRows] = useState<
    { item: VaultAssetItem; collectionName: string }[]
  >([]);
  const [supportingVaultOpen, setSupportingVaultOpen] = useState(false);
  const [supportingVaultRows, setSupportingVaultRows] = useState<StoredGeneration[]>([]);
  const [brollMenuIndex, setBrollMenuIndex] = useState<number | null>(null);
  const [showSaveVaultModal, setShowSaveVaultModal] = useState(false);
  const [saveVaultCollectionName, setSaveVaultCollectionName] = useState('');
  const [saveVaultAssetName, setSaveVaultAssetName] = useState('');
  const [saveVaultMode, setSaveVaultMode] = useState<'new' | 'library'>('new');
  const [vaultCollectionOptions, setVaultCollectionOptions] = useState<string[]>([]);
  const [vaultCollectionLoading, setVaultCollectionLoading] = useState(false);
  const [saveVaultPending, setSaveVaultPending] = useState(false);
  const [labSeedPrompt, setLabSeedPrompt] = useState<string | null>(null);
  const [returnNotice, setReturnNotice] = useState<string | null>(null);

  const store = useStorylineStudioStore();
  const requestOpenInStudio = useStudioImportBridge((s) => s.requestOpenInStudio);
  const consumeReturnPayloadForPortal = useStudioImportBridge((s) => s.consumeReturnPayloadForPortal);
  const imageWorkshopDraft = useImageWorkshopBridge((s) => s.draft);
  const clearImageWorkshopDraft = useImageWorkshopBridge((s) => s.clearDraft);

  const openSupportingVault = useCallback(() => {
    setSupportingVaultOpen(true);
    const list = getGenerations('supporting_reference');
    setSupportingVaultRows([...list].sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  const getMatchedExistingCollection = useCallback((typed: string): string | null => {
    const q = typed.trim();
    if (!q) return null;
    const lower = q.toLowerCase();
    return vaultCollectionOptions.find((c) => c.toLowerCase() === lower) ?? null;
  }, [vaultCollectionOptions]);

  const loadVaultCollections = useCallback(() => {
    setVaultCollectionLoading(true);
    getAssetAlbums()
      .then((albums) => setVaultCollectionOptions(albums.map((a) => a.collectionName)))
      .catch(() => setVaultCollectionOptions([]))
      .finally(() => setVaultCollectionLoading(false));
  }, []);

  const openSaveVaultModal = useCallback(() => {
    setSaveVaultCollectionName('');
    setSaveVaultAssetName(store.storyTitle.trim());
    setSaveVaultMode('new');
    setVaultCollectionOptions([]);
    setShowSaveVaultModal(true);
  }, [store.storyTitle]);

  const handleSaveVaultConfirm = useCallback(async () => {
    const cover = firstStoryCoverImageUrl(store.beats);
    if (!cover) {
      store.setLastError('Generate at least one beat image before saving to the vault.');
      return;
    }
    const typedCollection = saveVaultCollectionName.trim();
    if (!typedCollection) return;
    if (saveVaultMode === 'library' && !getMatchedExistingCollection(typedCollection)) return;

    const matchedExisting =
      saveVaultMode === 'library'
        ? getMatchedExistingCollection(typedCollection)!
        : typedCollection;
    const isUnnamed = matchedExisting.toLowerCase() === 'unnamed';
    const baseNameForId = isUnnamed ? 'Unnamed' : matchedExisting;
    const collectionNameForDb = isUnnamed ? undefined : matchedExisting;
    const assetNameOpt = saveVaultAssetName.trim() || undefined;

    store.setLastError(null);
    setSaveVaultPending(true);
    const result = await saveStorySequenceToAssetsVault({
      coverImageUrl: cover,
      storyTitle: store.storyTitle,
      rawStoryline: store.rawStoryline,
      cleanedStoryline: store.cleanedStoryline,
      beatIntervalSec: store.beatIntervalSec,
      directorSettings: store.directorSettings,
      productionCast: store.productionCast,
      productionAssets: store.productionAssets,
      beats: store.beats,
      collectionNameForDb,
      baseNameForId,
      assetName: assetNameOpt,
    });
    setSaveVaultPending(false);

    if (result.ok && result.id && result.imageUrl) {
      saveGeneration('asset', result.imageUrl, undefined, {
        collectionName: collectionNameForDb,
        assetName: assetNameOpt,
      });
      addCachedGeneration('asset', { url: result.imageUrl });
      addRecentFromAsset({
        id: result.id,
        image_url: result.imageUrl,
        collection_name: matchedExisting,
        asset_name: assetNameOpt ?? null,
        seed: null,
      });
      setShowSaveVaultModal(false);
    } else if (!result.ok) {
      store.setLastError(result.error ?? 'Save failed');
    }
  }, [
    store,
    saveVaultCollectionName,
    saveVaultAssetName,
    saveVaultMode,
    getMatchedExistingCollection,
  ]);

  useEffect(() => {
    setTheme('purple');
  }, [setTheme]);

  const selectedBeat = useMemo(
    () => store.beats.find((b) => b.id === store.selectedBeatId) ?? null,
    [store.beats, store.selectedBeatId]
  );

  useEffect(() => {
    const returned = consumeReturnPayloadForPortal('lab');
    if (!returned) return;
    if (returned.origin?.selectedBeatId) {
      store.updateBeat(returned.origin.selectedBeatId, {
        imageUrl: returned.imageUrl,
        generationStatus: 'idle',
        generationMessage: null,
      });
      store.setSelectedBeatId(returned.origin.selectedBeatId);
      setReturnNotice(
        returned.target === 'studio'
          ? 'Returned from Character Studio and updated the originating beat.'
          : 'Returned from Asset Studio and updated the originating beat.',
      );
      return;
    }
    setReturnNotice(
      returned.target === 'studio'
        ? 'Returned from Character Studio. The saved result is ready to link inside Illustrator’s Imageshop.'
        : 'Returned from Asset Studio. The saved result is ready to link inside Illustrator’s Imageshop.',
    );
  }, [consumeReturnPayloadForPortal, store]);

  const handleLabUseAsSelectedBeat = useCallback(
    (args: { imageUrl: string; seed: number | null; aspectRatio: StoryBeatAspectRatio; visualPrompt: string }) => {
      if (!selectedBeat) return;
      store.updateBeat(selectedBeat.id, {
        imageUrl: args.imageUrl,
        generationStatus: 'idle',
        generationMessage: null,
        seed: args.seed,
        aspectRatio: args.aspectRatio,
        visualPrompt: args.visualPrompt,
      });
    },
    [selectedBeat, store]
  );

  const handleLabCreateNewBeat = useCallback(
    (args: { imageUrl: string; seed: number | null; aspectRatio: StoryBeatAspectRatio; visualPrompt: string }) => {
      const afterIndex = store.beats.length > 0 ? store.beats.length - 1 : -1;
      store.insertBeatAfter(afterIndex, 'broll', '');
      const sid = useStorylineStudioStore.getState().selectedBeatId;
      if (!sid) return;
      store.updateBeat(sid, {
        imageUrl: args.imageUrl,
        generationStatus: 'idle',
        generationMessage: null,
        seed: args.seed,
        aspectRatio: args.aspectRatio,
        kind: 'broll',
        visualPrompt: args.visualPrompt,
        text: '',
      });
    },
    [store]
  );

  const handleSeedLabFromDraft = useCallback((prompt: string) => {
    setLabSeedPrompt(prompt);
  }, []);

  const handleUseMatchedDraftItem = useCallback(
    (item: NonNullable<typeof imageWorkshopDraft>['items'][number]) => {
      if (item.entityKind === 'character' && item.matchedCharacterAlbum) {
        const cover =
          item.matchedCharacterAlbum.items.find((entry) => entry.id === item.matchedCharacterId) ??
          item.matchedCharacterAlbum.items[0];
        if (!cover?.image_url) return;
        store.addProductionCastMember({
          vaultCharacterId: cover.id,
          profileName: item.matchedCharacterAlbum.profileName,
          castName: cover.cast_name ?? null,
          displayName: cover.cast_name || cover.name || item.matchedCharacterAlbum.profileName,
          imageUrl: cover.image_url,
          tagSummary: '',
        });
        setReturnNotice(`${item.label} added to Production cast from Image Vault.`);
        return;
      }

      if (item.matchedAssetAlbum) {
        const cover =
          item.matchedAssetAlbum.items.find((entry) => entry.id === item.matchedAssetId) ??
          item.matchedAssetAlbum.items[0];
        if (!cover?.image_url) return;
        store.addProductionAssetMember({
          vaultAssetId: cover.id,
          collectionName: item.matchedAssetAlbum.collectionName,
          assetName: cover.asset_name || cover.name || item.matchedAssetAlbum.collectionName,
          imageUrl: cover.image_url,
        });
        setReturnNotice(`${item.label} added to Production assets from Image Vault.`);
      }
    },
    [store],
  );

  const handleOpenStudioFromDraft = useCallback(
    (
      target: 'studio' | 'assets',
      prompt: string,
      label: string,
    ) => {
      requestOpenInStudio(target, '', prompt, {
        origin: {
          sourcePortal: 'lab',
          sourceLabel: label,
        },
        returnToPortal: 'lab',
      });
    },
    [requestOpenInStudio],
  );

  const openVault = useCallback(async () => {
    setVaultOpen(true);
    setVaultLoading(true);
    try {
      const albums = await getCharacterAlbums();
      const rows = albums.flatMap((a) =>
        a.items.map((item) => ({ item, profileName: a.profileName }))
      );
      setVaultRows(rows);
    } finally {
      setVaultLoading(false);
    }
  }, []);

  const openAssetVault = useCallback(async () => {
    setAssetVaultOpen(true);
    setAssetVaultLoading(true);
    try {
      const albums = await getAssetAlbums();
      const rows = albums.flatMap((a) =>
        a.items.map((item) => ({ item, collectionName: a.collectionName }))
      );
      setAssetVaultRows(rows);
    } finally {
      setAssetVaultLoading(false);
    }
  }, []);

  const runGenerateBeat = useCallback(
    async (beatId: string) => {
      const beat = store.beats.find((b) => b.id === beatId);
      if (!beat || !beat.visualPrompt.trim()) {
        store.setLastError('Select a beat with a visual prompt.');
        return;
      }
      store.setLastError(null);
      store.updateBeat(beatId, { generationStatus: 'pending', generationMessage: null });

      const linkedCast = store.productionCast.filter((c) =>
        beat.linkedVaultCharacterIds.includes(c.vaultCharacterId)
      );
      const linkedSupporting = store.productionSupportingRefs.filter((r) =>
        beat.linkedSupportingRefIds.includes(r.supportingRefId)
      );
      const linkedAssets = store.productionAssets.filter((a) =>
        beat.linkedVaultAssetIds.includes(a.vaultAssetId)
      );

      const prompt = compileVisualPromptForBeat(beat, store.productionCast, store.directorSettings);
      const refUrls = buildStorylineReferenceSlots(linkedCast, linkedSupporting, linkedAssets);
      const seed = pickGenerationSeed('randomized', null);

      const img = await generateImage({
        prompt,
        referenceImageUrls: refUrls,
        seed,
        aspectRatio: beat.aspectRatio,
        modelId: 'pro',
        context: 'character',
      });

      if (!img.ok) {
        if ('blocked' in img && img.blocked) {
          store.updateBeat(beatId, {
            generationStatus: 'safety_blocked',
            generationMessage: 'Blocked by safety filters.',
          });
        } else {
          store.updateBeat(beatId, {
            generationStatus: 'error',
            generationMessage: 'error' in img ? img.error : 'Failed',
          });
        }
        return;
      }

      store.updateBeat(beatId, {
        imageUrl: img.imageDataUrl,
        generationStatus: 'idle',
        generationMessage: null,
        seed,
      });

      store.setAiBusy('interpolation');
      const ip = buildInterpolationUserPrompt({
        beatText: beat.text,
        visualPrompt: beat.visualPrompt,
      });
      const interpRes = await generateGeminiText({
        systemPrompt: STORYLINE_DIRECTOR_SYSTEM,
        userPrompt: ip,
        jsonMode: true,
      });
      store.setAiBusy('idle');
      if (interpRes.ok) {
        const ipParsed = parseJsonFromModel<{
          startFrame?: string;
          endFrame?: string;
        }>(interpRes.text);
        if (ipParsed?.startFrame && ipParsed?.endFrame) {
          store.updateBeat(beatId, {
            interpolation: {
              startFrame: ipParsed.startFrame,
              endFrame: ipParsed.endFrame,
            },
          });
        }
      }
    },
    [store]
  );

  const exportStoryJson = useCallback(() => {
    const payload = {
      version: 1,
      title: store.storyTitle,
      rawStoryline: store.rawStoryline,
      cleanedStoryline: store.cleanedStoryline,
      beatIntervalSec: store.beatIntervalSec,
      directorSettings: store.directorSettings,
      productionCast: store.productionCast,
      productionAssets: store.productionAssets,
      productionSupportingRefs: store.productionSupportingRefs,
      beats: store.beats,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${store.storyTitle.replace(/\s+/g, '_') || 'arcs_story'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [store]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'Enter') {
        const sid = useStorylineStudioStore.getState().selectedBeatId;
        if (sid) {
          e.preventDefault();
          void runGenerateBeat(sid);
        }
      }
      if (e.key === 'Escape') {
        setVaultOpen(false);
        setAssetVaultOpen(false);
        setBrollMenuIndex(null);
        setShowSaveVaultModal(false);
      }
      if (
        ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) &&
        document.activeElement?.getAttribute('data-storyline-timeline') === 'true'
      ) {
        const st = useStorylineStudioStore.getState();
        const idx = st.beats.findIndex((b) => b.id === st.selectedBeatId);
        if (st.beats.length === 0) return;
        e.preventDefault();
        let next = idx;
        if (e.key === 'ArrowLeft') next = Math.max(0, idx <= 0 ? 0 : idx - 1);
        if (e.key === 'ArrowRight')
          next = Math.min(st.beats.length - 1, idx < 0 ? 0 : idx + 1);
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = st.beats.length - 1;
        st.setSelectedBeatId(st.beats[next]!.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runGenerateBeat]);

  return (
    <div
      className="min-h-screen text-white flex flex-col overflow-hidden"
      style={{ background: STORYLINE_DIRECTOR_BG }}
    >
      <header
        className="shrink-0 border-b border-white/10 px-4 py-2 flex items-center justify-between gap-4"
        style={{ background: ACCENT_GOLD_GRADIENT }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Clapperboard className="w-6 h-6 shrink-0 text-black/80" aria-hidden />
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-wide truncate" style={magentaTitleStyle}>
              Illustrator’s Imageshop
            </h1>
            <p className="text-[10px] text-black/60 mt-0.5">Beats, production libraries & Image Lab</p>
            <input
              className="bg-black/10 border border-black/20 rounded px-2 py-0.5 text-xs text-black w-full max-w-md mt-1"
              value={store.storyTitle}
              onChange={(e) => store.setStoryTitle(e.target.value)}
              aria-label="Story title"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Tooltip
            content="Save story + beats to Supabase Asset Vault (needs API key + at least one generated beat)"
            side="bottom"
          >
            <button
              type="button"
              onClick={openSaveVaultModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black bg-black/10 hover:bg-black/20 border border-black/20"
            >
              <Box className="w-4 h-4" />
              Save to Vault
            </button>
          </Tooltip>
          <Tooltip content="Export beats + cast as JSON" side="bottom">
            <button
              type="button"
              onClick={exportStoryJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black bg-black/10 hover:bg-black/20 border border-black/20"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </Tooltip>
        </div>
      </header>

      {store.lastError && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-lg bg-red-950/80 border border-red-500/40 text-sm text-red-100">
          {store.lastError}
          <button
            type="button"
            className="ml-2 underline text-white/90"
            onClick={() => store.setLastError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {returnNotice ? (
        <div className="mx-4 mt-2 px-3 py-2 rounded-lg bg-emerald-950/70 border border-emerald-400/35 text-sm text-emerald-100">
          {returnNotice}
          <button
            type="button"
            className="ml-2 underline text-white/90"
            onClick={() => setReturnNotice(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
        {imageWorkshopDraft ? (
          <div className="shrink-0 rounded-xl border border-fuchsia-400/20 bg-black/30 p-4 backdrop-blur-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-200/80">
                  Visual Prep
                </p>
                <h2 className="mt-1 text-sm font-semibold text-white">{imageWorkshopDraft.source.sourceLabel}</h2>
                <p className="mt-1 text-xs text-white/60">
                  Writers&apos; Workshop handed off context for Illustrator’s Imageshop to match vault refs, seed quick
                  refs, or escalate into Character Studio / Asset Studio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => clearImageWorkshopDraft()}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10"
              >
                Clear Visual Prep
              </button>
            </div>
            {imageWorkshopDraft.moodboardPrompts.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {imageWorkshopDraft.moodboardPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSeedLabFromDraft(prompt)}
                    className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-[11px] text-fuchsia-100 hover:bg-fuchsia-500/20"
                  >
                    Seed Image Lab: {prompt.slice(0, 80)}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {(['matched', 'quick_ref', 'needs_studio'] as const).map((group) => {
                const groupItems = imageWorkshopDraft.items.filter((item) => item.group === group);
                const heading =
                  group === 'matched'
                    ? 'Matched from vault'
                    : group === 'quick_ref'
                      ? 'Quick refs'
                      : 'Needs studio';
                return (
                  <section key={group} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">{heading}</h3>
                    <div className="mt-3 space-y-2">
                      {groupItems.length === 0 ? (
                        <p className="text-xs text-white/35 italic">Nothing queued.</p>
                      ) : null}
                      {groupItems.map((item) => (
                        <div key={item.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                          <p className="text-xs font-semibold text-white">{item.label}</p>
                          <p className="mt-1 text-[11px] text-white/45">
                            {item.reason} · {item.entityKind.replace('_', ' ')}
                          </p>
                          <p className="mt-2 text-[11px] text-white/70 line-clamp-3">{item.sourceText}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.recommendedAction === 'match_existing' ? (
                              <Tooltip
                                content="Adds the matched vault item to the production library in this workspace."
                                side="top"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleUseMatchedDraftItem(item)}
                                  className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/20"
                                >
                                  {item.entityKind === 'character'
                                    ? 'Add to Production cast'
                                    : 'Add to Production assets'}
                                </button>
                              </Tooltip>
                            ) : null}
                            {item.recommendedAction === 'quick_ref' ? (
                              <Tooltip
                                content="Seeds Image Lab with this text so you can generate a quick reference image."
                                side="top"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSeedLabFromDraft(item.sourceText)}
                                  className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1.5 text-[11px] font-semibold text-fuchsia-100 hover:bg-fuchsia-500/20"
                                >
                                  Generate Quick Ref
                                </button>
                              </Tooltip>
                            ) : null}
                            {item.recommendedAction === 'open_character_studio' ? (
                              <Tooltip
                                content="Opens Character Studio with the drafted prompt from Writers’ Workshop."
                                side="top"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleOpenStudioFromDraft('studio', item.sourceText, item.label)}
                                  className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-50 hover:bg-amber-500/20"
                                >
                                  Open in Character Studio
                                </button>
                              </Tooltip>
                            ) : null}
                            {item.recommendedAction === 'open_asset_studio' ? (
                              <Tooltip
                                content="Opens Asset Studio with the drafted prompt from Writers’ Workshop."
                                side="top"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleOpenStudioFromDraft('assets', item.sourceText, item.label)}
                                  className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-[11px] font-semibold text-violet-100 hover:bg-violet-500/20"
                                >
                                  Open in Asset Studio
                                </button>
                              </Tooltip>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Row 1 — Production libraries (vault-linked cast, assets, and NPC refs for generation refs) */}
        <div className="shrink-0 rounded-xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <section className="flex flex-col min-h-0 min-w-0 max-h-[320px] md:max-h-[380px]">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                  Production cast
                </h2>
                <Tooltip content="Add a character from Image Vault" side="left">
                  <button
                    type="button"
                    onClick={() => void openVault()}
                    className="p-1.5 rounded-lg border border-white/20 hover:bg-white/10"
                    aria-label="Add cast from vault"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
              <ul className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-0.5">
                {store.productionCast.length === 0 && (
                  <li className="text-xs text-white/40 italic">No cast yet — add from vault.</li>
                )}
                {store.productionCast.map((c) => (
                  <li
                    key={c.vaultCharacterId}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2"
                  >
                    <ArcsStorageImg
                      src={c.imageUrl}
                      alt=""
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{c.displayName}</p>
                      <p className="text-[10px] text-white/45 truncate">{c.profileName}</p>
                    </div>
                    <Tooltip content="Remove from cast" side="left">
                      <button
                        type="button"
                        className="p-1 text-white/50 hover:text-red-300"
                        onClick={() => store.removeProductionCastMember(c.vaultCharacterId)}
                        aria-label={`Remove ${c.displayName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col min-h-0 min-w-0 max-h-[320px] md:max-h-[380px]">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                  Production assets
                </h2>
                <Tooltip content="Add an environment/prop from Asset Vault" side="left">
                  <button
                    type="button"
                    onClick={() => void openAssetVault()}
                    className="p-1.5 rounded-lg border border-white/20 hover:bg-white/10"
                    aria-label="Add asset from vault"
                  >
                    <Box className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
              <ul className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-0.5">
                {store.productionAssets.length === 0 && (
                  <li className="text-xs text-white/40 italic">No assets yet — add from vault.</li>
                )}
                {store.productionAssets.map((a) => (
                  <li
                    key={a.vaultAssetId}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2"
                  >
                    <ArcsStorageImg src={a.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{a.assetName}</p>
                      <p className="text-[10px] text-white/45 truncate">{a.collectionName}</p>
                    </div>
                    <Tooltip content="Remove from assets" side="left">
                      <button
                        type="button"
                        className="p-1 text-white/50 hover:text-red-300"
                        onClick={() => store.removeProductionAssetMember(a.vaultAssetId)}
                        aria-label={`Remove ${a.assetName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col min-h-0 min-w-0 max-h-[320px] md:max-h-[380px]">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">NPC Vault</h2>
                <Tooltip content="Add an NPC / cameo / quick ref from NPC Vault" side="left">
                  <button
                    type="button"
                    onClick={() => openSupportingVault()}
                    className="p-1.5 rounded-lg border border-white/20 hover:bg-white/10"
                    aria-label="Add NPC ref from vault"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
              <ul className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-0.5">
                {store.productionSupportingRefs.length === 0 && (
                  <li className="text-xs text-white/40 italic">No NPC refs yet — add from NPC Vault.</li>
                )}
                {store.productionSupportingRefs.map((r) => (
                  <li
                    key={r.supportingRefId}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2"
                  >
                    <ArcsStorageImg src={r.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{r.label || 'NPC ref'}</p>
                      <p className="text-[10px] text-white/45 truncate">Saved {new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    <Tooltip content="Remove from NPC refs" side="left">
                      <button
                        type="button"
                        className="p-1 text-white/50 hover:text-red-300"
                        onClick={() => store.removeProductionSupportingRef(r.supportingRefId)}
                        aria-label={`Remove ${r.label || 'NPC ref'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        {/* Row 2 — Timeline + large aspect-correct preview */}
        <div className="shrink-0 rounded-xl border border-white/10 bg-black/20 flex flex-col lg:flex-row min-h-0 gap-0">
          <main className="flex-1 min-w-0 flex flex-col p-3 min-h-[220px] lg:border-r border-white/10">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
                <Film className="w-4 h-4" />
                Beat timeline
              </h2>
              <span className="text-[10px] text-white/40 hidden sm:inline">
                Focus timeline → ← → Home End
              </span>
            </div>
            <div
              data-storyline-timeline="true"
              tabIndex={0}
              className="flex-1 overflow-x-auto overflow-y-hidden flex items-stretch gap-0 min-h-[200px] outline-none focus:ring-2 focus:ring-fuchsia-500/40 rounded-lg"
              role="listbox"
              aria-label="Story beats"
              aria-activedescendant={store.selectedBeatId ?? undefined}
            >
              {store.beats.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 w-full px-4 py-6 text-center">
                  <p className="text-sm text-white/45 max-w-md">
                    No beats yet. Use the button below to create your first slot, or scroll to{' '}
                    <span className="text-white/70">Image Lab</span>, generate an image, then use{' '}
                    <span className="text-white/70">Create new B-roll beat</span> under the large preview (it appears
                    after a successful generation).
                  </p>
                  <button
                    type="button"
                    onClick={() => store.insertBeatAfter(-1, 'broll', '')}
                    className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-4 py-2 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-500/25"
                  >
                    Add first B-roll beat
                  </button>
                </div>
              ) : (
                store.beats.map((b, i) => (
                  <React.Fragment key={b.id}>
                    <div className={`flex flex-col items-center shrink-0 ${timelineCardWidthClass(b.aspectRatio)}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={store.selectedBeatId === b.id}
                        onClick={() => store.setSelectedBeatId(b.id)}
                        className={`w-full rounded-lg border overflow-hidden text-left transition-all ${
                          store.selectedBeatId === b.id
                            ? 'border-fuchsia-400 ring-2 ring-fuchsia-500/50'
                            : 'border-white/15 hover:border-white/30'
                        }`}
                      >
                        <div className={`${beatAspectBoxClass(b.aspectRatio)} bg-black/40 relative w-full`}>
                          <div className="absolute top-1 right-1 z-10">
                            <Tooltip content="Delete beat" side="left">
                              <button
                                type="button"
                                className="p-1 rounded-md bg-black/40 border border-white/10 text-white/65 hover:text-red-200 hover:border-red-400/40 hover:bg-red-950/40"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  store.removeBeat(b.id);
                                }}
                                aria-label="Delete beat"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                          </div>
                          {b.imageUrl ? (
                            <Tooltip
                              content={
                                <div className="w-[min(22rem,85vw)]">
                                  <ArcsStorageImg
                                    src={b.imageUrl}
                                    alt=""
                                    className={`w-full ${beatAspectBoxClass(b.aspectRatio)} object-cover rounded border border-white/15`}
                                  />
                                  <p className="mt-1 text-[10px] text-white/70">Hover zoom preview</p>
                                </div>
                              }
                              side="top"
                              align="center"
                            >
                              <ArcsStorageImg src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                            </Tooltip>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/30 px-1 text-center">
                              {b.kind === 'broll' ? 'B-roll' : 'No image'}
                            </div>
                          )}
                          {b.generationStatus === 'pending' && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Loader2 className="w-8 h-8 animate-spin" style={{ color: GEM_MAGENTA }} />
                            </div>
                          )}
                        </div>
                        <div className="p-1.5 bg-black/50">
                          <p className="text-[10px] font-mono text-fuchsia-200/90 truncate">
                            {b.durationSec}s · {b.kind} · {b.aspectRatio}
                          </p>
                          <p className="text-[10px] text-white/70 line-clamp-2">{b.text}</p>
                        </div>
                      </button>
                    </div>
                    <div className="flex flex-col items-center justify-center w-8 shrink-0 relative">
                      <button
                        type="button"
                        className="w-7 h-7 rounded-full border border-dashed border-white/25 hover:border-fuchsia-400/60 flex items-center justify-center text-white/50 hover:text-fuchsia-200"
                        aria-label="Insert B-roll after this beat"
                        onClick={() =>
                          setBrollMenuIndex((v) => (v === i ? null : i))
                        }
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      {brollMenuIndex === i && (
                        <div className="absolute top-full mt-1 z-20 left-1/2 -translate-x-1/2 rounded-lg border border-white/20 bg-zinc-900 shadow-xl py-1 min-w-[140px]">
                          {BROLL_PRESETS.map((p) => (
                            <button
                              key={p.label}
                              type="button"
                              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-white/10"
                              onClick={() => {
                                store.insertBeatAfter(i, 'broll', p.text);
                                setBrollMenuIndex(null);
                              }}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                ))
              )}
            </div>
          </main>
          <aside className="lg:w-[min(100%,44rem)] xl:w-[min(100%,52rem)] shrink-0 flex flex-col gap-2 p-3 border-t lg:border-t-0 lg:border-l border-white/10 bg-black/15">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 shrink-0">
              Selected frame preview
            </h2>
            <p className="text-[10px] text-white/40 shrink-0">
              Uses the selected beat&apos;s aspect ratio so cinematic frames stay readable.
            </p>
            <div className="flex-1 flex items-center justify-center min-h-[140px] rounded-lg border border-white/10 bg-black/30 p-3">
              {selectedBeat ? (
                <div
                  className="relative w-full overflow-hidden rounded-lg border border-white/15 bg-black/40"
                  style={{
                    aspectRatio: selectedBeat.aspectRatio.replace(':', ' / '),
                    maxHeight: 'min(46vh, 480px)',
                  }}
                >
                  {selectedBeat.imageUrl ? (
                    <ArcsStorageImg
                      src={selectedBeat.imageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-white/40 px-4 text-center gap-1">
                      <span>No image for this beat yet.</span>
                      <span className="text-[10px] text-white/35">
                        Ratio {selectedBeat.aspectRatio} — generate or refine in Image Lab.
                      </span>
                    </div>
                  )}
                  {selectedBeat.generationStatus === 'pending' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 animate-spin" style={{ color: GEM_MAGENTA }} />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-white/40 text-center py-6 px-2">
                  Select a beat on the timeline to preview it at full width.
                </p>
              )}
            </div>
          </aside>
        </div>

        {/* Row 3 — Beat detail | Image Lab */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 min-h-0 shrink-0 pb-2">
          <aside className="min-w-0 flex flex-col gap-3 rounded-xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm max-h-[70vh] xl:max-h-none overflow-y-auto">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              Beat detail
            </h2>
            {!selectedBeat ? (
              <p className="text-sm text-white/40">Select a beat on the timeline.</p>
            ) : (
              <>
                <label className="block text-[10px] text-white/45 uppercase">Narrative</label>
                <textarea
                  className="w-full min-h-[72px] rounded-lg bg-black/30 border border-white/15 p-2 text-sm leading-relaxed"
                  value={selectedBeat.text}
                  onChange={(e) => store.updateBeat(selectedBeat.id, { text: e.target.value })}
                />
                <label className="block text-[10px] text-white/45 uppercase mt-2">Visual prompt</label>
                <textarea
                  className="w-full min-h-[100px] rounded-lg bg-black/30 border border-white/15 p-2 text-sm font-mono leading-relaxed"
                  value={selectedBeat.visualPrompt}
                  onChange={(e) => store.updateBeat(selectedBeat.id, { visualPrompt: e.target.value })}
                />
                <section className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[10px] text-white/45 uppercase">Cast links for this beat</p>
                    <p className="text-[10px] text-white/40">
                      {selectedBeat.linkedVaultCharacterIds.length > 0
                        ? `${selectedBeat.linkedVaultCharacterIds.length} linked`
                        : 'No linked cast'}
                    </p>
                  </div>
                  {store.productionCast.length === 0 ? (
                    <p className="text-[11px] text-white/40 italic">
                      Add production cast in the row above first.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {store.productionCast.map((c) => {
                        const checked = selectedBeat.linkedVaultCharacterIds.includes(c.vaultCharacterId);
                        return (
                          <label
                            key={c.vaultCharacterId}
                            className="flex items-center gap-2 text-[11px] text-white/80 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-white/30"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...selectedBeat.linkedVaultCharacterIds, c.vaultCharacterId]
                                  : selectedBeat.linkedVaultCharacterIds.filter(
                                      (id) => id !== c.vaultCharacterId
                                    );
                                store.updateBeat(selectedBeat.id, { linkedVaultCharacterIds: next });
                              }}
                            />
                            <span className="truncate">{c.displayName}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
                <section className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[10px] text-white/45 uppercase">NPC links for this beat</p>
                    <p className="text-[10px] text-white/40">
                      {selectedBeat.linkedSupportingRefIds.length > 0
                        ? `${selectedBeat.linkedSupportingRefIds.length} linked`
                        : 'No linked NPC refs'}
                    </p>
                  </div>
                  {store.productionSupportingRefs.length === 0 ? (
                    <p className="text-[11px] text-white/40 italic">
                      Add NPC refs in the row above first.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {store.productionSupportingRefs.map((r) => {
                        const checked = selectedBeat.linkedSupportingRefIds.includes(r.supportingRefId);
                        return (
                          <label
                            key={r.supportingRefId}
                            className="flex items-center gap-2 text-[11px] text-white/80 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-white/30"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...selectedBeat.linkedSupportingRefIds, r.supportingRefId]
                                  : selectedBeat.linkedSupportingRefIds.filter((id) => id !== r.supportingRefId);
                                store.updateBeat(selectedBeat.id, { linkedSupportingRefIds: next });
                              }}
                            />
                            <span className="truncate">{r.label || 'NPC ref'}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
                <section className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[10px] text-white/45 uppercase">Asset links for this beat</p>
                    <p className="text-[10px] text-white/40">
                      {selectedBeat.linkedVaultAssetIds.length > 0
                        ? `${selectedBeat.linkedVaultAssetIds.length} linked`
                        : 'No linked assets'}
                    </p>
                  </div>
                  {store.productionAssets.length === 0 ? (
                    <p className="text-[11px] text-white/40 italic">
                      Add production assets in the row above first.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {store.productionAssets.map((a) => {
                        const checked = selectedBeat.linkedVaultAssetIds.includes(a.vaultAssetId);
                        return (
                          <label
                            key={a.vaultAssetId}
                            className="flex items-center gap-2 text-[11px] text-white/80 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-white/30"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...selectedBeat.linkedVaultAssetIds, a.vaultAssetId]
                                  : selectedBeat.linkedVaultAssetIds.filter(
                                      (id) => id !== a.vaultAssetId
                                    );
                                store.updateBeat(selectedBeat.id, { linkedVaultAssetIds: next });
                              }}
                            />
                            <span className="truncate">{a.assetName}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
                <section className="mt-2">
                  <label className="block text-[10px] text-white/45 uppercase mb-1.5">Aspect ratio</label>
                  <div className="flex flex-wrap gap-1.5">
                    {STORY_BEAT_ASPECTS.map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => store.updateBeat(selectedBeat.id, { aspectRatio: ratio })}
                        className={`px-2 py-1 rounded-full text-[11px] border transition ${
                          selectedBeat.aspectRatio === ratio
                            ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-100'
                            : 'border-white/20 text-white/75 hover:bg-white/10'
                        }`}
                      >
                        {ratio === '9:16'
                          ? 'Portrait (9:16)'
                          : ratio === '1:1'
                            ? 'Square (1:1)'
                            : 'Cinematic (21:9)'}
                      </button>
                    ))}
                  </div>
                </section>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <datalist id="camera-shot-options">
                    {CAMERA_SHOT_SUGGESTIONS.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                  <datalist id="camera-angle-options">
                    {CAMERA_ANGLE_SUGGESTIONS.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                  <datalist id="camera-movement-options">
                    {CAMERA_MOVEMENT_SUGGESTIONS.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                  {(['shot', 'angle', 'movement'] as const).map((k) => (
                    <label key={k} className="text-[10px] text-white/45 uppercase col-span-1">
                      {k}
                      <input
                        className="w-full mt-0.5 rounded bg-black/30 border border-white/15 px-1 py-1 text-[11px]"
                        list={
                          k === 'shot'
                            ? 'camera-shot-options'
                            : k === 'angle'
                              ? 'camera-angle-options'
                              : 'camera-movement-options'
                        }
                        value={selectedBeat.camera[k]}
                        onChange={(e) =>
                          store.updateBeat(selectedBeat.id, {
                            camera: { ...selectedBeat.camera, [k]: e.target.value },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
                  <p className="text-[10px] text-white/45 uppercase">POV-only workflow hint</p>
                  <p className="mt-1 text-[11px] text-white/65 leading-relaxed">
                    If you want “the same image, different viewpoint”, keep identity/style references the same and change
                    only the camera POV. Don’t rely on angle tags alone—use explicit “no other changes” language.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="px-2.5 py-1.5 rounded-lg text-[11px] border border-white/15 hover:bg-white/10"
                      onClick={() => {
                        const existing = selectedBeat.visualPrompt ?? '';
                        if (existing.includes('POV-only variation:')) return;
                        const next = `${existing.trim()}\n\nPOV-only variation: keep identity, wardrobe, art style, and scene unchanged; change only point-of-view and camera placement.`.trim();
                        store.updateBeat(selectedBeat.id, { visualPrompt: next });
                      }}
                    >
                      Insert POV-only preset
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <label className="text-[10px] text-white/45 uppercase">
                    Dialogue
                    <textarea
                      className="w-full mt-0.5 min-h-[48px] rounded bg-black/30 border border-white/15 px-2 py-1.5 text-xs leading-relaxed"
                      value={selectedBeat.audio.dialogue}
                      onChange={(e) =>
                        store.updateBeat(selectedBeat.id, {
                          audio: { ...selectedBeat.audio, dialogue: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="text-[10px] text-white/45 uppercase">
                    SFX
                    <input
                      className="w-full mt-0.5 rounded bg-black/30 border border-white/15 px-1 py-1 text-[11px]"
                      value={selectedBeat.audio.sfx}
                      onChange={(e) =>
                        store.updateBeat(selectedBeat.id, {
                          audio: { ...selectedBeat.audio, sfx: e.target.value },
                        })
                      }
                    />
                  </label>
                </div>
                {selectedBeat.interpolation && (
                  <div className="mt-2 text-[11px] space-y-1 text-white/70 border-t border-white/10 pt-2">
                    <p className="font-semibold text-white/50 uppercase text-[10px]">Interpolation</p>
                    <p>
                      <span className="text-fuchsia-300/80">Start:</span>{' '}
                      {selectedBeat.interpolation.startFrame}
                    </p>
                    <p>
                      <span className="text-fuchsia-300/80">End:</span>{' '}
                      {selectedBeat.interpolation.endFrame}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Tooltip content="Generate image for this beat (⌘/Ctrl+Enter)" side="top">
                    <button
                      type="button"
                      disabled={selectedBeat.generationStatus === 'pending' || store.aiBusy !== 'idle'}
                      onClick={() => void runGenerateBeat(selectedBeat.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-black disabled:opacity-50"
                      style={{ background: ACCENT_GOLD_GRADIENT }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate
                    </button>
                  </Tooltip>
                  <Tooltip content="Save the selected beat image into NPC Vault for reuse later" side="top">
                    <button
                      type="button"
                      disabled={!selectedBeat.imageUrl}
                      onClick={() => {
                        if (!selectedBeat.imageUrl) return;
                        saveGeneration('supporting_reference', selectedBeat.imageUrl, selectedBeat.seed ?? undefined, {
                          supportingLabel: selectedBeat.text.trim().slice(0, 80) || 'NPC ref',
                        });
                        openSupportingVault();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs border border-fuchsia-400/30 text-fuchsia-100 hover:bg-fuchsia-500/15 disabled:opacity-50"
                    >
                      <Box className="w-3.5 h-3.5" />
                      Save to NPC Vault
                    </button>
                  </Tooltip>
                  <Tooltip content="Re-run generation" side="top">
                    <button
                      type="button"
                      disabled={selectedBeat.generationStatus === 'pending' || store.aiBusy !== 'idle'}
                      onClick={() => void runGenerateBeat(selectedBeat.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs border border-white/20 hover:bg-white/10 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Redo
                    </button>
                  </Tooltip>
                  <Tooltip content="Remove this beat" side="top">
                    <button
                      type="button"
                      onClick={() => store.removeBeat(selectedBeat.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs border border-red-500/30 text-red-200 hover:bg-red-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </Tooltip>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
                  <Tooltip content="Open this frame in Reference Character Studio" side="top">
                    <button
                      type="button"
                      disabled={!selectedBeat.imageUrl}
                      onClick={() => {
                        if (!selectedBeat.imageUrl) return;
                        const hint = [selectedBeat.visualPrompt, selectedBeat.text]
                          .filter(Boolean)
                          .join('\n\n')
                          .slice(0, 4000);
                        requestOpenInStudio('studio', selectedBeat.imageUrl, hint || undefined, {
                          origin: {
                            sourcePortal: 'lab',
                            sourceLabel: selectedBeat.text || 'Selected beat',
                            selectedBeatId: selectedBeat.id,
                          },
                          returnToPortal: 'lab',
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs border border-white/25 hover:bg-white/10 disabled:opacity-40"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Character Studio
                    </button>
                  </Tooltip>
                  <Tooltip content="Open this frame in Assets Studio" side="top">
                    <button
                      type="button"
                      disabled={!selectedBeat.imageUrl}
                      onClick={() => {
                        if (!selectedBeat.imageUrl) return;
                        const hint = [selectedBeat.visualPrompt, selectedBeat.text]
                          .filter(Boolean)
                          .join('\n\n')
                          .slice(0, 4000);
                        requestOpenInStudio('assets', selectedBeat.imageUrl, hint || undefined, {
                          origin: {
                            sourcePortal: 'lab',
                            sourceLabel: selectedBeat.text || 'Selected beat',
                            selectedBeatId: selectedBeat.id,
                          },
                          returnToPortal: 'lab',
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs border border-white/25 hover:bg-white/10 disabled:opacity-40"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Assets Studio
                    </button>
                  </Tooltip>
                </div>
              </>
            )}
          </aside>

          <aside className="min-w-0 flex flex-col rounded-xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm max-h-[70vh] xl:max-h-none overflow-y-auto">
            <GenericImageLabPanel
              selectedBeat={selectedBeat}
              productionCast={store.productionCast}
              productionAssets={store.productionAssets}
              onUseAsSelectedBeat={handleLabUseAsSelectedBeat}
              onCreateNewBeat={handleLabCreateNewBeat}
              seedPrompt={labSeedPrompt}
              onSeedPromptConsumed={() => setLabSeedPrompt(null)}
            />
          </aside>
        </div>
      </div>

      {showSaveVaultModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Save story to asset vault"
        >
          <div className="w-full max-w-md rounded-xl border border-white/20 bg-zinc-900 shadow-2xl p-4 text-white">
            <h3 className="text-sm font-semibold mb-3">Save story to Asset Vault</h3>
            <p className="text-xs text-white/55 mb-3">
              Uses the first beat that has a generated image as the vault cover. Requires Supabase
              configuration.
            </p>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setSaveVaultMode('new')}
                className={`flex-1 py-1.5 text-xs rounded-lg border ${
                  saveVaultMode === 'new'
                    ? 'border-fuchsia-500/60 bg-fuchsia-950/40'
                    : 'border-white/15'
                }`}
              >
                New collection
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaveVaultMode('library');
                  void loadVaultCollections();
                }}
                className={`flex-1 py-1.5 text-xs rounded-lg border ${
                  saveVaultMode === 'library'
                    ? 'border-fuchsia-500/60 bg-fuchsia-950/40'
                    : 'border-white/15'
                }`}
              >
                Existing collection
              </button>
            </div>
            <label className="block text-xs text-white/60 mb-1">Collection name</label>
            <input
              type="text"
              value={saveVaultCollectionName}
              onChange={(e) => setSaveVaultCollectionName(e.target.value)}
              list={saveVaultMode === 'library' ? 'storyline-vault-collections' : undefined}
              placeholder={saveVaultMode === 'library' ? 'Type exact existing name' : 'e.g. My storyboards'}
              className="w-full bg-black/40 text-white border border-white/20 rounded-lg px-3 py-2 mb-2 text-sm"
            />
            {saveVaultMode === 'library' && (
              <datalist id="storyline-vault-collections">
                {vaultCollectionOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            )}
            {saveVaultMode === 'library' && (
              <p className="text-[10px] text-white/45 mb-2">
                {vaultCollectionLoading
                  ? 'Loading collections…'
                  : !getMatchedExistingCollection(saveVaultCollectionName)
                    ? 'Save enables only when the name matches an existing collection exactly.'
                    : '\u00A0'}
              </p>
            )}
            <label className="block text-xs text-white/60 mb-1">Asset / story label (optional)</label>
            <input
              type="text"
              value={saveVaultAssetName}
              onChange={(e) => setSaveVaultAssetName(e.target.value)}
              placeholder="Defaults to story title"
              className="w-full bg-black/40 text-white border border-white/20 rounded-lg px-3 py-2 mb-4 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveVaultModal(false)}
                className="px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  saveVaultPending ||
                  !saveVaultCollectionName.trim() ||
                  (saveVaultMode === 'library' &&
                    (vaultCollectionLoading || !getMatchedExistingCollection(saveVaultCollectionName)))
                }
                onClick={() => void handleSaveVaultConfirm()}
                className="px-3 py-2 rounded-lg text-sm font-medium text-black border border-amber-600/50 disabled:opacity-50"
                style={{ background: ACCENT_GOLD_GRADIENT }}
              >
                {saveVaultPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {vaultOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Pick character from vault"
        >
          <div className="w-full max-w-lg max-h-[70vh] rounded-xl border border-white/20 bg-zinc-900 shadow-2xl flex flex-col">
            <div className="p-3 border-b border-white/10 flex justify-between items-center">
              <span className="text-sm font-semibold">Image Vault — pick character</span>
              <button
                type="button"
                className="text-white/60 hover:text-white text-sm"
                onClick={() => setVaultOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {vaultLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-2">
                  {vaultRows.map(({ item, profileName }) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="w-full rounded-lg border border-white/10 overflow-hidden text-left hover:border-fuchsia-500/50"
                        onClick={() => {
                          store.addProductionCastMember({
                            vaultCharacterId: item.id,
                            profileName,
                            castName: item.cast_name ?? null,
                            displayName: displayNameForVaultItem(item, profileName),
                            imageUrl: item.image_url,
                            tagSummary: tagSummaryFromItem(),
                          });
                          setVaultOpen(false);
                        }}
                      >
                        <ArcsStorageImg
                          src={item.image_url}
                          alt=""
                          className="w-full aspect-square object-cover"
                        />
                        <p className="text-[10px] p-1 truncate">
                          {displayNameForVaultItem(item, profileName)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      {assetVaultOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Pick asset from vault"
        >
          <div className="w-full max-w-lg max-h-[70vh] rounded-xl border border-white/20 bg-zinc-900 shadow-2xl flex flex-col">
            <div className="p-3 border-b border-white/10 flex justify-between items-center">
              <span className="text-sm font-semibold">Asset Vault — pick asset</span>
              <button
                type="button"
                className="text-white/60 hover:text-white text-sm"
                onClick={() => setAssetVaultOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {assetVaultLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-2">
                  {assetVaultRows.map(({ item, collectionName }) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="w-full rounded-lg border border-white/10 overflow-hidden text-left hover:border-fuchsia-500/50"
                        onClick={() => {
                          store.addProductionAssetMember({
                            vaultAssetId: item.id,
                            collectionName,
                            assetName: (item.asset_name || item.name || 'Asset').trim() || 'Asset',
                            imageUrl: item.image_url,
                          });
                          setAssetVaultOpen(false);
                        }}
                      >
                        <ArcsStorageImg src={item.image_url} alt="" className="w-full aspect-square object-cover" />
                        <p className="text-[10px] p-1 truncate">
                          {(item.asset_name || item.name || 'Asset').trim() || 'Asset'}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {supportingVaultOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Pick supporting reference from NPC Vault"
        >
          <div className="w-full max-w-lg max-h-[70vh] rounded-xl border border-white/20 bg-zinc-900 shadow-2xl flex flex-col">
            <div className="p-3 border-b border-white/10 flex justify-between items-center">
              <span className="text-sm font-semibold">NPC Vault — pick ref</span>
              <button
                type="button"
                className="text-white/60 hover:text-white text-sm"
                onClick={() => setSupportingVaultOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {supportingVaultRows.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-white/60">No NPC Vault refs yet.</p>
                  <p className="mt-2 text-xs text-white/40">
                    Save a generated image to NPC Vault, then add it here.
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-2">
                  {supportingVaultRows.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        className="w-full rounded-lg border border-white/10 overflow-hidden text-left hover:border-fuchsia-500/50"
                        onClick={() => {
                          store.addProductionSupportingRef({
                            supportingRefId: g.id,
                            label: g.supportingLabel?.trim() ? g.supportingLabel : 'NPC ref',
                            imageUrl: g.url,
                            createdAt: g.createdAt,
                          });
                          setSupportingVaultOpen(false);
                        }}
                      >
                        <ArcsStorageImg src={g.url} alt="" className="w-full aspect-square object-cover" />
                        <p className="text-[10px] p-1 truncate">
                          {g.supportingLabel?.trim() ? g.supportingLabel : 'NPC ref'}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
