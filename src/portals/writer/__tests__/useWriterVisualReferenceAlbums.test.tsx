import { act, renderHook, waitFor } from '@testing-library/react';
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useWriterVisualReferenceAlbums', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCharacterAlbums.mockResolvedValue([]);
    mocks.getAssetAlbums.mockResolvedValue([]);
  });

  it('loads both vault album types for the selected issue', async () => {
    const characters = [{ id: 'character-album' }];
    const assets = [{ id: 'asset-album' }];
    mocks.getCharacterAlbums.mockResolvedValue(characters);
    mocks.getAssetAlbums.mockResolvedValue(assets);

    const { result } = renderHook(() => useWriterVisualReferenceAlbums('issue-a'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.albums).toEqual({ characters, assets });
    expect(result.current.error).toBeNull();
  });

  it('keeps the newest refresh result when requests resolve out of order', async () => {
    const initialCharacters = [{ id: 'initial-character' }];
    const initialAssets = [{ id: 'initial-asset' }];
    mocks.getCharacterAlbums.mockResolvedValueOnce(initialCharacters);
    mocks.getAssetAlbums.mockResolvedValueOnce(initialAssets);
    const { result } = renderHook(() => useWriterVisualReferenceAlbums('issue-a'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const olderCharacters = deferred<object[]>();
    const olderAssets = deferred<object[]>();
    const newerCharacters = deferred<object[]>();
    const newerAssets = deferred<object[]>();
    mocks.getCharacterAlbums
      .mockReturnValueOnce(olderCharacters.promise)
      .mockReturnValueOnce(newerCharacters.promise);
    mocks.getAssetAlbums
      .mockReturnValueOnce(olderAssets.promise)
      .mockReturnValueOnce(newerAssets.promise);

    let olderRefresh!: Promise<unknown>;
    let newerRefresh!: Promise<unknown>;
    act(() => {
      olderRefresh = result.current.refresh();
      newerRefresh = result.current.refresh();
    });
    newerCharacters.resolve([{ id: 'new-character' }]);
    newerAssets.resolve([{ id: 'new-asset' }]);
    await act(async () => { await newerRefresh; });
    expect(result.current.albums).toEqual({
      characters: [{ id: 'new-character' }],
      assets: [{ id: 'new-asset' }],
    });

    olderCharacters.resolve([{ id: 'old-character' }]);
    olderAssets.resolve([{ id: 'old-asset' }]);
    await act(async () => { await olderRefresh; });
    expect(result.current.albums).toEqual({
      characters: [{ id: 'new-character' }],
      assets: [{ id: 'new-asset' }],
    });
    expect(result.current.loading).toBe(false);
  });

  it('does not publish a late result after the selected issue changes', async () => {
    const issueACharacters = deferred<object[]>();
    const issueAAssets = deferred<object[]>();
    mocks.getCharacterAlbums.mockReturnValueOnce(issueACharacters.promise);
    mocks.getAssetAlbums.mockReturnValueOnce(issueAAssets.promise);
    const { result, rerender } = renderHook(
      ({ issueId }) => useWriterVisualReferenceAlbums(issueId),
      { initialProps: { issueId: 'issue-a' as string | null } },
    );
    await waitFor(() => expect(mocks.getCharacterAlbums).toHaveBeenCalledTimes(1));

    const issueBCharacters = deferred<object[]>();
    const issueBAssets = deferred<object[]>();
    mocks.getCharacterAlbums.mockReturnValueOnce(issueBCharacters.promise);
    mocks.getAssetAlbums.mockReturnValueOnce(issueBAssets.promise);
    rerender({ issueId: 'issue-b' });
    expect(result.current.albums).toEqual({ characters: [], assets: [] });
    expect(result.current.loading).toBe(true);

    issueACharacters.resolve([{ id: 'issue-a-character' }]);
    issueAAssets.resolve([{ id: 'issue-a-asset' }]);
    await act(async () => { await Promise.all([issueACharacters.promise, issueAAssets.promise]); });
    expect(result.current.albums).toEqual({ characters: [], assets: [] });
    expect(result.current.loading).toBe(true);

    issueBCharacters.resolve([{ id: 'issue-b-character' }]);
    issueBAssets.resolve([{ id: 'issue-b-asset' }]);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.albums).toEqual({
      characters: [{ id: 'issue-b-character' }],
      assets: [{ id: 'issue-b-asset' }],
    });
  });

  it('reports only the latest request failure', async () => {
    const { result } = renderHook(() => useWriterVisualReferenceAlbums('issue-a'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const failedCharacters = deferred<object[]>();
    const pendingAssets = deferred<object[]>();
    mocks.getCharacterAlbums.mockReturnValueOnce(failedCharacters.promise);
    mocks.getAssetAlbums.mockReturnValueOnce(pendingAssets.promise);

    let refresh!: Promise<unknown>;
    act(() => { refresh = result.current.refresh(); });
    failedCharacters.reject(new Error('Character Vault unavailable'));
    await act(async () => { await refresh; });

    expect(result.current.error).toBe('Character Vault unavailable');
    expect(result.current.loading).toBe(false);
  });

  it('invalidates an unresolved refresh when the consumer unmounts', async () => {
    const { result, unmount } = renderHook(() => useWriterVisualReferenceAlbums('issue-a'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const characters = deferred<object[]>();
    const assets = deferred<object[]>();
    mocks.getCharacterAlbums.mockReturnValueOnce(characters.promise);
    mocks.getAssetAlbums.mockReturnValueOnce(assets.promise);

    let refresh!: Promise<unknown>;
    act(() => { refresh = result.current.refresh(); });
    unmount();
    characters.resolve([{ id: 'late-character' }]);
    assets.resolve([{ id: 'late-asset' }]);

    await expect(refresh).resolves.toBeNull();
  });
});
