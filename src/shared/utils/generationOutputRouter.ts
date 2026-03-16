/**
 * Routes generated images to the correct archive by context.
 * Character Studio → Character Profiles (Reference Album).
 * Assets Studio → Comics & Story Archive (Related Album).
 * Until backend exists, persist to localStorage per context.
 */
import type { GenerationContextType } from '@/data/systemPrompts';

const STORAGE_KEY_CHARACTER = 'arcs_generations_character';
const STORAGE_KEY_ASSET = 'arcs_generations_asset';

export interface StoredGeneration {
  id: string;
  url: string; // data URL or blob URL
  createdAt: number;
  seed?: number; // optional, for expansion/gallery consistency
  profileName?: string; // character: album grouping when Supabase not used
  collectionName?: string; // asset: album grouping when Supabase not used
}

function getStorageKey(contextType: GenerationContextType): string {
  return contextType === 'character' ? STORAGE_KEY_CHARACTER : STORAGE_KEY_ASSET;
}

export function saveGeneration(
  contextType: GenerationContextType,
  urlOrBlob: string,
  seed?: number,
  options?: { profileName?: string; collectionName?: string }
): void {
  const key = getStorageKey(contextType);
  const raw = localStorage.getItem(key);
  const list: StoredGeneration[] = raw ? JSON.parse(raw) : [];
  list.push({
    id: crypto.randomUUID(),
    url: urlOrBlob,
    createdAt: Date.now(),
    ...(seed != null && { seed }),
    ...(contextType === 'character' &&
      options?.profileName != null && { profileName: options.profileName }),
    ...(contextType === 'asset' &&
      options?.collectionName != null && { collectionName: options.collectionName }),
  });
  localStorage.setItem(key, JSON.stringify(list));
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
