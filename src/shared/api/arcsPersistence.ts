/**
 * ARCS persistence: save characters and assets to Supabase with semantic IDs and metadata_tags.
 * Falls back to no-op when Supabase is not configured (generationOutputRouter still handles localStorage).
 */
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { generateSemanticId } from '@/shared/utils/semanticId';
import type { ThumbnailFocus } from '@/shared/utils/generationOutputRouter';
import type { CharacterStudioState } from '@/stores/characterStudioStore';
import type { AssetStudioState } from '@/stores/assetStudioStore';
import type {
  DirectorSettings,
  ProductionAssetMember,
  ProductionCastMember,
  StoryBeat,
} from '@/portals/storyline/storylineTypes';
import {
  buildStorySequenceV1Payload,
  STORY_SEQUENCE_V1_KEY,
  STORYLINE_ASSET_SOURCE,
} from '@/shared/utils/storySequencePayload';

const BUCKET = 'arcs-generations';

function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const b64 = match[2];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Pick file extension from MIME type for storage object key. */
function extFromMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  return 'jpg';
}

/**
 * Upload raw image bytes under `{auth.uid()}/…` and return the stable object/public URL string
 * (used in Postgres; UI resolves to signed URLs for display).
 * Returns null if not signed in or upload fails.
 */
async function uploadBlobToArcsBucket(blob: Blob): Promise<string | null> {
  if (!supabase) return null;
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userErr || !user?.id) return null;

  const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const ext = extFromMime(mime);
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    return null;
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

/**
 * Ensures `image_url` stored in Postgres is loadable after refresh.
 * - `data:` (API generations) → upload to Storage, store public URL.
 * - `blob:` (imported / pasted files in-session) → fetch blob, upload, store public URL.
 * - `http(s):` and app paths → unchanged.
 */
async function ensurePersistentImageUrl(url: string): Promise<string> {
  if (!url || !isSupabaseConfigured() || !supabase) return url;

  if (url.startsWith('data:')) {
    const blob = dataUrlToBlob(url);
    if (!blob) return url;
    const uploaded = await uploadBlobToArcsBucket(blob);
    return uploaded ?? url;
  }

  if (url.startsWith('blob:')) {
    try {
      const res = await fetch(url);
      if (!res.ok) return url;
      const blob = await res.blob();
      const uploaded = await uploadBlobToArcsBucket(blob);
      return uploaded ?? url;
    } catch {
      return url;
    }
  }

  return url;
}

/** `blob:` URLs never survive a full page reload; never persist them to Postgres when using Supabase. */
function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:');
}

const STORAGE_UPLOAD_HINT =
  'Sign in, ensure bucket "arcs-generations" exists, and storage policies allow authenticated uploads under your user folder. Images are served via signed URLs.';
const SIGN_IN_REQUIRED_MESSAGE = 'Sign in to save characters and assets to the cloud vault.';

async function getAuthenticatedUserId(): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (error || !userId) return null;
  return userId;
}

function buildCharacterMetadataTags(store: CharacterStudioState): Record<string, unknown> {
  return {
    wardrobe: store.wardrobeSelections,
    physical: store.physicalSelections,
    cinematic: store.cinematic,
    heritage: store.heritageSelection,
    gender: store.genderSelection,
    tags: store.tags,
    artStyleId: store.artStyleId,
    customStyles: store.customStyles,
  };
}

function buildAssetMetadataTags(store: AssetStudioState): Record<string, unknown> {
  return {
    eraStyle: store.eraStyleSelection,
    locationType: store.locationTypeSelection,
    architecturalDetail: store.architecturalDetailSelection,
    setDressing: store.setDressingSelections,
    cinematic: store.cinematic,
    tags: store.tags,
    artStyleId: store.artStyleId,
    customStyles: store.customStyles,
    spatialRoom: store.spatialRoomOption,
    spatialUrban: store.spatialUrbanOption,
    timeSeason: store.timeSeason,
    aspectRatio: store.aspectRatio,
  };
}

export interface SaveCharacterResult {
  ok: boolean;
  id?: string;
  imageUrl?: string;
  error?: string;
}

export async function saveCharacterToDb(
  store: CharacterStudioState,
  baseName: string = 'character',
  profileName?: string,
  castName?: string
): Promise<SaveCharacterResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return { ok: false, error: SIGN_IN_REQUIRED_MESSAGE };

  const imageUrl = store.currentLiveImageUrl;
  if (!imageUrl) return { ok: false, error: 'No image to save' };

  const { data: rows } = await supabase.from('characters').select('id').limit(5000);
  const existingIds = (rows ?? []).map((r) => r.id);
  const id = generateSemanticId('CHAR', baseName, existingIds);

  const finalImageUrl = await ensurePersistentImageUrl(imageUrl);
  if (isBlobUrl(finalImageUrl)) {
    return {
      ok: false,
      error: `Could not upload this image to Supabase Storage, so it would break after refresh. ${STORAGE_UPLOAD_HINT}`,
    };
  }
  const metadataTags = buildCharacterMetadataTags(store);
  const seed = store.currentGenerationSeed != null ? Number(store.currentGenerationSeed) : null;

  const { error } = await supabase.from('characters').insert({
    id,
    metadata_tags: metadataTags,
    seed,
    image_url: finalImageUrl,
    name: castName ?? profileName ?? (baseName !== 'character' ? baseName : null),
    profile_name: profileName ?? null,
    cast_name: castName ?? null,
    owner_id: ownerId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, id, imageUrl: finalImageUrl };
}

/**
 * Persists archive-card framing inside metadata_tags.archive_thumbnail so it works
 * without extra DB columns (avoids PostgREST schema cache / migration issues).
 */
export async function updateCharacterThumbnailFocusDb(
  id: string,
  focus: ThumbnailFocus
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }
  const { data: row, error: fetchErr } = await supabase
    .from('characters')
    .select('metadata_tags')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!row) return { ok: false, error: 'Character not found' };
  const prev =
    row.metadata_tags && typeof row.metadata_tags === 'object' && !Array.isArray(row.metadata_tags)
      ? { ...(row.metadata_tags as Record<string, unknown>) }
      : {};
  prev.archive_thumbnail = { x: focus.x, y: focus.y, scale: focus.scale };
  const { error } = await supabase
    .from('characters')
    .update({ metadata_tags: prev })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateAssetThumbnailFocusDb(
  id: string,
  focus: ThumbnailFocus
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }
  const { data: row, error: fetchErr } = await supabase
    .from('assets')
    .select('metadata_tags')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!row) return { ok: false, error: 'Asset not found' };
  const prev =
    row.metadata_tags && typeof row.metadata_tags === 'object' && !Array.isArray(row.metadata_tags)
      ? { ...(row.metadata_tags as Record<string, unknown>) }
      : {};
  prev.archive_thumbnail = { x: focus.x, y: focus.y, scale: focus.scale };
  const { error } = await supabase.from('assets').update({ metadata_tags: prev }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface SaveAssetResult {
  ok: boolean;
  id?: string;
  imageUrl?: string;
  error?: string;
}

export async function saveAssetToDb(
  store: AssetStudioState,
  baseName: string = 'asset',
  collectionName?: string,
  assetName?: string
): Promise<SaveAssetResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return { ok: false, error: SIGN_IN_REQUIRED_MESSAGE };

  const imageUrl = store.currentLiveImageUrl;
  if (!imageUrl) return { ok: false, error: 'No image to save' };

  const { data: rows } = await supabase.from('assets').select('id').limit(5000);
  const existingIds = (rows ?? []).map((r) => r.id);
  const id = generateSemanticId('ASST', baseName, existingIds);

  const finalImageUrl = await ensurePersistentImageUrl(imageUrl);
  if (isBlobUrl(finalImageUrl)) {
    return {
      ok: false,
      error: `Could not upload this image to Supabase Storage, so it would break after refresh. ${STORAGE_UPLOAD_HINT}`,
    };
  }
  const metadataTags = buildAssetMetadataTags(store);
  const seed = store.currentGenerationSeed != null ? Number(store.currentGenerationSeed) : null;

  const { error } = await supabase.from('assets').insert({
    id,
    metadata_tags: metadataTags,
    seed,
    image_url: finalImageUrl,
    name: assetName ?? collectionName ?? (baseName !== 'asset' ? baseName : null),
    collection_name: collectionName ?? null,
    asset_name: assetName ?? null,
    owner_id: ownerId,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id, imageUrl: finalImageUrl };
}

/** `metadata_tags.source` for rows created from Imageshop import + process (no full studio state). */
export const IMAGESHOP_IMPORT_METADATA_SOURCE = 'imageshop_import' as const;

/**
 * Save a processed import image to `characters` without hydrating Character Studio state.
 * Uses minimal `metadata_tags` (source + optional `processing` payload).
 */
export async function saveImportedImageToCharacterVault(args: {
  imageUrl: string;
  baseName?: string;
  profileName?: string;
  castName?: string;
  seed?: number | null;
  processing?: Record<string, unknown>;
}): Promise<SaveCharacterResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return { ok: false, error: SIGN_IN_REQUIRED_MESSAGE };

  const imageUrl = args.imageUrl.trim();
  if (!imageUrl) return { ok: false, error: 'No image to save' };

  const base =
    args.baseName?.trim() ||
    args.profileName?.trim() ||
    args.castName?.trim() ||
    'import';

  const { data: rows } = await supabase.from('characters').select('id').limit(5000);
  const existingIds = (rows ?? []).map((r) => r.id);
  const id = generateSemanticId('CHAR', base, existingIds);

  const finalImageUrl = await ensurePersistentImageUrl(imageUrl);
  if (isBlobUrl(finalImageUrl)) {
    return {
      ok: false,
      error: `Could not upload this image to Supabase Storage, so it would break after refresh. ${STORAGE_UPLOAD_HINT}`,
    };
  }

  const metadataTags: Record<string, unknown> = {
    source: IMAGESHOP_IMPORT_METADATA_SOURCE,
    ...(args.processing && Object.keys(args.processing).length > 0
      ? { processing: args.processing }
      : {}),
  };

  const seed = args.seed != null ? Number(args.seed) : null;

  const { error } = await supabase.from('characters').insert({
    id,
    metadata_tags: metadataTags,
    seed,
    image_url: finalImageUrl,
    name: args.castName ?? args.profileName ?? (base !== 'character' ? base : null),
    profile_name: args.profileName ?? null,
    cast_name: args.castName ?? null,
    owner_id: ownerId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, id, imageUrl: finalImageUrl };
}

/**
 * Save a processed import image to `assets` without hydrating Asset Studio state.
 */
export async function saveImportedImageToAssetVault(args: {
  imageUrl: string;
  baseName?: string;
  collectionName?: string;
  assetName?: string;
  seed?: number | null;
  processing?: Record<string, unknown>;
}): Promise<SaveAssetResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return { ok: false, error: SIGN_IN_REQUIRED_MESSAGE };

  const imageUrl = args.imageUrl.trim();
  if (!imageUrl) return { ok: false, error: 'No image to save' };

  const base =
    args.baseName?.trim() ||
    args.collectionName?.trim() ||
    args.assetName?.trim() ||
    'import';

  const { data: rows } = await supabase.from('assets').select('id').limit(5000);
  const existingIds = (rows ?? []).map((r) => r.id);
  const id = generateSemanticId('ASST', base, existingIds);

  const finalImageUrl = await ensurePersistentImageUrl(imageUrl);
  if (isBlobUrl(finalImageUrl)) {
    return {
      ok: false,
      error: `Could not upload this image to Supabase Storage, so it would break after refresh. ${STORAGE_UPLOAD_HINT}`,
    };
  }

  const metadataTags: Record<string, unknown> = {
    source: IMAGESHOP_IMPORT_METADATA_SOURCE,
    ...(args.processing && Object.keys(args.processing).length > 0
      ? { processing: args.processing }
      : {}),
  };

  const seed = args.seed != null ? Number(args.seed) : null;

  const { error } = await supabase.from('assets').insert({
    id,
    metadata_tags: metadataTags,
    seed,
    image_url: finalImageUrl,
    name: args.assetName ?? args.collectionName ?? (base !== 'asset' ? base : null),
    collection_name: args.collectionName ?? null,
    asset_name: args.assetName ?? null,
    owner_id: ownerId,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id, imageUrl: finalImageUrl };
}

export interface SaveStorySequenceResult {
  ok: boolean;
  id?: string;
  imageUrl?: string;
  error?: string;
}

/**
 * Save a Storyline Studio sequence as an `assets` row: cover image + story_sequence_v1 in metadata_tags.
 */
export async function saveStorySequenceToAssetsVault(args: {
  coverImageUrl: string;
  storyTitle: string;
  rawStoryline: string;
  cleanedStoryline: string;
  beatIntervalSec: number;
  directorSettings: DirectorSettings;
  productionCast: ProductionCastMember[];
  productionAssets: ProductionAssetMember[];
  beats: StoryBeat[];
  collectionNameForDb: string | undefined;
  baseNameForId: string;
  assetName?: string;
}): Promise<SaveStorySequenceResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return { ok: false, error: SIGN_IN_REQUIRED_MESSAGE };

  const cover = args.coverImageUrl.trim();
  if (!cover) {
    return { ok: false, error: 'No cover image — generate at least one beat first.' };
  }

  const { data: rows } = await supabase.from('assets').select('id').limit(5000);
  const existingIds = (rows ?? []).map((r) => r.id);
  const id = generateSemanticId('ASST', args.baseNameForId, existingIds);

  const finalImageUrl = await ensurePersistentImageUrl(cover);
  if (isBlobUrl(finalImageUrl)) {
    return {
      ok: false,
      error: `Could not upload cover image to Supabase Storage. ${STORAGE_UPLOAD_HINT}`,
    };
  }

  const storyPayload = buildStorySequenceV1Payload({
    storyTitle: args.storyTitle,
    rawStoryline: args.rawStoryline,
    cleanedStoryline: args.cleanedStoryline,
    beatIntervalSec: args.beatIntervalSec,
    directorSettings: args.directorSettings,
    productionCast: args.productionCast,
    productionAssets: args.productionAssets,
    beats: args.beats,
  });

  const metadataTags: Record<string, unknown> = {
    [STORY_SEQUENCE_V1_KEY]: storyPayload as unknown as Record<string, unknown>,
    source: STORYLINE_ASSET_SOURCE,
  };

  const displayName =
    args.assetName?.trim() ||
    args.storyTitle.trim() ||
    (args.baseNameForId !== 'Unnamed' ? args.baseNameForId : null);

  const { error } = await supabase.from('assets').insert({
    id,
    metadata_tags: metadataTags,
    seed: null,
    image_url: finalImageUrl,
    name: displayName,
    collection_name: args.collectionNameForDb ?? null,
    asset_name: args.assetName?.trim() || null,
    owner_id: ownerId,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id, imageUrl: finalImageUrl };
}
