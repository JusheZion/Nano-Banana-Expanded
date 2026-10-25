import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  orderSort: vi.fn(),
  orderTitle: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { from: mocks.from },
}));

import { listWriterLoreCardsResult } from '@/shared/api/arcsWriterRoom';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.orderTitle.mockResolvedValue({ data: [{ id: 'lore-1', title: 'Kaleid' }], error: null });
  mocks.orderSort.mockReturnValue({ order: mocks.orderTitle });
  mocks.eq.mockReturnValue({ order: mocks.orderSort });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockReturnValue({ select: mocks.select });
});

describe('listWriterLoreCardsResult', () => {
  it('returns rows through an explicit success result', async () => {
    await expect(listWriterLoreCardsResult('series-1')).resolves.toEqual({
      ok: true,
      rows: [{ id: 'lore-1', title: 'Kaleid' }],
    });
  });

  it('distinguishes returned and rejected query failures from an empty canon', async () => {
    mocks.orderTitle.mockResolvedValueOnce({ data: null, error: { message: 'read denied' } });
    await expect(listWriterLoreCardsResult('series-1')).resolves.toEqual({
      ok: false,
      error: 'read denied',
    });

    mocks.orderTitle.mockRejectedValueOnce(new Error('network offline'));
    await expect(listWriterLoreCardsResult('series-1')).resolves.toEqual({
      ok: false,
      error: 'network offline',
    });
  });
});
