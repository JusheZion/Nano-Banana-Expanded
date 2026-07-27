import {
  PACING_REVIEW_ARCHIVE_CONFLICT_MESSAGE,
  getPacingRevisionReplacementPolicy,
} from './writerPacingRevisionLifecycle';
import type { PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';

type BatchSet = Pick<PacingRevisionSet, 'id' | 'issue_id' | 'status' | 'updated_at'>;

export type PacingReviewBatchIssue = {
  issueId: string;
  label: string;
  generating?: boolean;
};

export type PacingReviewBatchOutcome = {
  issueId: string;
  label: string;
  reviewSaved: boolean;
  kind:
    | 'success'
    | 'review_failed'
    | 'archive_conflict'
    | 'archive_failed'
    | 'refresh_failed'
    | 'skipped';
  message: string;
};

export type PacingReviewBatchResult =
  | { kind: 'cancelled'; outcomes: [] }
  | {
      kind: 'complete';
      outcomes: PacingReviewBatchOutcome[];
      summary: {
        reviewsSaved: number;
        attentionCount: number;
        message: string;
      };
    };

type ActiveSetResult<TSet extends BatchSet> =
  | { ok: true; set: TSet | null }
  | { ok: false; error: string };

type ArchiveResult =
  | { ok: true }
  | { ok: false; kind?: 'conflict' | 'operational'; error: string };

type Preflight<TSet extends BatchSet> = {
  issue: PacingReviewBatchIssue;
  set: TSet | null;
  policy: ReturnType<typeof getPacingRevisionReplacementPolicy>;
  loadError?: string;
};

function unfinishedConfirmation(count: number): string {
  return `${count} selected issue${count === 1 ? '' : 's'} ${count === 1 ? 'has' : 'have'} unfinished Revision Set decisions or edits. For each successful new Pacing Review, its previous set will move to Revision history. Failed reviews will preserve their previous sets. Continue?`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function summarize(outcomes: PacingReviewBatchOutcome[]) {
  const reviewsSaved = outcomes.filter(({ reviewSaved }) => reviewSaved).length;
  const attentionCount = outcomes.filter(({ kind }) => kind !== 'success').length;
  const savedLabel = `${reviewsSaved} Pacing Review${reviewsSaved === 1 ? '' : 's'} saved.`;
  const attentionLabel = attentionCount === 1
    ? '1 item was skipped or needs attention.'
    : `${attentionCount} items were skipped or need attention.`;
  return {
    reviewsSaved,
    attentionCount,
    message: `${savedLabel} ${attentionLabel}`,
  };
}

export async function runPacingReviewBatch<TSet extends BatchSet>(input: {
  issues: PacingReviewBatchIssue[];
  loadActiveSet: (issueId: string) => Promise<ActiveSetResult<TSet>>;
  confirmArchive: (message: string) => boolean;
  runReview: (issueId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  archiveSet: (issueId: string, set: TSet) => Promise<ArchiveResult>;
  refreshIssueState: (issueId: string) => Promise<void>;
  onIssueStart?: (issue: PacingReviewBatchIssue, index: number, total: number) => void;
}): Promise<PacingReviewBatchResult> {
  const preflights = await Promise.all(input.issues.map(async (issue): Promise<Preflight<TSet>> => {
    let loaded: ActiveSetResult<TSet>;
    try {
      loaded = await input.loadActiveSet(issue.issueId);
    } catch (error) {
      loaded = { ok: false, error: errorMessage(error) };
    }
    if (!loaded.ok) {
      return {
        issue,
        set: null,
        policy: { kind: 'none' },
        loadError: loaded.error,
      };
    }
    return {
      issue,
      set: loaded.set,
      policy: getPacingRevisionReplacementPolicy({
        status: loaded.set?.status ?? null,
        generating: issue.generating === true,
      }),
    };
  }));

  const unfinishedCount = preflights.filter(
    ({ loadError, policy }) => !loadError && policy.kind === 'confirm_archive',
  ).length;
  if (
    unfinishedCount > 0
    && !input.confirmArchive(unfinishedConfirmation(unfinishedCount))
  ) {
    return { kind: 'cancelled', outcomes: [] };
  }

  const outcomes: PacingReviewBatchOutcome[] = [];
  const recordWithRefresh = async (outcome: PacingReviewBatchOutcome) => {
    try {
      await input.refreshIssueState(outcome.issueId);
      outcomes.push(outcome);
    } catch (error) {
      outcomes.push({
        ...outcome,
        kind: 'refresh_failed',
        message: `${outcome.message} Refresh failed: ${errorMessage(error)}`,
      });
    }
  };
  for (let index = 0; index < preflights.length; index += 1) {
    const preflight = preflights[index]!;
    const { issue, set, policy, loadError } = preflight;
    input.onIssueStart?.(issue, index, preflights.length);
    if (loadError) {
      outcomes.push({
        issueId: issue.issueId,
        label: issue.label,
        reviewSaved: false,
        kind: 'skipped',
        message: `Could not check the current Revision Set: ${loadError}`,
      });
      continue;
    }
    if (policy.kind === 'blocked') {
      outcomes.push({
        issueId: issue.issueId,
        label: issue.label,
        reviewSaved: false,
        kind: 'skipped',
        message: policy.message,
      });
      continue;
    }

    let reviewResult: Awaited<ReturnType<typeof input.runReview>>;
    try {
      reviewResult = await input.runReview(issue.issueId);
    } catch (error) {
      reviewResult = {
        ok: false,
        error: errorMessage(error),
      };
    }
    if (!reviewResult.ok) {
      await recordWithRefresh({
        issueId: issue.issueId,
        label: issue.label,
        reviewSaved: false,
        kind: 'review_failed',
        message: `Pacing Review failed; previous Revision Set preserved: ${reviewResult.error}`,
      });
      continue;
    }

    if (
      set
      && (policy.kind === 'auto_archive' || policy.kind === 'confirm_archive')
    ) {
      let archiveResult: ArchiveResult;
      try {
        archiveResult = await input.archiveSet(issue.issueId, set);
      } catch (error) {
        archiveResult = {
          ok: false,
          kind: 'operational',
          error: errorMessage(error),
        };
      }
      if (!archiveResult.ok) {
        await recordWithRefresh({
          issueId: issue.issueId,
          label: issue.label,
          reviewSaved: true,
          kind: archiveResult.kind === 'conflict' ? 'archive_conflict' : 'archive_failed',
          message: archiveResult.kind === 'conflict'
            ? PACING_REVIEW_ARCHIVE_CONFLICT_MESSAGE
            : `The new Pacing Review was saved, but archiving the previous Revision Set failed: ${archiveResult.error}`,
        });
        continue;
      }
      await recordWithRefresh({
        issueId: issue.issueId,
        label: issue.label,
        reviewSaved: true,
        kind: 'success',
        message: 'New Pacing Review saved; previous Revision Set moved to Revision history.',
      });
      continue;
    }

    await recordWithRefresh({
      issueId: issue.issueId,
      label: issue.label,
      reviewSaved: true,
      kind: 'success',
      message: 'Pacing Review saved.',
    });
  }

  return { kind: 'complete', outcomes, summary: summarize(outcomes) };
}
