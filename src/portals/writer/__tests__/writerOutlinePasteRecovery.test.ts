import { describe, expect, it, vi } from 'vitest';
import type { WriterIssueOutlineRow } from '@/shared/api/arcsWriterRoom';
import {
  clearReviewedOutlineRecoveryErrors,
  captureReviewedOutlinePriorSource,
  getReviewedOutlineUndoAvailability,
  reviewedOutlineRecoveryGuidance,
  restoreReviewedOutlinePriorSource,
  retryReviewedOutlineSourceSync,
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
    deleteOutline: vi.fn(async () => ({ ok: true as const })),
    restorePriorSource: vi.fn(async () => ({ ok: true as const })),
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

  it('offers guarded deletion Undo for the first official outline version', () => {
    const insert: ReviewedOutlineInsert = {
      ...reviewedInsert('source'),
      previousOutline: null,
      hadPreviousOutline: false,
    };

    expect(getReviewedOutlineUndoAvailability(insert, 'issue-1')).toEqual({
      available: true,
      reason: null,
      guidance: 'Undo will remove this first official outline version and restore the prior My Outline source.',
    });
    expect(reviewedOutlineRecoveryGuidance(insert)).toMatch(/remove this first official outline version/i);
  });

  it('deletes a still-latest first version, restores the prior source, and refreshes', async () => {
    const first = { ...inserted, id: 'outline-1', version: 1 };
    const insert: ReviewedOutlineInsert = {
      insertedRow: first,
      previousOutline: null,
      hadPreviousOutline: false,
      origin: 'source',
    };
    const deps = createDeps();
    vi.mocked(deps.reloadOutlines)
      .mockResolvedValueOnce({ ok: true, rows: [first] })
      .mockResolvedValueOnce({ ok: true, rows: [] })
      .mockResolvedValueOnce({ ok: true, rows: [] });

    const result = await restoreReviewedOutlineInsert(insert, 'issue-1', deps);

    expect(result).toMatchObject({ ok: true, undoKind: 'deleted_first', rows: [] });
    expect(deps.deleteOutline).toHaveBeenCalledWith({ issueId: 'issue-1', outlineId: 'outline-1' });
    expect(deps.restorePriorSource).toHaveBeenCalledOnce();
    expect(deps.restoreOutline).not.toHaveBeenCalled();
  });

  it('does not delete a first version when a newer row exists', async () => {
    const first = { ...inserted, id: 'outline-1', version: 1 };
    const insert: ReviewedOutlineInsert = {
      insertedRow: first,
      previousOutline: null,
      hadPreviousOutline: false,
      origin: 'source',
    };
    const deps = createDeps();
    vi.mocked(deps.reloadOutlines).mockResolvedValueOnce({ ok: true, rows: [inserted, first] });

    const result = await restoreReviewedOutlineInsert(insert, 'issue-1', deps);

    expect(result).toMatchObject({ ok: false, phase: 'conflict' });
    expect(deps.deleteOutline).not.toHaveBeenCalled();
    expect(deps.restorePriorSource).not.toHaveBeenCalled();
  });

  it('retains first-version recovery when exact deletion fails', async () => {
    const first = { ...inserted, id: 'outline-1', version: 1 };
    const insert: ReviewedOutlineInsert = {
      insertedRow: first,
      previousOutline: null,
      hadPreviousOutline: false,
      origin: 'source',
    };
    const deps = createDeps();
    vi.mocked(deps.reloadOutlines).mockResolvedValueOnce({ ok: true, rows: [first] });
    vi.mocked(deps.deleteOutline).mockResolvedValueOnce({ ok: false, error: 'delete denied' });

    const result = await restoreReviewedOutlineInsert(insert, 'issue-1', deps);

    expect(result).toMatchObject({ ok: false, phase: 'delete', partial: false, error: expect.stringMatching(/delete denied/i) });
    expect(deps.restorePriorSource).not.toHaveBeenCalled();
  });

  it('reports a recoverable partial state when source restoration fails after first-version deletion', async () => {
    const first = { ...inserted, id: 'outline-1', version: 1 };
    const insert: ReviewedOutlineInsert = {
      insertedRow: first,
      previousOutline: null,
      hadPreviousOutline: false,
      origin: 'source',
    };
    const deps = createDeps();
    vi.mocked(deps.reloadOutlines)
      .mockResolvedValueOnce({ ok: true, rows: [first] })
      .mockResolvedValueOnce({ ok: true, rows: [] })
      .mockResolvedValueOnce({ ok: true, rows: [] });
    vi.mocked(deps.restorePriorSource).mockResolvedValueOnce({ ok: false, error: 'notes offline' });

    const result = await restoreReviewedOutlineInsert(insert, 'issue-1', deps);

    expect(result).toMatchObject({
      ok: false,
      phase: 'source_restore',
      partial: true,
      insertedRowDeleted: true,
      rows: [],
      error: expect.stringMatching(/notes offline/i),
    });
  });

  it('does not restore source when a concurrent outline appears after first-version deletion', async () => {
    const first = { ...inserted, id: 'outline-1', version: 1 };
    const concurrent = { ...inserted, id: 'outline-2', version: 2 };
    const insert: ReviewedOutlineInsert = {
      insertedRow: first,
      previousOutline: null,
      hadPreviousOutline: false,
      origin: 'source',
    };
    const deps = createDeps();
    vi.mocked(deps.reloadOutlines)
      .mockResolvedValueOnce({ ok: true, rows: [first] })
      .mockResolvedValueOnce({ ok: true, rows: [concurrent] });

    const result = await restoreReviewedOutlineInsert(insert, 'issue-1', deps);

    expect(result).toMatchObject({
      ok: false,
      phase: 'conflict',
      partial: true,
      insertedRowDeleted: true,
      rows: [concurrent],
    });
    expect(deps.deleteOutline).toHaveBeenCalledOnce();
    expect(deps.restorePriorSource).not.toHaveBeenCalled();
  });

  it('reports post-delete refresh failure without repeating deletion', async () => {
    const first = { ...inserted, id: 'outline-1', version: 1 };
    const insert: ReviewedOutlineInsert = {
      insertedRow: first,
      previousOutline: null,
      hadPreviousOutline: false,
      origin: 'source',
    };
    const deps = createDeps();
    vi.mocked(deps.reloadOutlines)
      .mockResolvedValueOnce({ ok: true, rows: [first] })
      .mockResolvedValueOnce({ ok: true, rows: [] })
      .mockResolvedValueOnce({ ok: false, error: 'refresh offline' });

    const result = await restoreReviewedOutlineInsert(insert, 'issue-1', deps);

    expect(result).toMatchObject({
      ok: true,
      undoKind: 'deleted_first',
      refreshError: expect.stringMatching(/refresh offline/i),
    });
    expect(deps.deleteOutline).toHaveBeenCalledOnce();
  });

  it('retries only prior-source restoration after the first version was already deleted', async () => {
    const first = { ...inserted, id: 'outline-1', version: 1 };
    const insert: ReviewedOutlineInsert = {
      insertedRow: first,
      previousOutline: null,
      hadPreviousOutline: false,
      origin: 'source',
      insertedRowDeleted: true,
    };
    const deps = createDeps();
    vi.mocked(deps.reloadOutlines)
      .mockResolvedValueOnce({ ok: true, rows: [] })
      .mockResolvedValueOnce({ ok: true, rows: [] });

    const result = await restoreReviewedOutlineInsert(insert, 'issue-1', deps);

    expect(result).toMatchObject({ ok: true, undoKind: 'deleted_first', rows: [] });
    expect(deps.deleteOutline).not.toHaveBeenCalled();
    expect(deps.restorePriorSource).toHaveBeenCalledOnce();
  });

  it('does not restore stale source after deletion when a newer official row appears', async () => {
    const first = { ...inserted, id: 'outline-1', version: 1 };
    const insert: ReviewedOutlineInsert = {
      insertedRow: first,
      previousOutline: null,
      hadPreviousOutline: false,
      origin: 'source',
      insertedRowDeleted: true,
    };
    const deps = createDeps();
    vi.mocked(deps.reloadOutlines).mockResolvedValueOnce({ ok: true, rows: [inserted] });

    const result = await restoreReviewedOutlineInsert(insert, 'issue-1', deps);

    expect(result).toMatchObject({ ok: false, phase: 'conflict', partial: true, insertedRowDeleted: true });
    expect(deps.restorePriorSource).not.toHaveBeenCalled();
  });

  it('captures empty prior source text/mode and only the exact author_outline field state', () => {
    const notes = {
      author_outline: { text: '', mode: 'preserve', updated_at: '2026-07-22T01:00:00.000Z' },
      unrelated: { keep: true },
    };

    expect(captureReviewedOutlinePriorSource(notes)).toEqual({
      priorAuthorOutline: {
        present: true,
        value: notes.author_outline,
      },
      priorAuthorSource: {
        text: '',
        mode: 'preserve',
        updatedAt: '2026-07-22T01:00:00.000Z',
      },
    });
  });

  it('records an absent author_outline distinctly and restores only that field on current notes', () => {
    const captured = captureReviewedOutlinePriorSource({ unrelated: { before: true } });
    const currentNotes = {
      unrelated: { changedAfterApply: true },
      lock_state: { author_outline: false },
      author_outline: { text: 'reviewed source', mode: 'replace' },
    };

    expect(captured).toMatchObject({
      priorAuthorOutline: { present: false },
      priorAuthorSource: { text: '', mode: 'structure' },
    });
    expect(restoreReviewedOutlinePriorSource(currentNotes, captured.priorAuthorOutline)).toEqual({
      unrelated: { changedAfterApply: true },
      lock_state: { author_outline: false },
    });
  });

  it('restores the exact prior author_outline value while preserving unrelated current notes', () => {
    const priorValue = { text: '', mode: 'preserve', custom: { exact: true } };
    const captured = captureReviewedOutlinePriorSource({ author_outline: priorValue, cache: 'old' });
    const currentNotes = {
      author_outline: { text: 'reviewed source', mode: 'replace' },
      cache: 'new',
      unrelated: { changedAfterApply: true },
    };

    expect(restoreReviewedOutlinePriorSource(currentNotes, captured.priorAuthorOutline)).toEqual({
      author_outline: priorValue,
      cache: 'new',
      unrelated: { changedAfterApply: true },
    });
  });

  it('clears both modal and scripts errors after a successful source-sync retry or Undo', () => {
    const setReviewError = vi.fn();
    const setScriptsError = vi.fn();

    clearReviewedOutlineRecoveryErrors({ setReviewError, setScriptsError });

    expect(setReviewError).toHaveBeenCalledWith(null);
    expect(setScriptsError).toHaveBeenCalledWith(null);
  });
});

describe('reviewed outline source-sync retry', () => {
  it('reloads first and refuses to sync when a newer official row exists', async () => {
    const syncSource = vi.fn(async () => ({ ok: true as const }));
    const reloadOutlines = vi.fn(async () => ({ ok: true as const, rows: [restored, inserted, previous] }));

    const result = await retryReviewedOutlineSourceSync(reviewedInsert('source'), {
      reloadOutlines,
      syncSource,
    });

    expect(result).toMatchObject({ ok: false, phase: 'conflict', error: expect.stringMatching(/newer official outline/i) });
    expect(reloadOutlines).toHaveBeenCalledOnce();
    expect(syncSource).not.toHaveBeenCalled();
  });

  it('reloads, syncs, then refreshes in order when the inserted row is still latest', async () => {
    const order: string[] = [];
    const reloadOutlines = vi.fn()
      .mockImplementationOnce(async () => { order.push('reload-before'); return { ok: true as const, rows: [inserted, previous] }; })
      .mockImplementationOnce(async () => { order.push('refresh-after'); return { ok: true as const, rows: [inserted, previous] }; });
    const syncSource = vi.fn(async () => { order.push('sync'); return { ok: true as const }; });

    const result = await retryReviewedOutlineSourceSync(reviewedInsert('official_editor'), {
      reloadOutlines,
      syncSource,
    });

    expect(result).toMatchObject({ ok: true, rows: [inserted, previous] });
    expect(order).toEqual(['reload-before', 'sync', 'refresh-after']);
  });
});
