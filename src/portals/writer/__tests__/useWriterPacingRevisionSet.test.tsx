import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  updateProgress: vi.fn(),
  discard: vi.fn(),
}));

vi.mock('@/shared/api/writerTools', () => ({ invokeWriterTools: mocks.invoke }));
vi.mock('@/shared/api/writerPacingRevisionSets', () => ({
  listWriterPacingRevisionSets: mocks.list,
  getWriterPacingRevisionSet: mocks.get,
  updateWriterPacingRevisionChange: mocks.update,
  updateWriterPacingRevisionProgress: mocks.updateProgress,
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
    mocks.updateProgress.mockResolvedValue({ ok: true, set: revisionSet });
    mocks.discard.mockResolvedValue({ ok: true });
  });

  it('creates the outline preview then runs Page Beats and Dialogue as separate requests', async () => {
    mocks.invoke
      .mockResolvedValueOnce({ success: true, mode: 'pacing_revision_outline_preview', data: revisionSet })
      .mockResolvedValueOnce({ success: true, mode: 'pacing_revision_page_preview', data: {} })
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
      include_beats: true,
      include_dialogue: false,
    });
    expect(mocks.invoke).toHaveBeenNthCalledWith(3, {
      mode: 'pacing_revision_page_preview',
      revision_set_id: SET_ID,
      page_id: PAGE_ID,
      include_beats: false,
      include_dialogue: true,
    });
  });

  it('resumes the newest persisted non-discarded set on load', async () => {
    mocks.list.mockResolvedValue({ ok: true, sets: [revisionSet] });
    const { result } = renderHook(() => useWriterPacingRevisionSet(ISSUE_ID, []));
    await waitFor(() => expect(result.current.activeSet?.id).toBe(SET_ID));
    expect(result.current.loading).toBe(false);
  });

  it('offers recovery when a ready set is missing page-layer candidates', async () => {
    mocks.list.mockResolvedValue({
      ok: true,
      sets: [{ ...revisionSet, status: 'ready' }],
    });
    mocks.invoke.mockResolvedValue({
      success: true,
      mode: 'pacing_revision_page_preview',
      data: {},
    });
    const { result } = renderHook(() => useWriterPacingRevisionSet(
      ISSUE_ID,
      [{ id: PAGE_ID, page_number: 1 }],
    ));
    await waitFor(() => expect(result.current.activeSet?.status).toBe('ready'));

    expect(result.current.hasPendingCandidates).toBe(true);
    await act(async () => { await result.current.generatePages(); });

    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(mocks.invoke).toHaveBeenNthCalledWith(1, {
      mode: 'pacing_revision_page_preview',
      revision_set_id: SET_ID,
      page_id: PAGE_ID,
      include_beats: true,
      include_dialogue: false,
    });
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, {
      mode: 'pacing_revision_page_preview',
      revision_set_id: SET_ID,
      page_id: PAGE_ID,
      include_beats: false,
      include_dialogue: true,
    });
  });

  it('resumes a partial page by invoking only the missing Dialogue layer', async () => {
    const partialSet: PacingRevisionSet = {
      ...revisionSet,
      items: [{
        ...revisionSet.items[0]!,
        changes: [{
          id: '10000000-0000-4000-8000-000000000005',
          item_id: ITEM_ID,
          layer: 'beats',
          target_key: `page:${PAGE_ID}`,
          page_id: PAGE_ID,
          page_number: 1,
          current_value: {},
          ai_proposal: { panels: [{ action: 'Open' }] },
          edited_candidate: null,
          decision: 'pending',
          dependency_ids: [],
          reason: 'Improve pacing.',
          source_fingerprint: 'beats-source',
          generation_status: 'ready',
        }],
      }],
    };
    mocks.list.mockResolvedValue({ ok: true, sets: [partialSet] });
    mocks.invoke.mockResolvedValue({ success: true, mode: 'pacing_revision_page_preview', data: {} });
    const { result } = renderHook(() => useWriterPacingRevisionSet(
      ISSUE_ID,
      [{ id: PAGE_ID, page_number: 1 }],
    ));
    await waitFor(() => expect(result.current.activeSet?.id).toBe(SET_ID));

    await act(async () => { await result.current.generatePages(); });

    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledWith({
      mode: 'pacing_revision_page_preview',
      revision_set_id: SET_ID,
      page_id: PAGE_ID,
      include_beats: false,
      include_dialogue: true,
    });
  });

  it('preserves the Page Beats success when the following Dialogue request fails', async () => {
    mocks.list.mockResolvedValue({ ok: true, sets: [revisionSet] });
    mocks.invoke
      .mockResolvedValueOnce({ success: true, mode: 'pacing_revision_page_preview', data: {} })
      .mockResolvedValueOnce({ success: false, error: 'Page candidate failed', details: 'Dialogue timed out' });
    const { result } = renderHook(() => useWriterPacingRevisionSet(
      ISSUE_ID,
      [{ id: PAGE_ID, page_number: 1 }],
    ));
    await waitFor(() => expect(result.current.activeSet?.id).toBe(SET_ID));

    await act(async () => { await result.current.generatePages(); });

    expect(mocks.invoke).toHaveBeenNthCalledWith(1, expect.objectContaining({
      include_beats: true,
      include_dialogue: false,
    }));
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, expect.objectContaining({
      include_beats: false,
      include_dialogue: true,
    }));
    expect(result.current.error).toContain('need retry');
  });

  it('skips pages that already have both Page Beats and Dialogue candidates', async () => {
    mocks.list.mockResolvedValue({
      ok: true,
      sets: [{
        ...revisionSet,
        status: 'partially_ready',
        items: [{
          ...revisionSet.items[0]!,
          changes: [
            {
              id: '10000000-0000-4000-8000-000000000005',
              item_id: ITEM_ID,
              layer: 'beats',
              target_key: `page:${PAGE_ID}`,
              page_id: PAGE_ID,
              page_number: 1,
              current_value: {},
              ai_proposal: { panels: [{ action: 'Open' }] },
              edited_candidate: null,
              decision: 'pending',
              dependency_ids: [],
              reason: 'Improve pacing.',
              source_fingerprint: 'beats-source',
              generation_status: 'ready',
            },
            {
              id: '10000000-0000-4000-8000-000000000006',
              item_id: ITEM_ID,
              layer: 'dialogue',
              target_key: `page:${PAGE_ID}`,
              page_id: PAGE_ID,
              page_number: 1,
              current_value: '',
              ai_proposal: 'CAPTION: Open.',
              edited_candidate: null,
              decision: 'pending',
              dependency_ids: [],
              reason: 'Improve pacing.',
              source_fingerprint: 'dialogue-source',
              generation_status: 'ready',
            },
          ],
        }],
      }],
    });
    const { result } = renderHook(() => useWriterPacingRevisionSet(
      ISSUE_ID,
      [{ id: PAGE_ID, page_number: 1 }],
    ));
    await waitFor(() => expect(result.current.activeSet).not.toBeNull());

    expect(result.current.hasPendingCandidates).toBe(false);
    await act(async () => { await result.current.generatePages(); });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
