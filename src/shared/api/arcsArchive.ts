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
      .select('id, image_url, name, cast_name, profile_name, seed');
    if (error) return {};
    const list = (rows ?? []) as CharacterArchiveItem[];
    const grouped: Record<string, CharacterArchiveItem[]> = {};
    for (const row of list) {
      const key = row.profile_name ?? 'Unnamed';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }
    return grouped;
  }
  const gens = getGenerations('character');
  const grouped: Record<string, CharacterArchiveItem[]> = {};
  for (const g of gens) {
    const key = g.profileName ?? 'Unnamed';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({
      id: g.id,
      image_url: g.url,
      name: undefined,
      cast_name: undefined,
      profile_name: g.profileName,
      seed: g.seed,
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
