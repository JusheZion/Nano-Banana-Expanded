import type { PacingRevisionChange } from '@/shared/writer/pacingRevisionSchemas';
import { effectivePacingRevisionCandidate } from './writerPacingRevisionModel';

type OutlineBeat = {
  page_target?: number;
  scene?: string;
  summary: string;
  emotional_turn?: string;
};

type StoredOperation = {
  operation_id: string;
  operation: 'edit' | 'move' | 'combine' | 'add';
  source_beat_ids: string[];
  anchor_source_beat_id?: string;
  placement?: 'before' | 'after';
  scene?: string;
  summary?: string;
  emotional_turn?: string;
};

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function fingerprintPacingRevisionValue(value: unknown): Promise<string> {
  return sha256Hex(JSON.stringify(value));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readBeat(value: unknown): OutlineBeat | null {
  const record = asRecord(value);
  return typeof record.summary === 'string' && record.summary.trim()
    ? {
        ...(typeof record.page_target === 'number' ? { page_target: record.page_target } : {}),
        ...(typeof record.scene === 'string' ? { scene: record.scene } : {}),
        summary: record.summary,
        ...(typeof record.emotional_turn === 'string' ? { emotional_turn: record.emotional_turn } : {}),
      }
    : null;
}

function readCandidate(change: PacingRevisionChange): {
  operation: StoredOperation;
  proposedBeat: OutlineBeat | null;
} {
  const candidate = asRecord(effectivePacingRevisionCandidate(change));
  const operation = asRecord(candidate.operation) as Partial<StoredOperation>;
  if (
    typeof operation.operation_id !== 'string'
    || !['edit', 'move', 'combine', 'add'].includes(String(operation.operation))
    || !Array.isArray(operation.source_beat_ids)
  ) {
    throw new Error(`Outline change ${change.id} is missing its deterministic operation.`);
  }
  return {
    operation: operation as StoredOperation,
    proposedBeat: readBeat(candidate.proposed_beat),
  };
}

export async function buildPacingRevisionOutlineFromApprovedChanges(args: {
  sourceOutline: unknown;
  approvedOutlineChanges: PacingRevisionChange[];
  revisionSetId: string;
}): Promise<Record<string, unknown>> {
  const source = asRecord(args.sourceOutline);
  const sourceBeats = Array.isArray(source.page_beats) ? source.page_beats : [];
  const working = await Promise.all(sourceBeats.map(async (rawBeat, index) => {
    const beat = readBeat(rawBeat);
    if (!beat) throw new Error(`Source outline beat ${index + 1} is invalid.`);
    const text = [
      beat.scene ? `Scene: ${beat.scene}` : '',
      beat.summary,
      beat.emotional_turn ? `Emotional turn: ${beat.emotional_turn}` : '',
    ].filter(Boolean).join('\n');
    const digest = await sha256Hex(`${index + 1}\u0000${text}`);
    return { id: `beat_${digest.slice(0, 24)}`, beat };
  }));

  for (const change of args.approvedOutlineChanges) {
    const { operation, proposedBeat } = readCandidate(change);
    const sourceIndexes = operation.source_beat_ids
      .map((id) => working.findIndex((entry) => entry.id === id))
      .filter((index) => index >= 0);
    const proposal = proposedBeat ?? readBeat(operation);
    if (operation.operation === 'edit') {
      if (sourceIndexes.length !== 1 || !proposal) throw new Error(`Invalid edit ${operation.operation_id}.`);
      working[sourceIndexes[0]!] = { id: operation.operation_id, beat: proposal };
      continue;
    }
    if (operation.operation === 'combine') {
      if (sourceIndexes.length < 2 || !proposal) throw new Error(`Invalid combine ${operation.operation_id}.`);
      const insertionIndex = Math.min(...sourceIndexes);
      for (const index of [...sourceIndexes].sort((a, b) => b - a)) working.splice(index, 1);
      working.splice(insertionIndex, 0, { id: operation.operation_id, beat: proposal });
      continue;
    }
    const anchorIndex = operation.anchor_source_beat_id
      ? working.findIndex((entry) => entry.id === operation.anchor_source_beat_id)
      : -1;
    if (anchorIndex < 0 || !operation.placement) throw new Error(`Invalid anchor for ${operation.operation_id}.`);
    if (operation.operation === 'add') {
      if (!proposal) throw new Error(`Invalid add ${operation.operation_id}.`);
      working.splice(anchorIndex + (operation.placement === 'after' ? 1 : 0), 0, {
        id: operation.operation_id,
        beat: proposal,
      });
      continue;
    }
    if (sourceIndexes.length !== 1) throw new Error(`Invalid move ${operation.operation_id}.`);
    const [moved] = working.splice(sourceIndexes[0]!, 1);
    const refreshedAnchor = working.findIndex((entry) => entry.id === operation.anchor_source_beat_id);
    working.splice(refreshedAnchor + (operation.placement === 'after' ? 1 : 0), 0, moved!);
  }

  return {
    ...source,
    page_beats: working.map((entry, index) => ({ ...entry.beat, page_target: index + 1 })),
    pacing_revision_manifest: {
      revision_set_id: args.revisionSetId,
      applied_change_ids: args.approvedOutlineChanges.map((change) => change.id),
    },
  };
}
