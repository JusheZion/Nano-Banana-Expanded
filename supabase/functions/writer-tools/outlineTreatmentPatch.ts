import type {
  CompleteTreatmentPreviewResult,
  OutlineTreatmentPromptInput,
} from './outlineTreatmentPrompt.ts';

export function normalizeOutlineTreatmentPatchResult(value: unknown): unknown {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { operations?: unknown }).operations)) {
    return value;
  }
  return {
    ...(value as Record<string, unknown>),
    operations: (value as { operations: unknown[] }).operations.map((operation) => {
      if (!operation || typeof operation !== 'object') return operation;
      const record = operation as Record<string, unknown>;
      const { proposed_text: proposedText, ...rest } = record;
      const normalized: Record<string, unknown> = { ...rest };
      if (typeof proposedText === 'string' && typeof normalized.summary !== 'string') {
        normalized.summary = proposedText;
      }
      for (const key of [
        'anchor_source_beat_id',
        'placement',
        'reason',
        'scene',
        'summary',
        'emotional_turn',
      ]) {
        if (normalized[key] === null) delete normalized[key];
      }
      return normalized;
    }),
  };
}

export type OutlineTreatmentPatchOperation = {
  operation_id: string;
  operation: 'edit' | 'move' | 'combine' | 'add';
  source_beat_ids: string[];
  anchor_source_beat_id?: string;
  placement?: 'before' | 'after';
  reason?: string;
  scene?: string;
  summary?: string;
  emotional_turn?: string;
};

export type OutlineTreatmentOperationNotice = {
  operation_id: string;
  status: 'accepted' | 'rejected' | 'warning';
  code: string;
  message: string;
  source_beat_ids: string[];
  proposed?: {
    scene?: string;
    summary?: string;
    emotional_turn?: string;
  };
};

type TreatmentChangeType =
  | 'unchanged'
  | 'language_polished'
  | 'moved'
  | 'combined'
  | 'enhanced'
  | 'added';

type WorkingBeat = {
  resultId: string;
  sourceIds: string[];
  changeType: TreatmentChangeType;
  reason: string;
  beat: {
    scene?: string;
    summary: string;
    emotional_turn?: string;
  };
};

type PatchPreviewResult = CompleteTreatmentPreviewResult & {
  operation_notices: OutlineTreatmentOperationNotice[];
};

function reject(
  notices: OutlineTreatmentOperationNotice[],
  operation: OutlineTreatmentPatchOperation,
  code: string,
  message: string,
): void {
  notices.push({
    operation_id: operation.operation_id,
    status: 'rejected',
    code,
    message,
    source_beat_ids: operation.source_beat_ids,
    proposed: {
      ...(operation.scene === undefined ? {} : { scene: operation.scene }),
      ...(operation.summary === undefined ? {} : { summary: operation.summary }),
      ...(operation.emotional_turn === undefined
        ? {}
        : { emotional_turn: operation.emotional_turn }),
    },
  });
}

function accept(
  notices: OutlineTreatmentOperationNotice[],
  operation: OutlineTreatmentPatchOperation,
): void {
  notices.push({
    operation_id: operation.operation_id,
    status: 'accepted',
    code: 'operation_applied',
    message: operation.reason?.trim() || 'AI change applied.',
    source_beat_ids: operation.source_beat_ids,
  });
}

function findWorkingIndex(working: WorkingBeat[], sourceId: string): number {
  return working.findIndex((beat) => beat.sourceIds.includes(sourceId));
}

function hasProposedText(operation: OutlineTreatmentPatchOperation): boolean {
  return Boolean(
    operation.summary?.trim()
    || operation.scene?.trim()
    || operation.emotional_turn?.trim(),
  );
}

const CONTINUITY_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into',
  'is', 'it', 'of', 'on', 'or', 'that', 'the', 'their', 'they', 'this', 'to',
  'was', 'with',
]);

function significantTokens(value: string): Set<string> {
  return new Set(
    value
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}']+/gu)
      ?.filter((token) => token.length > 2 && !CONTINUITY_STOP_WORDS.has(token))
      ?? [],
  );
}

function preservesSourceEvent(source: string, proposal: string): boolean {
  const sourceTokens = significantTokens(source);
  if (sourceTokens.size === 0) return true;
  const proposalTokens = significantTokens(proposal);
  const sharedCount = [...sourceTokens].filter((token) => proposalTokens.has(token)).length;
  const minimumShared = Math.max(1, Math.ceil(sourceTokens.size * 0.3));
  return sharedCount >= minimumShared;
}

export function applyOutlineTreatmentPatches(
  patchResult: { operations: OutlineTreatmentPatchOperation[] },
  input: OutlineTreatmentPromptInput,
): PatchPreviewResult {
  const sourceById = new Map(input.sourceBeats.map((beat) => [beat.id, beat]));
  const notices: OutlineTreatmentOperationNotice[] = [];
  const usedOperationIds = new Set<string>();
  const editedSourceIds = new Set<string>();
  const consumedSourceIds = new Set<string>();
  const working: WorkingBeat[] = input.sourceBeats.map((source) => ({
    resultId: source.id,
    sourceIds: [source.id],
    changeType: 'unchanged',
    reason: 'Source beat retained.',
    beat: { summary: source.text },
  }));
  const operationReason = (operation: OutlineTreatmentPatchOperation): string => (
    operation.reason?.trim()
    || ({
      edit: 'Language and formatting updated.',
      move: 'Beat repositioned for pacing.',
      combine: 'Source beats combined for pacing.',
      add: 'New connective material added.',
    }[operation.operation])
  );

  for (const operation of patchResult.operations) {
    if (usedOperationIds.has(operation.operation_id)) {
      reject(notices, operation, 'duplicate_operation_id', 'Operation identifiers must be unique.');
      continue;
    }
    usedOperationIds.add(operation.operation_id);

    const unknownIds = operation.source_beat_ids.filter((id) => !sourceById.has(id));
    if (unknownIds.length) {
      reject(notices, operation, 'unknown_source_beat', 'The operation references a source beat that does not exist.');
      continue;
    }
    if (
      operation.anchor_source_beat_id
      && !sourceById.has(operation.anchor_source_beat_id)
    ) {
      reject(notices, operation, 'unknown_anchor', 'The operation anchor does not exist.');
      continue;
    }
    if (
      operation.anchor_source_beat_id
      && operation.source_beat_ids.includes(operation.anchor_source_beat_id)
    ) {
      reject(notices, operation, 'self_anchor', 'An operation cannot anchor to one of its own source beats.');
      continue;
    }

    if (operation.operation === 'edit') {
      if (operation.source_beat_ids.length !== 1 || !hasProposedText(operation)) {
        reject(notices, operation, 'invalid_edit', 'Edit operations require one source beat and proposed text.');
        continue;
      }
      const sourceId = operation.source_beat_ids[0]!;
      if (editedSourceIds.has(sourceId) || consumedSourceIds.has(sourceId)) {
        reject(notices, operation, 'conflicting_operation', 'This source beat already has a conflicting operation.');
        continue;
      }
      const index = findWorkingIndex(working, sourceId);
      if (index < 0) {
        reject(notices, operation, 'source_unavailable', 'The source beat is no longer available for editing.');
        continue;
      }
      const source = sourceById.get(sourceId)!;
      if (
        operation.summary?.trim()
        && !preservesSourceEvent(source.text, operation.summary)
      ) {
        reject(
          notices,
          operation,
          'source_event_mismatch',
          'The proposed wording does not appear to describe the selected source beat, so the original beat was retained.',
        );
        continue;
      }
      const current = working[index]!;
      working[index] = {
        ...current,
        resultId: operation.operation_id,
        changeType: input.treatmentMode === 'expand' ? 'enhanced' : 'language_polished',
        reason: operationReason(operation),
        beat: {
          ...current.beat,
          ...(operation.scene === undefined ? {} : { scene: operation.scene }),
          ...(operation.summary === undefined ? {} : { summary: operation.summary }),
          ...(operation.emotional_turn === undefined
            ? {}
            : { emotional_turn: operation.emotional_turn }),
        },
      };
      editedSourceIds.add(sourceId);
      accept(notices, operation);
      continue;
    }

    if (operation.operation === 'move') {
      if (input.treatmentMode === 'preserve') {
        reject(notices, operation, 'operation_forbidden', 'Keep My Order cannot move beats.');
        continue;
      }
      if (
        operation.source_beat_ids.length !== 1
        || !operation.anchor_source_beat_id
        || !operation.placement
      ) {
        reject(notices, operation, 'invalid_move', 'Move operations require one source beat and a placement anchor.');
        continue;
      }
      const sourceId = operation.source_beat_ids[0]!;
      if (consumedSourceIds.has(sourceId)) {
        reject(notices, operation, 'conflicting_operation', 'This source beat already has a conflicting operation.');
        continue;
      }
      const sourceIndex = findWorkingIndex(working, sourceId);
      const anchorIndexBeforeRemoval = findWorkingIndex(working, operation.anchor_source_beat_id);
      if (sourceIndex < 0 || anchorIndexBeforeRemoval < 0) {
        reject(notices, operation, 'source_unavailable', 'The move source or anchor is unavailable.');
        continue;
      }
      const [moved] = working.splice(sourceIndex, 1);
      if (!moved) continue;
      const anchorIndex = findWorkingIndex(working, operation.anchor_source_beat_id);
      const insertIndex = operation.placement === 'before' ? anchorIndex : anchorIndex + 1;
      working.splice(insertIndex, 0, {
        ...moved,
        resultId: operation.operation_id,
        changeType: 'moved',
        reason: operationReason(operation),
      });
      consumedSourceIds.add(sourceId);
      accept(notices, operation);
      continue;
    }

    if (operation.operation === 'combine') {
      if (input.treatmentMode === 'preserve') {
        reject(notices, operation, 'operation_forbidden', 'Keep My Order cannot combine beats.');
        continue;
      }
      const sourceIds = [...new Set(operation.source_beat_ids)];
      if (sourceIds.length < 2 || !operation.summary?.trim()) {
        reject(notices, operation, 'invalid_combine', 'Combine operations require at least two source beats and a summary.');
        continue;
      }
      if (sourceIds.some((id) => consumedSourceIds.has(id) || editedSourceIds.has(id))) {
        reject(notices, operation, 'conflicting_operation', 'A combined source beat already has a conflicting operation.');
        continue;
      }
      const indexes = sourceIds.map((id) => findWorkingIndex(working, id));
      if (indexes.some((index) => index < 0)) {
        reject(notices, operation, 'source_unavailable', 'A combined source beat is unavailable.');
        continue;
      }
      const projectedCount = working.length - (sourceIds.length - 1);
      if (projectedCount < input.allowedPageRange.min) {
        reject(notices, operation, 'page_range_exceeded', 'This combination would reduce the outline below its approved page range.');
        continue;
      }
      const insertIndex = Math.min(...indexes);
      const sourceSet = new Set(sourceIds);
      const retained = working.filter((beat) => !beat.sourceIds.some((id) => sourceSet.has(id)));
      const combined: WorkingBeat = {
        resultId: operation.operation_id,
        sourceIds,
        changeType: 'combined',
        reason: operationReason(operation),
        beat: {
          ...(operation.scene === undefined ? {} : { scene: operation.scene }),
          summary: operation.summary,
          ...(operation.emotional_turn === undefined
            ? {}
            : { emotional_turn: operation.emotional_turn }),
        },
      };
      retained.splice(Math.min(insertIndex, retained.length), 0, combined);
      working.splice(0, working.length, ...retained);
      sourceIds.forEach((id) => consumedSourceIds.add(id));
      accept(notices, operation);
      continue;
    }

    if (input.treatmentMode === 'preserve') {
      reject(notices, operation, 'operation_forbidden', 'Keep My Order cannot add beats.');
      continue;
    }
    if (
      operation.source_beat_ids.length
      || !operation.anchor_source_beat_id
      || !operation.placement
      || !operation.summary?.trim()
    ) {
      reject(notices, operation, 'invalid_add', 'Add operations require proposed text and a placement anchor, but no source beats.');
      continue;
    }
    if (working.length + 1 > input.allowedPageRange.max) {
      reject(notices, operation, 'page_range_exceeded', 'This addition would exceed the approved page range.');
      continue;
    }
    const anchorIndex = findWorkingIndex(working, operation.anchor_source_beat_id);
    if (anchorIndex < 0) {
      reject(notices, operation, 'source_unavailable', 'The addition anchor is unavailable.');
      continue;
    }
    const insertIndex = operation.placement === 'before' ? anchorIndex : anchorIndex + 1;
    working.splice(insertIndex, 0, {
      resultId: operation.operation_id,
      sourceIds: [],
      changeType: 'added',
      reason: operationReason(operation),
      beat: {
        ...(operation.scene === undefined ? {} : { scene: operation.scene }),
        summary: operation.summary,
        ...(operation.emotional_turn === undefined
          ? {}
          : { emotional_turn: operation.emotional_turn }),
      },
    });
    accept(notices, operation);
  }

  return {
    proposal: {
      page_beats: working.map((result, index) => ({
        treatment_beat_id: result.resultId,
        page_target: index + 1,
        ...result.beat,
      })),
    },
    manifest: {
      treatment_mode: input.treatmentMode,
      source_page_count: input.sourcePageCount,
      proposed_page_count: working.length,
      entries: working.map((result, index) => ({
        result_beat_id: result.resultId,
        source_beat_ids: result.sourceIds,
        change_type: result.changeType,
        original_pages: result.sourceIds.flatMap((id) => {
          const source = sourceById.get(id);
          return source ? [source.page_target ?? source.ordinal] : [];
        }),
        proposed_page: index + 1,
        reason: result.reason,
      })),
    },
    operation_notices: notices,
  };
}
