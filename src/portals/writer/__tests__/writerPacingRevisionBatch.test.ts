import { describe, expect, it, vi } from 'vitest';
import { runPacingReviewBatch } from '../writerPacingRevisionBatch';

type TestSet = {
  id: string;
  issue_id: string;
  status: 'ready' | 'partially_ready' | 'applied' | 'failed' | 'applying' | 'generating';
  updated_at: string;
};

const set = (issueId: string, status: TestSet['status']): TestSet => ({
  id: `set-${issueId}`,
  issue_id: issueId,
  status,
  updated_at: `2026-07-27T12:00:0${issueId.at(-1) ?? '0'}.000Z`,
});

describe('runPacingReviewBatch', () => {
  it('preflights every issue, confirms unfinished sets once, and skips blocked issues visibly', async () => {
    const activeSets = new Map<string, TestSet>([
      ['issue-1', set('issue-1', 'ready')],
      ['issue-2', set('issue-2', 'applied')],
      ['issue-3', set('issue-3', 'applying')],
      ['issue-4', set('issue-4', 'generating')],
    ]);
    const confirmArchive = vi.fn(() => true);
    const runReview = vi.fn<(issueId: string) => Promise<{ ok: true }>>(async () => ({
      ok: true,
    }));
    const archiveSet = vi.fn<
      (issueId: string, revisionSet: TestSet) => Promise<{ ok: true }>
    >(async () => ({
      ok: true as const,
    }));

    const result = await runPacingReviewBatch({
      issues: [1, 2, 3, 4].map((number) => ({
        issueId: `issue-${number}`,
        label: `Issue #${number}`,
      })),
      loadActiveSet: async (issueId) => ({
        ok: true,
        set: activeSets.get(issueId) ?? null,
      }),
      confirmArchive,
      runReview,
      archiveSet,
      refreshIssueState: async () => {},
    });

    expect(confirmArchive).toHaveBeenCalledTimes(1);
    expect(confirmArchive).toHaveBeenCalledWith(
      '1 selected issue has unfinished Revision Set decisions or edits. For each successful new Pacing Review, its previous set will move to Revision history. Failed reviews will preserve their previous sets. Continue?',
    );
    expect(runReview.mock.calls.map(([issueId]) => issueId)).toEqual(['issue-1', 'issue-2']);
    expect(archiveSet.mock.calls.map(([issueId, revisionSet]) => [
      issueId,
      revisionSet.id,
      revisionSet.status,
      revisionSet.updated_at,
    ])).toEqual([
      ['issue-1', 'set-issue-1', 'ready', activeSets.get('issue-1')!.updated_at],
      ['issue-2', 'set-issue-2', 'applied', activeSets.get('issue-2')!.updated_at],
    ]);
    expect(result.outcomes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        issueId: 'issue-3',
        kind: 'skipped',
        message: expect.stringContaining('applying'),
      }),
      expect.objectContaining({
        issueId: 'issue-4',
        kind: 'skipped',
        message: expect.stringContaining('generating'),
      }),
    ]));
  });

  it('cancels the whole batch before any review or archive when unfinished confirmation is declined', async () => {
    const runReview = vi.fn();
    const archiveSet = vi.fn();

    const result = await runPacingReviewBatch({
      issues: [
        { issueId: 'issue-1', label: 'Issue #1' },
        { issueId: 'issue-2', label: 'Issue #2' },
      ],
      loadActiveSet: async (issueId) => ({
        ok: true,
        set: issueId === 'issue-1'
          ? set(issueId, 'partially_ready')
          : set(issueId, 'failed'),
      }),
      confirmArchive: () => false,
      runReview,
      archiveSet,
      refreshIssueState: async () => {},
    });

    expect(result).toEqual({ kind: 'cancelled', outcomes: [] });
    expect(runReview).not.toHaveBeenCalled();
    expect(archiveSet).not.toHaveBeenCalled();
  });

  it('preserves each failed review set and continues later issues', async () => {
    const archiveSet = vi.fn<
      (issueId: string, revisionSet: TestSet) => Promise<{ ok: true }>
    >(async () => ({
      ok: true as const,
    }));
    const refreshIssueState = vi.fn<(issueId: string) => Promise<void>>(async () => {});

    const result = await runPacingReviewBatch({
      issues: [
        { issueId: 'issue-1', label: 'Issue #1' },
        { issueId: 'issue-2', label: 'Issue #2' },
        { issueId: 'issue-3', label: 'Issue #3' },
      ],
      loadActiveSet: async (issueId) => ({
        ok: true,
        set: set(issueId, 'applied'),
      }),
      confirmArchive: () => true,
      runReview: async (issueId) => issueId === 'issue-2'
        ? { ok: false, error: 'AI timed out' }
        : { ok: true },
      archiveSet,
      refreshIssueState,
    });

    expect(result.kind).toBe('complete');
    expect(result.outcomes.map(({ issueId, kind }) => [issueId, kind])).toEqual([
      ['issue-1', 'success'],
      ['issue-2', 'review_failed'],
      ['issue-3', 'success'],
    ]);
    expect(archiveSet.mock.calls.map(([issueId]) => issueId)).toEqual(['issue-1', 'issue-3']);
    expect(refreshIssueState.mock.calls.map(([issueId]) => issueId)).toEqual([
      'issue-1',
      'issue-2',
      'issue-3',
    ]);
  });

  it('reports archive conflict and operational failure separately while preserving partial success', async () => {
    const runReview = vi.fn<(issueId: string) => Promise<{ ok: true }>>(async () => ({
      ok: true,
    }));

    const result = await runPacingReviewBatch({
      issues: [
        { issueId: 'issue-1', label: 'Issue #1' },
        { issueId: 'issue-2', label: 'Issue #2' },
        { issueId: 'issue-3', label: 'Issue #3' },
      ],
      loadActiveSet: async (issueId) => ({
        ok: true,
        set: set(issueId, 'failed'),
      }),
      confirmArchive: () => true,
      runReview,
      archiveSet: async (issueId) => {
        if (issueId === 'issue-1') return { ok: true };
        if (issueId === 'issue-2') {
          return { ok: false, kind: 'conflict', error: 'guard changed' };
        }
        return { ok: false, kind: 'operational', error: 'network unavailable' };
      },
      refreshIssueState: async () => {},
    });

    expect(result.outcomes.map(({ issueId, kind, message }) => [
      issueId,
      kind,
      message,
    ])).toEqual([
      ['issue-1', 'success', 'New Pacing Review saved; previous Revision Set moved to Revision history.'],
      ['issue-2', 'archive_conflict', 'The new Pacing Review was saved, but the previous Revision Set changed before it could be archived.'],
      ['issue-3', 'archive_failed', 'The new Pacing Review was saved, but archiving the previous Revision Set failed: network unavailable'],
    ]);
  });

  it('counts saved reviews separately from archive and refresh attention', async () => {
    const result = await runPacingReviewBatch({
      issues: [
        { issueId: 'issue-1', label: 'Issue #1' },
        { issueId: 'issue-2', label: 'Issue #2' },
        { issueId: 'issue-3', label: 'Issue #3' },
        { issueId: 'issue-4', label: 'Issue #4' },
      ],
      loadActiveSet: async (issueId) => ({
        ok: true,
        set: issueId === 'issue-4'
          ? set(issueId, 'applying')
          : set(issueId, 'applied'),
      }),
      confirmArchive: () => true,
      runReview: async (issueId) => issueId === 'issue-3'
        ? { ok: false, error: 'AI timed out' }
        : { ok: true },
      archiveSet: async (issueId) => issueId === 'issue-2'
        ? { ok: false, kind: 'conflict', error: 'changed' }
        : { ok: true },
      refreshIssueState: async (issueId) => {
        if (issueId === 'issue-1') throw new Error('refresh failed');
      },
    });

    expect(result.kind).toBe('complete');
    expect(result.kind === 'complete' && result.summary).toEqual({
      reviewsSaved: 2,
      attentionCount: 4,
      message: '2 Pacing Reviews saved. 4 items were skipped or need attention.',
    });
    expect(result.outcomes.map(({ issueId, kind, reviewSaved }) => [
      issueId,
      kind,
      reviewSaved,
    ])).toEqual([
      ['issue-1', 'refresh_failed', true],
      ['issue-2', 'archive_conflict', true],
      ['issue-3', 'review_failed', false],
      ['issue-4', 'skipped', false],
    ]);
  });

  it('skips a preflight load failure and still runs later eligible issues', async () => {
    const runReview = vi.fn<(issueId: string) => Promise<{ ok: true }>>(async () => ({
      ok: true,
    }));

    const result = await runPacingReviewBatch({
      issues: [
        { issueId: 'issue-1', label: 'Issue #1' },
        { issueId: 'issue-2', label: 'Issue #2' },
      ],
      loadActiveSet: async (issueId) => issueId === 'issue-1'
        ? { ok: false, error: 'Revision Set unavailable' }
        : { ok: true, set: null },
      confirmArchive: () => true,
      runReview,
      archiveSet: async () => ({ ok: true }),
      refreshIssueState: async () => {},
    });

    expect(runReview).toHaveBeenCalledTimes(1);
    expect(runReview).toHaveBeenCalledWith('issue-2');
    expect(result.outcomes).toEqual([
      {
        issueId: 'issue-1',
        label: 'Issue #1',
        reviewSaved: false,
        kind: 'skipped',
        message: 'Could not check the current Revision Set: Revision Set unavailable',
      },
      {
        issueId: 'issue-2',
        label: 'Issue #2',
        reviewSaved: true,
        kind: 'success',
        message: 'Pacing Review saved.',
      },
    ]);
  });

  it('contains unexpected load, archive, and refresh exceptions to their issue', async () => {
    const runReview = vi.fn<(issueId: string) => Promise<{ ok: true }>>(async () => ({
      ok: true,
    }));

    const result = await runPacingReviewBatch({
      issues: [
        { issueId: 'issue-1', label: 'Issue #1' },
        { issueId: 'issue-2', label: 'Issue #2' },
        { issueId: 'issue-3', label: 'Issue #3' },
        { issueId: 'issue-4', label: 'Issue #4' },
      ],
      loadActiveSet: async (issueId) => {
        if (issueId === 'issue-1') throw new Error('load disconnected');
        return { ok: true, set: set(issueId, 'applied') };
      },
      confirmArchive: () => true,
      runReview,
      archiveSet: async (issueId) => {
        if (issueId === 'issue-2') throw new Error('archive disconnected');
        return { ok: true };
      },
      refreshIssueState: async (issueId) => {
        if (issueId === 'issue-3') throw new Error('refresh disconnected');
      },
    });

    expect(runReview.mock.calls.map(([issueId]) => issueId)).toEqual([
      'issue-2',
      'issue-3',
      'issue-4',
    ]);
    expect(result.outcomes.map(({ issueId, kind }) => [issueId, kind])).toEqual([
      ['issue-1', 'skipped'],
      ['issue-2', 'archive_failed'],
      ['issue-3', 'refresh_failed'],
      ['issue-4', 'success'],
    ]);
  });
});
