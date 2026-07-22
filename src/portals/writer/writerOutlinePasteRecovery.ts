import type { WriterIssueOutlineRow } from '@/shared/api/arcsWriterRoom';

type ReloadResult = { ok: true; rows: WriterIssueOutlineRow[] } | { ok: false; error: string };
type RestoreResult = { ok: true } | { ok: false; error?: string };

export type ReviewedOutlineInsert = {
  insertedRow: WriterIssueOutlineRow;
  previousOutline: WriterIssueOutlineRow | null;
  origin: 'source' | 'official_editor';
};

export type ReviewedOutlineRecoveryDeps = {
  reloadOutlines(): Promise<ReloadResult>;
  restoreOutline(input: {
    issueId: string;
    outlineJson: Record<string, unknown>;
    restoredFromVersion: number;
    nextVersion: number;
  }): Promise<RestoreResult>;
};

export async function restoreReviewedOutlineInsert(
  insert: ReviewedOutlineInsert,
  deps: ReviewedOutlineRecoveryDeps,
): Promise<
  | { ok: true; rows?: WriterIssueOutlineRow[]; restoredVersion: number; refreshError?: string }
  | { ok: false; phase: 'missing_previous' | 'reload' | 'conflict' | 'restore'; error: string }
> {
  if (!insert.previousOutline) {
    return {
      ok: false,
      phase: 'missing_previous',
      error: 'This was the first official outline version, so there is no preceding version to restore.',
    };
  }

  let reloaded: ReloadResult;
  try {
    reloaded = await deps.reloadOutlines();
  } catch (error) {
    reloaded = { ok: false, error: error instanceof Error ? error.message : 'Unexpected outline reload error' };
  }
  if (!reloaded.ok) {
    return {
      ok: false,
      phase: 'reload',
      error: `Could not reload official outline versions before Undo: ${reloaded.error}`,
    };
  }

  const latest = [...reloaded.rows].sort((a, b) => b.version - a.version)[0];
  if (!latest || latest.id !== insert.insertedRow.id) {
    return {
      ok: false,
      phase: 'conflict',
      error: 'Undo stopped because a newer official outline version now exists. Open version history before restoring.',
    };
  }

  const nextVersion = latest.version + 1;
  let restored: RestoreResult;
  try {
    restored = await deps.restoreOutline({
      issueId: insert.insertedRow.issue_id,
      outlineJson: insert.previousOutline.outline_json,
      restoredFromVersion: insert.previousOutline.version,
      nextVersion,
    });
  } catch (error) {
    restored = { ok: false, error: error instanceof Error ? error.message : 'Unexpected restore error' };
  }
  if (!restored.ok) {
    return {
      ok: false,
      phase: 'restore',
      error: restored.error ?? 'Could not restore the preceding official outline version.',
    };
  }

  let refreshed: ReloadResult;
  try {
    refreshed = await deps.reloadOutlines();
  } catch (error) {
    refreshed = { ok: false, error: error instanceof Error ? error.message : 'Unexpected outline refresh error' };
  }
  return refreshed.ok
    ? { ok: true, rows: refreshed.rows, restoredVersion: nextVersion }
    : {
        ok: true,
        restoredVersion: nextVersion,
        refreshError: `The preceding outline was restored as v${nextVersion}, but the version list could not refresh: ${refreshed.error}`,
      };
}

export function clearReviewedOutlineRecoveryErrors(actions: {
  setReviewError(error: null): void;
  setScriptsError(error: null): void;
}): void {
  actions.setReviewError(null);
  actions.setScriptsError(null);
}
