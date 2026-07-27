import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  neq: vi.fn(),
  order: vi.fn(),
  update: vi.fn(),
  single: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { from: mocks.from, rpc: mocks.rpc },
}));

import {
  archiveWriterPacingRevisionSet,
  beginWriterPacingRevisionApply,
  completeWriterPacingRevisionSet,
  listWriterPacingRevisionSetHistory,
  listWriterPacingRevisionSets,
  markWriterPacingRevisionRecoveryRequired,
  recoverWriterPacingRevisionApply,
  undoWriterPacingRevisionSet,
  updateWriterPacingRevisionApplySnapshot,
  updateWriterPacingRevisionChange,
} from '../writerPacingRevisionSets';

const SET_ID = '10000000-0000-4000-8000-000000000001';
const ITEM_ID = '10000000-0000-4000-8000-000000000002';
const CHANGE_ID = '10000000-0000-4000-8000-000000000003';
const ISSUE_ID = '10000000-0000-4000-8000-000000000004';
const UPDATED_AT = '2026-07-27T10:00:00.000Z';
const snapshot = {
  outline: {},
  beats: [],
  dialogue: [],
  createdPages: [],
  sourcePageCount: 1,
  targetPageCount: 2,
  appliedIds: [CHANGE_ID],
};
const expectation = {
  issue_id: ISSUE_ID,
  outline_id: '10000000-0000-4000-8000-000000000005',
  outline_json: {},
  target_page_count: 2,
  pages: [],
};

function updateChain(result: { data: unknown[] | null; error: { message: string } | null }) {
  const chain = {
    eq: vi.fn(),
    in: vi.fn(),
    select: vi.fn().mockResolvedValue(result),
  };
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  return chain;
}

const setRow = {
  id: SET_ID,
  issue_id: ISSUE_ID,
  status: 'ready',
  pacing_review_json: {},
  source_outline_json: {},
  proposed_outline_json: {},
  source_fingerprint: 'source',
  progress_json: { total_pages: 0, completed_pages: [], current_page: null, stopped: false },
  failure_ledger: [],
  items: [{
    id: ITEM_ID,
    revision_set_id: SET_ID,
    position: 0,
    title: 'Delay reveal',
    rationale: 'Improve escalation.',
    affected_page_numbers: [24],
    generation_status: 'ready',
    changes: [],
  }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockReset();
  mocks.from.mockReturnValue({ select: mocks.select, update: mocks.update });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ neq: mocks.neq, select: mocks.select });
  mocks.neq.mockReturnValue({ order: mocks.order });
  mocks.order.mockResolvedValue({ data: [setRow], error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.single.mockResolvedValue({
    data: {
      id: CHANGE_ID,
      item_id: ITEM_ID,
      layer: 'dialogue',
      target_key: 'page:24:dialogue',
      page_number: 24,
      current_value: 'MARA: Open it.',
      ai_proposal: 'MARA: Not yet.',
      edited_candidate: null,
      decision: 'approved',
      dependency_ids: [],
      reason: 'Delay the reveal.',
      source_fingerprint: 'source',
      generation_status: 'ready',
    },
    error: null,
  });
});

describe('writer pacing revision persistence', () => {
  it('lists active sets newest first without archived or discarded sets', async () => {
    const chain = {
      eq: vi.fn(),
      neq: vi.fn(),
      order: vi.fn().mockResolvedValue({ data: [setRow], error: null }),
    };
    chain.eq.mockReturnValue(chain);
    chain.neq.mockReturnValue(chain);
    mocks.select.mockReturnValueOnce(chain);

    await expect(listWriterPacingRevisionSets(ISSUE_ID)).resolves.toEqual({
      ok: true,
      sets: [expect.objectContaining({ id: SET_ID, items: [expect.objectContaining({ id: ITEM_ID })] })],
    });
    expect(mocks.from).toHaveBeenCalledWith('writer_pacing_revision_sets');
    expect(chain.eq).toHaveBeenCalledWith('issue_id', ISSUE_ID);
    expect(chain.neq).toHaveBeenNthCalledWith(1, 'status', 'archived');
    expect(chain.neq).toHaveBeenNthCalledWith(2, 'status', 'discarded');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('lists archived history only and newest first', async () => {
    const archivedRow = { ...setRow, status: 'archived' };
    const chain = {
      eq: vi.fn(),
      order: vi.fn().mockResolvedValue({ data: [archivedRow], error: null }),
    };
    chain.eq.mockReturnValue(chain);
    mocks.select.mockReturnValueOnce(chain);

    await expect(listWriterPacingRevisionSetHistory(ISSUE_ID)).resolves.toEqual({
      ok: true,
      sets: [expect.objectContaining({ id: SET_ID, status: 'archived' })],
    });

    expect(chain.eq).toHaveBeenNthCalledWith(1, 'issue_id', ISSUE_ID);
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'status', 'archived');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('archives an eligible set through the exact guarded RPC arguments', async () => {
    await expect(archiveWriterPacingRevisionSet({
      setId: SET_ID,
      expectedStatus: 'applied',
      expectedUpdatedAt: UPDATED_AT,
    })).resolves.toEqual({ ok: true });

    expect(mocks.rpc).toHaveBeenCalledWith('archive_writer_pacing_revision_set', {
      p_set_id: SET_ID,
      p_expected_status: 'applied',
      p_expected_updated_at: UPDATED_AT,
    });
  });

  it('fails before the archive RPC when the expected status is ineligible', async () => {
    await expect(archiveWriterPacingRevisionSet({
      setId: SET_ID,
      expectedStatus: 'applying',
      expectedUpdatedAt: UPDATED_AT,
    } as Parameters<typeof archiveWriterPacingRevisionSet>[0])).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/not eligible/i),
    });

    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('fails before the archive RPC when updated_at is absent', async () => {
    await expect(archiveWriterPacingRevisionSet({
      setId: SET_ID,
      expectedStatus: 'ready',
    } as Parameters<typeof archiveWriterPacingRevisionSet>[0])).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/updated_at/i),
    });

    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('persists an individual decision without replacing the AI proposal', async () => {
    mocks.select.mockReturnValueOnce({ eq: mocks.eq });
    mocks.eq.mockReturnValueOnce({ select: () => ({ single: mocks.single }) });

    const result = await updateWriterPacingRevisionChange(CHANGE_ID, { decision: 'approved' });

    expect(result).toEqual({
      ok: true,
      change: expect.objectContaining({ id: CHANGE_ID, decision: 'approved' }),
    });
    expect(mocks.update).toHaveBeenCalledWith({ decision: 'approved' });
  });

  it('begins Apply only from an allowed state and stores the base recovery snapshot', async () => {
    const chain = updateChain({ data: [{ id: SET_ID }], error: null });
    const update = vi.fn().mockReturnValue(chain);
    mocks.from.mockReturnValue({ update });

    await expect(beginWriterPacingRevisionApply(SET_ID, snapshot)).resolves.toEqual({ ok: true });

    expect(update).toHaveBeenCalledWith({
      status: 'applying',
      apply_snapshot: snapshot,
      recovery_status: 'applying',
    });
    expect(chain.eq).toHaveBeenCalledWith('id', SET_ID);
    expect(chain.in).toHaveBeenCalledWith('status', ['ready', 'partially_ready']);
  });

  it('fails begin when the set is no longer in an allowed state', async () => {
    const chain = updateChain({ data: [], error: null });
    mocks.from.mockReturnValue({ update: vi.fn().mockReturnValue(chain) });

    await expect(beginWriterPacingRevisionApply(SET_ID, snapshot)).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/could not begin/i),
    });
  });

  it('updates created-page recovery IDs only while the set is applying', async () => {
    const chain = updateChain({ data: [{ id: SET_ID }], error: null });
    const update = vi.fn().mockReturnValue(chain);
    mocks.from.mockReturnValue({ update });
    const withCreated = {
      ...snapshot,
      createdPages: [{ pageId: 'page-2', pageNumber: 2 }],
    };

    await expect(updateWriterPacingRevisionApplySnapshot(SET_ID, withCreated)).resolves.toEqual({ ok: true });

    expect(update).toHaveBeenCalledWith({
      apply_snapshot: withCreated,
      recovery_status: 'applying',
    });
    expect(chain.eq).toHaveBeenCalledWith('status', 'applying');
  });

  it('completes the set and exact children through one transactional RPC', async () => {
    await expect(completeWriterPacingRevisionSet(
      SET_ID,
      [CHANGE_ID],
      snapshot,
      expectation,
    )).resolves.toEqual({ ok: true });

    expect(mocks.rpc).toHaveBeenCalledWith('complete_writer_pacing_revision_apply', {
      p_set_id: SET_ID,
      p_change_ids: [CHANGE_ID],
      p_snapshot: snapshot,
      p_expectation: expectation,
    });
  });

  it('restores live content and reopens the set through one transactional RPC', async () => {
    await expect(undoWriterPacingRevisionSet(SET_ID))
      .resolves.toEqual({ ok: true });

    expect(mocks.rpc).toHaveBeenCalledWith('undo_writer_pacing_revision_apply', {
      p_set_id: SET_ID,
    });
  });

  it('normalizes a legacy applied snapshot and retries Undo once', async () => {
    mocks.rpc
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Applied recovery snapshot is invalid' },
      })
      .mockResolvedValueOnce({ data: true, error: null });

    await expect(undoWriterPacingRevisionSet(SET_ID))
      .resolves.toEqual({ ok: true });

    expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'undo_writer_pacing_revision_apply', {
      p_set_id: SET_ID,
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'undo_legacy_writer_pacing_revision_apply', {
      p_set_id: SET_ID,
    });
  });

  it('does not reinterpret a modern Undo validation failure as legacy data', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Applied page content changed before Undo' },
    });

    await expect(undoWriterPacingRevisionSet(SET_ID))
      .resolves.toEqual({
        ok: false,
        error: 'Applied page content changed before Undo',
      });

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it('requires the exact legacy-invalid error before attempting compatibility recovery', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Undo failed: Applied recovery snapshot is invalid; retry' },
    });

    await expect(undoWriterPacingRevisionSet(SET_ID))
      .resolves.toEqual({
        ok: false,
        error: 'Undo failed: Applied recovery snapshot is invalid; retry',
      });

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it('fails closed when a transactional RPC rejects the transition', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'state changed' } });

    await expect(completeWriterPacingRevisionSet(SET_ID, [CHANGE_ID], snapshot, expectation)).resolves.toEqual({
      ok: false,
      error: 'state changed',
    });
  });

  it('returns a recovered set to ready only after verified cleanup', async () => {
    const chain = updateChain({ data: [{ id: SET_ID }], error: null });
    const update = vi.fn().mockReturnValue(chain);
    mocks.from.mockReturnValue({ update });

    await expect(recoverWriterPacingRevisionApply(
      SET_ID,
      snapshot,
      'cleanup verified',
      true,
    )).resolves.toEqual({ ok: true });

    expect(update).toHaveBeenCalledWith({
      status: 'ready',
      apply_snapshot: snapshot,
      recovery_status: 'recovered: cleanup verified',
    });
  });

  it('keeps incomplete cleanup in applying with visible recovery detail', async () => {
    const chain = updateChain({ data: [{ id: SET_ID }], error: null });
    const update = vi.fn().mockReturnValue(chain);
    mocks.from.mockReturnValue({ update });

    await recoverWriterPacingRevisionApply(SET_ID, snapshot, 'page cleanup failed', false);

    expect(update).toHaveBeenCalledWith({
      status: 'applying',
      apply_snapshot: snapshot,
      recovery_status: 'recovery_required: page cleanup failed',
    });
  });

  it('marks an ambiguous applied Undo as recovery required without changing status', async () => {
    const chain = updateChain({ data: [{ id: SET_ID }], error: null });
    const update = vi.fn().mockReturnValue(chain);
    mocks.from.mockReturnValue({ update });

    await expect(markWriterPacingRevisionRecoveryRequired(
      SET_ID,
      'applied',
      'reopen response lost',
    )).resolves.toEqual({ ok: true });

    expect(update).toHaveBeenCalledWith({
      recovery_status: 'recovery_required: reopen response lost',
    });
    expect(chain.eq).toHaveBeenCalledWith('status', 'applied');
  });
});
