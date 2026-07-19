import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResponse = { data: unknown; error: { message: string } | null };

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  response: { data: null, error: null } as QueryResponse,
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    from: mocks.from,
  },
}));

import { restoreWriterOutlineAsLatest } from '@/shared/api/arcsWriterRoom';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.response = { data: null, error: null };
  mocks.insert.mockImplementation(() => Promise.resolve(mocks.response));
  mocks.from.mockReturnValue({ insert: mocks.insert });
});

describe('restoreWriterOutlineAsLatest', () => {
  it('copies a prior outline into a new latest version without deleting history', async () => {
    const outlineJson = { title: 'Original', page_beats: [{ page_target: 71 }] };

    await expect(restoreWriterOutlineAsLatest({
      issueId: 'issue-1',
      outlineJson,
      restoredFromVersion: 3,
      nextVersion: 5,
    })).resolves.toEqual({ ok: true });

    expect(mocks.from).toHaveBeenCalledWith('writer_issue_outlines');
    expect(mocks.insert).toHaveBeenCalledWith({
      issue_id: 'issue-1',
      version: 5,
      outline_json: outlineJson,
      created_by: 'user_restore',
      source_mode: 'rollback:v3',
    });
  });

  it('returns the database error when the restored version cannot be saved', async () => {
    mocks.response = { data: null, error: { message: 'permission denied' } };

    await expect(restoreWriterOutlineAsLatest({
      issueId: 'issue-1',
      outlineJson: {},
      restoredFromVersion: 2,
      nextVersion: 4,
    })).resolves.toEqual({ ok: false, error: 'permission denied' });
  });
});
