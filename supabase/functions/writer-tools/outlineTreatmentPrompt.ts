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
    'Every source beat id must appear in the manifest source_beat_ids union.',
    'Create one manifest entry for every result beat.',
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
