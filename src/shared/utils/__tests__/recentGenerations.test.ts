import { beforeEach, describe, expect, it } from 'vitest';
import {
  addRecentFromCharacter,
  getRecentCharacters,
  getRecentGenerations,
} from '@/shared/utils/recentGenerations';

const RECENT_KEY = 'arcs_recent_generations_v1';

beforeEach(() => {
  localStorage.clear();
});

describe('recentGenerations', () => {
  it('ignores malformed localStorage entries', () => {
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([
        null,
        { id: 'missing-url', kind: 'character', savedAt: Date.now() },
        {
          id: 'valid-character',
          kind: 'character',
          imageUrl: 'https://example.com/character.png',
          savedAt: Date.now(),
        },
        {
          id: 'valid-asset',
          kind: 'asset',
          imageUrl: 'https://example.com/asset.png',
          savedAt: Date.now(),
        },
      ])
    );

    expect(getRecentCharacters()).toHaveLength(1);
    expect(getRecentGenerations()).toHaveLength(2);
  });

  it('can add a character after malformed entries are present', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify([null, { id: 'bad' }]));

    addRecentFromCharacter({
      id: 'CHAR-flux',
      image_url: 'https://example.com/flux.png',
      profile_name: 'Flux',
      cast_name: 'Flux Briefs',
      seed: 123,
    });

    expect(getRecentCharacters()).toMatchObject([
      {
        id: 'CHAR-flux',
        imageUrl: 'https://example.com/flux.png',
        profileName: 'Flux',
        displayName: 'Flux Briefs',
        seed: 123,
      },
    ]);
  });
});
