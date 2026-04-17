import { describe, it, expect } from 'vitest';
import { linkCastNamesToBeats } from '@/portals/storyline/linkCastToBeats';
import { parseJsonFromModel } from '@/portals/storyline/parseDirectorJson';
import { buildStorylineReferenceSlots } from '@/portals/storyline/buildStorylineReferenceSlots';
import type { ProductionCastMember, StoryBeat } from '@/portals/storyline/storylineTypes';

function beat(id: string, text: string, visual = ''): StoryBeat {
  return {
    id,
    kind: 'narrative',
    text,
    durationSec: 5,
    visualPrompt: visual,
    camera: { shot: '', angle: '', movement: '' },
    tone: '',
    audio: { dialogue: '', sfx: '' },
    linkedVaultCharacterIds: [],
    linkedVaultAssetIds: [],
    linkedSupportingRefIds: [],
    tags: [],
    imageUrl: null,
    interpolation: null,
    generationStatus: 'idle',
    generationMessage: null,
    seed: null,
    aspectRatio: '9:16',
  };
}

describe('linkCastNamesToBeats', () => {
  it('links vault id when display name appears in beat text', () => {
    const cast: ProductionCastMember[] = [
      {
        vaultCharacterId: 'v1',
        profileName: 'Hero',
        castName: 'Jordan',
        displayName: 'Jordan',
        imageUrl: 'https://x',
        tagSummary: '',
      },
    ];
    const beats = [beat('b1', 'Jordan enters the room.')];
    const out = linkCastNamesToBeats(beats, cast);
    expect(out[0]!.linkedVaultCharacterIds).toContain('v1');
  });

  it('does not partial-match inside longer words', () => {
    const cast: ProductionCastMember[] = [
      {
        vaultCharacterId: 'v1',
        profileName: 'X',
        castName: null,
        displayName: 'Ann',
        imageUrl: 'https://x',
        tagSummary: '',
      },
    ];
    const beats = [beat('b1', 'Annie said hello.')];
    const out = linkCastNamesToBeats(beats, cast);
    expect(out[0]!.linkedVaultCharacterIds).not.toContain('v1');
  });
});

describe('parseJsonFromModel', () => {
  it('parses fenced JSON', () => {
    const raw = '```json\n{"cleanedText":"hello"}\n```';
    expect(parseJsonFromModel<{ cleanedText: string }>(raw)?.cleanedText).toBe('hello');
  });
});

describe('buildStorylineReferenceSlots', () => {
  it('fills slots in order up to 14', () => {
    const cast: ProductionCastMember[] = Array.from({ length: 16 }, (_, i) => ({
      vaultCharacterId: `id${i}`,
      profileName: 'P',
      castName: null,
      displayName: `C${i}`,
      imageUrl: `https://u${i}`,
      tagSummary: '',
    }));
    const slots = buildStorylineReferenceSlots(cast);
    expect(slots).toHaveLength(14);
    expect(slots[0]).toBe('https://u0');
    expect(slots[13]).toBe('https://u13');
  });

  it('appends asset references after cast references', () => {
    const cast: ProductionCastMember[] = [
      {
        vaultCharacterId: 'c1',
        profileName: 'P',
        castName: null,
        displayName: 'Hero',
        imageUrl: 'https://cast-1',
        tagSummary: '',
      },
    ];
    const assets = [
      {
        vaultAssetId: 'a1',
        collectionName: 'City',
        assetName: 'Street',
        imageUrl: 'https://asset-1',
      },
    ];
    const slots = buildStorylineReferenceSlots(cast, [], assets);
    expect(slots[0]).toBe('https://cast-1');
    // Asset refs should land in composition/background slots (10..13).
    expect(slots[10]).toBe('https://asset-1');
  });
});
