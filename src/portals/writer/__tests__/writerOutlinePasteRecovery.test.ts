import { describe, expect, it, vi } from 'vitest';
import type { WriterIssueOutlineRow } from '@/shared/api/arcsWriterRoom';
import {
  clearReviewedOutlineRecoveryErrors,
  getReviewedOutlineUndoAvailability,
  reviewedOutlineRecoveryGuidance,
  restoreReviewedOutlineInsert,
  type ReviewedOutlineInsert,
  type ReviewedOutlineRecoveryDeps,
} from '../writerOutlinePasteRecovery';

const previous: WriterIssueOutlineRow = {
  id: 'outline-2',
  issue_id: 'issue-1',
  version: 2,
  outline_json: { title: 'Before' },
  created_at: '2026-07-22T00:00:00.000Z',
  created_by: null,
  source_mode: 'ai',
};

const inserted: WriterIssueOutlineRow = {
  ...previous,
  id: 'outline-3',
  version: 3,
  outline_json: { title: 'After' },
  source_mode: 'paste_review',
};

const restored: WriterIssueOutlineRow = {
  ...previous,
  id: 'outline-4',
  version: 4,
  source_mode: 'restore',
};

function reviewedInsert(origin: ReviewedOutlineInsert['origin']): ReviewedOutlineInsert {
  return { insertedRow: inserted, previousOutline: previous, hadPreviousOutline: true, origin };
}

function createDeps(): ReviewedOutlineRecoveryDeps {
  let reloadCount = 0;
  return {
    reloadOutlines: vi.fn(async () => {
      reloadCount += 1;
      return reloadCount === 1
        ? { ok: true as const, rows: [inserted, previous] }
        : { ok: true as const, rows: [restored, inserted, previous] };
    }),
    restoreOutline: vi.fn(async () => ({ ok: true as const })),
  };
}

describe('reviewed outline recovery', () => {
  it.each(['source', 'official_editor'] as const)(
    'reloads and restores the preceding version for %s-origin inserts',
    async (origin) => {
      const deps = createDeps();

      const result = await restoreReviewedOutlineInsert(reviewedInsert(origin), 'issue-1', deps);

      expect(result).toMatchObject({ ok: true, rows: [restored, inserted, previous] });
      expect(deps.reloadOutlines).toHaveBeenCalledTimes(2);
      expect(deps.restoreOutline).toHaveBeenCalledWith({
        issueId: 'issue-1',
        outlineJson: previous.outline_json,
        restoredFromVersion: 2,
        nextVersion: 4,
      });
    },
  );

  it('preserves the insert recovery record when the required pre-restore reload fails', async () => {
    const deps = createDeps();
    vi.mocked(deps.reloadOutlines).mockResolvedValueOnce({ ok: false, error: 'refresh offline' });

    const result = await restoreReviewedOutlineInsert(reviewedInsert('source'), 'issue-1', deps);

    expect(result).toMatchObject({ ok: false, phase: 'reload', error: expect.stringMatching(/refresh offline/i) });
    expect(deps.restoreOutline).not.toHaveBeenCalled();
  });

  it('refuses to overwrite a version that advanced after the reviewed insert', async () => {
    const deps = createDeps();
    vi.mocked(deps.reloadOutlines).mockResolvedValueOnce({ ok: true, rows: [restored, inserted, previous] });

    const result = await restoreReviewedOutlineInsert(reviewedInsert('official_editor'), 'issue-1', deps);

    expect(result).toMatchObject({ ok: false, phase: 'conflict' });
    expect(deps.restoreOutline).not.toHaveBeenCalled();
  });

  it('does not reload or restore when the owning issue is not selected', async () => {
    const deps = createDeps();

    const result = await restoreReviewedOutlineInsert(reviewedInsert('source'), 'issue-2', deps);

    expect(result).toMatchObject({ ok: false, phase: 'wrong_issue', error: expect.stringMatching(/return to the owning issue/i) });
    expect(deps.reloadOutlines).not.toHaveBeenCalled();
    expect(deps.restoreOutline).not.toHaveBeenCalled();
  });

  it('exposes Undo only on the owning issue when a preceding version exists', () => {
    const insert = reviewedInsert('official_editor');

    expect(getReviewedOutlineUndoAvailability(insert, 'issue-1')).toEqual({
      available: true,
      reason: null,
      guidance: 'Undo is available for this reviewed update.',
    });
    expect(getReviewedOutlineUndoAvailability(insert, 'issue-2')).toEqual({
      available: false,
      reason: 'wrong_issue',
      guidance: 'Return to the owning issue to Undo this reviewed update.',
    });
    expect(reviewedOutlineRecoveryGuidance(insert)).toBe('Undo remains available.');
  });

  it('does not promise Undo for the first official outline version', () => {
    const insert: ReviewedOutlineInsert = {
      ...reviewedInsert('source'),
      previousOutline: null,
      hadPreviousOutline: false,
    };

    expect(getReviewedOutlineUndoAvailability(insert, 'issue-1')).toEqual({
      available: false,
      reason: 'no_previous',
      guidance: 'This is the first official outline version, so there is no preceding version to Undo.',
    });
    expect(reviewedOutlineRecoveryGuidance(insert)).toMatch(/recovery and version reload remain available/i);
    expect(reviewedOutlineRecoveryGuidance(insert)).not.toMatch(/^Undo remains available/i);
  });

  it('clears both modal and scripts errors after a successful source-sync retry or Undo', () => {
    const setReviewError = vi.fn();
    const setScriptsError = vi.fn();

    clearReviewedOutlineRecoveryErrors({ setReviewError, setScriptsError });

    expect(setReviewError).toHaveBeenCalledWith(null);
    expect(setScriptsError).toHaveBeenCalledWith(null);
  });
});
