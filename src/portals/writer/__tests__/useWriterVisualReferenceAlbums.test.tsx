import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCharacterAlbums: vi.fn(),
  getAssetAlbums: vi.fn(),
}));

vi.mock('@/shared/api/arcsVault', () => ({
  getCharacterAlbums: mocks.getCharacterAlbums,
}));
vi.mock('@/shared/api/arcsAssetVault', () => ({
  getAssetAlbums: mocks.getAssetAlbums,
}));

import { useWriterVisualReferenceAlbums } from '../useWriterVisualReferenceAlbums';

describe('useWriterVisualReferenceAlbums', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCharacterAlbums.mockResolvedValue([]);
    mocks.getAssetAlbums.mockResolvedValue([]);
  });

  it('adapts both vault album sources into one scoped resource', async () => {
    const characters = [{ id: 'character-album' }];
    const assets = [{ id: 'asset-album' }];
    mocks.getCharacterAlbums.mockResolvedValue(characters);
    mocks.getAssetAlbums.mockResolvedValue(assets);

    const { result } = renderHook(() => useWriterVisualReferenceAlbums('issue-a'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.albums).toEqual({ characters, assets });
    expect(result.current.error).toBeNull();
  });
});
