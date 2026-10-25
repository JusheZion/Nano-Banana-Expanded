import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listWriterLoreCardsResult: vi.fn(),
}));

vi.mock('@/shared/api/arcsWriterRoom', () => ({
  listWriterLoreCardsResult: mocks.listWriterLoreCardsResult,
}));

import { useWriterLoreCards } from '../useWriterLoreCards';

describe('useWriterLoreCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listWriterLoreCardsResult.mockResolvedValue({ ok: true, rows: [] });
  });

  it('loads cards for the selected series through the scoped resource', async () => {
    const cards = [{ id: 'lore-1', title: 'Kaleid' }];
    mocks.listWriterLoreCardsResult.mockResolvedValue({ ok: true, rows: cards });

    const { result } = renderHook(() => useWriterLoreCards('series-a'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.listWriterLoreCardsResult).toHaveBeenCalledWith('series-a');
    expect(result.current.cards).toEqual(cards);
    expect(result.current.error).toBeNull();
  });

  it('exposes a failed read instead of presenting it as an empty canon', async () => {
    mocks.listWriterLoreCardsResult.mockResolvedValue({ ok: false, error: 'read denied' });

    const { result } = renderHook(() => useWriterLoreCards('series-a'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.cards).toEqual([]);
    expect(result.current.error).toBe('read denied');
  });
});
