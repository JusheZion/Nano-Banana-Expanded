import { describe, expect, it } from 'vitest';
import type { PacingRevisionChange, PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';
import {
  approvedPacingRevisionChanges,
  effectivePacingRevisionCandidate,
  eligiblePacingRevisionChanges,
  pacingRevisionLayerSummary,
  pacingRevisionDependencyBlockers,
  pacingRevisionMissingDependencyIds,
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

  it('uses the Apply dependency predicate for approved parents that are not ready', () => {
    const failedOutline = change({
      decision: 'approved',
      generation_status: 'failed',
    });
    const beats = change({
      layer: 'beats',
      decision: 'approved',
      dependency_ids: [failedOutline.id],
    });
    const set = setWith([failedOutline, beats]);

    expect(pacingRevisionDependencyBlockers(beats, [failedOutline, beats])).toEqual([failedOutline]);
    expect(approvedPacingRevisionChanges(set)).toEqual([]);
  });

  it('fails closed when an approved change references a missing dependency', () => {
    const missingDependencyId = crypto.randomUUID();
    const beats = change({
      layer: 'beats',
      decision: 'approved',
      dependency_ids: [missingDependencyId],
    });
    const set = setWith([beats]);

    expect(pacingRevisionMissingDependencyIds(beats, [beats])).toEqual([missingDependencyId]);
    expect(approvedPacingRevisionChanges(set)).toEqual([]);
    expect(pacingRevisionLayerSummary(set, 'beats')).toEqual({
      remaining: 0,
      ready: 0,
      applied: 0,
      rejected: 0,
    });
  });

  it('summarizes current remaining, dependency-valid ready, applied, and rejected changes', () => {
    const outline = change({ decision: 'approved' });
    const pendingBeats = change({ layer: 'beats', decision: 'pending' });
    const readyBeats = change({
      layer: 'beats',
      decision: 'approved',
      dependency_ids: [outline.id],
    });
    const blockedBeats = change({
      layer: 'beats',
      decision: 'approved',
      dependency_ids: [change().id],
    });
    const appliedBeats = change({
      layer: 'beats',
      decision: 'approved',
      generation_status: 'applied',
    });
    const rejectedBeats = change({
      layer: 'beats',
      decision: 'rejected',
    });
    const set = setWith([
      outline,
      pendingBeats,
      readyBeats,
      blockedBeats,
      appliedBeats,
      rejectedBeats,
    ]);

    expect(pacingRevisionLayerSummary(set, 'beats')).toEqual({
      remaining: 1,
      ready: 1,
      applied: 1,
      rejected: 1,
    });
  });

  it('counts only pending ready changes as remaining', () => {
    const pendingReady = change({ layer: 'beats', generation_status: 'ready' });
    const unavailableStatuses = ['pending', 'failed', 'stale', 'locked'] as const;
    const unavailable = unavailableStatuses.map((generationStatus) =>
      change({ layer: 'beats', generation_status: generationStatus })
    );

    expect(pacingRevisionLayerSummary(
      setWith([pendingReady, ...unavailable]),
      'beats',
    ).remaining).toBe(1);
  });
});
