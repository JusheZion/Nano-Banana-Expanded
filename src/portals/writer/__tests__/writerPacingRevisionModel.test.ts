import { describe, expect, it } from 'vitest';
import type { PacingRevisionChange, PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';
import {
  approvedPacingRevisionChanges,
  effectivePacingRevisionCandidate,
  eligiblePacingRevisionChanges,
  pacingRevisionDependencyBlockers,
} from '../writerPacingRevisionModel';

function change(overrides: Partial<PacingRevisionChange> = {}): PacingRevisionChange {
  return {
    id: crypto.randomUUID(),
    item_id: crypto.randomUUID(),
    layer: 'outline',
    target_key: 'outline:op',
    current_value: 'current',
    ai_proposal: 'AI',
    edited_candidate: null,
    decision: 'pending',
    dependency_ids: [],
    reason: 'Improve pacing',
    source_fingerprint: 'fingerprint',
    generation_status: 'ready',
    ...overrides,
  };
}

function setWith(changes: PacingRevisionChange[]): PacingRevisionSet {
  const itemId = changes[0]?.item_id ?? crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    issue_id: crypto.randomUUID(),
    status: 'ready',
    pacing_review_json: {},
    source_outline_json: {},
    proposed_outline_json: {},
    source_fingerprint: 'source',
    progress_json: { total_pages: 1, completed_pages: [1], current_page: null, stopped: false },
    failure_ledger: [],
    items: [{
      id: itemId,
      revision_set_id: crypto.randomUUID(),
      position: 0,
      title: 'Opening',
      rationale: 'Improve pacing',
      affected_page_numbers: [1],
      generation_status: 'ready',
      changes,
    }],
  };
}

describe('writerPacingRevisionModel', () => {
  it('uses an edited candidate without overwriting the AI proposal', () => {
    const candidate = change({ ai_proposal: 'AI', edited_candidate: 'Author edit' });
    expect(effectivePacingRevisionCandidate(candidate)).toBe('Author edit');
    expect(candidate.ai_proposal).toBe('AI');
  });

  it('excludes rejected, locked, and unselected changes from batch eligibility', () => {
    const ready = change();
    const rejected = change({ decision: 'rejected' });
    const locked = change({ generation_status: 'locked' });
    expect(eligiblePacingRevisionChanges(setWith([ready, rejected, locked]), {
      selectedIds: new Set([ready.id, rejected.id, locked.id]),
    })).toEqual([ready]);
  });

  it('blocks approved children whose required parent change is not approved', () => {
    const outline = change({ decision: 'pending' });
    const beats = change({
      layer: 'beats',
      decision: 'approved',
      dependency_ids: [outline.id],
    });
    const set = setWith([outline, beats]);
    expect(pacingRevisionDependencyBlockers(beats, [outline, beats])).toEqual([outline]);
    expect(approvedPacingRevisionChanges(set)).toEqual([]);
  });
});
