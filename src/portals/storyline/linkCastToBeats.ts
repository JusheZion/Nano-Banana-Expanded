import type { ProductionCastMember, StoryBeat } from '@/portals/storyline/storylineTypes';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * If beat text contains a cast display name (word boundary), link that vault id.
 */
export function linkCastNamesToBeats(
  beats: StoryBeat[],
  cast: ProductionCastMember[]
): StoryBeat[] {
  if (cast.length === 0) return beats;

  return beats.map((beat) => {
    const haystack = `${beat.text} ${beat.visualPrompt}`.toLowerCase();
    const ids = new Set(beat.linkedVaultCharacterIds);
    for (const c of cast) {
      const name = c.displayName.trim();
      if (name.length < 2) continue;
      const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i');
      if (re.test(haystack)) {
        ids.add(c.vaultCharacterId);
      }
    }
    return { ...beat, linkedVaultCharacterIds: [...ids] };
  });
}
