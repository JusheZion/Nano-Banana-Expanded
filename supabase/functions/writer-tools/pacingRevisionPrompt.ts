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
  expansionTarget: number | null;
};

function uniquePages(values: number[]): number[] {
  return [...new Set(values.filter((page) => Number.isInteger(page) && page > 0))].sort((a, b) => a - b);
}

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function derivePacingRevisionExpansionTarget(
  pacingReview: unknown,
  currentPhysicalPageMax: number,
): number | null {
  const lengthAlignment = asObject(asObject(pacingReview).length_alignment);
  const recommendation = asObject(lengthAlignment.recommended_pages);
  let recommendedTarget: number | null = null;

  if (Number.isInteger(recommendation.exact)) {
    recommendedTarget = Number(recommendation.exact);
  } else if (Number.isInteger(recommendation.min) && Number.isInteger(recommendation.max)) {
    const minimum = Math.min(Number(recommendation.min), Number(recommendation.max));
    const maximum = Math.max(Number(recommendation.min), Number(recommendation.max));
    recommendedTarget = currentPhysicalPageMax >= minimum && currentPhysicalPageMax <= maximum
      ? currentPhysicalPageMax
      : currentPhysicalPageMax < minimum
      ? minimum
      : maximum;
  }

  if (recommendedTarget === null) return null;
  const supportedTarget = Math.max(1, Math.min(200, recommendedTarget));
  return supportedTarget > currentPhysicalPageMax ? supportedTarget : null;
}

export function pacingRevisionAllowedPageRange(
  sourcePageCount: number,
  expansionTarget: number | null,
): { min: number; max: number } {
  const supportedSourceCount = Math.max(1, Math.min(200, Math.trunc(sourcePageCount)));
  return {
    min: supportedSourceCount,
    max: Math.min(200, Math.max(
      supportedSourceCount,
      Math.ceil(supportedSourceCount * 1.1),
      expansionTarget ?? 0,
    )),
  };
}

export function assertPacingRevisionProposalReachesTarget(
  proposal: unknown,
  expansionTarget: number | null,
): void {
  if (expansionTarget === null) return;
  const pageBeats = asObject(proposal).page_beats;
  const reachesTarget = Array.isArray(pageBeats)
    && pageBeats.length >= expansionTarget
    && pageBeats.slice(0, expansionTarget).every((beat, index) =>
      asObject(beat).page_target === index + 1
    );
  if (!reachesTarget) {
    throw new Error(
      `Pacing revision proposal must contain sequential page beats through page ${expansionTarget}`,
    );
  }
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
    ...(input.expansionTarget === null
      ? []
      : [
          `The saved pacing target requires exactly ${input.expansionTarget} sequential page beats.`,
          `Add enough substantive connective beats for deterministic page_target 1 through ${input.expansionTarget}.`,
        ]),
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
      page_number: typeof manifest?.proposed_page === 'number' ? manifest.proposed_page : null,
      current_value: current,
      ai_proposal: {
        operation,
        proposed_beat: proposalById.get(operation.operation_id) ?? null,
      },
      reason: operation.reason?.trim() || 'Pacing revision.',
    }];
  });
  const acceptedPagesByItemId = new Map<string, number[]>();
  for (const change of outlineChanges) {
    if (change.page_number === null) continue;
    const pages = acceptedPagesByItemId.get(change.item_id) ?? [];
    pages.push(change.page_number);
    acceptedPagesByItemId.set(change.item_id, pages);
  }
  const backedItems = normalized.items.flatMap((item): PacingRevisionItemPlan[] => {
    const acceptedPages = uniquePages(acceptedPagesByItemId.get(item.item_id) ?? []);
    return acceptedPages.length > 0
      ? [{ ...item, affected_page_numbers: acceptedPages }]
      : [];
  });
  const backed = mergeOverlappingItems(backedItems);
  const backedItemIds = new Set(backed.items.map((item) => item.item_id));
  const backedOutlineChanges = outlineChanges.flatMap((change): PacingOutlineChildChange[] => {
    const itemId = backed.itemIdMap.get(change.item_id);
    return itemId && backedItemIds.has(itemId) ? [{ ...change, item_id: itemId }] : [];
  });

  return {
    items: backed.items,
    operations,
    patch,
    outlineChanges: backedOutlineChanges,
  };
}
