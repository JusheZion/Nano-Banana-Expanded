import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  getGenerations,
  updateAssetGenerationThumbnailFocus,
  renameAssetCollectionLocal,
  moveAssetToCollectionLocal,
  updateAssetNameLocal,
  deleteAssetGenerationLocal,
  deleteAssetCollectionLocal,
} from '@/shared/utils/generationOutputRouter';
import type { ThumbnailFocus } from '@/shared/utils/generationOutputRouter';

export type VaultAssetItem = {
  id: string;
  image_url: string;
  collection_name?: string | null;
  asset_name?: string | null;
  name?: string | null;
  seed?: number | null;
  created_at?: string | null;
  /** Archive thumbnail focus (0–100) and scale (>0). Derived from `metadata_tags.archive_thumbnail` when online. */
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_scale?: number | null;
};

export type VaultAssetAlbum = {
  collectionName: string;
  items: VaultAssetItem[];
};

const UNNAMED_KEY = 'Unnamed';

function normalizeCollectionKey(name: string | null | undefined): string {
  const t = typeof name === 'string' ? name.trim() : '';
  return t.length > 0 ? t : UNNAMED_KEY;
}

function groupAssetAlbums(items: VaultAssetItem[]): VaultAssetAlbum[] {
  const by: Record<string, VaultAssetItem[]> = {};
  for (const it of items) {
    const k = normalizeCollectionKey(it.collection_name);
    if (!by[k]) by[k] = [];
    by[k].push(it);
  }
  const albums: VaultAssetAlbum[] = Object.entries(by).map(([collectionName, list]) => ({
    collectionName,
    items: list,
  }));
  albums.sort((a, b) => {
    if (a.collectionName === UNNAMED_KEY && b.collectionName !== UNNAMED_KEY) return 1;
    if (b.collectionName === UNNAMED_KEY && a.collectionName !== UNNAMED_KEY) return -1;
    return a.collectionName.localeCompare(b.collectionName);
  });
  return albums;
}

export async function getAssetAlbums(): Promise<VaultAssetAlbum[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('assets')
      .select('id, image_url, collection_name, asset_name, name, seed, created_at, metadata_tags');
    if (!error && data && data.length > 0) {
      const list = (data ?? []).map((raw) => {
        const row = raw as Record<string, unknown>;
        const mt = row.metadata_tags as Record<string, unknown> | null | undefined;
        const at = mt?.archive_thumbnail as
          | { x?: number; y?: number; scale?: number }
          | undefined;
        const hasThumb =
          at &&
          (typeof at.x === 'number' ||
            typeof at.y === 'number' ||
            typeof at.scale === 'number');
        const base: VaultAssetItem = {
          id: row.id as string,
          image_url: row.image_url as string,
          collection_name: (row.collection_name as string | null) ?? null,
          asset_name: (row.asset_name as string | null) ?? null,
          name: (row.name as string | null) ?? null,
          seed: (row.seed as number | null) ?? null,
          created_at: (row.created_at as string | null) ?? null,
        };
        return hasThumb
          ? {
              ...base,
              thumbnail_focus_x: typeof at!.x === 'number' ? at!.x! : 50,
              thumbnail_focus_y: typeof at!.y === 'number' ? at!.y! : 50,
              thumbnail_scale: typeof at!.scale === 'number' ? at!.scale! : 1,
            }
          : base;
      }) as VaultAssetItem[];
      return groupAssetAlbums(list);
    }
  }

  const gens = getGenerations('asset');
  const items: VaultAssetItem[] = gens.map((g) => ({
    id: g.id,
    image_url: g.url,
    collection_name: g.collectionName ?? null,
    asset_name: g.assetName ?? null,
    name: g.assetName ?? null,
    seed: g.seed ?? null,
    created_at: new Date(g.createdAt).toISOString(),
    thumbnail_focus_x: g.thumbnailFocus?.x ?? null,
    thumbnail_focus_y: g.thumbnailFocus?.y ?? null,
    thumbnail_scale: g.thumbnailFocus?.scale ?? null,
  }));
  return groupAssetAlbums(items);
}

export async function updateAssetThumbnailFocus(args: {
  id: string;
  focus: ThumbnailFocus;
}): Promise<MutOk> {
  if (await assetVaultUsesSupabase()) {
    // Mirror character behavior: patch metadata_tags.archive_thumbnail.
    const { data: row, error: fetchErr } = await supabase!
      .from('assets')
      .select('metadata_tags')
      .eq('id', args.id)
      .maybeSingle();
    if (fetchErr) return { ok: false, error: fetchErr.message };
    if (!row) return { ok: false, error: 'Asset not found' };
    const prev =
      row.metadata_tags &&
      typeof row.metadata_tags === 'object' &&
      !Array.isArray(row.metadata_tags)
        ? { ...(row.metadata_tags as Record<string, unknown>) }
        : {};
    prev.archive_thumbnail = {
      x: args.focus.x,
      y: args.focus.y,
      scale: args.focus.scale,
    };
    const { error } = await supabase!
      .from('assets')
      .update({ metadata_tags: prev })
      .eq('id', args.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const ok = updateAssetGenerationThumbnailFocus(args.id, args.focus);
  return ok ? { ok: true } : { ok: false, error: 'Asset not found in local archive' };
}

type MutOk = { ok: true } | { ok: false; error: string };

async function assetVaultUsesSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { data, error } = await supabase.from('assets').select('id').limit(1);
  return !error && Boolean(data && data.length > 0);
}

export async function renameVaultAssetCollection(
  fromDisplay: string,
  toDisplay: string
): Promise<MutOk> {
  const fromK = normalizeCollectionKey(fromDisplay);
  const toK = normalizeCollectionKey(toDisplay);
  if (fromK === toK) return { ok: true };
  const newCol = toK === UNNAMED_KEY ? null : toK;

  if (await assetVaultUsesSupabase()) {
    const base = supabase!.from('assets').update({ collection_name: newCol });
    const { error } =
      fromK === UNNAMED_KEY
        ? await base.is('collection_name', null)
        : await base.eq('collection_name', fromK);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  renameAssetCollectionLocal(fromDisplay, toDisplay);
  return { ok: true };
}

export async function moveVaultAssetToCollection(args: {
  id: string;
  targetCollectionDisplay: string;
}): Promise<MutOk> {
  const dest = normalizeCollectionKey(args.targetCollectionDisplay);
  const col = dest === UNNAMED_KEY ? null : dest;

  if (await assetVaultUsesSupabase()) {
    const { error } = await supabase!
      .from('assets')
      .update({ collection_name: col })
      .eq('id', args.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const ok = moveAssetToCollectionLocal(args.id, args.targetCollectionDisplay);
  return ok ? { ok: true } : { ok: false, error: 'Asset not found in local archive' };
}

export async function updateVaultAssetNames(args: {
  id: string;
  assetName: string | null;
}): Promise<MutOk> {
  const assetName = args.assetName?.trim() || null;
  const displayName = assetName;

  if (await assetVaultUsesSupabase()) {
    const { error } = await supabase!
      .from('assets')
      .update({ asset_name: assetName, name: displayName })
      .eq('id', args.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const ok = updateAssetNameLocal(args.id, assetName);
  return ok ? { ok: true } : { ok: false, error: 'Asset not found in local archive' };
}

export async function deleteVaultAsset(id: string): Promise<MutOk> {
  if (await assetVaultUsesSupabase()) {
    const { error } = await supabase!.from('assets').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const ok = deleteAssetGenerationLocal(id);
  return ok ? { ok: true } : { ok: false, error: 'Asset not found in local archive' };
}

export async function deleteVaultAssetCollection(collectionDisplay: string): Promise<MutOk> {
  const key = normalizeCollectionKey(collectionDisplay);
  if (await assetVaultUsesSupabase()) {
    const base = supabase!.from('assets').delete();
    const { error } =
      key === UNNAMED_KEY
        ? await base.is('collection_name', null)
        : await base.eq('collection_name', key);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  deleteAssetCollectionLocal(collectionDisplay);
  return { ok: true };
}

export async function listAssetCollectionKeys(): Promise<string[]> {
  const albums = await getAssetAlbums();
  return albums.map((a) => a.collectionName);
}

const ASSET_MERGE_SKIP_KEY = 'arcs_asset_vault_merge_confirm_skip';

export function assetVaultMergeConfirmSkipped(): boolean {
  try {
    return localStorage.getItem(ASSET_MERGE_SKIP_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAssetVaultMergeConfirmSkipped(skip: boolean): void {
  try {
    if (skip) localStorage.setItem(ASSET_MERGE_SKIP_KEY, '1');
    else localStorage.removeItem(ASSET_MERGE_SKIP_KEY);
  } catch {
    /* ignore */
  }
}
