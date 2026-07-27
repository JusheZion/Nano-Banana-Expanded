import type { PacingRevisionChange } from '@/shared/writer/pacingRevisionSchemas';
import type { PacingRevisionApplySnapshot } from './writerPacingRevisionApply';
import { effectivePacingRevisionCandidate } from './writerPacingRevisionModel';

export type PacingRevisionCreatedPage = {
  pageId: string;
  pageNumber: number;
};

export type PacingRevisionPersistedPage = {
  id: string;
  page_number: number;
  beats_json: unknown;
  script_text: string | null;
};

export type PacingRevisionApplyVerification =
  | { ok: true }
  | { ok: false; error: string };

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableValue(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function equalValue(left: unknown, right: unknown): boolean {
  return stableValue(left) === stableValue(right);
}

export function verifyPacingRevisionApply(args: {
  sourcePageCount: number;
  targetPageCount: number;
  freshPages: PacingRevisionPersistedPage[];
  createdPages: PacingRevisionCreatedPage[];
  approvedChanges: PacingRevisionChange[];
}): PacingRevisionApplyVerification {
  const pagesByNumber = new Map<number, PacingRevisionPersistedPage>();
  for (const page of args.freshPages) {
    if (pagesByNumber.has(page.page_number)) {
      return { ok: false, error: `Apply verification found duplicate page ${page.page_number}.` };
    }
    pagesByNumber.set(page.page_number, page);
  }

  const expectedNumbers = Array.from(
    { length: args.targetPageCount },
    (_, index) => index + 1,
  );
  if (
    args.freshPages.length !== expectedNumbers.length
    || expectedNumbers.some((pageNumber) => !pagesByNumber.has(pageNumber))
  ) {
    return {
      ok: false,
      error: `Apply verification did not find the complete page-number set 1–${args.targetPageCount}.`,
    };
  }

  const createdByNumber = new Map<number, string>();
  for (const created of args.createdPages) {
    if (createdByNumber.has(created.pageNumber)) {
      return { ok: false, error: `Apply verification has duplicate created mapping for page ${created.pageNumber}.` };
    }
    createdByNumber.set(created.pageNumber, created.pageId);
    const persisted = pagesByNumber.get(created.pageNumber);
    if (!persisted || persisted.id !== created.pageId) {
      return { ok: false, error: `Apply verification could not confirm created page ${created.pageNumber}.` };
    }
  }
  if (args.createdPages.length !== args.targetPageCount - args.sourcePageCount) {
    return { ok: false, error: 'Apply verification found an incomplete created-page mapping.' };
  }

  for (const change of args.approvedChanges) {
    if (change.layer === 'outline') continue;
    const pageNumber = change.page_number;
    const page = pageNumber == null ? null : pagesByNumber.get(pageNumber);
    const expectedPageId = change.page_id ?? (pageNumber == null ? undefined : createdByNumber.get(pageNumber));
    if (!page || !expectedPageId || page.id !== expectedPageId) {
      return { ok: false, error: `Apply verification could not resolve ${change.layer} page ${pageNumber ?? 'unknown'}.` };
    }
    const candidate = effectivePacingRevisionCandidate(change);
    if (change.layer === 'beats' && !equalValue(page.beats_json, candidate)) {
      return { ok: false, error: `Page Beats verification failed for page ${pageNumber}.` };
    }
    if (change.layer === 'dialogue' && page.script_text !== candidate) {
      return { ok: false, error: `Dialogue verification failed for page ${pageNumber}.` };
    }
  }
  return { ok: true };
}

export function verifyPacingRevisionCreatedPagesAbsent(args: {
  freshPages: Array<Pick<PacingRevisionPersistedPage, 'id'>>;
  createdPages: PacingRevisionCreatedPage[];
}): PacingRevisionApplyVerification {
  const remainingIds = new Set(args.freshPages.map((page) => page.id));
  const remaining = args.createdPages.find((page) => remainingIds.has(page.pageId));
  return remaining
    ? { ok: false, error: `Created page ${remaining.pageNumber} still exists after cleanup.` }
    : { ok: true };
}

export function verifyPacingRevisionUndoRecovery(args: {
  freshPages: PacingRevisionPersistedPage[];
  freshOutlines: Array<{ id: string; outline_json: unknown }>;
  snapshot: PacingRevisionApplySnapshot;
}): PacingRevisionApplyVerification {
  const absence = verifyPacingRevisionCreatedPagesAbsent({
    freshPages: args.freshPages,
    createdPages: args.snapshot.createdPages,
  });
  if (!absence.ok) return absence;
  const pagesById = new Map(args.freshPages.map((page) => [page.id, page]));
  for (const prior of args.snapshot.beats) {
    const page = pagesById.get(prior.pageId);
    if (!page || !equalValue(page.beats_json, prior.value)) {
      return { ok: false, error: `Restored Page Beats could not be verified for ${prior.pageId}.` };
    }
  }
  for (const prior of args.snapshot.dialogue) {
    const page = pagesById.get(prior.pageId);
    if (!page || page.script_text !== prior.value) {
      return { ok: false, error: `Restored Dialogue could not be verified for ${prior.pageId}.` };
    }
  }
  if (
    args.snapshot.plannedOutlineId
    && args.freshOutlines.some((outline) => outline.id === args.snapshot.plannedOutlineId)
  ) {
    return { ok: false, error: 'The applied outline still exists after recovery.' };
  }
  if (
    args.snapshot.plannedOutlineId
    && !equalValue(args.freshOutlines[0]?.outline_json, args.snapshot.outline)
  ) {
    return { ok: false, error: 'The restored source outline could not be verified.' };
  }
  return { ok: true };
}
