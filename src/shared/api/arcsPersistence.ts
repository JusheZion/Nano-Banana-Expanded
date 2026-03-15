/**
 * ARCS persistence: save characters and assets to Supabase with semantic IDs and metadata_tags.
 * Falls back to no-op when Supabase is not configured (generationOutputRouter still handles localStorage).
 */
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { generateSemanticId } from '@/shared/utils/semanticId';
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
  if (error) return url;
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
  error?: string;
}

export async function saveCharacterToDb(
  store: CharacterStudioState,
  baseName: string = 'character'
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
  const metadataTags = buildCharacterMetadataTags(store);
  const seed = store.currentGenerationSeed != null ? Number(store.currentGenerationSeed) : null;

  const { error } = await supabase.from('characters').insert({
    id,
    metadata_tags: metadataTags,
    seed,
    image_url: finalImageUrl,
    name: baseName !== 'character' ? baseName : null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id };
}

export interface SaveAssetResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function saveAssetToDb(
  store: AssetStudioState,
  baseName: string = 'asset'
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
    name: baseName !== 'asset' ? baseName : null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id };
}
