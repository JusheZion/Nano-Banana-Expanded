import { useMemo } from 'react';
import { getAssetAlbums, type VaultAssetAlbum } from '@/shared/api/arcsAssetVault';
import { getCharacterAlbums, type VaultCharacterAlbum } from '@/shared/api/arcsVault';
import { useLatestAsyncValue } from '@/shared/hooks/useLatestAsyncValue';

export type VaultOptionTarget = 'character' | 'asset' | 'npc';

const getProfileName = (album: VaultCharacterAlbum) => album.profileName;
const getCollectionName = (album: VaultAssetAlbum) => album.collectionName;

export function useCharacterVaultAlbums(enabled = false) {
  return useLatestAsyncValue(getCharacterAlbums, [] as VaultCharacterAlbum[], enabled);
}

export function useAssetVaultAlbums(enabled = false) {
  return useLatestAsyncValue(getAssetAlbums, [] as VaultAssetAlbum[], enabled);
}

export function useCharacterVaultOptions() {
  const result = useCharacterVaultAlbums();
  const options = useMemo(() => result.value.map(getProfileName), [result.value]);
  return { options, loading: result.loading, error: result.error, refresh: result.refresh };
}

export function useAssetVaultOptions() {
  const result = useAssetVaultAlbums();
  const options = useMemo(() => result.value.map(getCollectionName), [result.value]);
  return { options, loading: result.loading, error: result.error, refresh: result.refresh };
}

export function useImageshopVaultOptions(target: VaultOptionTarget, enabled: boolean) {
  const profiles = useCharacterVaultAlbums(enabled && target === 'character');
  const collections = useAssetVaultAlbums(enabled && target === 'asset');
  const profileOptions = useMemo(() => profiles.value.map(getProfileName), [profiles.value]);
  const collectionOptions = useMemo(
    () => collections.value.map(getCollectionName),
    [collections.value],
  );

  return {
    profiles: { options: profileOptions, loading: profiles.loading, error: profiles.error },
    collections: { options: collectionOptions, loading: collections.loading, error: collections.error },
  };
}
