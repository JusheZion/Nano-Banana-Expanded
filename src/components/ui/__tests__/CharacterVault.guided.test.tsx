import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CharacterVault } from '@/components/ui/CharacterVault';
import { useGuidedComicVaultBridge } from '@/stores/guidedComicVaultBridge';

const getCharacterAlbumsMock = vi.fn();

vi.mock('@/shared/api/arcsVault', () => ({
  getCharacterAlbums: () => getCharacterAlbumsMock(),
  setProfileCover: vi.fn(async () => ({ ok: true })),
  renameVaultCharacterProfile: vi.fn(async () => ({ ok: true })),
  moveVaultCharacterToProfile: vi.fn(async () => ({ ok: true })),
  updateVaultCharacterCastName: vi.fn(async () => ({ ok: true })),
  deleteVaultCharacter: vi.fn(async () => ({ ok: true })),
  deleteVaultCharacterProfile: vi.fn(async () => ({ ok: true })),
  vaultMergeConfirmSkipped: vi.fn(() => true),
  setVaultMergeConfirmSkipped: vi.fn(),
}));

vi.mock('@/shared/hooks/useArcsResolvedSrc', () => ({
  useArcsResolvedSrc: (src: string) => src,
}));

vi.mock('@/components/ui/ProfileVaultModal', () => ({
  ProfileVaultModal: ({
    onVaultChanged,
    onUseForGuidedFlow,
  }: {
    onVaultChanged: () => void;
    onUseForGuidedFlow?: () => void;
  }) => (
    <div>
      <button type="button" onClick={onVaultChanged}>Simulate vault change</button>
      {onUseForGuidedFlow && (
        <button type="button" onClick={onUseForGuidedFlow}>Use for guided flow</button>
      )}
    </div>
  ),
}));

function deferred<T>() {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve(value: T) {
      if (!resolvePromise) throw new Error('Deferred promise was not initialized');
      resolvePromise(value);
    },
  };
}

beforeEach(() => {
  useGuidedComicVaultBridge.setState({
    portalToOpen: null,
    pendingTarget: null,
    selection: null,
  });
  getCharacterAlbumsMock.mockResolvedValue([
    {
      profileName: 'Aries',
      coverId: 'aries-cover',
      items: [
        {
          id: 'aries-cover',
          image_url: 'https://example.com/aries.png',
          profile_name: 'Aries',
          cast_name: 'Alpha Swag Aries',
          name: 'Profile cover',
          created_at: '2026-05-18T00:00:00.000Z',
          is_profile_cover: true,
        },
      ],
    },
  ]);
});

describe('CharacterVault guided selection', () => {
  it('shows the guided action for character images while matching a location or asset reference', async () => {
    useGuidedComicVaultBridge.getState().requestVaultSelection({
      type: 'location',
      name: 'Celestial throne room',
    });

    render(<CharacterVault />);

    fireEvent.click(await screen.findByRole('button', { name: /aries/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /use for guided flow/i })).toBeTruthy();
    });
  });

  it('keeps the newest albums when an older refresh finishes last', async () => {
    const older = deferred<Array<{ profileName: string; coverId: null; items: [] }>>();
    const newer = deferred<Array<{ profileName: string; coverId: null; items: [] }>>();
    getCharacterAlbumsMock
      .mockResolvedValueOnce([{ profileName: 'Initial', coverId: null, items: [] }])
      .mockImplementationOnce(() => older.promise)
      .mockImplementationOnce(() => newer.promise);

    render(<CharacterVault />);
    fireEvent.click(await screen.findByRole('button', { name: /initial/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate vault change' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate vault change' }));

    await act(async () => newer.resolve([{ profileName: 'Current', coverId: null, items: [] }]));
    expect(await screen.findByRole('button', { name: /current/i })).toBeTruthy();

    await act(async () => older.resolve([{ profileName: 'Stale', coverId: null, items: [] }]));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /stale/i })).toBeNull();
      expect(screen.getByRole('button', { name: /current/i })).toBeTruthy();
    });
  });
});
