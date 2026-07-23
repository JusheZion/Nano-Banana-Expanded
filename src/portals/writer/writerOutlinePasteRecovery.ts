import type { WriterIssueOutlineRow } from '@/shared/api/arcsWriterRoom';
import {
  readAuthorOutlineFromNotes,
  type AuthorOutlineSource,
} from './writerSynopsisHelper';

type ReloadResult = { ok: true; rows: WriterIssueOutlineRow[] } | { ok: false; error: string };
type RestoreResult = { ok: true } | { ok: false; error?: string };
type StepResult = { ok: true } | { ok: false; error: string };

export type ReviewedOutlineInsert = {
  insertedRow: WriterIssueOutlineRow;
  previousOutline: WriterIssueOutlineRow | null;
  hadPreviousOutline: boolean;
  origin: 'source' | 'official_editor';
  insertedRowDeleted?: boolean;
};

export type ReviewedOutlineRecoveryDeps = {
  reloadOutlines(): Promise<ReloadResult>;
  restoreOutline(input: {
    issueId: string;
    outlineJson: Record<string, unknown>;
    restoredFromVersion: number;
    nextVersion: number;
  }): Promise<RestoreResult>;
  deleteOutline(input: { issueId: string; outlineId: string }): Promise<StepResult>;
  restorePriorSource(): Promise<StepResult>;
};

export type ReviewedOutlineSourceSyncDeps = {
  reloadOutlines(): Promise<ReloadResult>;
  syncSource(): Promise<StepResult>;
};

export type ReviewedOutlinePriorSource = {
  present: boolean;
  value?: unknown;
};

const REVIEWED_OUTLINE_RECOVERY_KEY = 'reviewed_outline_recovery';

export type PersistedReviewedOutlineRecovery = {
  issueId: string;
  insertedVersion: number;
  previousOutline: WriterIssueOutlineRow | null;
  origin: ReviewedOutlineInsert['origin'];
  canonicalSourceText: string;
  priorAuthorOutline: ReviewedOutlinePriorSource;
  priorAuthorSource: AuthorOutlineSource;
};

function readPersistedReviewedOutlineRecovery(notes: unknown): PersistedReviewedOutlineRecovery | null {
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return null;
  const value = (notes as Record<string, unknown>)[REVIEWED_OUTLINE_RECOVERY_KEY];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Partial<PersistedReviewedOutlineRecovery>;
  if (
    typeof record.issueId !== 'string'
    || !Number.isInteger(record.insertedVersion)
    || (record.origin !== 'source' && record.origin !== 'official_editor')
    || typeof record.canonicalSourceText !== 'string'
    || !record.priorAuthorOutline
    || typeof record.priorAuthorOutline.present !== 'boolean'
    || !record.priorAuthorSource
    || typeof record.priorAuthorSource.text !== 'string'
    || !['preserve', 'structure', 'expand'].includes(record.priorAuthorSource.mode)
  ) return null;
  return record as PersistedReviewedOutlineRecovery;
}

export function mergeReviewedOutlineRecoveryIntoNotes(
  notes: unknown,
  recovery: PersistedReviewedOutlineRecovery,
): Record<string, unknown> {
  const next = notes && typeof notes === 'object' && !Array.isArray(notes)
    ? { ...(notes as Record<string, unknown>) }
    : {};
  next[REVIEWED_OUTLINE_RECOVERY_KEY] = structuredClone(recovery);
  return next;
}

export function clearReviewedOutlineRecoveryFromNotes(notes: unknown): Record<string, unknown> {
  const next = notes && typeof notes === 'object' && !Array.isArray(notes)
    ? { ...(notes as Record<string, unknown>) }
    : {};
  delete next[REVIEWED_OUTLINE_RECOVERY_KEY];
  return next;
}

export function rehydrateReviewedOutlineRecovery(
  notes: unknown,
  outlines: WriterIssueOutlineRow[],
): (ReviewedOutlineInsert & Omit<PersistedReviewedOutlineRecovery, 'issueId' | 'insertedVersion' | 'previousOutline' | 'origin'> & {
  priorAuthorOutline: ReviewedOutlinePriorSource;
  priorAuthorSource: AuthorOutlineSource;
}) | null {
  const stored = readPersistedReviewedOutlineRecovery(notes);
  if (!stored) return null;
  const insertedRow = outlines.find((row) => (
    row.issue_id === stored.issueId && row.version === stored.insertedVersion
  ));
  if (!insertedRow) return null;
  return {
    insertedRow,
    previousOutline: stored.previousOutline,
    hadPreviousOutline: Boolean(stored.previousOutline),
    origin: stored.origin,
    canonicalSourceText: stored.canonicalSourceText,
    priorAuthorOutline: stored.priorAuthorOutline,
    priorAuthorSource: stored.priorAuthorSource,
  };
}

export function captureReviewedOutlinePriorSource(notes: Record<string, unknown>): {
  priorAuthorOutline: ReviewedOutlinePriorSource;
  priorAuthorSource: AuthorOutlineSource;
} {
  const present = Object.prototype.hasOwnProperty.call(notes, 'author_outline');
  return {
    priorAuthorOutline: present
      ? { present: true, value: notes.author_outline }
      : { present: false },
    priorAuthorSource: readAuthorOutlineFromNotes(notes),
  };
}

export function restoreReviewedOutlinePriorSource(
  currentNotes: Record<string, unknown>,
  prior: ReviewedOutlinePriorSource,
): Record<string, unknown> {
  const nextNotes = { ...currentNotes };
  if (prior.present) nextNotes.author_outline = prior.value;
  else delete nextNotes.author_outline;
  return nextNotes;
}

async function reloadSafely(
  reloadOutlines: () => Promise<ReloadResult>,
  fallback: string,
): Promise<ReloadResult> {
  try {
    return await reloadOutlines();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : fallback };
  }
}

async function stepSafely(step: () => Promise<StepResult>, fallback: string): Promise<StepResult> {
  try {
    return await step();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : fallback };
  }
}

export async function retryReviewedOutlineSourceSync(
  insert: ReviewedOutlineInsert,
  deps: ReviewedOutlineSourceSyncDeps,
): Promise<
  | { ok: true; rows: WriterIssueOutlineRow[] }
  | { ok: false; phase: 'reload' | 'conflict' | 'source_sync' | 'refresh'; error: string }
> {
  const reloaded = await reloadSafely(deps.reloadOutlines, 'Unexpected outline reload error');
  if (!reloaded.ok) {
    return { ok: false, phase: 'reload', error: `Could not reload official outline versions before source sync: ${reloaded.error}` };
  }
  const latest = [...reloaded.rows].sort((a, b) => b.version - a.version)[0];
  if (!latest || latest.id !== insert.insertedRow.id) {
    return {
      ok: false,
      phase: 'conflict',
      error: 'Source sync stopped because a newer official outline exists. Reload versions and review the latest outline before continuing.',
    };
  }
  const sourceSync = await stepSafely(deps.syncSource, 'Unexpected source sync error');
  if (!sourceSync.ok) return { ok: false, phase: 'source_sync', error: sourceSync.error };
  const refreshed = await reloadSafely(deps.reloadOutlines, 'Unexpected outline refresh error');
  return refreshed.ok
    ? { ok: true, rows: refreshed.rows }
    : { ok: false, phase: 'refresh', error: `My Outline was synchronized, but official versions could not refresh: ${refreshed.error}` };
}

export async function restoreReviewedOutlineInsert(
  insert: ReviewedOutlineInsert,
  selectedIssueId: string | null,
  deps: ReviewedOutlineRecoveryDeps,
): Promise<
  | {
      ok: true;
      undoKind: 'restored_previous' | 'deleted_first';
      rows?: WriterIssueOutlineRow[];
      restoredVersion?: number;
      refreshError?: string;
    }
  | {
      ok: false;
      phase: 'wrong_issue' | 'reload' | 'conflict' | 'restore' | 'delete' | 'source_restore';
      error: string;
      partial: boolean;
      insertedRowDeleted?: boolean;
      rows?: WriterIssueOutlineRow[];
    }
> {
  if (selectedIssueId !== insert.insertedRow.issue_id) {
    return {
      ok: false,
      phase: 'wrong_issue',
      error: 'Return to the owning issue before undoing this reviewed outline update.',
      partial: false,
    };
  }

  if (insert.insertedRowDeleted) {
    const beforeRestore = await reloadSafely(deps.reloadOutlines, 'Unexpected outline reload error');
    if (!beforeRestore.ok) {
      return {
        ok: false,
        phase: 'reload',
        error: `The first outline row is already removed, but versions could not reload before restoring source: ${beforeRestore.error}`,
        partial: true,
        insertedRowDeleted: true,
      };
    }
    if (beforeRestore.rows.length > 0) {
      return {
        ok: false,
        phase: 'conflict',
        error: 'Source restore stopped because a newer official outline now exists. Review that version before changing My Outline source.',
        partial: true,
        insertedRowDeleted: true,
        rows: beforeRestore.rows,
      };
    }
    const sourceRestore = await stepSafely(deps.restorePriorSource, 'Unexpected prior-source restore error');
    const refreshed = await reloadSafely(deps.reloadOutlines, 'Unexpected outline refresh error');
    if (!sourceRestore.ok) {
      return {
        ok: false,
        phase: 'source_restore',
        error: `The first official outline version was removed, but the prior My Outline source still could not be restored: ${sourceRestore.error}${refreshed.ok ? '' : `. Version refresh also failed: ${refreshed.error}`}`,
        partial: true,
        insertedRowDeleted: true,
        rows: refreshed.ok ? refreshed.rows : undefined,
      };
    }
    return refreshed.ok
      ? { ok: true, undoKind: 'deleted_first', rows: refreshed.rows }
      : {
          ok: true,
          undoKind: 'deleted_first',
          refreshError: `The prior My Outline source was restored, but official versions could not refresh: ${refreshed.error}`,
        };
  }

  const reloaded = await reloadSafely(deps.reloadOutlines, 'Unexpected outline reload error');
  if (!reloaded.ok) {
    return {
      ok: false,
      phase: 'reload',
      error: `Could not reload official outline versions before Undo: ${reloaded.error}`,
      partial: false,
    };
  }

  const latest = [...reloaded.rows].sort((a, b) => b.version - a.version)[0];
  if (!latest || latest.id !== insert.insertedRow.id) {
    return {
      ok: false,
      phase: 'conflict',
      error: 'Undo stopped because a newer official outline version now exists. Open version history before restoring.',
      partial: false,
    };
  }

  if (!insert.hadPreviousOutline || !insert.previousOutline) {
    const deleted = await stepSafely(
      () => deps.deleteOutline({ issueId: insert.insertedRow.issue_id, outlineId: insert.insertedRow.id }),
      'Unexpected outline deletion error',
    );
    if (!deleted.ok) {
      return {
        ok: false,
        phase: 'delete',
        error: `Could not remove the first official outline version: ${deleted.error}`,
        partial: false,
      };
    }
    const afterDelete = await reloadSafely(deps.reloadOutlines, 'Unexpected outline reload error');
    if (!afterDelete.ok) {
      return {
        ok: false,
        phase: 'reload',
        error: `The first official outline version was removed, but versions could not reload before restoring source: ${afterDelete.error}`,
        partial: true,
        insertedRowDeleted: true,
      };
    }
    if (afterDelete.rows.length > 0) {
      return {
        ok: false,
        phase: 'conflict',
        error: 'Source restore stopped because a newer official outline appeared after deletion. Review that version before changing My Outline source.',
        partial: true,
        insertedRowDeleted: true,
        rows: afterDelete.rows,
      };
    }
    const sourceRestore = await stepSafely(deps.restorePriorSource, 'Unexpected prior-source restore error');
    const refreshed = await reloadSafely(deps.reloadOutlines, 'Unexpected outline refresh error');
    if (!sourceRestore.ok) {
      return {
        ok: false,
        phase: 'source_restore',
        error: `The first official outline version was removed, but the prior My Outline source could not be restored: ${sourceRestore.error}${refreshed.ok ? '' : `. Version refresh also failed: ${refreshed.error}`}`,
        partial: true,
        insertedRowDeleted: true,
        rows: refreshed.ok ? refreshed.rows : undefined,
      };
    }
    return refreshed.ok
      ? { ok: true, undoKind: 'deleted_first', rows: refreshed.rows }
      : {
          ok: true,
          undoKind: 'deleted_first',
          refreshError: `The first official outline version was removed and prior source restored, but versions could not refresh: ${refreshed.error}`,
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
      partial: false,
    };
  }
  const sourceRestore = await stepSafely(deps.restorePriorSource, 'Unexpected prior-source restore error');
  if (!sourceRestore.ok) {
    return {
      ok: false,
      phase: 'source_restore',
      error: `The preceding official outline was restored, but the prior My Outline source could not be restored: ${sourceRestore.error}`,
      partial: true,
    };
  }

  let refreshed: ReloadResult;
  try {
    refreshed = await deps.reloadOutlines();
  } catch (error) {
    refreshed = { ok: false, error: error instanceof Error ? error.message : 'Unexpected outline refresh error' };
  }
  return refreshed.ok
    ? { ok: true, undoKind: 'restored_previous', rows: refreshed.rows, restoredVersion: nextVersion }
    : {
        ok: true,
        undoKind: 'restored_previous',
        restoredVersion: nextVersion,
        refreshError: `The preceding outline was restored as v${nextVersion}, but the version list could not refresh: ${refreshed.error}`,
      };
}

export function getReviewedOutlineUndoAvailability(
  insert: ReviewedOutlineInsert,
  selectedIssueId: string | null,
): {
  available: boolean;
  reason: 'wrong_issue' | null;
  guidance: string;
} {
  if (selectedIssueId !== insert.insertedRow.issue_id) {
    return {
      available: false,
      reason: 'wrong_issue',
      guidance: 'Return to the owning issue to Undo this reviewed update.',
    };
  }
  return {
    available: true,
    reason: null,
    guidance: insert.hadPreviousOutline && insert.previousOutline
      ? 'Undo is available for this reviewed update.'
      : 'Undo will remove this first official outline version and restore the prior My Outline source.',
  };
}

export function reviewedOutlineRecoveryGuidance(insert: ReviewedOutlineInsert): string {
  return insert.hadPreviousOutline && insert.previousOutline
    ? 'Undo remains available.'
    : 'Undo remains available and will remove this first official outline version, then restore the prior My Outline source.';
}

export function clearReviewedOutlineRecoveryErrors(actions: {
  setReviewError(error: null): void;
  setScriptsError(error: null): void;
}): void {
  actions.setReviewError(null);
  actions.setScriptsError(null);
}
