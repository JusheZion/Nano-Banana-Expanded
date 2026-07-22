import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { from: mocks.from },
}));

import { listWriterOutlinesForIssueResult } from '@/shared/api/arcsWriterRoom';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.order.mockResolvedValue({ data: [{ id: 'outline-2', version: 2 }], error: null });
  mocks.eq.mockReturnValue({ order: mocks.order });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockReturnValue({ select: mocks.select });
});

describe('listWriterOutlinesForIssueResult', () => {
  it('returns rows through an explicit success result', async () => {
    await expect(listWriterOutlinesForIssueResult('issue-1')).resolves.toEqual({
      ok: true,
      rows: [{ id: 'outline-2', version: 2 }],
    });
  });

  it('distinguishes returned and rejected query failures from an empty list', async () => {
    mocks.order.mockResolvedValueOnce({ data: null, error: { message: 'read denied' } });
    await expect(listWriterOutlinesForIssueResult('issue-1')).resolves.toEqual({
      ok: false,
      error: 'read denied',
    });

    mocks.order.mockRejectedValueOnce(new Error('network offline'));
    await expect(listWriterOutlinesForIssueResult('issue-1')).resolves.toEqual({
      ok: false,
      error: 'network offline',
    });
  });
});
