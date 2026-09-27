import { useCallback, useEffect, useRef, useState } from 'react';
import { getAssetAlbums, type VaultAssetAlbum } from '@/shared/api/arcsAssetVault';
import { getCharacterAlbums, type VaultCharacterAlbum } from '@/shared/api/arcsVault';

export type VaultOptionTarget = 'character' | 'asset' | 'npc';

function useLatestOptions<T>(load: () => Promise<T[]>, getLabel: (value: T) => string) {
  const requestIdRef = useRef(0);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const cancel = useCallback(() => {
    requestIdRef.current += 1;
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    try {
      const values = await load();
      if (requestIdRef.current === requestId) setOptions(values.map(getLabel));
    } catch {
      if (requestIdRef.current === requestId) setOptions([]);
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [getLabel, load]);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [],
  );

  return { options, loading, refresh, cancel };
}

const getProfileName = (album: VaultCharacterAlbum) => album.profileName;
const getCollectionName = (album: VaultAssetAlbum) => album.collectionName;

export function useCharacterVaultOptions() {
  return useLatestOptions(getCharacterAlbums, getProfileName);
}

export function useAssetVaultOptions() {
  return useLatestOptions(getAssetAlbums, getCollectionName);
}

export function useImageshopVaultOptions(target: VaultOptionTarget, enabled: boolean) {
  const {
    options: profileOptions,
    loading: profilesLoading,
    refresh: refreshProfiles,
    cancel: cancelProfiles,
  } = useCharacterVaultOptions();
  const {
    options: collectionOptions,
    loading: collectionsLoading,
    refresh: refreshCollections,
    cancel: cancelCollections,
  } = useAssetVaultOptions();

  useEffect(() => {
    if (enabled && target === 'character') {
      void refreshProfiles();
      return cancelProfiles;
    }
    cancelProfiles();
  }, [cancelProfiles, enabled, refreshProfiles, target]);

  useEffect(() => {
    if (enabled && target === 'asset') {
      void refreshCollections();
      return cancelCollections;
    }
    cancelCollections();
  }, [cancelCollections, enabled, refreshCollections, target]);

  return {
    profiles: { options: profileOptions, loading: profilesLoading },
    collections: { options: collectionOptions, loading: collectionsLoading },
  };
}
