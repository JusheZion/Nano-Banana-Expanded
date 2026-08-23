import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  getGenerations,
  renameCharacterProfileLocal,
  moveCharacterToProfileLocal,
  deleteCharacterGenerationLocal,
  deleteCharacterProfileLocal,
  updateCharacterCastNameLocal,
} from '@/shared/utils/generationOutputRouter';

export type VaultCharacterItem = {
  id: string;
  image_url: string;
  profile_name?: string | null;
  cast_name?: string | null;
  name?: string | null;
  seed?: number | null;
  created_at?: string | null;
  is_profile_cover?: boolean | null;
  /** Archive thumbnail focus (0–100) and scale (>0). Derived from `metadata_tags.archive_thumbnail` when online. */
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_scale?: number | null;
};

export type VaultCharacterAlbum = {
  profileName: string; // "Unnamed" when null
  items: VaultCharacterItem[];
  coverId: string | null;
};

const UNNAMED_KEY = 'Unnamed';

function normalizeProfileKey(profileName: string | null | undefined): string {
  const trimmed = typeof profileName === 'string' ? profileName.trim() : '';
  return trimmed.length > 0 ? trimmed : UNNAMED_KEY;
}

function coverStorageKey(profileKey: string): string {
  return `arcs_cover_${profileKey}`;
}

function parseCoverIdFromStorage(profileKey: string): string | null {
  try {
    return localStorage.getItem(coverStorageKey(profileKey));
  } catch {
    return null;
  }
}

function writeCoverIdToStorage(profileKey: string, id: string): void {
  try {
    localStorage.setItem(coverStorageKey(profileKey), id);
  } catch {
    // ignore quota / disabled storage
  }
}

function getNewestItemId(items: VaultCharacterItem[]): string | null {
  if (items.length === 0) return null;
  const sorted = [...items].sort((a, b) => {
    const at = a.created_at ? Date.parse(a.created_at) : 0;
    const bt = b.created_at ? Date.parse(b.created_at) : 0;
    return bt - at;
  });
  return sorted[0]?.id ?? null;
}

export function selectCoverIdForAlbum(args: {
  profileKey: string;
  items: VaultCharacterItem[];
  persistedCoverId?: string | null;
}): string | null {
  const { profileKey, items } = args;
  if (items.length === 0) return null;

  const dbCover = items.find((it) => it.is_profile_cover);
  if (dbCover?.id) return dbCover.id;

  const persisted = args.persistedCoverId ?? parseCoverIdFromStorage(profileKey);
  if (persisted && items.some((it) => it.id === persisted)) return persisted;

  return getNewestItemId(items);
}

function groupAlbums(items: VaultCharacterItem[]): VaultCharacterAlbum[] {
  const byProfile: Record<string, VaultCharacterItem[]> = {};
  for (const it of items) {
    const key = normalizeProfileKey(it.profile_name);
    if (!byProfile[key]) byProfile[key] = [];
    byProfile[key].push(it);
  }

  const albums: VaultCharacterAlbum[] = Object.entries(byProfile).map(([profileKey, list]) => {
    const coverId = selectCoverIdForAlbum({ profileKey, items: list });
    return { profileName: profileKey, items: list, coverId };
  });

  // stable, readable ordering: named profiles A-Z, Unnamed last
  albums.sort((a, b) => {
    if (a.profileName === UNNAMED_KEY && b.profileName !== UNNAMED_KEY) return 1;
    if (b.profileName === UNNAMED_KEY && a.profileName !== UNNAMED_KEY) return -1;
    return a.profileName.localeCompare(b.profileName);
  });

  return albums;
}

export async function getCharacterAlbums(): Promise<VaultCharacterAlbum[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      const { data, error } = await supabase
        .from('characters')
        .select(
          'id, image_url, profile_name, cast_name, name, seed, created_at, is_profile_cover, metadata_tags'
        );
      if (!error && data != null) {
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
          const base: VaultCharacterItem = {
            id: row.id as string,
            image_url: row.image_url as string,
            profile_name: (row.profile_name as string | null) ?? null,
            cast_name: (row.cast_name as string | null) ?? null,
            name: (row.name as string | null) ?? null,
            seed: (row.seed as number | null) ?? null,
            created_at: (row.created_at as string | null) ?? null,
            is_profile_cover: (row.is_profile_cover as boolean | null) ?? null,
          };
          return hasThumb
            ? {
                ...base,
                thumbnail_focus_x: typeof at!.x === 'number' ? at!.x! : 50,
                thumbnail_focus_y: typeof at!.y === 'number' ? at!.y! : 50,
                thumbnail_scale: typeof at!.scale === 'number' ? at!.scale! : 1,
              }
            : base;
        }) as VaultCharacterItem[];
        return groupAlbums(list);
      }
    }
  }

  const gens = getGenerations('character');
  const items: VaultCharacterItem[] = gens.map((g) => ({
    id: g.id,
    image_url: g.url,
    profile_name: g.profileName ?? null,
    cast_name: g.castName ?? null,
    name: null,
    seed: g.seed ?? null,
    created_at: new Date(g.createdAt).toISOString(),
    is_profile_cover: false,
    thumbnail_focus_x: g.thumbnailFocus?.x ?? null,
    thumbnail_focus_y: g.thumbnailFocus?.y ?? null,
    thumbnail_scale: g.thumbnailFocus?.scale ?? null,
  }));
  return groupAlbums(items);
}

export async function setProfileCover(args: {
  profileName: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const profileKey = normalizeProfileKey(args.profileName);

  if (isSupabaseConfigured() && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      // Swap semantics: clear all covers for the profile, then set the clicked id.
      // Note: "Unnamed" maps to NULL profile_name.
      const isUnnamed = profileKey === UNNAMED_KEY;

      const clearQuery = supabase.from('characters').update({ is_profile_cover: false });
      const clearResult = isUnnamed
        ? await clearQuery.is('profile_name', null)
        : await clearQuery.eq('profile_name', profileKey);
      if (clearResult.error) {
        return { ok: false, error: clearResult.error.message };
      }

      const { error: setErr } = await supabase
        .from('characters')
        .update({ is_profile_cover: true })
        .eq('id', args.id);
      if (setErr) return { ok: false, error: setErr.message };

      writeCoverIdToStorage(profileKey, args.id);
      return { ok: true };
    }
  }

  // Offline: store the generation id as the cover.
  writeCoverIdToStorage(profileKey, args.id);
  return { ok: true };
}

export const VAULT_MERGE_CONFIRM_SKIP_KEY = 'arcs_vault_merge_confirm_skip';

export function vaultMergeConfirmSkipped(): boolean {
  try {
    return localStorage.getItem(VAULT_MERGE_CONFIRM_SKIP_KEY) === '1';
  } catch {
    return false;
  }
}

export function setVaultMergeConfirmSkipped(skip: boolean): void {
  try {
    if (skip) localStorage.setItem(VAULT_MERGE_CONFIRM_SKIP_KEY, '1');
    else localStorage.removeItem(VAULT_MERGE_CONFIRM_SKIP_KEY);
  } catch {
    /* ignore */
  }
}

type VaultMutOk = { ok: true } | { ok: false; error: string };

async function getAuthenticatedCharacterVaultClient(): Promise<NonNullable<typeof supabase> | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session ? supabase : null;
}

/** Rename an entire profile (all rows). */
export async function renameVaultCharacterProfile(
  fromProfileDisplay: string,
  toProfileDisplay: string
): Promise<VaultMutOk> {
  const fromK = normalizeProfileKey(fromProfileDisplay);
  const toK = normalizeProfileKey(toProfileDisplay);
  if (fromK === toK) return { ok: true };
  const newProfile = toK === UNNAMED_KEY ? null : toK;

  const client = await getAuthenticatedCharacterVaultClient();
  if (client) {
    const base = client.from('characters').update({ profile_name: newProfile });
    const { error } =
      fromK === UNNAMED_KEY
        ? await base.is('profile_name', null)
        : await base.eq('profile_name', fromK);
    if (error) return { ok: false, error: error.message };
  } else {
    renameCharacterProfileLocal(fromProfileDisplay, toProfileDisplay);
  }

  const oldCover = parseCoverIdFromStorage(fromK);
  try {
    localStorage.removeItem(coverStorageKey(fromK));
  } catch {
    /* ignore */
  }
  if (oldCover && toK !== UNNAMED_KEY) writeCoverIdToStorage(toK, oldCover);
  return { ok: true };
}

/** Move one image to another profile; clears cover flag on the row (destination cover unchanged). */
export async function moveVaultCharacterToProfile(args: {
  id: string;
  targetProfileDisplay: string;
}): Promise<VaultMutOk> {
  const dest = normalizeProfileKey(args.targetProfileDisplay);
  const profileNameVal = dest === UNNAMED_KEY ? null : dest;

  const client = await getAuthenticatedCharacterVaultClient();
  if (client) {
    const { error } = await client.from('characters').update({
      profile_name: profileNameVal,
      is_profile_cover: false,
    }).eq('id', args.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const moved = moveCharacterToProfileLocal(args.id, args.targetProfileDisplay);
  return moved
    ? { ok: true }
    : { ok: false, error: 'Character not found in local archive' };
}

export async function updateVaultCharacterCastName(
  id: string,
  castName: string | null
): Promise<VaultMutOk> {
  const val = castName?.trim() || null;
  const client = await getAuthenticatedCharacterVaultClient();
  if (client) {
    const { error } = await client
      .from('characters')
      .update({ cast_name: val })
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const ok = updateCharacterCastNameLocal(id, val);
  return ok ? { ok: true } : { ok: false, error: 'Character not found in local archive' };
}

export async function deleteVaultCharacter(id: string): Promise<VaultMutOk> {
  const client = await getAuthenticatedCharacterVaultClient();
  if (client) {
    const { error } = await client.from('characters').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const ok = deleteCharacterGenerationLocal(id);
  return ok ? { ok: true } : { ok: false, error: 'Character not found in local archive' };
}

export async function deleteVaultCharacterProfile(
  profileDisplay: string
): Promise<VaultMutOk> {
  const key = normalizeProfileKey(profileDisplay);
  const client = await getAuthenticatedCharacterVaultClient();
  if (client) {
    const base = client.from('characters').delete();
    const { error } =
      key === UNNAMED_KEY
        ? await base.is('profile_name', null)
        : await base.eq('profile_name', key);
    if (error) return { ok: false, error: error.message };
  } else {
    deleteCharacterProfileLocal(profileDisplay);
  }
  try {
    localStorage.removeItem(coverStorageKey(key));
  } catch {
    /* ignore */
  }
  return { ok: true };
}

/** Album keys for merge confirmation (excluding source). */
export async function listCharacterProfileKeys(): Promise<string[]> {
  const albums = await getCharacterAlbums();
  return albums.map((a) => a.profileName);
}
