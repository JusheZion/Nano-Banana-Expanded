/**
 * Lightweight recent generations cache (Supabase URLs only).
 * Survives refresh; stays small to avoid localStorage quota.
 */

export type RecentKind = 'character' | 'asset';

export interface RecentGeneration {
  id: string;
  kind: RecentKind;
  imageUrl: string;
  profileName?: string;
  collectionName?: string;
  displayName?: string;
  seed?: number | null;
  savedAt: number;
}

const RECENT_KEY = 'arcs_recent_generations_v1';
const MAX_RECENT = 12;

function isRecentGeneration(value: unknown): value is RecentGeneration {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<RecentGeneration>;
  return (
    typeof item.id === 'string' &&
    (item.kind === 'character' || item.kind === 'asset') &&
    typeof item.imageUrl === 'string' &&
    item.imageUrl.length > 0 &&
    typeof item.savedAt === 'number'
  );
}

function loadRecentList(): RecentGeneration[] {
  const raw = localStorage.getItem(RECENT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentGeneration);
  } catch {
    return [];
  }
}

function saveRecentList(list: RecentGeneration[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Quota or private mode; Supabase save still succeeded.
  }
}

export function addRecentFromCharacter(row: {
  id: string;
  image_url: string;
  profile_name?: string | null;
  cast_name?: string | null;
  seed?: number | null;
}): void {
  const item: RecentGeneration = {
    id: row.id,
    kind: 'character',
    imageUrl: row.image_url,
    profileName: row.profile_name ?? undefined,
    displayName: row.cast_name ?? row.profile_name ?? undefined,
    seed: row.seed ?? undefined,
    savedAt: Date.now(),
  };
  let list = loadRecentList();
  list = list.filter((g) => !(g.id === item.id && g.kind === 'character'));
  list.unshift(item);
  if (list.length > MAX_RECENT) list.length = MAX_RECENT;
  saveRecentList(list);
}

export function addRecentFromAsset(row: {
  id: string;
  image_url: string;
  collection_name?: string | null;
  asset_name?: string | null;
  seed?: number | null;
}): void {
  const item: RecentGeneration = {
    id: row.id,
    kind: 'asset',
    imageUrl: row.image_url,
    collectionName: row.collection_name ?? undefined,
    displayName: row.asset_name ?? row.collection_name ?? undefined,
    seed: row.seed ?? undefined,
    savedAt: Date.now(),
  };
  let list = loadRecentList();
  list = list.filter((g) => !(g.id === item.id && g.kind === 'asset'));
  list.unshift(item);
  if (list.length > MAX_RECENT) list.length = MAX_RECENT;
  saveRecentList(list);
}

export function getRecentGenerations(): RecentGeneration[] {
  return loadRecentList();
}

export function getRecentCharacters(): RecentGeneration[] {
  return getRecentGenerations().filter((g) => g.kind === 'character');
}

export function getRecentAssets(): RecentGeneration[] {
  return getRecentGenerations().filter((g) => g.kind === 'asset');
}

/** Remove recent entries whose image URL matches (e.g. after user deletes live image). */
export function removeRecentByImageUrl(imageUrl: string, kind: RecentKind): void {
  const list = loadRecentList().filter(
    (g) => !(g.imageUrl === imageUrl && g.kind === kind)
  );
  saveRecentList(list);
}
