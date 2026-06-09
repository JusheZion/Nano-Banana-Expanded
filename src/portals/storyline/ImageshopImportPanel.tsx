import { useCallback, useEffect, useMemo, useState } from 'react';
import { generateImage, type OnyxModelId } from '@/shared/api/geminiImageApi';
import {
  saveImportedImageToAssetVault,
  saveImportedImageToCharacterVault,
} from '@/shared/api/arcsPersistence';
import { getCharacterAlbums } from '@/shared/api/arcsVault';
import { getAssetAlbums } from '@/shared/api/arcsAssetVault';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { ArcsStorageImg } from '@/components/ui/ArcsStorageImg';
import { Tooltip } from '@/shared/components/Tooltip';
import { SearchableVaultSelect } from '@/shared/components/SearchableVaultSelect';
import { ART_STYLE_LIBRARY } from '@/data/character_studio_spec';
import { pickGenerationSeed } from '@/shared/utils/generationSeed';
import { saveGeneration } from '@/shared/utils/generationOutputRouter';
import { addRecentFromAsset, addRecentFromCharacter } from '@/shared/utils/recentGenerations';
import {
  studioPreviewMaxHeightCss,
  type StudioPreviewAspectId,
} from '@/shared/utils/studioPreviewLayout';
import type { StoryBeatAspectRatio } from '@/portals/storyline/storylineTypes';
import {
  buildImageshopImportPrompt,
  IMAGESHOP_IMPORT_MAX_FILE_BYTES,
} from '@/portals/storyline/imageshopImportPrompt';

function formatGeminiClientError(message: string): string {
  if (message.includes('VITE_GEMINI_API_KEY')) {
    return 'Gemini API key is not available in this build. Add VITE_GEMINI_API_KEY to your .env file and restart the dev server (same variable Character and Asset studios use).';
  }
  return message;
}

type VaultTarget = 'character' | 'asset' | 'npc';

/** Options that were used for the last successful `generateImage` call (paired with `importSeed`). */
type ImageshopProcessingSnapshot = {
  retouch: boolean;
  stylePreset?: string;
  styleExtra?: string;
  aspectRatio: StoryBeatAspectRatio;
  vaultTarget: VaultTarget;
  userNote?: string;
};

export function ImageshopImportPanel() {
  const [importObjectUrl, setImportObjectUrl] = useState<string | null>(null);
  const [importOriginalDataUrl, setImportOriginalDataUrl] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importRetouch, setImportRetouch] = useState(true);
  const [importStylePreset, setImportStylePreset] = useState('');
  const [importStyleExtra, setImportStyleExtra] = useState('');
  const [importUserNote, setImportUserNote] = useState('');
  const [importAspect, setImportAspect] = useState<StoryBeatAspectRatio>('9:16');
  const [importVaultTarget, setImportVaultTarget] = useState<VaultTarget>('npc');
  const [importProcessedUrl, setImportProcessedUrl] = useState<string | null>(null);
  /** Metadata for `processing` in vault saves — frozen at generation time (with `importSeed`), not live UI. */
  const [importProcessingSnapshot, setImportProcessingSnapshot] =
    useState<ImageshopProcessingSnapshot | null>(null);
  const [importSeed, setImportSeed] = useState<number | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSaveError, setImportSaveError] = useState<string | null>(null);
  const [importSaveNotice, setImportSaveNotice] = useState<string | null>(null);
  const [importSavePending, setImportSavePending] = useState(false);

  const [profileName, setProfileName] = useState('');
  const [castName, setCastName] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [assetName, setAssetName] = useState('');
  const [npcLabel, setNpcLabel] = useState('Imported ref');

  const [vaultProfileOptions, setVaultProfileOptions] = useState<string[]>([]);
  const [vaultProfileLoading, setVaultProfileLoading] = useState(false);
  const [vaultCollectionOptions, setVaultCollectionOptions] = useState<string[]>([]);
  const [vaultCollectionLoading, setVaultCollectionLoading] = useState(false);

  const modelId: OnyxModelId = 'pro';
  const supabaseReady = isSupabaseConfigured();

  const labContext = importVaultTarget === 'asset' ? 'asset' : 'character';

  const referenceImageUrls = useMemo(() => {
    const a = Array.from({ length: 14 }, () => '');
    if (importObjectUrl) a[0] = importObjectUrl;
    return a;
  }, [importObjectUrl]);

  const processingMeta = useMemo(
    () => ({
      retouch: importRetouch,
      stylePreset: importStylePreset.trim() || undefined,
      styleExtra: importStyleExtra.trim() || undefined,
      aspectRatio: importAspect,
      vaultTarget: importVaultTarget,
    }),
    [importAspect, importRetouch, importStyleExtra, importStylePreset, importVaultTarget]
  );

  const processingForPersist = useMemo((): Record<string, unknown> => {
    const s = importProcessingSnapshot;
    if (!s) return { ...processingMeta };
    return {
      retouch: s.retouch,
      ...(s.stylePreset !== undefined ? { stylePreset: s.stylePreset } : {}),
      ...(s.styleExtra !== undefined ? { styleExtra: s.styleExtra } : {}),
      aspectRatio: s.aspectRatio,
      vaultTarget: s.vaultTarget,
      ...(s.userNote ? { userNote: s.userNote } : {}),
    };
  }, [importProcessingSnapshot, processingMeta]);

  useEffect(() => {
    return () => {
      if (importObjectUrl?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(importObjectUrl);
        } catch {
          /* ignore */
        }
      }
    };
  }, [importObjectUrl]);

  const loadProfileOptions = useCallback(() => {
    if (!supabaseReady) return;
    setVaultProfileLoading(true);
    getCharacterAlbums()
      .then((albums) => setVaultProfileOptions(albums.map((a) => a.profileName)))
      .catch(() => setVaultProfileOptions([]))
      .finally(() => setVaultProfileLoading(false));
  }, [supabaseReady]);

  const loadCollectionOptions = useCallback(() => {
    if (!supabaseReady) return;
    setVaultCollectionLoading(true);
    getAssetAlbums()
      .then((albums) => setVaultCollectionOptions(albums.map((a) => a.collectionName)))
      .catch(() => setVaultCollectionOptions([]))
      .finally(() => setVaultCollectionLoading(false));
  }, [supabaseReady]);

  useEffect(() => {
    if (importVaultTarget === 'character') void loadProfileOptions();
  }, [importVaultTarget, loadProfileOptions]);

  useEffect(() => {
    if (importVaultTarget === 'asset') void loadCollectionOptions();
  }, [importVaultTarget, loadCollectionOptions]);

  const onPickFile = useCallback(
    (files: FileList | null) => {
      setImportError(null);
      setImportSaveError(null);
      setImportSaveNotice(null);
      setImportProcessedUrl(null);
      setImportProcessingSnapshot(null);
      setImportSeed(null);
      setImportOriginalDataUrl(null);
      const file = files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setImportError('Choose an image file (PNG, JPEG, or WebP).');
        return;
      }
      if (file.size > IMAGESHOP_IMPORT_MAX_FILE_BYTES) {
        setImportError(
          `File is too large (max ${Math.round(IMAGESHOP_IMPORT_MAX_FILE_BYTES / (1024 * 1024))} MB).`
        );
        return;
      }
      setImportObjectUrl((prev) => {
        if (prev?.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(prev);
          } catch {
            /* ignore */
          }
        }
        return URL.createObjectURL(file);
      });
      setImportFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setImportOriginalDataUrl(reader.result);
      };
      reader.onerror = () => {
        setImportOriginalDataUrl(null);
        setImportError('Could not prepare this image for direct vault upload.');
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const runProcess = useCallback(async () => {
    if (!importObjectUrl) {
      setImportError('Choose an image file first.');
      return;
    }
    setImportError(null);
    setImportBusy(true);
    try {
      const prompt = buildImageshopImportPrompt({
        retouch: importRetouch,
        stylePreset: importStylePreset,
        styleExtra: importStyleExtra,
        userNote: importUserNote,
      });
      const seed = pickGenerationSeed('randomized', null);
      const res = await generateImage({
        prompt,
        referenceImageUrls,
        seed,
        aspectRatio: importAspect,
        modelId,
        context: labContext,
      });
      if (!res.ok) {
        if ('blocked' in res && res.blocked) setImportError('Blocked by safety filters.');
        else if ('error' in res) setImportError(formatGeminiClientError(res.error));
        else setImportError('Processing failed.');
        return;
      }
      setImportProcessedUrl(res.imageDataUrl);
      setImportSaveNotice(null);
      setImportSeed(seed);
      setImportProcessingSnapshot({
        retouch: importRetouch,
        stylePreset: importStylePreset.trim() || undefined,
        styleExtra: importStyleExtra.trim() || undefined,
        aspectRatio: importAspect,
        vaultTarget: importVaultTarget,
        userNote: importUserNote.trim() || undefined,
      });
    } finally {
      setImportBusy(false);
    }
  }, [
    importAspect,
    importObjectUrl,
    importRetouch,
    importStyleExtra,
    importStylePreset,
    importUserNote,
    labContext,
    modelId,
    referenceImageUrls,
  ]);

  const getMatchedProfile = useCallback(
    (typed: string): string | null => {
      const q = typed.trim();
      if (!q) return null;
      const lower = q.toLowerCase();
      return vaultProfileOptions.find((p) => p.toLowerCase() === lower) ?? null;
    },
    [vaultProfileOptions]
  );

  const getMatchedCollection = useCallback(
    (typed: string): string | null => {
      const q = typed.trim();
      if (!q) return null;
      const lower = q.toLowerCase();
      return vaultCollectionOptions.find((c) => c.toLowerCase() === lower) ?? null;
    },
    [vaultCollectionOptions]
  );

  const handleSave = useCallback(async (source: 'processed' | 'original' = 'processed') => {
    const imageUrl = source === 'original' ? importOriginalDataUrl : importProcessedUrl;
    const seedForSave = source === 'original' ? null : importSeed;
    const processingForSave =
      source === 'original'
        ? {
            ...processingMeta,
            directUpload: true,
            sourceFileName: importFileName || undefined,
          }
        : processingForPersist;

    if (!imageUrl) {
      setImportSaveError(source === 'original' ? 'Choose an image before uploading.' : 'Process an image before saving.');
      return;
    }
    setImportSaveError(null);
    setImportSaveNotice(null);
    setImportSavePending(true);
    try {
      if (importVaultTarget === 'npc') {
        const label = npcLabel.trim() || 'Imported ref';
        saveGeneration('supporting_reference', imageUrl, seedForSave ?? undefined, {
          supportingLabel: label,
        });
        setImportSaveNotice(
          source === 'original' ? `Uploaded original to NPC Vault as "${label}".` : `Saved to NPC Vault as "${label}".`,
        );
        return;
      }

      if (importVaultTarget === 'character') {
        const typed = profileName.trim();
        if (!typed) {
          setImportSaveError('Enter a profile name.');
          return;
        }
        const matched = getMatchedProfile(typed);
        const profileNameForDb = matched ?? typed;
        const isUnnamed = profileNameForDb.toLowerCase() === 'unnamed';
        const baseNameForId = isUnnamed ? 'Unnamed' : profileNameForDb;
        const profileForInsert = isUnnamed ? undefined : profileNameForDb;
        const cast = castName.trim() || undefined;

        if (supabaseReady) {
          const result = await saveImportedImageToCharacterVault({
            imageUrl,
            baseName: baseNameForId,
            profileName: profileForInsert,
            castName: cast,
            seed: seedForSave,
            processing: processingForSave,
          });
          if (!result.ok) {
            setImportSaveError(result.error ?? 'Save failed');
            return;
          }
          if (result.id && result.imageUrl) {
            addRecentFromCharacter({
              id: result.id,
              image_url: result.imageUrl,
              profile_name: profileForInsert ?? null,
              cast_name: cast ?? null,
              seed: seedForSave,
            });
            saveGeneration('character', result.imageUrl, seedForSave ?? undefined, {
              profileName: profileForInsert,
              castName: cast,
            });
          }
        } else {
          saveGeneration('character', imageUrl, seedForSave ?? undefined, {
            profileName: profileForInsert,
            castName: cast,
          });
        }
        setImportSaveNotice(
          source === 'original'
            ? `Uploaded original to Character Vault as "${profileNameForDb}".`
            : `Saved to Character Vault as "${profileNameForDb}".`,
        );
        return;
      }

      if (importVaultTarget === 'asset') {
        const typed = collectionName.trim();
        if (!typed) {
          setImportSaveError('Enter a collection name.');
          return;
        }
        const matched = getMatchedCollection(typed);
        const collectionForDb = matched ?? typed;
        const isUnnamed = collectionForDb.toLowerCase() === 'unnamed';
        const baseNameForId = isUnnamed ? 'Unnamed' : collectionForDb;
        const collectionInsert = isUnnamed ? undefined : collectionForDb;
        const asset = assetName.trim() || undefined;

        if (supabaseReady) {
          const result = await saveImportedImageToAssetVault({
            imageUrl,
            baseName: baseNameForId,
            collectionName: collectionInsert,
            assetName: asset,
            seed: seedForSave,
            processing: processingForSave,
          });
          if (!result.ok) {
            setImportSaveError(result.error ?? 'Save failed');
            return;
          }
          if (result.id && result.imageUrl) {
            addRecentFromAsset({
              id: result.id,
              image_url: result.imageUrl,
              collection_name: collectionInsert ?? null,
              asset_name: asset ?? null,
              seed: seedForSave,
            });
            saveGeneration('asset', result.imageUrl, seedForSave ?? undefined, {
              collectionName: collectionInsert,
              assetName: asset,
            });
          }
        } else {
          saveGeneration('asset', imageUrl, seedForSave ?? undefined, {
            collectionName: collectionInsert,
            assetName: asset,
          });
        }
        setImportSaveNotice(
          source === 'original'
            ? `Uploaded original to Asset Vault collection "${collectionForDb}".`
            : `Saved to Asset Vault collection "${collectionForDb}".`,
        );
      }
    } finally {
      setImportSavePending(false);
    }
  }, [
    assetName,
    castName,
    collectionName,
    getMatchedCollection,
    getMatchedProfile,
    importFileName,
    importOriginalDataUrl,
    importProcessedUrl,
    importSeed,
    importVaultTarget,
    npcLabel,
    processingForPersist,
    processingMeta,
    profileName,
    supabaseReady,
  ]);

  const labPreviewMaxH = studioPreviewMaxHeightCss(importAspect as StudioPreviewAspectId);
  const isCinematic = importAspect === '21:9';
  const previewMaxH = isCinematic ? 'min(40vh, 360px)' : labPreviewMaxH;

  return (
    <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-950/10 p-3">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/80">
        Import external image
      </h4>
      <p className="mt-1 text-[11px] text-white/50">
        Retouch and style options use the image model (not dedicated upscaling). Results are
        generative—preview before saving.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-[11px] px-3 py-1.5 rounded-lg border border-white/15 bg-black/30 cursor-pointer hover:bg-white/10">
          Choose file…
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/*"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files)}
          />
        </label>
        {importFileName ? (
          <span className="text-[11px] text-white/60 truncate max-w-[200px]" title={importFileName}>
            {importFileName}
          </span>
        ) : (
          <span className="text-[11px] text-white/35">No file selected</span>
        )}
      </div>

      {importObjectUrl ? (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase text-white/40 mb-1">Source</p>
            <div
              className="rounded-lg border border-white/10 overflow-hidden bg-black/40 flex items-center justify-center"
              style={{ maxHeight: previewMaxH }}
            >
              <ArcsStorageImg src={importObjectUrl} alt="" className="max-h-[220px] w-full object-contain" />
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/40 mb-1">Processed</p>
            <div
              className="rounded-lg border border-fuchsia-500/20 overflow-hidden bg-black/40 flex items-center justify-center min-h-[120px]"
              style={{ maxHeight: previewMaxH }}
            >
              {importProcessedUrl ? (
                <ArcsStorageImg
                  src={importProcessedUrl}
                  alt=""
                  className="max-h-[220px] w-full object-contain"
                />
              ) : (
                <span className="text-[11px] text-white/35 p-4">Run Process to generate</span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-[11px] text-white/75 cursor-pointer">
          <input
            type="checkbox"
            checked={importRetouch}
            onChange={(e) => setImportRetouch(e.target.checked)}
            className="rounded border-white/30"
          />
          Retouch / cleanup
        </label>
      </div>

      <div className="mt-2">
        <label className="text-[10px] text-white/45 uppercase">Art style (optional)</label>
        <select
          className="mt-0.5 w-full max-w-xs rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-xs"
          value={importStylePreset}
          onChange={(e) => setImportStylePreset(e.target.value)}
        >
          <option value="">No style change (follow reference)</option>
          {ART_STYLE_LIBRARY.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2">
        <label className="text-[10px] text-white/45 uppercase">Extra style notes</label>
        <input
          type="text"
          className="mt-0.5 w-full rounded-lg bg-black/30 border border-white/15 px-2 py-1.5 text-xs"
          value={importStyleExtra}
          onChange={(e) => setImportStyleExtra(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="mt-2">
        <label className="text-[10px] text-white/45 uppercase">Notes for the model</label>
        <input
          type="text"
          className="mt-0.5 w-full rounded-lg bg-black/30 border border-white/15 px-2 py-1.5 text-xs"
          value={importUserNote}
          onChange={(e) => setImportUserNote(e.target.value)}
          placeholder="Optional (lighting, mood, …)"
        />
      </div>

      <div className="mt-3">
        <label className="text-[10px] text-white/45 uppercase mb-1 block">Aspect ratio</label>
        <div className="flex flex-wrap gap-2">
          {(['9:16', '1:1', '21:9'] as StoryBeatAspectRatio[]).map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => setImportAspect(ratio)}
              className={`px-2 py-1 rounded-lg text-[11px] border ${
                importAspect === ratio
                  ? 'border-amber-400/60 bg-amber-500/15'
                  : 'border-white/15 hover:bg-white/10'
              }`}
            >
              {ratio === '9:16' ? 'Portrait' : ratio === '1:1' ? 'Square' : 'Cinematic'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label className="text-[10px] text-white/45 uppercase mb-1 block">Save to vault</label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['npc', 'NPC Vault (local)'],
              ['character', 'Character Vault'],
              ['asset', 'Asset Vault'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setImportVaultTarget(id)}
              className={`px-2 py-1 rounded-lg text-[11px] border ${
                importVaultTarget === id
                  ? 'border-amber-400/60 bg-amber-500/15'
                  : 'border-white/15 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {importVaultTarget === 'character' ? (
        <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/20 p-2">
          <SearchableVaultSelect
            id="imageshop-import-profile"
            label="Profile name"
            value={profileName}
            onChange={setProfileName}
            options={vaultProfileOptions}
            loading={vaultProfileLoading}
            placeholder="New profile or pick existing…"
            helperSlot={
              <p className="text-[10px] text-white/45">
                {supabaseReady
                  ? 'Saved to Supabase when signed in; otherwise local archive only.'
                  : 'Supabase not configured — local archive only.'}
              </p>
            }
          />
          <label className="block text-[10px] text-white/45 uppercase">
            Cast name (optional)
            <input
              className="mt-0.5 w-full rounded bg-black/30 border border-white/15 px-2 py-1 text-xs"
              value={castName}
              onChange={(e) => setCastName(e.target.value)}
            />
          </label>
        </div>
      ) : null}

      {importVaultTarget === 'asset' ? (
        <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/20 p-2">
          <SearchableVaultSelect
            id="imageshop-import-collection"
            label="Collection name"
            value={collectionName}
            onChange={setCollectionName}
            options={vaultCollectionOptions}
            loading={vaultCollectionLoading}
            placeholder="New collection or pick existing…"
            helperSlot={
              <p className="text-[10px] text-white/45">
                {supabaseReady
                  ? 'Saved to Supabase when signed in; otherwise local archive only.'
                  : 'Supabase not configured — local archive only.'}
              </p>
            }
          />
          <label className="block text-[10px] text-white/45 uppercase">
            Asset name (optional)
            <input
              className="mt-0.5 w-full rounded bg-black/30 border border-white/15 px-2 py-1 text-xs"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
            />
          </label>
        </div>
      ) : null}

      {importVaultTarget === 'npc' ? (
        <div className="mt-3">
          <label className="text-[10px] text-white/45 uppercase">Label</label>
          <input
            type="text"
            className="mt-0.5 w-full rounded-lg bg-black/30 border border-white/15 px-2 py-1.5 text-xs"
            value={npcLabel}
            onChange={(e) => setNpcLabel(e.target.value)}
            placeholder="NPC ref"
          />
        </div>
      ) : null}

      {importError ? <p className="mt-2 text-xs text-red-200/90">{importError}</p> : null}
      {importSaveError ? <p className="mt-2 text-xs text-red-200/90">{importSaveError}</p> : null}
      {importSaveNotice ? <p className="mt-2 text-xs text-emerald-200/90">{importSaveNotice}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Tooltip content="Upload the chosen source image directly to the selected vault without running the image model" side="top">
          <button
            type="button"
            disabled={importSavePending || !importOriginalDataUrl}
            onClick={() => void handleSave('original')}
            className="px-3 py-2 rounded-full text-xs border border-emerald-300/45 text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-50"
          >
            {importSavePending ? 'Saving…' : 'Upload original'}
          </button>
        </Tooltip>
        <Tooltip content="Send source image to the model with your options" side="top">
          <button
            type="button"
            disabled={importBusy || !importObjectUrl}
            onClick={() => void runProcess()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold text-black disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg, #b45309, #fbbf24)' }}
          >
            {importBusy ? 'Processing…' : 'Process'}
          </button>
        </Tooltip>
        <Tooltip
          content="Save the current processed image to the selected vault"
          side="top"
        >
          <button
            type="button"
            disabled={importSavePending || !importProcessedUrl}
            onClick={() => void handleSave('processed')}
            className="px-3 py-2 rounded-full text-xs border border-amber-400/40 text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"
          >
            {importSavePending ? 'Saving…' : 'Save to vault'}
          </button>
        </Tooltip>
      </div>

      {importProcessedUrl ? (
        <p className="mt-2 text-[10px] text-emerald-200/80">
          Ready to save. NPC Vault stores locally; Character/Asset use Supabase when configured and
          signed in. If options change, Process again only when you want to update the preview.
        </p>
      ) : null}
    </div>
  );
}
