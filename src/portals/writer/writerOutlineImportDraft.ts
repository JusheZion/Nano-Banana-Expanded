import type { OutlinePasteDiagnostic } from './writerOutlinePasteDiagnostic';

const PREFIX = 'writer:outline-import-draft:';

type OutlineImportDraft = {
  issueId: string;
  step: number;
  savedAt: string;
  diagnostic: OutlinePasteDiagnostic;
};

function key(issueId: string): string {
  return `${PREFIX}${issueId}`;
}

function isDiagnostic(value: unknown): value is OutlinePasteDiagnostic {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.originalText === 'string'
    && Array.isArray(record.passages)
    && Array.isArray(record.warnings)
    && typeof record.sourceType === 'string';
}

export function loadOutlineImportDraft(storage: Pick<Storage, 'getItem'>, issueId: string): OutlineImportDraft | null {
  try {
    const raw = storage.getItem(key(issueId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.issueId !== issueId || !Number.isInteger(value.step) || !isDiagnostic(value.diagnostic)) return null;
    return value as OutlineImportDraft;
  } catch {
    return null;
  }
}

export function saveOutlineImportDraft(
  storage: Pick<Storage, 'setItem'>,
  issueId: string,
  diagnostic: OutlinePasteDiagnostic,
  step: number,
): void {
  try {
    storage.setItem(key(issueId), JSON.stringify({ issueId, diagnostic, step, savedAt: new Date().toISOString() }));
  } catch {
    // A denied/full local store must not block manual import.
  }
}

export function clearOutlineImportDraft(storage: Pick<Storage, 'removeItem'>, issueId: string): void {
  try {
    storage.removeItem(key(issueId));
  } catch {
    // A denied local store leaves an inert stale draft; the current import still succeeds.
  }
}
