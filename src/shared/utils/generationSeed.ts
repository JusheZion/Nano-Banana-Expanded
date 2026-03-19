/** Locked = reuse seed; Randomized = new seed each generate (default). */
export type SeedMode = 'locked' | 'randomized';

export function pickGenerationSeed(
  mode: SeedMode | undefined,
  current: number | null
): number {
  const m = mode ?? 'randomized';
  if (m === 'randomized') return Math.floor(Math.random() * 0xffffffff);
  return current ?? Math.floor(Math.random() * 0xffffffff);
}
