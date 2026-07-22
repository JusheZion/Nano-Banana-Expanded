import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  deleteRow: vi.fn(),
  eqIssue: vi.fn(),
  eqId: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { from: mocks.from },
}));

import { deleteWriterOutlineById } from '@/shared/api/arcsWriterRoom';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.eqId.mockResolvedValue({ error: null });
  mocks.eqIssue.mockReturnValue({ eq: mocks.eqId });
  mocks.deleteRow.mockReturnValue({ eq: mocks.eqIssue });
  mocks.from.mockReturnValue({ delete: mocks.deleteRow });
});

describe('deleteWriterOutlineById', () => {
  it('guards the exact immutable row by both owning issue and row id', async () => {
    await expect(deleteWriterOutlineById({ issueId: 'issue-1', outlineId: 'outline-1' }))
      .resolves.toEqual({ ok: true });

    expect(mocks.from).toHaveBeenCalledWith('writer_issue_outlines');
    expect(mocks.eqIssue).toHaveBeenCalledWith('issue_id', 'issue-1');
    expect(mocks.eqId).toHaveBeenCalledWith('id', 'outline-1');
  });

  it('returns the database failure without claiming deletion', async () => {
    mocks.eqId.mockResolvedValueOnce({ error: { message: 'delete denied' } });

    await expect(deleteWriterOutlineById({ issueId: 'issue-1', outlineId: 'outline-1' }))
      .resolves.toEqual({ ok: false, error: 'delete denied' });
  });
});
