/**
 * Routes generated images to the correct archive by context.
 * Character Studio → Character Profiles (Reference Album).
 * Assets Studio → Comics & Story Archive (Related Album).
 * Until backend exists, persist to localStorage per context.
 */
import type { GenerationContextType } from '@/data/systemPrompts';

const STORAGE_KEY_CHARACTER = 'arcs_generations_character';
const STORAGE_KEY_ASSET = 'arcs_generations_asset';

/** Archive card crop (Character Archive); optional per saved generation. */
export type ThumbnailFocus = { x: number; y: number; scale: number };

export interface StoredGeneration {
  id: string;
  url: string; // data URL or blob URL
  createdAt: number;
  seed?: number; // optional, for expansion/gallery consistency
  profileName?: string; // character: album grouping when Supabase not used
  collectionName?: string; // asset: album grouping when Supabase not used
  thumbnailFocus?: ThumbnailFocus;
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
      ...(contextType === 'asset' &&
        options?.collectionName != null && { collectionName: options.collectionName }),
    });
    localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7503/ingest/38906f41-21ab-4611-a211-2685b306cf1c', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'a2f6fd',
      },
      body: JSON.stringify({
        sessionId: 'a2f6fd',
        location: 'generationOutputRouter.ts:saveGeneration:catch',
        message: 'Failed to persist generation to localStorage',
        data: {
          contextType,
          errorMessage: err instanceof Error ? err.message : String(err),
        },
        timestamp: Date.now(),
        hypothesisId: 'quota',
      }),
    }).catch(() => {});
    // #endregion
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
