import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});
