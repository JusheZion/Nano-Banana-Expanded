import { describe, it, expect } from 'vitest';
import {
  buildStorySequenceV1Payload,
  compactBeatForVault,
  firstStoryCoverImageUrl,
} from '@/shared/utils/storySequencePayload';
import type { StoryBeat } from '@/portals/storyline/storylineTypes';

function beat(over: Partial<StoryBeat> = {}): StoryBeat {
  const next: StoryBeat = {
    id: 'b1',
    kind: 'narrative',
    text: 't',
    durationSec: 5,
    visualPrompt: 'vp',
    camera: { shot: '', angle: '', movement: '' },
    tone: '',
    audio: { dialogue: '', sfx: '' },
    linkedVaultCharacterIds: [],
    linkedVaultAssetIds: [],
    tags: [],
    imageUrl: null,
    interpolation: null,
    generationStatus: 'idle',
    generationMessage: null,
    seed: null,
    aspectRatio: '9:16',
    ...over,
  };
  return {
    ...next,
    aspectRatio: next.aspectRatio ?? '9:16',
  };
}

describe('firstStoryCoverImageUrl', () => {
  it('returns first beat with image', () => {
    expect(firstStoryCoverImageUrl([beat(), beat({ imageUrl: 'data:x' })])).toBe('data:x');
  });
  it('returns null when none', () => {
    expect(firstStoryCoverImageUrl([beat()])).toBeNull();
  });
});

describe('compactBeatForVault', () => {
  it('keeps only http(s) image URLs in JSON', () => {
    const c = compactBeatForVault(beat({ imageUrl: 'data:abc' }));
    expect(c.imageUrl).toBeUndefined();
    const c2 = compactBeatForVault(beat({ imageUrl: 'https://x/y.png' }));
    expect(c2.imageUrl).toBe('https://x/y.png');
  });
});

describe('buildStorySequenceV1Payload', () => {
  it('includes version and beats', () => {
    const p = buildStorySequenceV1Payload({
      storyTitle: 'S',
      rawStoryline: 'r',
      cleanedStoryline: 'c',
      beatIntervalSec: 10,
      directorSettings: {
        highFashionTechwear: false,
        yugiOhComplexity: false,
        strictWardrobeLock: true,
      },
      productionCast: [],
      productionAssets: [],
      beats: [beat({ id: 'x' })],
    });
    expect(p.version).toBe(1);
    expect(p.title).toBe('S');
    expect(p.beats).toHaveLength(1);
    expect(p.beats[0]!.id).toBe('x');
    expect(p.exportedAt).toMatch(/^\d{4}-/);
  });
});
