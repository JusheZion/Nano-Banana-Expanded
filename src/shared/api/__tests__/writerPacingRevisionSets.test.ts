import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  neq: vi.fn(),
  order: vi.fn(),
  update: vi.fn(),
  single: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { from: mocks.from },
}));

import {
  beginWriterPacingRevisionApply,
  completeWriterPacingRevisionSet,
  listWriterPacingRevisionSets,
  reopenWriterPacingRevisionSetAfterUndo,
  updateWriterPacingRevisionApplySnapshot,
  updateWriterPacingRevisionChange,
} from '../writerPacingRevisionSets';

const SET_ID = '10000000-0000-4000-8000-000000000001';
const ITEM_ID = '10000000-0000-4000-8000-000000000002';
const CHANGE_ID = '10000000-0000-4000-8000-000000000003';
const ISSUE_ID = '10000000-0000-4000-8000-000000000004';
const snapshot = {
  outline: {},
  beats: [],
  dialogue: [],
  createdPages: [],
  sourcePageCount: 1,
  targetPageCount: 2,
  appliedIds: [CHANGE_ID],
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
  mocks.from.mockReturnValue({ select: mocks.select, update: mocks.update });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ neq: mocks.neq, select: mocks.select });
  mocks.neq.mockReturnValue({ order: mocks.order });
  mocks.order.mockResolvedValue({ data: [setRow], error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
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
  it('lists non-discarded sets with nested items and changes', async () => {
    await expect(listWriterPacingRevisionSets(ISSUE_ID)).resolves.toEqual({
      ok: true,
      sets: [expect.objectContaining({ id: SET_ID, items: [expect.objectContaining({ id: ITEM_ID })] })],
    });
    expect(mocks.from).toHaveBeenCalledWith('writer_pacing_revision_sets');
    expect(mocks.eq).toHaveBeenCalledWith('issue_id', ISSUE_ID);
    expect(mocks.neq).toHaveBeenCalledWith('status', 'discarded');
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

  it('fails closed when completion updates zero approved changes', async () => {
    const updateChanges = vi.fn().mockReturnValue(updateChain({ data: [], error: null }));
    const updateSet = vi.fn();
    mocks.from.mockImplementation((table: string) => table === 'writer_pacing_revision_changes'
      ? { update: updateChanges }
      : { update: updateSet });

    const result = await completeWriterPacingRevisionSet(
      SET_ID,
      [CHANGE_ID],
      { createdPages: [] },
    );

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/did not mark every approved change/i),
    });
    expect(updateSet).not.toHaveBeenCalled();
  });

  it('fails closed when Undo reopens zero applied changes', async () => {
    const updateChanges = vi.fn().mockReturnValue(updateChain({ data: [], error: null }));
    const updateSet = vi.fn()
      .mockReturnValueOnce(updateChain({ data: [{ id: SET_ID }], error: null }))
      .mockReturnValueOnce(updateChain({ data: [{ id: SET_ID }], error: null }));
    mocks.from.mockImplementation((table: string) => table === 'writer_pacing_revision_changes'
      ? { update: updateChanges }
      : { update: updateSet });

    const result = await reopenWriterPacingRevisionSetAfterUndo(SET_ID, [CHANGE_ID]);

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/did not reopen every applied change/i),
    });
    expect(updateSet).toHaveBeenCalledTimes(2);
  });

  it('requires applying status for completion and reports failed child rollback', async () => {
    const applyChildren = updateChain({ data: [{ id: CHANGE_ID }], error: null });
    const rollbackChildren = updateChain({ data: [], error: null });
    const completeSet = updateChain({ data: [], error: null });
    const changeUpdate = vi.fn()
      .mockReturnValueOnce(applyChildren)
      .mockReturnValueOnce(rollbackChildren);
    const setUpdate = vi.fn().mockReturnValue(completeSet);
    mocks.from.mockImplementation((table: string) => table === 'writer_pacing_revision_changes'
      ? { update: changeUpdate }
      : { update: setUpdate });

    const result = await completeWriterPacingRevisionSet(SET_ID, [CHANGE_ID], snapshot);

    expect(completeSet.eq).toHaveBeenCalledWith('status', 'applying');
    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/rollback.*every change/i),
    });
  });

  it('compensates the set back to applied when reopening children fails', async () => {
    const reopenSet = updateChain({ data: [{ id: SET_ID }], error: null });
    const compensateSet = updateChain({ data: [], error: null });
    const reopenChildren = updateChain({ data: null, error: { message: 'Child reopen failed' } });
    const setUpdate = vi.fn()
      .mockReturnValueOnce(reopenSet)
      .mockReturnValueOnce(compensateSet);
    const changeUpdate = vi.fn().mockReturnValue(reopenChildren);
    mocks.from.mockImplementation((table: string) => table === 'writer_pacing_revision_sets'
      ? { update: setUpdate }
      : { update: changeUpdate });

    const result = await reopenWriterPacingRevisionSetAfterUndo(SET_ID, [CHANGE_ID]);

    expect(reopenSet.eq).toHaveBeenCalledWith('status', 'applied');
    expect(compensateSet.eq).toHaveBeenCalledWith('status', 'ready');
    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/Child reopen failed.*compensation.*failed/i),
    });
  });
});
