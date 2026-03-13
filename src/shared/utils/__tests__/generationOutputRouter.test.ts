import { describe, it, expect, beforeEach } from 'vitest';
import { saveGeneration, getGenerations } from '../generationOutputRouter';

const CHARACTER_KEY = 'arcs_generations_character';
const ASSET_KEY = 'arcs_generations_asset';

describe('generationOutputRouter', () => {
  beforeEach(() => {
    localStorage.removeItem(CHARACTER_KEY);
    localStorage.removeItem(ASSET_KEY);
  });

  it('saves asset generation to asset key only; character generations do not include it', () => {
    saveGeneration('asset', 'https://example.com/asset1.png');

    const characterGens = getGenerations('character');
    const assetGens = getGenerations('asset');

    expect(characterGens).toHaveLength(0);
    expect(assetGens).toHaveLength(1);
    expect(assetGens[0].url).toBe('https://example.com/asset1.png');
  });

  it('saves character generation to character key only; asset generations do not include it', () => {
    saveGeneration('character', 'https://example.com/char1.png');

    const characterGens = getGenerations('character');
    const assetGens = getGenerations('asset');

    expect(assetGens).toHaveLength(0);
    expect(characterGens).toHaveLength(1);
    expect(characterGens[0].url).toBe('https://example.com/char1.png');
  });

  it('asset generations do not appear in character profile list', () => {
    saveGeneration('asset', 'data:image/png;base64,asset123');
    saveGeneration('character', 'data:image/png;base64,char456');

    const characterGens = getGenerations('character');

    const urls = characterGens.map((g) => g.url);
    expect(urls).toContain('data:image/png;base64,char456');
    expect(urls).not.toContain('data:image/png;base64,asset123');
  });

  it('character generations do not appear in asset archive list', () => {
    saveGeneration('character', 'data:image/png;base64,char789');
    saveGeneration('asset', 'data:image/png;base64,asset999');

    const assetGens = getGenerations('asset');

    const urls = assetGens.map((g) => g.url);
    expect(urls).toContain('data:image/png;base64,asset999');
    expect(urls).not.toContain('data:image/png;base64,char789');
  });
});
