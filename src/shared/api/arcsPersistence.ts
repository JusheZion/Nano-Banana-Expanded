/**
 * ARCS persistence: save characters and assets to Supabase with semantic IDs and metadata_tags.
 * Falls back to no-op when Supabase is not configured (generationOutputRouter still handles localStorage).
 */
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { generateSemanticId } from '@/shared/utils/semanticId';
import type { ThumbnailFocus } from '@/shared/utils/generationOutputRouter';
import type { CharacterStudioState } from '@/stores/characterStudioStore';
import type { AssetStudioState } from '@/stores/assetStudioStore';

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
 * Upload raw image bytes to Supabase Storage and return a public URL.
 * Returns null if upload fails (caller keeps original URL).
 */
async function uploadBlobToArcsBucket(blob: Blob): Promise<string | null> {
  if (!supabase) return null;
  const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const ext = extFromMime(mime);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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
  'Ensure Storage bucket "arcs-generations" exists and policies allow INSERT for your anon key; for display after refresh the bucket/objects must be publicly readable (or use signed URLs — not yet wired in the app).';

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
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id, imageUrl: finalImageUrl };
}
