import {
  applyOutlineTreatmentPatches,
  type OutlineTreatmentPatchOperation,
} from './outlineTreatmentPatch.ts';
import {
  buildOutlineTreatmentPrompt,
  type OutlineTreatmentPromptInput,
} from './outlineTreatmentPrompt.ts';

export type PacingRevisionItemPlan = {
  item_id: string;
  title: string;
  rationale: string;
  affected_page_numbers: number[];
};

export type PacingRevisionPlanOperation = OutlineTreatmentPatchOperation & {
  item_id: string;
};

export type PacingRevisionPlan = {
  items: PacingRevisionItemPlan[];
  operations: PacingRevisionPlanOperation[];
};

export type PacingOutlineChildChange = {
  item_id: string;
  operation_id: string;
  target_key: string;
  page_number: number | null;
  current_value: unknown;
  ai_proposal: unknown;
  reason: string;
};

type PacingPromptInput = OutlineTreatmentPromptInput & {
  pacingReview: unknown;
};

function uniquePages(values: number[]): number[] {
  return [...new Set(values.filter((page) => Number.isInteger(page) && page > 0))].sort((a, b) => a - b);
}

function mergeOverlappingItems(items: PacingRevisionItemPlan[]): {
  items: PacingRevisionItemPlan[];
  itemIdMap: Map<string, string>;
} {
  const merged: PacingRevisionItemPlan[] = [];
  const itemIdMap = new Map<string, string>();

  for (const item of items) {
    const pages = uniquePages(item.affected_page_numbers);
    const overlapIndexes = merged.flatMap((candidate, index) => (
      candidate.affected_page_numbers.some((page) => pages.includes(page)) ? [index] : []
    ));
    if (overlapIndexes.length === 0) {
      const normalized = { ...item, affected_page_numbers: pages };
      merged.push(normalized);
      itemIdMap.set(item.item_id, item.item_id);
      continue;
    }

    const primaryIndex = overlapIndexes[0]!;
    const participants = [
      merged[primaryIndex]!,
      ...overlapIndexes.slice(1).map((index) => merged[index]!),
      { ...item, affected_page_numbers: pages },
    ];
    const primary = participants[0]!;
    const combined: PacingRevisionItemPlan = {
      item_id: primary.item_id,
      title: participants.map((entry) => entry.title).join(' / '),
      rationale: participants.map((entry) => entry.rationale).join(' '),
      affected_page_numbers: uniquePages(participants.flatMap((entry) => entry.affected_page_numbers)),
    };
    for (const participant of participants) itemIdMap.set(participant.item_id, combined.item_id);
    for (const index of [...overlapIndexes].sort((a, b) => b - a)) merged.splice(index, 1);
    merged.splice(primaryIndex, 0, combined);
  }

  return { items: merged, itemIdMap };
}

export function buildPacingRevisionOutlinePrompt(input: PacingPromptInput): string {
  return [
    'Create a preview-only pacing revision plan. Do not persist or describe persistence.',
    'Return an items array and an operations array. Do not return a replacement outline.',
    'Every operation must include item_id matching exactly one item.',
    'Each item represents one editorial intent and owns a non-overlapping set of affected page numbers.',
    'If two intentions affect the same page, combine them into one item.',
    `Saved pacing review:\n${JSON.stringify(input.pacingReview)}`,
    buildOutlineTreatmentPrompt(input),
    [
      'Return shape:',
      '{"items":[{"item_id":string,"title":string,"rationale":string,"affected_page_numbers":integer[]}],',
      '"operations":[{"item_id":string,"operation_id":string,"operation":"edit"|"move"|"combine"|"add",',
      '"source_beat_ids":string[],"anchor_source_beat_id"?:string,"placement"?:"before"|"after",',
      '"reason":string,"scene"?:string,"summary"?:string,"emotional_turn"?:string}]}',
    ].join(''),
  ].join('\n\n');
}

export function buildPacingRevisionOutlinePreview(
  plan: PacingRevisionPlan,
  input: OutlineTreatmentPromptInput,
) {
  const normalized = mergeOverlappingItems(plan.items);
  const validItemIds = new Set(normalized.items.map((item) => item.item_id));
  const operations = plan.operations.flatMap((operation): PacingRevisionPlanOperation[] => {
    const itemId = normalized.itemIdMap.get(operation.item_id) ?? operation.item_id;
    return validItemIds.has(itemId) ? [{ ...operation, item_id: itemId }] : [];
  });
  const patch = applyOutlineTreatmentPatches({ operations }, input);
  const acceptedOperationIds = new Set(
    patch.operation_notices
      .filter((notice) => notice.status === 'accepted')
      .map((notice) => notice.operation_id),
  );
  const sourceById = new Map(input.sourceBeats.map((beat) => [beat.id, beat]));
  const proposalById = new Map(
    (patch.proposal.page_beats ?? [])
      .filter((beat) => typeof beat.treatment_beat_id === 'string')
      .map((beat) => [String(beat.treatment_beat_id), beat]),
  );
  const manifestById = new Map(
    patch.manifest.entries.map((entry) => [entry.result_beat_id, entry]),
  );
  const outlineChanges: PacingOutlineChildChange[] = operations.flatMap((operation) => {
    if (!acceptedOperationIds.has(operation.operation_id)) return [];
    const manifest = manifestById.get(operation.operation_id);
    const current = operation.source_beat_ids.map((sourceId) => sourceById.get(sourceId)).filter(Boolean);
    return [{
      item_id: operation.item_id,
      operation_id: operation.operation_id,
      target_key: `outline:${operation.operation_id}`,
      page_number: manifest?.proposed_page ?? null,
      current_value: current,
      ai_proposal: {
        operation,
        proposed_beat: proposalById.get(operation.operation_id) ?? null,
      },
      reason: operation.reason?.trim() || 'Pacing revision.',
    }];
  });

  return {
    items: normalized.items,
    operations,
    patch,
    outlineChanges,
  };
}
