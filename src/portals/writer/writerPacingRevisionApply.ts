import type {
  PacingRevisionChange,
  PacingRevisionSet,
} from '@/shared/writer/pacingRevisionSchemas';
import {
  approvedPacingRevisionChanges,
  effectivePacingRevisionCandidate,
} from './writerPacingRevisionModel';

type ApplyWriters = {
  buildOutline: (approvedOutlineChanges: PacingRevisionChange[]) => Promise<unknown>;
  writeOutline: (outline: unknown) => Promise<void>;
  writeBeats: (pageId: string, value: unknown) => Promise<void>;
  writeDialogue: (pageId: string, value: string | null) => Promise<void>;
};

export type PacingRevisionApplySnapshot = {
  outline: unknown;
  beats: Array<{ pageId: string; value: unknown }>;
  dialogue: Array<{ pageId: string; value: string | null }>;
};

export function pacingRevisionFingerprintKey(change: PacingRevisionChange): string {
  return `${change.layer}:${change.target_key}`;
}

export async function applyPacingRevisionSet(args: {
  set: PacingRevisionSet;
  currentFingerprints: Map<string, string>;
  lockedTargetKeys: Set<string>;
  writers: ApplyWriters;
}): Promise<{ snapshot: PacingRevisionApplySnapshot; appliedIds: string[] }> {
  const approved = approvedPacingRevisionChanges(args.set);
  if (approved.length === 0) throw new Error('Approve at least one eligible change before applying.');
  const stale = approved.find((change) =>
    args.currentFingerprints.get(pacingRevisionFingerprintKey(change)) !== change.source_fingerprint
  );
  if (stale) throw new Error(`Change ${stale.target_key} is stale. Refresh the Revision Set.`);
  const locked = approved.find((change) => args.lockedTargetKeys.has(pacingRevisionFingerprintKey(change)));
  if (locked) throw new Error(`Change ${locked.target_key} is locked.`);

  const outlineChanges = approved.filter((change) => change.layer === 'outline');
  const beatsChanges = approved.filter((change) => change.layer === 'beats');
  const dialogueChanges = approved.filter((change) => change.layer === 'dialogue');
  const snapshot: PacingRevisionApplySnapshot = {
    outline: args.set.source_outline_json,
    beats: beatsChanges.flatMap((change) => change.page_id
      ? [{ pageId: change.page_id, value: change.current_value }]
      : []),
    dialogue: dialogueChanges.flatMap((change) => change.page_id
      ? [{ pageId: change.page_id, value: typeof change.current_value === 'string' ? change.current_value : null }]
      : []),
  };
  const completed: Array<() => Promise<void>> = [];
  try {
    if (outlineChanges.length) {
      await args.writers.writeOutline(await args.writers.buildOutline(outlineChanges));
      completed.push(() => args.writers.writeOutline(snapshot.outline));
    }
    for (const change of beatsChanges) {
      if (!change.page_id) throw new Error('Page Beats change is missing a page target.');
      await args.writers.writeBeats(change.page_id, effectivePacingRevisionCandidate(change));
      completed.push(() => args.writers.writeBeats(change.page_id!, change.current_value));
    }
    for (const change of dialogueChanges) {
      if (!change.page_id) throw new Error('Dialogue change is missing a page target.');
      const value = effectivePacingRevisionCandidate(change);
      if (typeof value !== 'string') throw new Error('Dialogue candidate must be text.');
      await args.writers.writeDialogue(change.page_id, value);
      completed.push(() => args.writers.writeDialogue(
        change.page_id!,
        typeof change.current_value === 'string' ? change.current_value : null,
      ));
    }
  } catch (error) {
    for (const compensate of completed.reverse()) {
      try {
        await compensate();
      } catch {
        // Preserve the original failure; caller records recovery-required state.
      }
    }
    throw error;
  }
  return { snapshot, appliedIds: approved.map((change) => change.id) };
}

export async function undoPacingRevisionApply(
  snapshot: PacingRevisionApplySnapshot,
  writers: Omit<ApplyWriters, 'buildOutline'>,
): Promise<void> {
  await writers.writeOutline(snapshot.outline);
  for (const beat of snapshot.beats) await writers.writeBeats(beat.pageId, beat.value);
  for (const dialogue of snapshot.dialogue) {
    await writers.writeDialogue(dialogue.pageId, dialogue.value);
  }
}
