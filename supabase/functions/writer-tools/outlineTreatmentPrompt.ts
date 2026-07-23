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

export type CompactTreatmentPreviewResult = {
  page_beats: Array<{
    treatment_beat_id: string;
    source_beat_ids: string[];
    change_type: string;
    reason?: string;
    page_target?: number;
    scene?: string;
    summary: string;
    emotional_turn?: string;
  }>;
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
    'Return JSON only, with one compact page_beats array matching the supplied schema.',
    `Treatment mode: ${input.treatmentMode}`,
    `Source page count: ${input.sourcePageCount}`,
    `Allowed page range: ${input.allowedPageRange.min}-${input.allowedPageRange.max}`,
    'Never delete or omit a source beat.',
    'Every source beat id must appear exactly once across all result source_beat_ids arrays.',
    'Every result beat must have a unique treatment_beat_id.',
    'Return a number of result beats within the allowed page range.',
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
      '{"page_beats":[{"treatment_beat_id":string,"source_beat_ids":string[],',
      '"change_type":"unchanged"|"language_polished"|"moved"|"combined"|"enhanced"|"added",',
      '"reason"?:string,"page_target"?:number,"scene"?:string,"summary":string,"emotional_turn"?:string}]}',
    ].join(''),
  ].join('\n\n');
}

export function hydrateOutlineTreatmentResult(
  compact: CompactTreatmentPreviewResult,
  input: OutlineTreatmentPromptInput,
): CompleteTreatmentPreviewResult {
  const sourceById = new Map(input.sourceBeats.map((beat) => [beat.id, beat]));
  const defaultReason = (changeType: string): string => ({
    unchanged: 'Source beat retained.',
    language_polished: 'Language and formatting polished.',
    moved: 'Source beat repositioned for pacing.',
    combined: 'Source beats combined for pacing.',
    enhanced: 'Source beat enhanced while preserving its event.',
    added: 'New connective beat added.',
  }[changeType] ?? 'Treatment change recorded.');
  return {
    proposal: {
      page_beats: compact.page_beats.map((beat) => ({
        treatment_beat_id: beat.treatment_beat_id,
        ...(beat.page_target === undefined ? {} : { page_target: beat.page_target }),
        ...(beat.scene === undefined ? {} : { scene: beat.scene }),
        summary: beat.summary,
        ...(beat.emotional_turn === undefined ? {} : { emotional_turn: beat.emotional_turn }),
      })),
    },
    manifest: {
      treatment_mode: input.treatmentMode,
      source_page_count: input.sourcePageCount,
      proposed_page_count: compact.page_beats.length,
      entries: compact.page_beats.map((beat) => ({
        result_beat_id: beat.treatment_beat_id,
        source_beat_ids: beat.source_beat_ids,
        change_type: beat.change_type,
        original_pages: beat.source_beat_ids.flatMap((id) => {
          const source = sourceById.get(id);
          return source ? [source.page_target ?? source.ordinal] : [];
        }),
        ...(beat.page_target === undefined ? {} : { proposed_page: beat.page_target }),
        reason: beat.reason?.trim() || defaultReason(beat.change_type),
      })),
    },
  };
}

export function normalizeCompactTreatmentResult(
  compact: CompactTreatmentPreviewResult,
  input: OutlineTreatmentPromptInput,
): CompactTreatmentPreviewResult {
  const sourceById = new Map(input.sourceBeats.map((beat) => [beat.id, beat]));
  const seenSourceIds = new Set<string>();
  const beats = compact.page_beats.flatMap((beat) => {
    const sourceBeatIds = beat.change_type === 'added'
      ? []
      : [...new Set(beat.source_beat_ids)].filter((id) => {
          if (!sourceById.has(id) || seenSourceIds.has(id)) return false;
          seenSourceIds.add(id);
          return true;
        });
    if (beat.change_type !== 'added' && sourceBeatIds.length === 0) return [];
    return [{ ...beat, source_beat_ids: sourceBeatIds }];
  });

  for (const source of input.sourceBeats) {
    if (seenSourceIds.has(source.id)) continue;
    beats.push({
      treatment_beat_id: source.id,
      source_beat_ids: [source.id],
      change_type: 'unchanged',
      reason: 'Restored because the AI omitted this source beat.',
      page_target: source.page_target,
      summary: source.text,
    });
  }

  while (beats.length > input.allowedPageRange.max) {
    let addedIndex = -1;
    for (let index = beats.length - 1; index >= 0; index -= 1) {
      if (beats[index]?.change_type === 'added') {
        addedIndex = index;
        break;
      }
    }
    if (addedIndex >= 0) {
      beats.splice(addedIndex, 1);
      continue;
    }
    const right = beats.pop();
    const left = beats.pop();
    if (!left || !right) break;
    beats.push({
      treatment_beat_id: left.treatment_beat_id,
      source_beat_ids: [...left.source_beat_ids, ...right.source_beat_ids],
      change_type: 'combined',
      reason: 'Combined deterministically to stay within the approved page range.',
      summary: `${left.summary.trim()} ${right.summary.trim()}`.trim(),
      ...(left.scene || right.scene ? { scene: [left.scene, right.scene].filter(Boolean).join(' / ') } : {}),
      ...(right.emotional_turn || left.emotional_turn
        ? { emotional_turn: right.emotional_turn ?? left.emotional_turn }
        : {}),
    });
  }

  while (beats.length < input.allowedPageRange.min) {
    const splitIndex = beats.findIndex((beat) => beat.source_beat_ids.length > 1);
    if (splitIndex < 0) break;
    const [combined] = beats.splice(splitIndex, 1);
    const restored = combined.source_beat_ids.flatMap((id) => {
      const source = sourceById.get(id);
      return source
        ? [{
            treatment_beat_id: source.id,
            source_beat_ids: [source.id],
            change_type: 'unchanged',
            reason: 'Restored from a combination to meet the approved page range.',
            page_target: source.page_target,
            summary: source.text,
          }]
        : [];
    });
    beats.splice(splitIndex, 0, ...restored);
  }

  return {
    page_beats: beats.map((beat, index) => ({
      ...beat,
      treatment_beat_id: `beat-${index + 1}`,
      page_target: index + 1,
    })),
  };
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
  previousResult: CompactTreatmentPreviewResult,
  consistencyErrors: string[],
): string {
  return [
    buildOutlineTreatmentPrompt(input),
    'Your previous response was valid JSON but failed consistency validation.',
    `Correct every issue: ${JSON.stringify(consistencyErrors)}`,
    'Return the complete corrected compact page_beats array, not a patch or explanation.',
    'Every source beat id must appear exactly once; combinations replace their source beats.',
    'Remove any retained, recap, or summary beat that duplicates material consumed by another result.',
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
