/**
 * Stale-while-revalidate: in-memory cache of last 10 generations per studio.
 * Session-only; not persisted across reloads.
 */
import type { GenerationContextType } from '@/data/systemPrompts';

const MAX_PER_CONTEXT = 10;

interface CachedItem {
  id: string;
  url: string;
  seed?: number;
  timestamp: number;
}

const cache: Record<GenerationContextType, CachedItem[]> = {
  character: [],
  asset: [],
};

export function getCachedGenerations(contextType: GenerationContextType): CachedItem[] {
  return [...cache[contextType]];
}

export function addCachedGeneration(
  contextType: GenerationContextType,
  item: Omit<CachedItem, 'id' | 'timestamp'>
): void {
  const list = cache[contextType];
  const entry: CachedItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  list.unshift(entry);
  if (list.length > MAX_PER_CONTEXT) list.length = MAX_PER_CONTEXT;
}
