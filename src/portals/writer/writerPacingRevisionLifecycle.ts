import type { PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';

export type PacingRevisionReplacementPolicy =
  | { kind: 'none' }
  | { kind: 'auto_archive' }
  | { kind: 'confirm_archive'; message: string }
  | { kind: 'blocked'; message: string };

export const PACING_REVIEW_ARCHIVE_CONFLICT_MESSAGE =
  'The new Pacing Review was saved, but the previous Revision Set changed before it could be archived.';

type PacingReviewReplacementResult =
  | { kind: 'cancelled' }
  | { kind: 'blocked'; error: string }
  | { kind: 'review_failed'; error: string }
  | { kind: 'archive_conflict'; error: typeof PACING_REVIEW_ARCHIVE_CONFLICT_MESSAGE }
  | { kind: 'archive_failed'; error: string }
  | { kind: 'success' };

export async function runPacingReviewReplacement<TSet>(input: {
  policy: PacingRevisionReplacementPolicy;
  activeSet: TSet | null;
  confirmArchive: (message: string) => boolean;
  runReview: () => Promise<{ ok: true } | { ok: false; error: string }>;
  archiveSet: (set: TSet) => Promise<
    { ok: true } | { ok: false; kind?: 'conflict' | 'operational'; error: string }
  >;
  refreshIssue: () => Promise<void>;
}): Promise<PacingReviewReplacementResult> {
  if (input.policy.kind === 'blocked') {
    return { kind: 'blocked', error: input.policy.message };
  }
  if (
    input.policy.kind === 'confirm_archive'
    && !input.confirmArchive(input.policy.message)
  ) {
    return { kind: 'cancelled' };
  }

  const reviewResult = await input.runReview();
  if (!reviewResult.ok) {
    return { kind: 'review_failed', error: reviewResult.error };
  }

  if (
    input.activeSet
    && (
      input.policy.kind === 'auto_archive'
      || input.policy.kind === 'confirm_archive'
    )
  ) {
    const archiveResult = await input.archiveSet(input.activeSet);
    if (!archiveResult.ok) {
      await input.refreshIssue();
      if (archiveResult.kind !== 'conflict') {
        return {
          kind: 'archive_failed',
          error: `The new Pacing Review was saved, but archiving the previous Revision Set failed: ${archiveResult.error}`,
        };
      }
      return {
        kind: 'archive_conflict',
        error: PACING_REVIEW_ARCHIVE_CONFLICT_MESSAGE,
      };
    }
  }

  await input.refreshIssue();
  return { kind: 'success' };
}

export function getPacingRevisionActiveSetForIssue<TSet extends { issue_id: string }>(
  activeSet: TSet | null,
  issueId: string | null,
): TSet | null {
  return activeSet?.issue_id === issueId ? activeSet : null;
}

export function getPacingRevisionReplacementPolicy(input: {
  status: PacingRevisionSet['status'] | null;
  generating: boolean;
}): PacingRevisionReplacementPolicy {
  if (!input.status) return { kind: 'none' };
  if (input.generating) {
    return {
      kind: 'blocked',
      message: 'Wait for the current Revision Set page candidates to finish generating before running a new Pacing Review.',
    };
  }
  if (input.status === 'generating') {
    return {
      kind: 'blocked',
      message: 'Wait for the current Revision Set to finish generating before running a new Pacing Review.',
    };
  }
  if (input.status === 'applying') {
    return {
      kind: 'blocked',
      message: 'Wait for the current Revision Set to finish applying before running a new Pacing Review.',
    };
  }
  if (input.status === 'ready' || input.status === 'partially_ready') {
    return {
      kind: 'confirm_archive',
      message: 'This Revision Set has unfinished decisions or edits. If the new Pacing Review succeeds, they will move to Revision history. Continue?',
    };
  }
  if (input.status === 'applied' || input.status === 'failed') {
    return { kind: 'auto_archive' };
  }
  return { kind: 'none' };
}
