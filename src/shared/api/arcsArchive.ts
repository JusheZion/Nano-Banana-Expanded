/**
 * ARCS archive recall: fetch characters/assets grouped by profile or collection for the recall modal.
 * Uses Supabase when configured; otherwise groups from generationOutputRouter (localStorage).
 */
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { getGenerations } from '@/shared/utils/generationOutputRouter';

export type CharacterArchiveItem = {
  id: string;
  image_url: string;
  name?: string;
  cast_name?: string;
  profile_name?: string;
  seed?: number;
  /** 0–100; default 50 */
  thumbnail_focus_x?: number;
  thumbnail_focus_y?: number;
  /** 1 = neutral; >1 zoom in toward focus */
  thumbnail_scale?: number;
};

export type AssetArchiveItem = {
  id: string;
  image_url: string;
  name?: string;
  asset_name?: string;
  collection_name?: string;
  seed?: number;
};

/**
 * Characters grouped by profile_name (or "Unnamed" when null).
 * When Supabase is configured: fetch from characters table.
 * Otherwise: use getGenerations('character') and group by profileName.
 */
export async function getCharactersGroupedByProfile(): Promise<
  Record<string, CharacterArchiveItem[]>
> {
  if (isSupabaseConfigured() && supabase) {
    const { data: rows, error } = await supabase
      .from('characters')
      .select('id, image_url, name, cast_name, profile_name, seed, metadata_tags');
    if (error || rows == null) return {};
    const grouped: Record<string, CharacterArchiveItem[]> = {};
    for (const raw of rows) {
      const row = raw as Record<string, unknown>;
      const mt = row.metadata_tags as Record<string, unknown> | null | undefined;
      const at = mt?.archive_thumbnail as
        | { x?: number; y?: number; scale?: number }
        | undefined;
      const key = (row.profile_name as string | null) ?? 'Unnamed';
      if (!grouped[key]) grouped[key] = [];
      const hasThumb =
        at &&
        (typeof at.x === 'number' ||
          typeof at.y === 'number' ||
          typeof at.scale === 'number');
      const item: CharacterArchiveItem = {
        id: row.id as string,
        image_url: row.image_url as string,
        name: row.name as string | undefined,
        cast_name: row.cast_name as string | undefined,
        profile_name: row.profile_name as string | undefined,
        seed: row.seed as number | undefined,
        ...(hasThumb && {
          thumbnail_focus_x: typeof at!.x === 'number' ? at!.x! : 50,
          thumbnail_focus_y: typeof at!.y === 'number' ? at!.y! : 50,
          thumbnail_scale: typeof at!.scale === 'number' ? at!.scale! : 1,
        }),
      };
      grouped[key].push(item);
    }
    return grouped;
  }
  const gens = getGenerations('character');
  const grouped: Record<string, CharacterArchiveItem[]> = {};
  for (const g of gens) {
    const key = g.profileName ?? 'Unnamed';
    if (!grouped[key]) grouped[key] = [];
    const tf = g.thumbnailFocus;
    grouped[key].push({
      id: g.id,
      image_url: g.url,
      name: undefined,
      cast_name: undefined,
      profile_name: g.profileName,
      seed: g.seed,
      ...(tf && {
        thumbnail_focus_x: tf.x,
        thumbnail_focus_y: tf.y,
        thumbnail_scale: tf.scale,
      }),
    });
  }
  return grouped;
}

/**
 * Assets grouped by collection_name (or "Unnamed" when null).
 * When Supabase is configured: fetch from assets table.
 * Otherwise: use getGenerations('asset') and group by collectionName.
 */
export async function getAssetsGroupedByCollection(): Promise<
  Record<string, AssetArchiveItem[]>
> {
  if (isSupabaseConfigured() && supabase) {
    const { data: rows, error } = await supabase
      .from('assets')
      .select('id, image_url, name, asset_name, collection_name, seed');
    if (error) return {};
    const list = (rows ?? []) as AssetArchiveItem[];
    const grouped: Record<string, AssetArchiveItem[]> = {};
    for (const row of list) {
      const key = row.collection_name ?? 'Unnamed';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }
    return grouped;
  }
  const gens = getGenerations('asset');
  const grouped: Record<string, AssetArchiveItem[]> = {};
  for (const g of gens) {
    const key = g.collectionName ?? 'Unnamed';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({
      id: g.id,
      image_url: g.url,
      name: undefined,
      asset_name: undefined,
      collection_name: g.collectionName,
      seed: g.seed,
    });
  }
  return grouped;
}
