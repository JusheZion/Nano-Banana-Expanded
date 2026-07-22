import { beforeEach, describe, expect, it, vi } from 'vitest';

const row = {
  id: 'outline-4',
  issue_id: 'issue-1',
  version: 4,
  outline_json: { title: 'Reviewed' },
  created_at: '2026-07-22T00:00:00.000Z',
  created_by: null,
  source_mode: 'paste_review',
};

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  latestSelect: vi.fn(),
  latestEq: vi.fn(),
  latestOrder: vi.fn(),
  latestLimit: vi.fn(),
  insert: vi.fn(),
  insertedSelect: vi.fn(),
  single: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { from: mocks.from },
}));

import { createWriterOutlineVersion } from '@/shared/api/arcsWriterRoom';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.latestLimit.mockResolvedValue({ data: [{ version: 3 }], error: null });
  mocks.latestOrder.mockReturnValue({ limit: mocks.latestLimit });
  mocks.latestEq.mockReturnValue({ order: mocks.latestOrder });
  mocks.latestSelect.mockReturnValue({ eq: mocks.latestEq });
  mocks.single.mockResolvedValue({ data: row, error: null });
  mocks.insertedSelect.mockReturnValue({ single: mocks.single });
  mocks.insert.mockReturnValue({ select: mocks.insertedSelect });
  mocks.from
    .mockReturnValueOnce({ select: mocks.latestSelect })
    .mockReturnValueOnce({ insert: mocks.insert });
});

describe('createWriterOutlineVersion', () => {
  it('queries the latest version then inserts and selects a complete new row without update', async () => {
    await expect(createWriterOutlineVersion({
      issueId: 'issue-1',
      outlineJson: row.outline_json,
      sourceMode: 'paste_review',
    })).resolves.toEqual({ ok: true, row });

    expect(mocks.latestSelect).toHaveBeenCalledWith('version');
    expect(mocks.latestEq).toHaveBeenCalledWith('issue_id', 'issue-1');
    expect(mocks.latestOrder).toHaveBeenCalledWith('version', { ascending: false });
    expect(mocks.latestLimit).toHaveBeenCalledWith(1);
    expect(mocks.insert).toHaveBeenCalledWith({
      issue_id: 'issue-1',
      version: 4,
      outline_json: row.outline_json,
      source_mode: 'paste_review',
    });
    expect(mocks.insertedSelect).toHaveBeenCalledWith(
      'id, issue_id, version, outline_json, created_at, created_by, source_mode',
    );
  });

  it('starts at version one and returns a latest-query error', async () => {
    mocks.latestLimit.mockResolvedValueOnce({ data: [], error: null });
    await createWriterOutlineVersion({ issueId: 'issue-1', outlineJson: {}, sourceMode: 'outline_import' });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }));

    vi.clearAllMocks();
    mocks.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({ order: () => ({ limit: async () => ({ data: null, error: { message: 'read denied' } }) }) }),
      }),
    });
    await expect(createWriterOutlineVersion({
      issueId: 'issue-1', outlineJson: {}, sourceMode: 'ai_treatment',
    })).resolves.toEqual({ ok: false, error: 'read denied' });
  });

  it('returns the insert error without claiming a row was created', async () => {
    mocks.single.mockResolvedValueOnce({ data: null, error: { message: 'version conflict' } });

    await expect(createWriterOutlineVersion({
      issueId: 'issue-1',
      outlineJson: { title: 'Reviewed' },
      sourceMode: 'paste_review',
    })).resolves.toEqual({ ok: false, error: 'version conflict' });
  });

  it('converts an unexpected Supabase rejection into the explicit error result', async () => {
    mocks.latestLimit.mockRejectedValueOnce(new Error('network offline'));

    await expect(createWriterOutlineVersion({
      issueId: 'issue-1',
      outlineJson: {},
      sourceMode: 'paste_review',
    })).resolves.toEqual({ ok: false, error: 'network offline' });
  });
});
