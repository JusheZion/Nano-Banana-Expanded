import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  discard: vi.fn(),
}));

vi.mock('@/shared/api/writerTools', () => ({ invokeWriterTools: mocks.invoke }));
vi.mock('@/shared/api/writerPacingRevisionSets', () => ({
  listWriterPacingRevisionSets: mocks.list,
  getWriterPacingRevisionSet: mocks.get,
  updateWriterPacingRevisionChange: mocks.update,
  discardWriterPacingRevisionSet: mocks.discard,
}));

import { useWriterPacingRevisionSet } from '../useWriterPacingRevisionSet';

const ISSUE_ID = '10000000-0000-4000-8000-000000000001';
const SET_ID = '10000000-0000-4000-8000-000000000002';
const ITEM_ID = '10000000-0000-4000-8000-000000000003';
const PAGE_ID = '10000000-0000-4000-8000-000000000004';

const revisionSet: PacingRevisionSet = {
  id: SET_ID,
  issue_id: ISSUE_ID,
  status: 'partially_ready',
  pacing_review_json: {},
  source_outline_json: {},
  proposed_outline_json: {},
  source_fingerprint: 'source',
  progress_json: { total_pages: 1, completed_pages: [], current_page: null, stopped: false },
  failure_ledger: [],
  items: [{
    id: ITEM_ID,
    revision_set_id: SET_ID,
    position: 0,
    title: 'Opening',
    rationale: 'Improve the opening.',
    affected_page_numbers: [1],
    generation_status: 'pending',
    changes: [],
  }],
};

describe('useWriterPacingRevisionSet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({ ok: true, sets: [] });
    mocks.get.mockResolvedValue({ ok: true, set: revisionSet });
    mocks.discard.mockResolvedValue({ ok: true });
  });

  it('creates the outline preview then runs exactly one page per request', async () => {
    mocks.invoke
      .mockResolvedValueOnce({ success: true, mode: 'pacing_revision_outline_preview', data: revisionSet })
      .mockResolvedValueOnce({ success: true, mode: 'pacing_revision_page_preview', data: {} });
    const { result } = renderHook(() => useWriterPacingRevisionSet(
      ISSUE_ID,
      [{ id: PAGE_ID, page_number: 1 }],
    ));
    await waitFor(() => expect(mocks.list).toHaveBeenCalled());

    await act(async () => { await result.current.create(); });

    expect(mocks.invoke).toHaveBeenNthCalledWith(1, {
      mode: 'pacing_revision_outline_preview',
      issue_id: ISSUE_ID,
    });
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, {
      mode: 'pacing_revision_page_preview',
      revision_set_id: SET_ID,
      page_id: PAGE_ID,
    });
  });

  it('resumes the newest persisted non-discarded set on load', async () => {
    mocks.list.mockResolvedValue({ ok: true, sets: [revisionSet] });
    const { result } = renderHook(() => useWriterPacingRevisionSet(ISSUE_ID, []));
    await waitFor(() => expect(result.current.activeSet?.id).toBe(SET_ID));
    expect(result.current.loading).toBe(false);
  });
});
