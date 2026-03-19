import { describe, expect, it } from 'vitest';
import { selectCoverIdForAlbum, type VaultCharacterItem } from '@/shared/api/arcsVault';

function makeItem(args: Partial<VaultCharacterItem> & { id: string }): VaultCharacterItem {
  return {
    id: args.id,
    image_url: args.image_url ?? `https://example.com/${args.id}.png`,
    profile_name: args.profile_name ?? 'Kaelen',
    cast_name: args.cast_name ?? null,
    name: args.name ?? null,
    seed: args.seed ?? null,
    created_at: args.created_at ?? null,
    is_profile_cover: args.is_profile_cover ?? false,
  };
}

describe('arcsVault.selectCoverIdForAlbum', () => {
  it('prefers DB cover flag when present', () => {
    const items: VaultCharacterItem[] = [
      makeItem({ id: 'a', created_at: '2026-03-18T00:00:00.000Z' }),
      makeItem({ id: 'b', created_at: '2026-03-19T00:00:00.000Z', is_profile_cover: true }),
      makeItem({ id: 'c', created_at: '2026-03-20T00:00:00.000Z' }),
    ];
    const cover = selectCoverIdForAlbum({ profileKey: 'Kaelen', items });
    expect(cover).toBe('b');
  });

  it('uses persisted cover id if it exists in items and no DB cover', () => {
    const items: VaultCharacterItem[] = [
      makeItem({ id: 'a', created_at: '2026-03-18T00:00:00.000Z' }),
      makeItem({ id: 'b', created_at: '2026-03-19T00:00:00.000Z' }),
    ];
    const cover = selectCoverIdForAlbum({
      profileKey: 'Kaelen',
      items,
      persistedCoverId: 'a',
    });
    expect(cover).toBe('a');
  });

  it('falls back to most recent created_at when no DB or persisted cover', () => {
    const items: VaultCharacterItem[] = [
      makeItem({ id: 'a', created_at: '2026-03-18T00:00:00.000Z' }),
      makeItem({ id: 'b', created_at: '2026-03-19T00:00:00.000Z' }),
      makeItem({ id: 'c', created_at: '2026-03-17T00:00:00.000Z' }),
    ];
    const cover = selectCoverIdForAlbum({ profileKey: 'Kaelen', items, persistedCoverId: null });
    expect(cover).toBe('b');
  });
});

