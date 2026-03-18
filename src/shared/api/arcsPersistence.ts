/**
 * ARCS persistence: save characters and assets to Supabase with semantic IDs and metadata_tags.
 * Falls back to no-op when Supabase is not configured (generationOutputRouter still handles localStorage).
 */
import { supabase, isSupabaseConfigured, getSupabaseDiagnostic } from '@/shared/lib/supabase';
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

async function uploadImageIfDataUrl(url: string): Promise<string> {
  if (!url.startsWith('data:')) return url;
  if (!supabase) return url;
  const blob = dataUrlToBlob(url);
  if (!blob) return url;
  const ext = url.startsWith('data:image/png') ? 'png' : 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });
  if (error) {
    // #region agent log
    fetch('http://127.0.0.1:7503/ingest/38906f41-21ab-4611-a211-2685b306cf1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2f6fd'},body:JSON.stringify({sessionId:'a2f6fd',location:'arcsPersistence.ts:uploadImageIfDataUrl:storageError',message:'Storage upload failed, storing data URL',data:{error:error.message},timestamp:Date.now(),hypothesisId:'img1'})}).catch(()=>{});
    // #endregion
    return url;
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
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
  const imageUrl = store.currentLiveImageUrl;
  if (!imageUrl) return { ok: false, error: 'No image to save' };

  const { data: rows } = await supabase.from('characters').select('id').limit(5000);
  const existingIds = (rows ?? []).map((r) => r.id);
  const id = generateSemanticId('CHAR', baseName, existingIds);

  const finalImageUrl = await uploadImageIfDataUrl(imageUrl);
  // #region agent log
  fetch('http://127.0.0.1:7503/ingest/38906f41-21ab-4611-a211-2685b306cf1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2f6fd'},body:JSON.stringify({sessionId:'a2f6fd',location:'arcsPersistence.ts:saveCharacterToDb:finalUrl',message:'Image URL to store',data:{isDataUrl:finalImageUrl.startsWith('data:'),len:finalImageUrl.length,prefix:finalImageUrl.slice(0,50)},timestamp:Date.now(),hypothesisId:'img2'})}).catch(()=>{});
  // #endregion
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
    if (error.message?.includes('Invalid API key')) {
      const diag = getSupabaseDiagnostic();
      fetch('http://127.0.0.1:7503/ingest/38906f41-21ab-4611-a211-2685b306cf1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2f6fd'},body:JSON.stringify({sessionId:'a2f6fd',location:'arcsPersistence.ts:saveCharacterToDb:invalidKey',message:'Invalid API key diagnostic',data:{urlPresent:diag.urlPresent,anonKeyLength:diag.anonKeyLength},timestamp:Date.now(),hypothesisId:'apikey'})}).catch(()=>{});
    }
    return { ok: false, error: error.message };
  }
  // #region agent log
  fetch('http://127.0.0.1:7503/ingest/38906f41-21ab-4611-a211-2685b306cf1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2f6fd'},body:JSON.stringify({sessionId:'a2f6fd',location:'arcsPersistence.ts:saveCharacterToDb:insertOk',message:'Character insert success',data:{id,imageUrlLen:finalImageUrl.length},timestamp:Date.now(),hypothesisId:'img3'})}).catch(()=>{});
  // #endregion
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

  const finalImageUrl = await uploadImageIfDataUrl(imageUrl);
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
