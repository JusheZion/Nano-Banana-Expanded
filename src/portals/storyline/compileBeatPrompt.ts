import type { DirectorSettings, ProductionCastMember, StoryBeat } from '@/portals/storyline/storylineTypes';

/**
 * Merge beat visual prompt with linked cast consistency lines for image generation.
 */
export function compileVisualPromptForBeat(
  beat: StoryBeat,
  cast: ProductionCastMember[],
  settings: DirectorSettings
): string {
  let prompt = beat.visualPrompt.trim();
  const linked = cast.filter((c) => beat.linkedVaultCharacterIds.includes(c.vaultCharacterId));
  if (linked.length > 0 && settings.strictWardrobeLock) {
    const lines = linked.map((c) =>
      c.tagSummary
        ? `Character lock (${c.displayName}): ${c.tagSummary}`
        : `Character lock: match wardrobe and likeness for "${c.displayName}" from references.`
    );
    prompt = `${prompt}\n\n${lines.join('\n')}`.trim();
  }
  return prompt;
}
