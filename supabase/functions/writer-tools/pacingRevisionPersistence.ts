import type { PacingRevisionPageTarget } from './pacingRevisionPageTarget.ts';

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export type PacingRevisionPersistenceResult =
  | { ok: true }
  | { ok: false; stage: 'set' | 'children'; error: string };

export type PacingRevisionChildLayer = 'beats' | 'dialogue';

export type PacingRevisionFailure = {
  page_number: number;
  layer?: PacingRevisionChildLayer;
  reason: string;
  item_id?: string;
};

export function buildPacingRevisionPageChangeRow(input: {
  id: string;
  itemId: string;
  layer: PacingRevisionChildLayer;
  target: PacingRevisionPageTarget;
  currentValue: unknown;
  aiProposal: unknown;
  dependencyIds: string[];
  reason: string;
  sourceFingerprint: string;
  now: string;
}): Record<string, unknown> {
  return {
    id: input.id,
    item_id: input.itemId,
    layer: input.layer,
    target_key: input.target.targetKey,
    page_id: input.target.pageId,
    page_number: input.target.pageNumber,
    current_value: input.target.kind === 'virtual' ? null : input.currentValue,
    ai_proposal: input.aiProposal,
    edited_candidate: null,
    decision: 'pending',
    dependency_ids: input.dependencyIds,
    reason: input.reason,
    source_fingerprint: input.sourceFingerprint,
    generation_status: 'ready',
    applied_at: null,
    created_at: input.now,
    updated_at: input.now,
  };
}

export function projectPacingRevisionFailureLedger({
  ledger,
  pageNumber,
  requestedLayers,
  readyLayers,
  newFailures = [],
}: {
  ledger: PacingRevisionFailure[];
  pageNumber: number;
  requestedLayers: PacingRevisionChildLayer[];
  readyLayers: PacingRevisionChildLayer[];
  newFailures?: PacingRevisionFailure[];
}): PacingRevisionFailure[] {
  const requested = new Set(requestedLayers);
  const ready = new Set(readyLayers);
  const retained: PacingRevisionFailure[] = [];
  for (const entry of ledger) {
    if (entry.page_number !== pageNumber) {
      retained.push(entry);
      continue;
    }
    if (entry.layer) {
      if (!requested.has(entry.layer)) retained.push(entry);
      continue;
    }
    for (const layer of ['beats', 'dialogue'] as const) {
      if (!requested.has(layer) && !ready.has(layer)) retained.push({ ...entry, layer });
    }
  }
  const projected = [...retained, ...newFailures];
  const deduplicated = new Map<string, PacingRevisionFailure>();
  for (const entry of projected) {
    deduplicated.set(`${entry.page_number}:${entry.layer ?? 'legacy'}`, entry);
  }
  return [...deduplicated.values()];
}

export async function persistPacingRevisionOutlinePreview(
  supabase: SupabaseClient,
  setRow: Record<string, unknown>,
  itemRows: Array<Record<string, unknown>>,
  changeRows: Array<Record<string, unknown>>,
): Promise<PacingRevisionPersistenceResult> {
  const { error: setError } = await supabase
    .from('writer_pacing_revision_sets')
    .insert(setRow);
  if (setError) return { ok: false, stage: 'set', error: setError.message };

  const { error: itemsError } = await supabase
    .from('writer_pacing_revision_items')
    .insert(itemRows);
  let changesError: { message: string } | null = null;
  if (!itemsError) {
    const result = await supabase
      .from('writer_pacing_revision_changes')
      .insert(changeRows);
    changesError = result.error;
  }
  if (!itemsError && !changesError) return { ok: true };

  await supabase
    .from('writer_pacing_revision_sets')
    .update({ status: 'failed', recovery_status: 'outline_persistence_failed' })
    .eq('id', setRow.id);
  return {
    ok: false,
    stage: 'children',
    error: itemsError?.message ?? changesError?.message ?? 'Unknown persistence error',
  };
}
