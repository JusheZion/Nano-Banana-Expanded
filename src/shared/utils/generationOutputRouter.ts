/**
 * Routes generated images to the correct archive by context.
 * Character Studio → Character Profiles (Reference Album).
 * Assets Studio → Comics & Story Archive (Related Album).
 * Until backend exists, persist to localStorage per context.
 */
import type { GenerationContextType } from '@/data/systemPrompts';

const STORAGE_KEY_CHARACTER = 'arcs_generations_character';
const STORAGE_KEY_ASSET = 'arcs_generations_asset';
const STORAGE_KEY_SUPPORTING = 'arcs_generations_supporting_reference';

/** Archive card crop (Character Archive); optional per saved generation. */
export type ThumbnailFocus = { x: number; y: number; scale: number };

export interface StoredGeneration {
  id: string;
  url: string; // data URL or blob URL
  createdAt: number;
  seed?: number; // optional, for expansion/gallery consistency
  profileName?: string; // character: album grouping when Supabase not used
  castName?: string;
  collectionName?: string; // asset: album grouping when Supabase not used
  /** Local-only asset card title (Supabase uses asset_name). */
  assetName?: string;
  /** Local-only NPC Vault label (supporting references). */
  supportingLabel?: string;
  thumbnailFocus?: ThumbnailFocus;
}

function getStorageKey(contextType: GenerationContextType): string {
  if (contextType === 'character') return STORAGE_KEY_CHARACTER;
  if (contextType === 'asset') return STORAGE_KEY_ASSET;
  return STORAGE_KEY_SUPPORTING;
}

export function saveGeneration(
  contextType: GenerationContextType,
  urlOrBlob: string,
  seed?: number,
  options?: {
    profileName?: string;
    collectionName?: string;
    assetName?: string;
    castName?: string;
    supportingLabel?: string;
  }
): void {
  const key = getStorageKey(contextType);
  try {
    const raw = localStorage.getItem(key);
    const list: StoredGeneration[] = raw ? JSON.parse(raw) : [];
    list.push({
      id: crypto.randomUUID(),
      url: urlOrBlob,
      createdAt: Date.now(),
      ...(seed != null && { seed }),
      ...(contextType === 'character' &&
        options?.profileName != null && { profileName: options.profileName }),
      ...(contextType === 'character' &&
        options?.castName != null &&
        options.castName.trim() !== '' && { castName: options.castName.trim() }),
      ...(contextType === 'asset' &&
        options?.collectionName != null && { collectionName: options.collectionName }),
      ...(contextType === 'asset' &&
        options?.assetName != null &&
        options.assetName.trim() !== '' && { assetName: options.assetName.trim() }),
      ...(contextType === 'supporting_reference' &&
        options?.supportingLabel != null &&
        options.supportingLabel.trim() !== '' && { supportingLabel: options.supportingLabel.trim() }),
    });
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Swallow localStorage quota/JSON errors so they don't block Supabase persistence.
  }
}

export function getGenerations(contextType: GenerationContextType): StoredGeneration[] {
  const raw = localStorage.getItem(getStorageKey(contextType));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function updateCharacterGenerationThumbnailFocus(
  id: string,
  focus: ThumbnailFocus
): boolean {
  const key = getStorageKey('character');
  try {
    const raw = localStorage.getItem(key);
    const list: StoredGeneration[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((g) => g.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], thumbnailFocus: { ...focus } };
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function updateAssetGenerationThumbnailFocus(
  id: string,
  focus: ThumbnailFocus
): boolean {
  const key = getStorageKey('asset');
  try {
    const raw = localStorage.getItem(key);
    const list: StoredGeneration[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((g) => g.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], thumbnailFocus: { ...focus } };
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

const UNNAMED = 'Unnamed';

function characterProfileKey(g: StoredGeneration): string {
  const p = g.profileName?.trim();
  return p ? p : UNNAMED;
}

function collectionKey(g: StoredGeneration): string {
  const c = g.collectionName?.trim();
  return c ? c : UNNAMED;
}

function writeList(context: GenerationContextType, list: StoredGeneration[]): void {
  try {
    localStorage.setItem(getStorageKey(context), JSON.stringify(list));
  } catch {
    /* quota */
  }
}

/** Rename every character generation in one profile (local vault). */
export function renameCharacterProfileLocal(fromDisplay: string, toDisplay: string): boolean {
  const from =
    !fromDisplay || fromDisplay.trim() === '' || fromDisplay === UNNAMED
      ? UNNAMED
      : fromDisplay.trim();
  const to =
    !toDisplay || toDisplay.trim() === '' || toDisplay === UNNAMED
      ? UNNAMED
      : toDisplay.trim();
  if (from === to) return true;
  const list = getGenerations('character');
  let changed = false;
  const next = list.map((g) => {
    if (characterProfileKey(g) !== from) return g;
    changed = true;
    return { ...g, profileName: to === UNNAMED ? undefined : to };
  });
  if (changed) writeList('character', next);
  return changed;
}

export function moveCharacterToProfileLocal(
  id: string,
  targetProfileDisplay: string
): boolean {
  const to =
    !targetProfileDisplay || targetProfileDisplay.trim() === '' || targetProfileDisplay === UNNAMED
      ? UNNAMED
      : targetProfileDisplay.trim();
  const list = getGenerations('character');
  const idx = list.findIndex((g) => g.id === id);
  if (idx === -1) return false;
  list[idx] = {
    ...list[idx],
    profileName: to === UNNAMED ? undefined : to,
  };
  writeList('character', list);
  return true;
}

export function updateCharacterCastNameLocal(id: string, castName: string | null): boolean {
  const list = getGenerations('character');
  const idx = list.findIndex((g) => g.id === id);
  if (idx === -1) return false;
  const t = castName?.trim();
  list[idx] = { ...list[idx], ...(t ? { castName: t } : { castName: undefined }) };
  writeList('character', list);
  return true;
}

export function deleteCharacterGenerationLocal(id: string): boolean {
  const list = getGenerations('character');
  const next = list.filter((g) => g.id !== id);
  if (next.length === list.length) return false;
  writeList('character', next);
  return true;
}

export function deleteCharacterProfileLocal(profileDisplay: string): number {
  const key =
    !profileDisplay || profileDisplay.trim() === '' || profileDisplay === UNNAMED
      ? UNNAMED
      : profileDisplay.trim();
  const list = getGenerations('character');
  const next = list.filter((g) => characterProfileKey(g) !== key);
  const n = list.length - next.length;
  if (n > 0) writeList('character', next);
  return n;
}

export function renameAssetCollectionLocal(fromDisplay: string, toDisplay: string): boolean {
  const from =
    !fromDisplay || fromDisplay.trim() === '' || fromDisplay === UNNAMED
      ? UNNAMED
      : fromDisplay.trim();
  const to =
    !toDisplay || toDisplay.trim() === '' || toDisplay === UNNAMED
      ? UNNAMED
      : toDisplay.trim();
  if (from === to) return true;
  const list = getGenerations('asset');
  let changed = false;
  const next = list.map((g) => {
    if (collectionKey(g) !== from) return g;
    changed = true;
    return { ...g, collectionName: to === UNNAMED ? undefined : to };
  });
  if (changed) writeList('asset', next);
  return changed;
}

export function moveAssetToCollectionLocal(id: string, targetCollection: string): boolean {
  const to =
    !targetCollection || targetCollection.trim() === '' || targetCollection === UNNAMED
      ? UNNAMED
      : targetCollection.trim();
  const list = getGenerations('asset');
  const idx = list.findIndex((g) => g.id === id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], collectionName: to === UNNAMED ? undefined : to };
  writeList('asset', list);
  return true;
}

export function updateAssetNameLocal(id: string, assetName: string | null): boolean {
  const list = getGenerations('asset');
  const idx = list.findIndex((g) => g.id === id);
  if (idx === -1) return false;
  const name = assetName?.trim();
  list[idx] = {
    ...list[idx],
    ...(name ? { assetName: name } : { assetName: undefined }),
  };
  writeList('asset', list);
  return true;
}

export function deleteAssetGenerationLocal(id: string): boolean {
  const prev = getGenerations('asset');
  const list = prev.filter((g) => g.id !== id);
  if (list.length === prev.length) return false;
  writeList('asset', list);
  return true;
}

export function deleteAssetCollectionLocal(collectionDisplay: string): number {
  const key =
    !collectionDisplay || collectionDisplay.trim() === '' || collectionDisplay === UNNAMED
      ? UNNAMED
      : collectionDisplay.trim();
  const list = getGenerations('asset');
  const next = list.filter((g) => collectionKey(g) !== key);
  const n = list.length - next.length;
  if (n > 0) writeList('asset', next);
  return n;
}

export function deleteSupportingReferenceGenerationLocal(id: string): boolean {
  const prev = getGenerations('supporting_reference');
  const list = prev.filter((g) => g.id !== id);
  if (list.length === prev.length) return false;
  writeList('supporting_reference', list);
  return true;
}
