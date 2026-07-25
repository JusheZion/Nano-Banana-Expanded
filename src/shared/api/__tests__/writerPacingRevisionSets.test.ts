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
  listWriterPacingRevisionSets,
  updateWriterPacingRevisionChange,
} from '../writerPacingRevisionSets';

const SET_ID = '10000000-0000-4000-8000-000000000001';
const ITEM_ID = '10000000-0000-4000-8000-000000000002';
const CHANGE_ID = '10000000-0000-4000-8000-000000000003';
const ISSUE_ID = '10000000-0000-4000-8000-000000000004';

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
});
