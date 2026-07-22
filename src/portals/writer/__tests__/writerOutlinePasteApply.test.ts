import { describe, expect, it, vi } from 'vitest';
import type { WriterIssueOutlineRow } from '@/shared/api/arcsWriterRoom';
import {
  persistReviewedOutlineVersion,
  type ReviewedOutlinePersistenceDeps,
} from '../writerOutlinePasteApply';

const previous: WriterIssueOutlineRow = {
  id: 'outline-2',
  issue_id: 'issue-1',
  version: 2,
  outline_json: { title: 'Before' },
  created_at: '2026-07-22T00:00:00.000Z',
  created_by: null,
  source_mode: 'ai',
};

const created: WriterIssueOutlineRow = {
  ...previous,
  id: 'outline-3',
  version: 3,
  outline_json: { title: 'After' },
  source_mode: 'paste_review',
};

function createDeps(order: string[]) {
  return {
    snapshotPrevious: vi.fn<ReviewedOutlinePersistenceDeps['snapshotPrevious']>(async () => { order.push('snapshot'); return { ok: true as const }; }),
    createVersion: vi.fn<ReviewedOutlinePersistenceDeps['createVersion']>(async () => {
      order.push('insert');
      return { ok: true as const, row: created, predecessor: previous };
    }),
    syncSource: vi.fn<ReviewedOutlinePersistenceDeps['syncSource']>(async () => { order.push('source'); return { ok: true as const }; }),
    refreshOutlines: vi.fn<ReviewedOutlinePersistenceDeps['refreshOutlines']>(async () => {
      order.push('refresh');
      return { ok: true as const, rows: [created, previous] };
    }),
  };
}

describe('persistReviewedOutlineVersion', () => {
  it('snapshots, inserts a new version, syncs source, refreshes rows, and exposes Undo', async () => {
    const order: string[] = [];
    const deps = createDeps(order);
    const result = await persistReviewedOutlineVersion({
      previousOutline: previous,
      approvedOutline: created.outline_json,
      canonicalSourceText: 'TITLE: After',
      sourceLocked: false,
    }, deps);

    expect(order).toEqual(['snapshot', 'insert', 'source', 'refresh']);
    expect(deps.createVersion).toHaveBeenCalledWith(created.outline_json);
    expect(result).toMatchObject({
      ok: true,
      row: created,
      predecessor: previous,
      rows: [created, previous],
      undoAvailable: true,
      shouldClearReview: true,
    });
  });

  it('uses the authoritative null predecessor and exposes first-version Undo', async () => {
    const order: string[] = [];
    const deps = createDeps(order);
    deps.createVersion.mockImplementation(async () => {
      order.push('insert');
      return { ok: true, row: { ...created, id: 'outline-1', version: 1 }, predecessor: null };
    });
    deps.refreshOutlines.mockImplementation(async () => {
      order.push('refresh');
      return { ok: true, rows: [{ ...created, id: 'outline-1', version: 1 }] };
    });

    const result = await persistReviewedOutlineVersion({
      previousOutline: null,
      approvedOutline: created.outline_json,
      canonicalSourceText: 'TITLE: First',
      sourceLocked: false,
    }, deps);

    expect(result).toMatchObject({ ok: true, predecessor: null, undoAvailable: true });
    expect(deps.snapshotPrevious).not.toHaveBeenCalled();
    expect(order).toEqual(['insert', 'source', 'refresh']);
  });

  it('retains review and original when insert fails', async () => {
    const order: string[] = [];
    const deps = createDeps(order);
    deps.createVersion.mockImplementation(async () => {
      order.push('insert');
      return { ok: false as const, error: 'duplicate version' };
    });

    await expect(persistReviewedOutlineVersion({
      previousOutline: previous,
      approvedOutline: created.outline_json,
      canonicalSourceText: 'TITLE: After',
      sourceLocked: false,
    }, deps)).resolves.toMatchObject({
      ok: false,
      phase: 'insert',
      error: 'duplicate version',
      partial: false,
      shouldClearReview: false,
    });
    expect(order).toEqual(['snapshot', 'insert']);
  });

  it('propagates an authoritative predecessor conflict without syncing source', async () => {
    const order: string[] = [];
    const deps = createDeps(order);
    deps.createVersion.mockImplementation(async () => {
      order.push('insert');
      return {
        ok: false as const,
        error: 'Official outline changed before save.',
        conflict: true,
        predecessor: { ...previous, id: 'outline-newer', version: 3 },
      };
    });

    const result = await persistReviewedOutlineVersion({
      previousOutline: previous,
      approvedOutline: created.outline_json,
      canonicalSourceText: 'TITLE: After',
      sourceLocked: false,
    }, deps);

    expect(result).toMatchObject({ ok: false, phase: 'insert', conflict: true });
    expect(order).toEqual(['snapshot', 'insert']);
    expect(deps.syncSource).not.toHaveBeenCalled();
  });

  it('reports a locked partial source sync precisely while retaining review and making rollback available', async () => {
    const order: string[] = [];
    const deps = createDeps(order);
    const result = await persistReviewedOutlineVersion({
      previousOutline: previous,
      approvedOutline: created.outline_json,
      canonicalSourceText: 'TITLE: After',
      sourceLocked: true,
    }, deps);

    expect(order).toEqual(['snapshot', 'insert', 'refresh']);
    expect(deps.syncSource).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      phase: 'source_sync',
      partial: true,
      row: created,
      undoAvailable: true,
      shouldClearReview: false,
    });
    if (result.ok) throw new Error('expected partial source-sync failure');
    expect(result.error).toMatch(/new official outline version 3 was saved/i);
    expect(result.error).toMatch(/My Outline is locked/i);
    expect(result.error).toMatch(/Undo/i);
  });

  it('does not insert when the prior-version snapshot fails', async () => {
    const order: string[] = [];
    const deps = createDeps(order);
    deps.snapshotPrevious.mockImplementation(async () => {
      order.push('snapshot');
      return { ok: false as const, error: 'snapshot denied' };
    });

    const result = await persistReviewedOutlineVersion({
      previousOutline: previous,
      approvedOutline: created.outline_json,
      canonicalSourceText: 'TITLE: After',
      sourceLocked: false,
    }, deps);
    expect(result).toMatchObject({ ok: false, phase: 'snapshot', shouldClearReview: false });
    expect(order).toEqual(['snapshot']);
  });

  it('retains review with Undo available when the inserted version cannot be refreshed', async () => {
    const order: string[] = [];
    const deps = createDeps(order);
    deps.refreshOutlines.mockImplementation(async () => {
      order.push('refresh');
      return { ok: false as const, error: 'refresh offline' };
    });

    const result = await persistReviewedOutlineVersion({
      previousOutline: previous,
      approvedOutline: created.outline_json,
      canonicalSourceText: 'TITLE: After',
      sourceLocked: false,
    }, deps);

    expect(result).toMatchObject({
      ok: false,
      phase: 'refresh',
      partial: true,
      row: created,
      undoAvailable: true,
      shouldClearReview: false,
    });
    expect(order).toEqual(['snapshot', 'insert', 'source', 'refresh']);
  });

  it('normalizes a rejected source sync and still attempts refresh for recovery', async () => {
    const order: string[] = [];
    const deps = createDeps(order);
    deps.syncSource.mockImplementation(async () => {
      order.push('source');
      throw new Error('notes offline');
    });

    const result = await persistReviewedOutlineVersion({
      previousOutline: previous,
      approvedOutline: created.outline_json,
      canonicalSourceText: 'TITLE: After',
      sourceLocked: false,
    }, deps);

    expect(result).toMatchObject({ ok: false, phase: 'source_sync', partial: true });
    if (result.ok) throw new Error('expected source-sync failure');
    expect(result.error).toMatch(/notes offline/i);
    expect(order).toEqual(['snapshot', 'insert', 'source', 'refresh']);
  });
});
