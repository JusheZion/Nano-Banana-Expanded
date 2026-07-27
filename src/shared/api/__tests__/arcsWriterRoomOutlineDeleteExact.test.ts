import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  deleteRow: vi.fn(),
  eqIssue: vi.fn(),
  eqId: vi.fn(),
  selectDeleted: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { from: mocks.from },
}));

import { deleteWriterOutlineById } from '@/shared/api/arcsWriterRoom';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectDeleted.mockResolvedValue({ data: [{ id: 'outline-1' }], error: null });
  mocks.eqId.mockReturnValue({ select: mocks.selectDeleted });
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
    expect(mocks.selectDeleted).toHaveBeenCalledWith('id');
  });

  it('returns the database failure without claiming deletion', async () => {
    mocks.selectDeleted.mockResolvedValueOnce({ data: null, error: { message: 'delete denied' } });

    await expect(deleteWriterOutlineById({ issueId: 'issue-1', outlineId: 'outline-1' }))
      .resolves.toEqual({ ok: false, error: 'delete denied' });
  });

  it.each([
    { label: 'no row is returned', rows: [] },
    { label: 'a different row is returned', rows: [{ id: 'outline-other' }] },
    { label: 'more than one row is returned', rows: [{ id: 'outline-1' }, { id: 'outline-other' }] },
  ])('does not claim deletion when $label', async ({ rows }) => {
    mocks.selectDeleted.mockResolvedValueOnce({ data: rows, error: null });

    await expect(deleteWriterOutlineById({ issueId: 'issue-1', outlineId: 'outline-1' }))
      .resolves.toEqual({
        ok: false,
        error: 'Exact outline row was not returned after deletion',
      });
  });

  it('allows an already-absent preplanned row during idempotent recovery', async () => {
    mocks.selectDeleted.mockResolvedValueOnce({ data: [], error: null });

    await expect(deleteWriterOutlineById({
      issueId: 'issue-1',
      outlineId: 'outline-1',
      allowMissing: true,
    })).resolves.toEqual({ ok: true });
  });
});
