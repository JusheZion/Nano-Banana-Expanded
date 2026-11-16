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

const OPERATION_TYPES = ['edit', 'move', 'combine', 'add'] as const;

function readRequiredString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readSourceBeatIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.map(readRequiredString);
  return ids.every((id): id is string => id !== null) ? ids : null;
}

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
  const stored = asRecord(candidate.operation);
  const operationId = readRequiredString(stored.operation_id);
  const operationType = OPERATION_TYPES.find((type) => type === stored.operation);
  const sourceBeatIds = readSourceBeatIds(stored.source_beat_ids);
  const anchorSourceBeatId = readOptionalString(stored.anchor_source_beat_id);
  const scene = readOptionalString(stored.scene);
  const summary = readOptionalString(stored.summary);
  const emotionalTurn = readOptionalString(stored.emotional_turn);
  if (
    !operationId
    || !operationType
    || sourceBeatIds === null
  ) {
    throw new Error(`Outline change ${change.id} is missing its deterministic operation.`);
  }
  return {
    operation: {
      operation_id: operationId,
      operation: operationType,
      source_beat_ids: sourceBeatIds,
      ...(anchorSourceBeatId === undefined ? {} : { anchor_source_beat_id: anchorSourceBeatId }),
      ...(stored.placement === 'before' || stored.placement === 'after'
        ? { placement: stored.placement }
        : {}),
      ...(scene === undefined ? {} : { scene }),
      ...(summary === undefined ? {} : { summary }),
      ...(emotionalTurn === undefined ? {} : { emotional_turn: emotionalTurn }),
    },
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
  const working: Array<{ id: string; beat: unknown }> = await Promise.all(sourceBeats.map(async (rawBeat, index) => {
    const beat = readBeat(rawBeat);
    const text = beat
      ? [
          beat.scene ? `Scene: ${beat.scene}` : '',
          beat.summary,
          beat.emotional_turn ? `Emotional turn: ${beat.emotional_turn}` : '',
        ].filter(Boolean).join('\n')
      : JSON.stringify(rawBeat);
    const digest = await sha256Hex(`${index + 1}\u0000${text}`);
    return {
      id: `${beat ? 'beat' : 'legacy'}_${digest.slice(0, 24)}`,
      beat: rawBeat,
    };
  }));
  const operationIds = new Set<string>();

  for (const change of args.approvedOutlineChanges) {
    const { operation, proposedBeat } = readCandidate(change);
    if (operationIds.has(operation.operation_id)) {
      throw new Error(`Duplicate operation ${operation.operation_id}.`);
    }
    operationIds.add(operation.operation_id);
    if (new Set(operation.source_beat_ids).size !== operation.source_beat_ids.length) {
      throw new Error(`Operation ${operation.operation_id} contains a duplicate source beat.`);
    }
    if (
      operation.anchor_source_beat_id
      && operation.source_beat_ids.includes(operation.anchor_source_beat_id)
    ) {
      throw new Error(`Operation ${operation.operation_id} cannot anchor to its own source beat.`);
    }
    const sourceIndexes = operation.source_beat_ids
      .map((id) => working.findIndex((entry) => entry.id === id));
    if (sourceIndexes.some((index) => index < 0)) {
      throw new Error(`Operation ${operation.operation_id} references an unknown source beat.`);
    }
    const proposal = proposedBeat ?? readBeat(operation);
    if (operation.operation === 'edit') {
      if (sourceIndexes.length !== 1 || !proposal) throw new Error(`Invalid edit ${operation.operation_id}.`);
      const sourceIndex = sourceIndexes[0];
      if (sourceIndex === undefined) throw new Error(`Invalid edit ${operation.operation_id}.`);
      working[sourceIndex] = { id: operation.operation_id, beat: proposal };
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
      if (sourceIndexes.length !== 0 || !proposal) throw new Error(`Invalid add ${operation.operation_id}.`);
      working.splice(anchorIndex + (operation.placement === 'after' ? 1 : 0), 0, {
        id: operation.operation_id,
        beat: proposal,
      });
      continue;
    }
    if (sourceIndexes.length !== 1) throw new Error(`Invalid move ${operation.operation_id}.`);
    const sourceIndex = sourceIndexes[0];
    if (sourceIndex === undefined) throw new Error(`Invalid move ${operation.operation_id}.`);
    const [moved] = working.splice(sourceIndex, 1);
    if (!moved) throw new Error(`Invalid move ${operation.operation_id}.`);
    const refreshedAnchor = working.findIndex((entry) => entry.id === operation.anchor_source_beat_id);
    if (refreshedAnchor < 0) throw new Error(`Invalid anchor for ${operation.operation_id}.`);
    working.splice(refreshedAnchor + (operation.placement === 'after' ? 1 : 0), 0, moved);
  }

  return {
    ...source,
    page_beats: working.map((entry, index) => {
      const record = asRecord(entry.beat);
      const beat = readBeat(entry.beat);
      if (Object.keys(record).length > 0) {
        return { ...record, ...(beat ?? {}), page_target: index + 1 };
      }
      return entry.beat;
    }),
    pacing_revision_manifest: {
      revision_set_id: args.revisionSetId,
      applied_change_ids: args.approvedOutlineChanges.map((change) => change.id),
    },
  };
}
