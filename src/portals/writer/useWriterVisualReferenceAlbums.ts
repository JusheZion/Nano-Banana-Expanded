import { useCallback } from 'react';
import { getAssetAlbums, type VaultAssetAlbum } from '@/shared/api/arcsAssetVault';
import { getCharacterAlbums, type VaultCharacterAlbum } from '@/shared/api/arcsVault';
import { useScopedAsyncResource } from '@/shared/hooks/useScopedAsyncResource';

export type WriterVisualReferenceAlbums = {
  characters: VaultCharacterAlbum[];
  assets: VaultAssetAlbum[];
};

const EMPTY_ALBUMS: WriterVisualReferenceAlbums = {
  characters: [],
  assets: [],
};

export function useWriterVisualReferenceAlbums(issueId: string | null) {
  const load = useCallback(async () => {
    const [characters, assets] = await Promise.all([getCharacterAlbums(), getAssetAlbums()]);
    return { characters, assets };
  }, []);
  const resource = useScopedAsyncResource({
    scope: issueId,
    initialValue: EMPTY_ALBUMS,
    load,
    fallbackError: 'Could not load vault references.',
  });
  return {
    albums: resource.value,
    loading: resource.loading,
    error: resource.error,
    refresh: resource.refresh,
    setError: resource.setError,
  };
}
