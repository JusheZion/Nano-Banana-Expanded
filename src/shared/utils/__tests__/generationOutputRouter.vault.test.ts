import { describe, expect, it, beforeEach } from 'vitest';
import {
  saveGeneration,
  getGenerations,
  renameCharacterProfileLocal,
  moveCharacterToProfileLocal,
  deleteCharacterGenerationLocal,
  renameAssetCollectionLocal,
} from '../generationOutputRouter';

describe('vault local mutations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renameCharacterProfileLocal moves items between profiles', () => {
    saveGeneration('character', 'data:image/png;base64,xx', 1, { profileName: 'A' });
    saveGeneration('character', 'data:image/png;base64,yy', 2, { profileName: 'A' });
    saveGeneration('character', 'data:image/png;base64,zz', 3, { profileName: 'B' });
    expect(renameCharacterProfileLocal('A', 'Alpha')).toBe(true);
    const list = getGenerations('character');
    expect(list.filter((g) => g.profileName === 'Alpha')).toHaveLength(2);
    expect(list.filter((g) => g.profileName === 'A')).toHaveLength(0);
  });

  it('moveCharacterToProfileLocal updates one row', () => {
    saveGeneration('character', 'data:image/png;base64,aa', 1, { profileName: 'A' });
    const id = getGenerations('character')[0]!.id;
    expect(moveCharacterToProfileLocal(id, 'B')).toBe(true);
    expect(getGenerations('character')[0]!.profileName).toBe('B');
  });

  it('deleteCharacterGenerationLocal removes by id', () => {
    saveGeneration('character', 'data:image/png;base64,aa', 1);
    const id = getGenerations('character')[0]!.id;
    expect(deleteCharacterGenerationLocal(id)).toBe(true);
    expect(getGenerations('character')).toHaveLength(0);
  });

  it('renameAssetCollectionLocal', () => {
    saveGeneration('asset', 'data:image/png;base64,aa', 1, { collectionName: 'C1' });
    renameAssetCollectionLocal('C1', 'C2');
    expect(getGenerations('asset')[0]!.collectionName).toBe('C2');
  });
});
