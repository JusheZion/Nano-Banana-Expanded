import type { WriterIssueOutlineRow } from '@/shared/api/arcsWriterRoom';

type StepResult = { ok: true } | { ok: false; error: string };
type CreateResult =
  | { ok: true; row: WriterIssueOutlineRow; predecessor: WriterIssueOutlineRow | null }
  | {
      ok: false;
      error: string;
      conflict?: boolean;
      predecessor?: WriterIssueOutlineRow | null;
    };
type RefreshResult = { ok: true; rows: WriterIssueOutlineRow[] } | { ok: false; error: string };

export type ReviewedOutlinePersistenceDeps = {
  snapshotPrevious(previous: WriterIssueOutlineRow): Promise<StepResult>;
  createVersion(outlineJson: Record<string, unknown>): Promise<CreateResult>;
  syncSource(canonicalSourceText: string): Promise<StepResult>;
  refreshOutlines(): Promise<RefreshResult>;
};

export async function persistReviewedOutlineVersion(
  input: {
    previousOutline: WriterIssueOutlineRow | null;
    approvedOutline: Record<string, unknown>;
    canonicalSourceText: string;
    sourceLocked: boolean;
  },
  deps: ReviewedOutlinePersistenceDeps,
): Promise<
  | {
      ok: true;
      row: WriterIssueOutlineRow;
      predecessor: WriterIssueOutlineRow | null;
      rows: WriterIssueOutlineRow[];
      undoAvailable: boolean;
      shouldClearReview: true;
    }
  | {
      ok: false;
      phase: 'snapshot' | 'insert' | 'source_sync' | 'refresh';
      error: string;
      partial: boolean;
      row?: WriterIssueOutlineRow;
      rows?: WriterIssueOutlineRow[];
      undoAvailable: boolean;
      conflict?: boolean;
      predecessor?: WriterIssueOutlineRow | null;
      shouldClearReview: false;
    }
> {
  if (input.previousOutline) {
    let snapshot: StepResult;
    try {
      snapshot = await deps.snapshotPrevious(input.previousOutline);
    } catch (error) {
      snapshot = { ok: false, error: error instanceof Error ? error.message : 'Unexpected snapshot error' };
    }
    if (!snapshot.ok) {
      return {
        ok: false,
        phase: 'snapshot',
        error: `Could not preserve the prior official outline: ${snapshot.error}`,
        partial: false,
        undoAvailable: false,
        shouldClearReview: false,
      };
    }
  }

  let created: CreateResult;
  try {
    created = await deps.createVersion(input.approvedOutline);
  } catch (error) {
    created = { ok: false, error: error instanceof Error ? error.message : 'Unexpected outline insert error' };
  }
  if (!created.ok) {
    return {
      ok: false,
      phase: 'insert',
      error: created.error,
      partial: false,
      undoAvailable: false,
      conflict: created.conflict,
      predecessor: created.predecessor,
      shouldClearReview: false,
    };
  }

  let sourceSync: StepResult;
  if (input.sourceLocked) {
    sourceSync = { ok: false, error: 'My Outline is locked.' };
  } else {
    try {
      sourceSync = await deps.syncSource(input.canonicalSourceText);
    } catch (error) {
      sourceSync = { ok: false, error: error instanceof Error ? error.message : 'Unexpected source sync error' };
    }
  }
  let refresh: RefreshResult;
  try {
    refresh = await deps.refreshOutlines();
  } catch (error) {
    refresh = { ok: false, error: error instanceof Error ? error.message : 'Unexpected outline refresh error' };
  }
  const undoAvailable = true;

  if (!refresh.ok) {
    return {
      ok: false,
      phase: 'refresh',
      error: `New official outline version ${created.row.version} was saved${
        sourceSync.ok ? ' and My Outline was synchronized' : `, but source sync also failed: ${sourceSync.error}`
      }. The version list could not be refreshed: ${refresh.error}. Apply again to retry recovery without creating another version${undoAvailable ? ', or use Undo last update' : ''}.`,
      partial: true,
      row: created.row,
      predecessor: created.predecessor,
      undoAvailable,
      shouldClearReview: false,
    };
  }
  const rows = refresh.rows;
  const refreshedUndoAvailable = rows.length > 1 || undoAvailable;

  if (!sourceSync.ok) {
    return {
      ok: false,
      phase: 'source_sync',
      error: `New official outline version ${created.row.version} was saved, but ${sourceSync.error} ${
        refreshedUndoAvailable
          ? 'Unlock My Outline if needed, then Apply again to finish source sync without creating another version, or use Undo last update.'
          : 'Unlock My Outline if needed, then Apply again to finish source sync without creating another version.'
      }`,
      partial: true,
      row: created.row,
      predecessor: created.predecessor,
      rows,
      undoAvailable: refreshedUndoAvailable,
      shouldClearReview: false,
    };
  }

  return {
    ok: true,
    row: created.row,
    predecessor: created.predecessor,
    rows,
    undoAvailable: refreshedUndoAvailable,
    shouldClearReview: true,
  };
}
