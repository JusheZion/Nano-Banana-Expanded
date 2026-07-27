import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  update: vi.fn(),
  deleteRow: vi.fn(),
  inIds: vi.fn(),
  returning: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { from: mocks.from },
}));

import {
  deleteWriterPagesExact,
  listWriterPagesResult,
  updateWriterPageBeatsJsonExact,
  updateWriterPageScriptTextExact,
} from '@/shared/api/arcsWriterRoom';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Pacing Apply exact writer page results', () => {
  it('surfaces page list errors instead of collapsing them to empty', async () => {
    mocks.order.mockResolvedValue({ data: null, error: { message: 'select denied' } });
    mocks.eq.mockReturnValue({ order: mocks.order });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.from.mockReturnValue({ select: mocks.select });

    await expect(listWriterPagesResult('issue-1')).resolves.toEqual({
      ok: false,
      error: 'select denied',
    });
  });

  it('requires one exact returned row for Beats and Dialogue writes', async () => {
    mocks.returning
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{ id: 'page-1', script_text: 'RESTORED' }],
        error: null,
      });
    mocks.eq.mockReturnValue({ select: mocks.returning });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.from.mockReturnValue({ update: mocks.update });

    await expect(updateWriterPageBeatsJsonExact('page-1', { panels: [] })).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/not confirmed/i),
    });
    await expect(updateWriterPageScriptTextExact('page-1', 'RESTORED')).resolves.toEqual({
      ok: true,
      row: { id: 'page-1', script_text: 'RESTORED' },
    });
  });

  it('requires exact deleted IDs unless planned cleanup explicitly allows missing rows', async () => {
    mocks.returning
      .mockResolvedValueOnce({ data: [{ id: 'page-2' }], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'page-2' }], error: null });
    mocks.inIds.mockReturnValue({ select: mocks.returning });
    mocks.eq.mockReturnValue({ in: mocks.inIds });
    mocks.deleteRow.mockReturnValue({ eq: mocks.eq });
    mocks.from.mockReturnValue({ delete: mocks.deleteRow });

    await expect(deleteWriterPagesExact('issue-1', ['page-2', 'page-3'])).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/not confirmed/i),
    });
    await expect(deleteWriterPagesExact(
      'issue-1',
      ['page-2', 'page-3'],
      { allowMissing: true },
    )).resolves.toEqual({ ok: true, deletedIds: ['page-2'] });
  });
});
