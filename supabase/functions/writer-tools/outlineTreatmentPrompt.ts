export type OutlineTreatmentPromptInput = {
  treatmentMode: 'preserve' | 'structure' | 'expand';
  sourcePageCount: number;
  allowedPageRange: { min: number; max: number };
  sourceBeats: Array<{
    id: string;
    ordinal: number;
    page_target?: number;
    text: string;
  }>;
  protectedTerms: string[];
};

type TreatmentPreviewResult = {
  proposal: {
    page_beats?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
  manifest: {
    entries: Array<{
      result_beat_id: string;
      source_beat_ids: string[];
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
};

export type CompleteTreatmentPreviewResult = TreatmentPreviewResult & {
  manifest: TreatmentPreviewResult['manifest'] & {
    treatment_mode: string;
    source_page_count: number;
    proposed_page_count: number;
  };
};

const MODE_INSTRUCTIONS: Record<OutlineTreatmentPromptInput['treatmentMode'], string> = {
  preserve: [
    'Beat IDs, order, events, outcomes, and page targets are immutable.',
    'Change language and formatting only.',
    'Return edit operations only.',
  ].join(' '),
  structure: [
    'You may return edit, move, combine, and narrowly connective add operations.',
    'Every original event and outcome must remain represented by the deterministic source base.',
  ].join(' '),
  expand: [
    'You may return edit, move, combine, and creative add operations.',
    'Every original event and outcome must remain represented by the deterministic source base.',
  ].join(' '),
};

export function buildOutlineTreatmentPrompt(input: OutlineTreatmentPromptInput): string {
  return [
    'Return JSON only with an operations array. Do not return a replacement outline.',
    'Omit unchanged beats; the application retains them automatically in their original positions.',
    `Treatment mode: ${input.treatmentMode}`,
    `Source page count: ${input.sourcePageCount}`,
    `Allowed page range: ${input.allowedPageRange.min}-${input.allowedPageRange.max}`,
    'Use edit for wording changes, move for explicit reordering, combine for explicit consolidation, and add for new material.',
    'Every edit must reference exactly one source beat and include proposed text.',
    'Every combine must reference at least two source beats and include proposed text.',
    'Every move and add must include anchor_source_beat_id and placement before or after.',
    'Add operations must use an empty source_beat_ids array.',
    'Every operation_id must be unique.',
    'Never claim a source ID whose supplied text does not match the event being changed.',
    'Do not propose recap or whole-outline summary operations.',
    MODE_INSTRUCTIONS[input.treatmentMode],
    input.protectedTerms.length
      ? `Preserve these terms exactly: ${JSON.stringify(input.protectedTerms)}`
      : 'No protected terms were supplied.',
    'Source beats:',
    JSON.stringify(input.sourceBeats),
    [
      'Return shape:',
      '{"operations":[{"operation_id":string,"operation":"edit"|"move"|"combine"|"add",',
      '"source_beat_ids":string[],"anchor_source_beat_id"?:string,"placement"?:"before"|"after",',
      '"reason":string,"scene"?:string,"summary"?:string,"emotional_turn"?:string}]}',
    ].join(''),
  ].join('\n\n');
}

export function getOutlineTreatmentConsistencyErrors(
  result: CompleteTreatmentPreviewResult,
  input: OutlineTreatmentPromptInput,
): string[] {
  const errors: string[] = [];
  const sourceIds = new Set(input.sourceBeats.map((beat) => beat.id));
  const coveredSourceIds = result.manifest.entries.flatMap((entry) => entry.source_beat_ids);
  const coveredSourceIdSet = new Set(coveredSourceIds);
  const proposalBeats = result.proposal.page_beats ?? [];
  const proposalIds = proposalBeats
    .map((beat) => beat.treatment_beat_id)
    .filter((id): id is string => typeof id === 'string');
  const manifestResultIds = result.manifest.entries.map((entry) => entry.result_beat_id);

  if (result.manifest.treatment_mode !== input.treatmentMode) {
    errors.push(`manifest treatment_mode must be ${input.treatmentMode}`);
  }
  if (result.manifest.source_page_count !== input.sourcePageCount) {
    errors.push(`manifest source_page_count must be ${input.sourcePageCount}`);
  }
  if (
    result.manifest.proposed_page_count < input.allowedPageRange.min
    || result.manifest.proposed_page_count > input.allowedPageRange.max
  ) {
    errors.push(
      `manifest proposed_page_count must be within ${input.allowedPageRange.min}-${input.allowedPageRange.max}`,
    );
  }
  if (proposalBeats.length !== result.manifest.proposed_page_count) {
    errors.push('proposal beat count must match manifest proposed_page_count');
  }
  if (
    coveredSourceIdSet.size !== sourceIds.size
    || coveredSourceIds.some((id) => !sourceIds.has(id))
  ) {
    const missing = [...sourceIds].filter((id) => !coveredSourceIdSet.has(id));
    const unknown = [...coveredSourceIdSet].filter((id) => !sourceIds.has(id));
    errors.push(
      `manifest source coverage is incomplete or unknown (missing: ${missing.join(', ') || 'none'}; unknown: ${unknown.join(', ') || 'none'})`,
    );
  }
  if (
    coveredSourceIds.length !== sourceIds.size
    || [...sourceIds].some((id) => coveredSourceIds.filter((coveredId) => coveredId === id).length !== 1)
  ) {
    errors.push('source beat IDs must be represented exactly once');
  }
  if (new Set(manifestResultIds).size !== manifestResultIds.length) {
    errors.push('manifest result beat IDs must be unique');
  }
  if (proposalBeats.some((beat) => (
    typeof beat.treatment_beat_id !== 'string' || beat.treatment_beat_id.length === 0
  ))) {
    errors.push('every proposal beat must have a treatment_beat_id');
  }
  if (new Set(proposalIds).size !== proposalIds.length) {
    errors.push('proposal result beat IDs must be unique');
  }
  if (
    proposalBeats.length !== manifestResultIds.length
    || proposalIds.length !== manifestResultIds.length
    || proposalIds.some((id) => !manifestResultIds.includes(id))
    || manifestResultIds.some((id) => !proposalIds.includes(id))
  ) {
    errors.push('proposal result beat IDs do not match manifest result beat IDs');
  }

  return errors;
}
