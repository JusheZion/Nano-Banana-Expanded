import type {
  PacingRevisionChange,
  PacingRevisionSet,
} from '@/shared/writer/pacingRevisionSchemas';
import {
  effectivePacingRevisionCandidate,
  flattenPacingRevisionChanges,
} from './writerPacingRevisionModel';
import type { PacingRevisionCreatedPage } from './writerPacingRevisionApplyVerification';

type ApplyWriters = {
  beginApply?: (snapshot: PacingRevisionApplySnapshot) => Promise<void>;
  persistSnapshot?: (snapshot: PacingRevisionApplySnapshot) => Promise<void>;
  buildOutline: (approvedOutlineChanges: PacingRevisionChange[]) => Promise<unknown>;
  writeOutline: (outline: unknown, plannedOutlineId: string | null) => Promise<void>;
  createPage: (pageNumber: number, plannedPageId: string) => Promise<PacingRevisionCreatedPage>;
  deletePages: (pageIds: string[]) => Promise<void>;
  writeBeats: (pageId: string, value: unknown) => Promise<void>;
  writeDialogue: (pageId: string, value: string | null) => Promise<void>;
};

export type PacingRevisionApplySnapshot = {
  outline: unknown;
  plannedOutlineId: string | null;
  beats: Array<{ pageId: string; value: unknown }>;
  dialogue: Array<{ pageId: string; value: string | null }>;
  createdPages: PacingRevisionCreatedPage[];
  sourcePageCount: number;
  targetPageCount: number;
  appliedIds: string[];
};

export function pacingRevisionApplySnapshotFromUnknown(
  value: unknown,
): PacingRevisionApplySnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    !Array.isArray(record.beats)
    || !Array.isArray(record.dialogue)
    || !Array.isArray(record.createdPages)
    || !Array.isArray(record.appliedIds)
    || !Number.isInteger(record.sourcePageCount)
    || !Number.isInteger(record.targetPageCount)
    || !record.createdPages.every((page) => {
      if (!page || typeof page !== 'object' || Array.isArray(page)) return false;
      const created = page as Record<string, unknown>;
      return typeof created.pageId === 'string'
        && created.pageId.length > 0
        && Number.isInteger(created.pageNumber);
    })
    || !record.appliedIds.every((id) => typeof id === 'string')
    || !(
      record.plannedOutlineId == null
      || typeof record.plannedOutlineId === 'string'
    )
  ) {
    return null;
  }
  return {
    outline: record.outline,
    plannedOutlineId: typeof record.plannedOutlineId === 'string'
      ? record.plannedOutlineId
      : null,
    beats: record.beats as PacingRevisionApplySnapshot['beats'],
    dialogue: record.dialogue as PacingRevisionApplySnapshot['dialogue'],
    createdPages: record.createdPages as PacingRevisionCreatedPage[],
    sourcePageCount: record.sourcePageCount as number,
    targetPageCount: record.targetPageCount as number,
    appliedIds: record.appliedIds as string[],
  };
}

export function pacingRevisionFingerprintKey(change: PacingRevisionChange): string {
  return `${change.layer}:${change.target_key}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function copySnapshot(snapshot: PacingRevisionApplySnapshot): PacingRevisionApplySnapshot {
  return {
    ...snapshot,
    beats: [...snapshot.beats],
    dialogue: [...snapshot.dialogue],
    createdPages: snapshot.createdPages.map((page) => ({ ...page })),
    appliedIds: [...snapshot.appliedIds],
  };
}

export async function loadPacingRevisionApplyAuthority<TSet, TIssue, TOutline, TPage>(readers: {
  loadSet: () => Promise<TSet>;
  loadIssue: () => Promise<TIssue>;
  loadOutlines: () => Promise<TOutline[]>;
  loadPages: () => Promise<TPage[]>;
}): Promise<{ set: TSet; issue: TIssue; latestOutline: TOutline; pages: TPage[] }> {
  const [set, issue, outlines, pages] = await Promise.all([
    readers.loadSet(),
    readers.loadIssue(),
    readers.loadOutlines(),
    readers.loadPages(),
  ]);
  const latestOutline = outlines[0];
  if (!latestOutline) throw new Error('A current saved outline is required before Apply.');
  return { set, issue, latestOutline, pages };
}

export async function applyPacingRevisionSet(args: {
  set: PacingRevisionSet;
  existingPages: Array<{ pageId: string; pageNumber: number }>;
  currentFingerprints: Map<string, string>;
  lockedTargetKeys: Set<string>;
  writers: ApplyWriters;
}): Promise<{
  snapshot: PacingRevisionApplySnapshot;
  appliedIds: string[];
  approvedChanges: PacingRevisionChange[];
  targetOutline: unknown;
}> {
  const allChanges = flattenPacingRevisionChanges(args.set);
  const byId = new Map(allChanges.map((change) => [change.id, change]));
  const approved = allChanges.filter((change) =>
    change.decision === 'approved' && change.generation_status === 'ready'
  );
  if (approved.length === 0) throw new Error('Approve at least one eligible change before applying.');
  const invalidDependency = approved.find((change) => change.dependency_ids.some((dependencyId) => {
    const dependency = byId.get(dependencyId);
    return !dependency
      || dependency.decision !== 'approved'
      || !['ready', 'applied'].includes(dependency.generation_status);
  }));
  if (invalidDependency) {
    throw new Error(`Change ${invalidDependency.target_key} has an unresolved dependency.`);
  }
  const stale = approved.find((change) =>
    args.currentFingerprints.get(pacingRevisionFingerprintKey(change)) !== change.source_fingerprint
  );
  if (stale) throw new Error(`Change ${stale.target_key} is stale. Refresh the Revision Set.`);
  const locked = approved.find((change) => args.lockedTargetKeys.has(pacingRevisionFingerprintKey(change)));
  if (locked) throw new Error(`Change ${locked.target_key} is locked.`);

  const outlineChanges = approved.filter((change) => change.layer === 'outline');
  const beatsChanges = approved.filter((change) => change.layer === 'beats');
  const dialogueChanges = approved.filter((change) => change.layer === 'dialogue');
  const targetOutline = await args.writers.buildOutline(outlineChanges);
  const targetOutlineRecord = targetOutline && typeof targetOutline === 'object' && !Array.isArray(targetOutline)
    ? targetOutline as Record<string, unknown>
    : null;
  const targetBeats = targetOutlineRecord && Array.isArray(targetOutlineRecord.page_beats)
    ? targetOutlineRecord.page_beats
    : null;
  if (targetBeats?.some((beat, index) => {
    const record = beat && typeof beat === 'object' && !Array.isArray(beat)
      ? beat as Record<string, unknown>
      : null;
    return record?.page_target !== index + 1;
  })) {
    throw new Error('The built approved outline must contain sequential page targets.');
  }
  const physicalNumbers = new Set<number>();
  const physicalById = new Map<string, number>();
  let existingMax = 0;
  for (const page of args.existingPages) {
    if (!page.pageId || !Number.isInteger(page.pageNumber) || page.pageNumber < 1) {
      throw new Error('Existing page identity is invalid.');
    }
    if (physicalNumbers.has(page.pageNumber)) {
      throw new Error(`Existing page-number collision at page ${page.pageNumber}.`);
    }
    physicalNumbers.add(page.pageNumber);
    if (physicalById.has(page.pageId)) {
      throw new Error(`Existing page identity ${page.pageId} is duplicated.`);
    }
    physicalById.set(page.pageId, page.pageNumber);
    existingMax = Math.max(existingMax, page.pageNumber);
  }
  for (let pageNumber = 1; pageNumber <= existingMax; pageNumber += 1) {
    if (!physicalNumbers.has(pageNumber)) {
      throw new Error(`Existing physical pages must be contiguous from 1 through ${existingMax}.`);
    }
  }
  const physicalTargetKeys = new Set<string>();
  for (const change of approved) {
    if (change.layer === 'outline' || change.page_id == null) continue;
    if (
      !Number.isInteger(change.page_number)
      || (change.page_number ?? 0) < 1
      || physicalById.get(change.page_id) !== change.page_number
    ) {
      throw new Error(`Approved ${change.layer} change has a mismatched physical page identity.`);
    }
    const target = `${change.layer}:${change.page_id}`;
    if (physicalTargetKeys.has(target)) {
      throw new Error(`Approved ${change.layer} changes collide on page ${change.page_number}.`);
    }
    physicalTargetKeys.add(target);
  }
  const approvedVirtual = approved.filter((change) => change.layer !== 'outline' && change.page_id == null);
  for (const change of approvedVirtual) {
    if (!Number.isInteger(change.page_number) || (change.page_number ?? 0) < 1) {
      throw new Error(`Virtual ${change.layer} change has an invalid page number.`);
    }
    if (physicalNumbers.has(change.page_number!)) {
      throw new Error(`Virtual page ${change.page_number} collides with an existing page.`);
    }
  }
  const targetPageCount = targetBeats?.length ?? existingMax;
  if (targetPageCount < existingMax) {
    throw new Error('Pacing Revision Apply cannot contract existing physical pages.');
  }
  const createdPageNumbers = Array.from(
    { length: targetPageCount - existingMax },
    (_, index) => existingMax + index + 1,
  );
  const expectedVirtualNumbers = new Set(createdPageNumbers);
  const unexpectedVirtual = approvedVirtual.find((change) => !expectedVirtualNumbers.has(change.page_number!));
  if (unexpectedVirtual) {
    throw new Error(`Virtual page ${unexpectedVirtual.page_number} is not contiguous with the approved outline target.`);
  }
  for (const pageNumber of createdPageNumbers) {
    const beatsForPage = beatsChanges.filter((change) =>
      change.page_id == null && change.page_number === pageNumber
    );
    const dialogueForPage = dialogueChanges.filter((change) =>
      change.page_id == null && change.page_number === pageNumber
    );
    if (beatsForPage.length !== 1) {
      throw new Error(`Virtual page ${pageNumber} requires one approved ready Page Beats change.`);
    }
    if (dialogueForPage.length !== 1) {
      throw new Error(`Virtual page ${pageNumber} requires one approved ready Dialogue change.`);
    }
    const beats = beatsForPage[0]!;
    const dialogue = dialogueForPage[0]!;
    const applicableOutline = beats.dependency_ids
      .map((dependencyId) => byId.get(dependencyId))
      .some((dependency) =>
        dependency?.layer === 'outline'
        && dependency.item_id === beats.item_id
        && dependency.decision === 'approved'
        && ['ready', 'applied'].includes(dependency.generation_status)
      );
    if (!applicableOutline) {
      throw new Error(`Virtual page ${pageNumber} requires an applicable approved Outline change.`);
    }
    if (!dialogue.dependency_ids.includes(beats.id)) {
      throw new Error(`Virtual page ${pageNumber} Dialogue must depend on its approved Page Beats change.`);
    }
  }
  const snapshot: PacingRevisionApplySnapshot = {
    outline: args.set.source_outline_json,
    plannedOutlineId: outlineChanges.length > 0 ? crypto.randomUUID() : null,
    beats: beatsChanges.flatMap((change) => change.page_id
      ? [{ pageId: change.page_id, value: change.current_value }]
      : []),
    dialogue: dialogueChanges.flatMap((change) => change.page_id
      ? [{ pageId: change.page_id, value: typeof change.current_value === 'string' ? change.current_value : null }]
      : []),
    createdPages: createdPageNumbers.map((pageNumber) => ({
      pageId: crypto.randomUUID(),
      pageNumber,
    })),
    sourcePageCount: args.existingPages.length,
    targetPageCount,
    appliedIds: approved.map((change) => change.id),
  };
  const completedExistingWrites: Array<() => Promise<void>> = [];
  let outlineWritten = false;
  const createdByPageNumber = new Map<number, string>();
  if (!args.writers.beginApply || !args.writers.persistSnapshot) {
    throw new Error('Durable Apply snapshot writers are required before mutation.');
  }
  await args.writers.beginApply(copySnapshot(snapshot));
  try {
    if (outlineChanges.length) {
      await args.writers.writeOutline(targetOutline, snapshot.plannedOutlineId);
      outlineWritten = true;
      await args.writers.persistSnapshot(copySnapshot(snapshot));
    }
    for (const pageNumber of createdPageNumbers) {
      const planned = snapshot.createdPages.find((page) => page.pageNumber === pageNumber);
      if (!planned) throw new Error(`Created page ${pageNumber} is missing its planned identity.`);
      const created = await args.writers.createPage(pageNumber, planned.pageId);
      if (
        !created?.pageId
        || created.pageNumber !== pageNumber
        || created.pageId !== planned.pageId
        || createdByPageNumber.has(pageNumber)
        || [...createdByPageNumber.values()].includes(created.pageId)
      ) {
        throw new Error(`Created page ${pageNumber} did not return its exact identity.`);
      }
      createdByPageNumber.set(pageNumber, created.pageId);
    }
    for (const change of beatsChanges) {
      const pageId = change.page_id ?? (
        change.page_number == null ? undefined : createdByPageNumber.get(change.page_number)
      );
      if (!pageId) throw new Error('Page Beats change is missing a page target.');
      await args.writers.writeBeats(pageId, effectivePacingRevisionCandidate(change));
      if (change.page_id) {
        completedExistingWrites.push(() => args.writers.writeBeats(change.page_id!, change.current_value));
      }
    }
    for (const change of dialogueChanges) {
      const pageId = change.page_id ?? (
        change.page_number == null ? undefined : createdByPageNumber.get(change.page_number)
      );
      if (!pageId) throw new Error('Dialogue change is missing a page target.');
      const value = effectivePacingRevisionCandidate(change);
      if (typeof value !== 'string') throw new Error('Dialogue candidate must be text.');
      await args.writers.writeDialogue(pageId, value);
      if (change.page_id) {
        completedExistingWrites.push(() => args.writers.writeDialogue(
          change.page_id!,
          typeof change.current_value === 'string' ? change.current_value : null,
        ));
      }
    }
  } catch (error) {
    const recoveryErrors: string[] = [];
    for (const compensate of completedExistingWrites.reverse()) {
      try {
        await compensate();
      } catch (recoveryError) {
        recoveryErrors.push(errorMessage(recoveryError));
      }
    }
    if (snapshot.createdPages.length > 0) {
      try {
        await args.writers.deletePages(snapshot.createdPages.map((page) => page.pageId));
      } catch (recoveryError) {
        recoveryErrors.push(errorMessage(recoveryError));
      }
    }
    if (outlineWritten) {
      try {
        await args.writers.writeOutline(snapshot.outline, snapshot.plannedOutlineId);
      } catch (recoveryError) {
        recoveryErrors.push(errorMessage(recoveryError));
      }
    }
    if (recoveryErrors.length > 0) {
      throw new Error(
        `${errorMessage(error)} Recovery also failed: ${recoveryErrors.join(' ')}`,
        { cause: error },
      );
    }
    throw error;
  }
  return {
    snapshot,
    appliedIds: snapshot.appliedIds,
    approvedChanges: approved,
    targetOutline,
  };
}

export async function undoPacingRevisionApply(
  snapshot: PacingRevisionApplySnapshot,
  writers: Pick<ApplyWriters, 'writeOutline' | 'writeBeats' | 'writeDialogue' | 'deletePages'>,
): Promise<void> {
  const recoveryErrors: string[] = [];
  for (const dialogue of [...snapshot.dialogue].reverse()) {
    try {
      await writers.writeDialogue(dialogue.pageId, dialogue.value);
    } catch (error) {
      recoveryErrors.push(errorMessage(error));
    }
  }
  for (const beat of [...snapshot.beats].reverse()) {
    try {
      await writers.writeBeats(beat.pageId, beat.value);
    } catch (error) {
      recoveryErrors.push(errorMessage(error));
    }
  }
  const createdPages = snapshot.createdPages ?? [];
  if (createdPages.length > 0) {
    try {
      await writers.deletePages(createdPages.map((page) => page.pageId));
    } catch (error) {
      recoveryErrors.push(errorMessage(error));
    }
  }
  try {
    await writers.writeOutline(snapshot.outline, snapshot.plannedOutlineId);
  } catch (error) {
    recoveryErrors.push(errorMessage(error));
  }
  if (recoveryErrors.length > 0) {
    throw new Error(`Undo recovery failed: ${recoveryErrors.join(' ')}`);
  }
}
