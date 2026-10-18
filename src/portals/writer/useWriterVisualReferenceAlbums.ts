import { useCallback, useEffect, useRef, useState } from 'react';
import { getAssetAlbums, type VaultAssetAlbum } from '@/shared/api/arcsAssetVault';
import { getCharacterAlbums, type VaultCharacterAlbum } from '@/shared/api/arcsVault';

export type WriterVisualReferenceAlbums = {
  characters: VaultCharacterAlbum[];
  assets: VaultAssetAlbum[];
};

const EMPTY_ALBUMS: WriterVisualReferenceAlbums = {
  characters: [],
  assets: [],
};

type WriterVisualReferenceAlbumState = {
  issueId: string | null;
  albums: WriterVisualReferenceAlbums;
  loading: boolean;
  error: string | null;
};

export function useWriterVisualReferenceAlbums(issueId: string | null) {
  const [state, setState] = useState<WriterVisualReferenceAlbumState>({
    issueId: null,
    albums: EMPTY_ALBUMS,
    loading: false,
    error: null,
  });
  const currentIssueIdRef = useRef(issueId);
  const requestSequenceRef = useRef(0);
  currentIssueIdRef.current = issueId;

  const refresh = useCallback(async (): Promise<WriterVisualReferenceAlbums | null> => {
    if (!issueId) return null;
    const requestIssueId = issueId;
    const requestSequence = ++requestSequenceRef.current;
    setState((current) => ({
      issueId: requestIssueId,
      albums: current.issueId === requestIssueId ? current.albums : EMPTY_ALBUMS,
      loading: true,
      error: null,
    }));

    try {
      const [characters, assets] = await Promise.all([getCharacterAlbums(), getAssetAlbums()]);
      if (
        currentIssueIdRef.current !== requestIssueId
        || requestSequenceRef.current !== requestSequence
      ) return null;
      const albums = { characters, assets };
      setState({
        issueId: requestIssueId,
        albums,
        loading: false,
        error: null,
      });
      return albums;
    } catch (error) {
      if (
        currentIssueIdRef.current !== requestIssueId
        || requestSequenceRef.current !== requestSequence
      ) return null;
      setState((current) => ({
        issueId: requestIssueId,
        albums: current.issueId === requestIssueId ? current.albums : EMPTY_ALBUMS,
        loading: false,
        error: error instanceof Error ? error.message : 'Could not load vault references.',
      }));
      return null;
    }
  }, [issueId]);

  useEffect(() => {
    if (!issueId) {
      requestSequenceRef.current += 1;
      setState({
        issueId: null,
        albums: EMPTY_ALBUMS,
        loading: false,
        error: null,
      });
      return;
    }
    void refresh();
  }, [issueId, refresh]);

  useEffect(() => () => {
    requestSequenceRef.current += 1;
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((current) => {
      const currentIssueId = currentIssueIdRef.current;
      if (!currentIssueId) return current;
      return current.issueId === currentIssueId
        ? { ...current, error }
        : {
            issueId: currentIssueId,
            albums: EMPTY_ALBUMS,
            loading: false,
            error,
          };
    });
  }, []);

  const isCurrentIssue = state.issueId === issueId;
  return {
    albums: isCurrentIssue ? state.albums : EMPTY_ALBUMS,
    loading: issueId ? (isCurrentIssue ? state.loading : true) : false,
    error: isCurrentIssue ? state.error : null,
    refresh,
    setError,
  };
}
