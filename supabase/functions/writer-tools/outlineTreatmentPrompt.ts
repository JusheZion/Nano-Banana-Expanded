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

type CompleteTreatmentPreviewResult = TreatmentPreviewResult & {
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
    'Use change_type unchanged or language_polished only.',
  ].join(' '),
  structure: [
    'You may reorder and combine source beats when it improves pacing.',
    'You may enhance wording and add only clearly identified connective beats.',
    'Every original event and outcome must remain traceable through source_beat_ids.',
  ].join(' '),
  expand: [
    'You may substantially enhance source beats and add new connective beats.',
    'Every original event and outcome must remain traceable through source_beat_ids.',
    'Added beats must use change_type added and an empty source_beat_ids array.',
  ].join(' '),
};

export function buildOutlineTreatmentPrompt(input: OutlineTreatmentPromptInput): string {
  return [
    'Return JSON only, with proposal and manifest fields matching the supplied schema.',
    `Treatment mode: ${input.treatmentMode}`,
    `Source page count: ${input.sourcePageCount}`,
    `Allowed page range: ${input.allowedPageRange.min}-${input.allowedPageRange.max}`,
    'Never delete or omit a source beat.',
    'Every source beat id must appear exactly once across all manifest source_beat_ids arrays.',
    'Create one manifest entry for every result beat.',
    'Every proposal beat must have a unique treatment_beat_id matching exactly one manifest result_beat_id.',
    'The number of proposal page_beats must equal manifest proposed_page_count.',
    'Do not retain a source beat separately when a combined result already consumes it.',
    'Do not append recap or whole-outline summary beats that repeat material already represented.',
    MODE_INSTRUCTIONS[input.treatmentMode],
    input.protectedTerms.length
      ? `Preserve these terms exactly: ${JSON.stringify(input.protectedTerms)}`
      : 'No protected terms were supplied.',
    'Source beats:',
    JSON.stringify(input.sourceBeats),
    [
      'Return shape:',
      '{"proposal":{"title"?:string,"premise"?:string,"acts"?:array,"page_beats":[',
      '{"treatment_beat_id":string,"page_target"?:number,"scene"?:string,"summary":string,"emotional_turn"?:string}]},',
      '"manifest":{"treatment_mode":string,"source_page_count":number,"proposed_page_count":number,',
      '"entries":[{"result_beat_id":string,"source_beat_ids":string[],"change_type":string,',
      '"original_pages":number[],"proposed_page"?:number,"reason":string}]}}',
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

export function buildOutlineTreatmentRepairPrompt(
  input: OutlineTreatmentPromptInput,
  previousResult: CompleteTreatmentPreviewResult,
  consistencyErrors: string[],
): string {
  return [
    buildOutlineTreatmentPrompt(input),
    'Your previous response was valid JSON but failed consistency validation.',
    `Correct every issue: ${JSON.stringify(consistencyErrors)}`,
    'Return the complete corrected proposal and manifest, not a patch or explanation.',
    'Use each proposal treatment_beat_id as exactly one manifest result_beat_id.',
    'The number of proposal page_beats must equal manifest proposed_page_count.',
    'Every source beat id must appear exactly once across the manifest; combinations replace their source beats.',
    'Remove any retained, recap, or summary proposal beat that duplicates material consumed by another result.',
    'Use only these change_type values: unchanged, language_polished, moved, combined, enhanced, added.',
    'Previous response:',
    JSON.stringify(previousResult),
  ].join('\n\n');
}

export function restorePreserveStructure(
  result: TreatmentPreviewResult,
  input: OutlineTreatmentPromptInput,
): TreatmentPreviewResult {
  if (input.treatmentMode !== 'preserve') return result;
  const proposalById = new Map(
    (result.proposal.page_beats ?? []).map((beat) => [beat.treatment_beat_id, beat]),
  );
  const entryBySourceId = new Map(
    result.manifest.entries.flatMap((entry) => (
      entry.source_beat_ids.length === 1 ? [[entry.source_beat_ids[0], entry] as const] : []
    )),
  );

  return {
    ...result,
    proposal: {
      ...result.proposal,
      page_beats: input.sourceBeats.map((sourceBeat) => {
        const entry = entryBySourceId.get(sourceBeat.id);
        const proposed = entry ? proposalById.get(entry.result_beat_id) : undefined;
        return {
          ...(proposed ?? { summary: sourceBeat.text }),
          treatment_beat_id: entry?.result_beat_id ?? sourceBeat.id,
          ...(sourceBeat.page_target === undefined ? {} : { page_target: sourceBeat.page_target }),
        };
      }),
    },
  };
}
