import { describe, expect, it, vi } from 'vitest';
import {
  PACING_REVIEW_ARCHIVE_CONFLICT_MESSAGE,
  runPacingReviewReplacement,
} from '../writerPacingRevisionLifecycle';

const capturedSet = {
  id: 'set-1',
  status: 'applied' as const,
  updated_at: '2026-07-27T10:00:00.000Z',
};

describe('WriterPortal single Pacing Review replacement orchestration', () => {
  it('cancels before AI or archive when unfinished-set confirmation is declined', async () => {
    const confirmArchive = vi.fn(() => false);
    const runReview = vi.fn();
    const archiveSet = vi.fn();
    const refreshIssue = vi.fn();

    const result = await runPacingReviewReplacement({
      policy: {
        kind: 'confirm_archive',
        message: 'Archive unfinished work if the review succeeds?',
      },
      activeSet: { ...capturedSet, status: 'ready' },
      confirmArchive,
      runReview,
      archiveSet,
      refreshIssue,
    });

    expect(result).toEqual({ kind: 'cancelled' });
    expect(confirmArchive).toHaveBeenCalledTimes(1);
    expect(runReview).not.toHaveBeenCalled();
    expect(archiveSet).not.toHaveBeenCalled();
    expect(refreshIssue).not.toHaveBeenCalled();
  });

  it('does not archive or refresh when the AI review fails', async () => {
    const archiveSet = vi.fn();
    const refreshIssue = vi.fn();

    const result = await runPacingReviewReplacement({
      policy: { kind: 'auto_archive' },
      activeSet: capturedSet,
      confirmArchive: vi.fn(),
      runReview: vi.fn().mockResolvedValue({ ok: false, error: 'AI timed out' }),
      archiveSet,
      refreshIssue,
    });

    expect(result).toEqual({ kind: 'review_failed', error: 'AI timed out' });
    expect(archiveSet).not.toHaveBeenCalled();
    expect(refreshIssue).not.toHaveBeenCalled();
  });

  it('archives after AI success and refreshes the saved issue afterward', async () => {
    const events: string[] = [];

    const result = await runPacingReviewReplacement({
      policy: { kind: 'auto_archive' },
      activeSet: capturedSet,
      confirmArchive: vi.fn(),
      runReview: vi.fn(async () => {
        events.push('review');
        return { ok: true as const };
      }),
      archiveSet: vi.fn(async () => {
        events.push('archive');
        return { ok: true as const };
      }),
      refreshIssue: vi.fn(async () => {
        events.push('refresh');
      }),
    });

    expect(result).toEqual({ kind: 'success' });
    expect(events).toEqual(['review', 'archive', 'refresh']);
  });

  it('refreshes the saved issue but preserves the old active set on archive conflict', async () => {
    const activeSet = capturedSet;
    const refreshIssue = vi.fn();

    const result = await runPacingReviewReplacement({
      policy: { kind: 'auto_archive' },
      activeSet,
      confirmArchive: vi.fn(),
      runReview: vi.fn().mockResolvedValue({ ok: true }),
      archiveSet: vi.fn().mockResolvedValue({ ok: false, error: 'updated_at changed' }),
      refreshIssue,
    });

    expect(result).toEqual({
      kind: 'archive_conflict',
      error: PACING_REVIEW_ARCHIVE_CONFLICT_MESSAGE,
    });
    expect(refreshIssue).toHaveBeenCalledTimes(1);
    expect(activeSet).toBe(capturedSet);
    expect(result.kind === 'archive_conflict' && result.error)
      .toBe('The new Pacing Review was saved, but the previous Revision Set changed before it could be archived.');
  });
});
