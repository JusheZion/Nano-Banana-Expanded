import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  list: vi.fn(),
  listHistory: vi.fn(),
  archive: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  updateProgress: vi.fn(),
  discard: vi.fn(),
}));

vi.mock('@/shared/api/writerTools', () => ({ invokeWriterTools: mocks.invoke }));
vi.mock('@/shared/api/writerPacingRevisionSets', () => ({
  listWriterPacingRevisionSets: mocks.list,
  listWriterPacingRevisionSetHistory: mocks.listHistory,
  archiveWriterPacingRevisionSet: mocks.archive,
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
const PHYSICAL_PAGE_71_ID = '10000000-0000-4000-8000-000000000071';

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
  created_at: '2026-07-27T09:00:00.000Z',
  updated_at: '2026-07-27T10:00:00.000Z',
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

const mixedPhysicalVirtualSet: PacingRevisionSet = {
  ...revisionSet,
  progress_json: {
    total_pages: 3,
    completed_pages: [],
    current_page: null,
    stopped: false,
  },
  items: [{
    ...revisionSet.items[0]!,
    affected_page_numbers: [73, 71, 72],
  }],
};

describe('useWriterPacingRevisionSet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({ ok: true, sets: [] });
    mocks.listHistory.mockResolvedValue({ ok: true, sets: [] });
    mocks.archive.mockResolvedValue({ ok: true });
    mocks.get.mockResolvedValue({ ok: true, set: revisionSet });
    mocks.updateProgress.mockResolvedValue({ ok: true, set: revisionSet });
    mocks.discard.mockResolvedValue({ ok: true });
  });

  it('loads active and history independently on issue change', async () => {
    const archivedSet = { ...revisionSet, status: 'archived' as const };
    mocks.list.mockResolvedValue({ ok: true, sets: [revisionSet] });
    mocks.listHistory.mockResolvedValue({ ok: true, sets: [archivedSet] });

    const { result } = renderHook(() => useWriterPacingRevisionSet(ISSUE_ID, []));

    await waitFor(() => expect(result.current.activeSet?.id).toBe(SET_ID));
    await waitFor(() => expect(result.current.historySets).toEqual([archivedSet]));
    expect(result.current.loading).toBe(false);
    expect(result.current.historyLoading).toBe(false);
  });

  it('preserves active state when history loading fails and exposes a retry', async () => {
    mocks.list.mockResolvedValue({ ok: true, sets: [revisionSet] });
    mocks.listHistory.mockResolvedValueOnce({ ok: false, error: 'History unavailable' });

    const { result } = renderHook(() => useWriterPacingRevisionSet(ISSUE_ID, []));

    await waitFor(() => expect(result.current.activeSet?.id).toBe(SET_ID));
    await waitFor(() => expect(result.current.historyError).toBe('History unavailable'));

    mocks.listHistory.mockResolvedValue({ ok: true, sets: [] });
    await act(async () => { await result.current.refreshHistory(); });

    expect(result.current.activeSet?.id).toBe(SET_ID);
    expect(result.current.historyError).toBeNull();
  });

  it('selects and closes an archived history set', async () => {
    const archivedSet = { ...revisionSet, status: 'archived' as const };
    mocks.listHistory.mockResolvedValue({ ok: true, sets: [archivedSet] });
    const { result } = renderHook(() => useWriterPacingRevisionSet(ISSUE_ID, []));
    await waitFor(() => expect(result.current.historySets).toHaveLength(1));

    act(() => { result.current.selectHistory(archivedSet); });
    expect(result.current.selectedHistorySet).toEqual(archivedSet);

    act(() => { result.current.closeHistory(); });
    expect(result.current.selectedHistorySet).toBeNull();
  });

  it('guardedly archives the captured active set and moves it into history', async () => {
    const appliedSet = { ...revisionSet, status: 'applied' as const };
    const archivedSet = { ...appliedSet, status: 'archived' as const };
    mocks.list.mockResolvedValueOnce({ ok: true, sets: [appliedSet] })
      .mockResolvedValue({ ok: true, sets: [] });
    mocks.listHistory.mockResolvedValueOnce({ ok: true, sets: [] })
      .mockResolvedValue({ ok: true, sets: [archivedSet] });
    const { result } = renderHook(() => useWriterPacingRevisionSet(ISSUE_ID, []));
    await waitFor(() => expect(result.current.activeSet?.status).toBe('applied'));

    let archiveResult: Awaited<ReturnType<typeof result.current.archiveActive>> | undefined;
    await act(async () => {
      archiveResult = await result.current.archiveActive(appliedSet);
    });

    expect(mocks.archive).toHaveBeenCalledWith({
      setId: SET_ID,
      expectedStatus: 'applied',
      expectedUpdatedAt: '2026-07-27T10:00:00.000Z',
    });
    expect(archiveResult).toEqual({ ok: true });
    expect(result.current.activeSet).toBeNull();
    expect(result.current.historySets).toContainEqual(expect.objectContaining({
      id: SET_ID,
      status: 'archived',
    }));
  });

  it('preserves the active set and exposes the archive error when the guard fails', async () => {
    const appliedSet = { ...revisionSet, status: 'applied' as const };
    mocks.list.mockResolvedValue({ ok: true, sets: [appliedSet] });
    mocks.archive.mockResolvedValue({ ok: false, error: 'Revision Set changed' });
    const { result } = renderHook(() => useWriterPacingRevisionSet(ISSUE_ID, []));
    await waitFor(() => expect(result.current.activeSet?.status).toBe('applied'));

    let archiveResult: Awaited<ReturnType<typeof result.current.archiveActive>> | undefined;
    await act(async () => {
      archiveResult = await result.current.archiveActive(appliedSet);
    });

    expect(archiveResult).toEqual({ ok: false, error: 'Revision Set changed' });
    expect(result.current.activeSet).toEqual(appliedSet);
    expect(result.current.error).toBe('Revision Set changed');
  });

  it('returns archive detail without surfacing a second hook error when the Portal owns the message', async () => {
    const appliedSet = { ...revisionSet, status: 'applied' as const };
    mocks.list.mockResolvedValue({ ok: true, sets: [appliedSet] });
    mocks.archive.mockResolvedValue({ ok: false, error: 'updated_at changed' });
    const { result } = renderHook(() => useWriterPacingRevisionSet(ISSUE_ID, []));
    await waitFor(() => expect(result.current.activeSet?.status).toBe('applied'));

    let archiveResult: Awaited<ReturnType<typeof result.current.archiveActive>> | undefined;
    await act(async () => {
      archiveResult = await result.current.archiveActive(appliedSet, { surfaceError: false });
    });

    expect(archiveResult).toEqual({ ok: false, error: 'updated_at changed' });
    expect(result.current.activeSet).toEqual(appliedSet);
    expect(result.current.error).toBeNull();
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
      page_number: 1,
      include_beats: true,
      include_dialogue: false,
    });
    expect(mocks.invoke).toHaveBeenNthCalledWith(3, {
      mode: 'pacing_revision_page_preview',
      revision_set_id: SET_ID,
      page_id: PAGE_ID,
      page_number: 1,
      include_beats: false,
      include_dialogue: true,
    });
  });

  it('queues mixed physical and virtual pages in numeric order with nullable physical identity', async () => {
    mocks.invoke
      .mockResolvedValueOnce({
        success: true,
        mode: 'pacing_revision_outline_preview',
        data: mixedPhysicalVirtualSet,
      })
      .mockResolvedValue({ success: true, mode: 'pacing_revision_page_preview', data: {} });
    mocks.get.mockResolvedValue({ ok: true, set: mixedPhysicalVirtualSet });
    const { result } = renderHook(() => useWriterPacingRevisionSet(
      ISSUE_ID,
      [{ id: PHYSICAL_PAGE_71_ID, page_number: 71 }],
    ));
    await waitFor(() => expect(mocks.list).toHaveBeenCalled());

    await act(async () => { await result.current.create(); });

    expect(mocks.invoke.mock.calls.slice(1).map(([request]) => ({
      page_id: request.page_id,
      page_number: request.page_number,
      include_beats: request.include_beats,
      include_dialogue: request.include_dialogue,
    }))).toEqual([
      { page_id: PHYSICAL_PAGE_71_ID, page_number: 71, include_beats: true, include_dialogue: false },
      { page_id: PHYSICAL_PAGE_71_ID, page_number: 71, include_beats: false, include_dialogue: true },
      { page_id: null, page_number: 72, include_beats: true, include_dialogue: false },
      { page_id: null, page_number: 72, include_beats: false, include_dialogue: true },
      { page_id: null, page_number: 73, include_beats: true, include_dialogue: false },
      { page_id: null, page_number: 73, include_beats: false, include_dialogue: true },
    ]);
    expect(result.current.error).not.toBe('The affected pages are not available in the current issue.');
  });

  it('resumes a virtual page by skipping ready Beats and generating Dialogue only', async () => {
    const virtualBeatsId = '10000000-0000-4000-8000-000000000072';
    const resumableVirtualSet: PacingRevisionSet = {
      ...mixedPhysicalVirtualSet,
      items: [{
        ...mixedPhysicalVirtualSet.items[0]!,
        affected_page_numbers: [72],
        changes: [{
          id: virtualBeatsId,
          item_id: ITEM_ID,
          layer: 'beats',
          target_key: 'virtual-page:72',
          page_id: null,
          page_number: 72,
          current_value: null,
          ai_proposal: { panels: [{ action: 'A new bridge scene.' }] },
          edited_candidate: null,
          decision: 'pending',
          dependency_ids: [],
          reason: 'Restore the bridge.',
          source_fingerprint: 'virtual-beats-source',
          generation_status: 'ready',
        }],
      }],
    };
    mocks.list.mockResolvedValue({ ok: true, sets: [resumableVirtualSet] });
    mocks.get.mockResolvedValue({ ok: true, set: resumableVirtualSet });
    mocks.invoke.mockResolvedValue({
      success: true,
      mode: 'pacing_revision_page_preview',
      data: {},
    });
    const { result } = renderHook(() => useWriterPacingRevisionSet(ISSUE_ID, []));
    await waitFor(() => expect(result.current.activeSet?.id).toBe(SET_ID));

    await act(async () => { await result.current.generatePages(); });

    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledWith({
      mode: 'pacing_revision_page_preview',
      revision_set_id: SET_ID,
      page_id: null,
      page_number: 72,
      include_beats: false,
      include_dialogue: true,
    });
    expect(result.current.error).not.toBe('The affected pages are not available in the current issue.');
  });

  it('retries only the failed virtual layer without regenerating successful work', async () => {
    const virtualBeatsId = '10000000-0000-4000-8000-000000000073';
    const retryableVirtualSet: PacingRevisionSet = {
      ...mixedPhysicalVirtualSet,
      items: [{
        ...mixedPhysicalVirtualSet.items[0]!,
        affected_page_numbers: [72, 73],
        changes: [{
          id: virtualBeatsId,
          item_id: ITEM_ID,
          layer: 'beats',
          target_key: 'virtual-page:73',
          page_id: null,
          page_number: 73,
          current_value: null,
          ai_proposal: { panels: [{ action: 'The successful Beats candidate.' }] },
          edited_candidate: null,
          decision: 'pending',
          dependency_ids: [],
          reason: 'Preserve successful work.',
          source_fingerprint: 'virtual-beats-source',
          generation_status: 'ready',
        }],
      }],
    };
    mocks.list.mockResolvedValue({ ok: true, sets: [retryableVirtualSet] });
    mocks.get.mockResolvedValue({ ok: true, set: retryableVirtualSet });
    mocks.invoke.mockResolvedValue({
      success: true,
      mode: 'pacing_revision_page_preview',
      data: {},
    });
    const { result } = renderHook(() => useWriterPacingRevisionSet(ISSUE_ID, []));
    await waitFor(() => expect(result.current.activeSet?.id).toBe(SET_ID));

    await act(async () => {
      await result.current.retryFailed([{ page: 73, layer: 'dialogue' }]);
    });

    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledWith({
      mode: 'pacing_revision_page_preview',
      revision_set_id: SET_ID,
      page_id: null,
      page_number: 73,
      include_beats: false,
      include_dialogue: true,
    });
    expect(mocks.invoke).not.toHaveBeenCalledWith(expect.objectContaining({ page_number: 72 }));
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
      page_number: 1,
      include_beats: true,
      include_dialogue: false,
    });
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, {
      mode: 'pacing_revision_page_preview',
      revision_set_id: SET_ID,
      page_id: PAGE_ID,
      page_number: 1,
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
      page_number: 1,
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

  it('removes a legacy completed page when a required child layer still fails', async () => {
    const legacyCompleteSet: PacingRevisionSet = {
      ...revisionSet,
      progress_json: {
        ...revisionSet.progress_json,
        completed_pages: [1],
      },
    };
    mocks.list.mockResolvedValue({ ok: true, sets: [legacyCompleteSet] });
    mocks.get.mockResolvedValue({ ok: true, set: legacyCompleteSet });
    mocks.invoke
      .mockResolvedValueOnce({ success: true, mode: 'pacing_revision_page_preview', data: {} })
      .mockResolvedValueOnce({ success: false, error: 'Page candidate failed', details: 'Dialogue timed out' });
    const { result } = renderHook(() => useWriterPacingRevisionSet(
      ISSUE_ID,
      [{ id: PAGE_ID, page_number: 1 }],
    ));
    await waitFor(() => expect(result.current.activeSet?.id).toBe(SET_ID));

    await act(async () => { await result.current.generatePages(); });

    expect(mocks.updateProgress).toHaveBeenLastCalledWith(
      SET_ID,
      expect.objectContaining({ completed_pages: [] }),
    );
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

  it('refreshes the set after a Beats edit so dependent Dialogue becomes stale and recoverable', async () => {
    const beatsChange = {
      id: '10000000-0000-4000-8000-000000000005',
      item_id: ITEM_ID,
      layer: 'beats' as const,
      target_key: `page:${PAGE_ID}`,
      page_id: PAGE_ID,
      page_number: 1,
      current_value: {},
      ai_proposal: { panels: [{ action: 'Open' }] },
      edited_candidate: null,
      decision: 'pending' as const,
      dependency_ids: [],
      reason: 'Improve pacing.',
      source_fingerprint: 'beats-source',
      generation_status: 'ready' as const,
    };
    const dialogueChange = {
      id: '10000000-0000-4000-8000-000000000006',
      item_id: ITEM_ID,
      layer: 'dialogue' as const,
      target_key: `page:${PAGE_ID}`,
      page_id: PAGE_ID,
      page_number: 1,
      current_value: '',
      ai_proposal: 'CAPTION: Open.',
      edited_candidate: null,
      decision: 'approved' as const,
      dependency_ids: [beatsChange.id],
      reason: 'Improve pacing.',
      source_fingerprint: 'dialogue-source',
      generation_status: 'ready' as const,
    };
    const completeSet: PacingRevisionSet = {
      ...revisionSet,
      progress_json: { ...revisionSet.progress_json, completed_pages: [1] },
      items: [{
        ...revisionSet.items[0]!,
        generation_status: 'ready',
        changes: [beatsChange, dialogueChange],
      }],
    };
    const staleSet: PacingRevisionSet = {
      ...completeSet,
      progress_json: { ...completeSet.progress_json, completed_pages: [] },
      items: [{
        ...completeSet.items[0]!,
        generation_status: 'pending',
        changes: [
          { ...beatsChange, edited_candidate: { panels: [{ action: 'Open wider' }] } },
          { ...dialogueChange, decision: 'pending', generation_status: 'stale' },
        ],
      }],
    };
    mocks.list.mockResolvedValue({ ok: true, sets: [completeSet] });
    mocks.update.mockResolvedValue({
      ok: true,
      change: { ...beatsChange, edited_candidate: { panels: [{ action: 'Open wider' }] } },
    });
    mocks.get.mockResolvedValue({ ok: true, set: staleSet });
    const { result } = renderHook(() => useWriterPacingRevisionSet(
      ISSUE_ID,
      [{ id: PAGE_ID, page_number: 1 }],
    ));
    await waitFor(() => expect(result.current.activeSet?.id).toBe(SET_ID));
    expect(result.current.hasPendingCandidates).toBe(false);

    await act(async () => {
      await result.current.updateChange(beatsChange.id, {
        edited_candidate: { panels: [{ action: 'Open wider' }] },
      });
    });

    expect(mocks.get).toHaveBeenCalledWith(SET_ID);
    expect(result.current.hasPendingCandidates).toBe(true);
    expect(result.current.activeSet?.items[0]?.changes.find((change) => change.layer === 'dialogue'))
      .toMatchObject({ decision: 'pending', generation_status: 'stale' });
  });
});
