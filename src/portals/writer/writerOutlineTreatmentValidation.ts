import type { IssueOutline, IssueOutlinePageBeat } from '@/shared/writer/types';
import {
  getTreatmentContract,
  getTreatmentPageRange,
  type WriterOutlineTreatmentMode,
} from './writerOutlineTreatmentContracts';

export type TreatmentChangeType =
  | 'unchanged'
  | 'language_polished'
  | 'moved'
  | 'combined'
  | 'enhanced'
  | 'added';

export type NormalizedTreatmentSourceBeat = {
  id: string;
  ordinal: number;
  pageTarget?: number;
  text: string;
  original: IssueOutlinePageBeat;
};

export type NormalizedTreatmentSource = {
  beats: NormalizedTreatmentSourceBeat[];
  pageCount: number;
  protectedTerms: string[];
};

export type TreatmentManifestEntry = {
  resultBeatId: string;
  sourceBeatIds: string[];
  changeType: TreatmentChangeType;
  originalPages: number[];
  proposedPage?: number;
  reason: string;
};

export type TreatmentManifest = {
  treatmentMode: WriterOutlineTreatmentMode;
  sourcePageCount: number;
  proposedPageCount: number;
  entries: TreatmentManifestEntry[];
};

export type TreatmentProposalSession = {
  mode: WriterOutlineTreatmentMode;
  source: NormalizedTreatmentSource;
  proposal: Record<string, unknown>;
  manifest: TreatmentManifest;
};

export type TreatmentValidationError = {
  code: string;
  message: string;
  sourceBeatIds: string[];
};

export type TreatmentValidationResult = {
  valid: boolean;
  errors: TreatmentValidationError[];
  summary: {
    sourceBeats: number;
    preserved: number;
    moved: number;
    combined: number;
    enhanced: number;
    added: number;
    sourcePages: number;
    proposedPages: number;
  };
};

function beatText(beat: IssueOutlinePageBeat): string {
  return [beat.scene, beat.summary, beat.emotional_turn].filter(Boolean).join(' ').trim();
}

export function normalizeTreatmentSource(
  outline: IssueOutline,
  protectedTerms: string[] = [],
): NormalizedTreatmentSource {
  const beats = (outline.page_beats ?? []).map((beat, index) => {
    const ordinal = index + 1;
    return {
      id: typeof beat.page_target === 'number'
        ? `source-page-${beat.page_target}-${ordinal}`
        : `source-unpaged-${ordinal}`,
      ordinal,
      ...(typeof beat.page_target === 'number' ? { pageTarget: beat.page_target } : {}),
      text: beatText(beat),
      original: structuredClone(beat),
    };
  });
  const explicitPages = beats.flatMap((beat) => beat.pageTarget ?? []);
  return {
    beats,
    pageCount: Math.max(1, beats.length, ...(explicitPages.length ? explicitPages : [0])),
    protectedTerms: [...new Set(protectedTerms.map((term) => term.trim()).filter(Boolean))],
  };
}

function proposalBeats(proposal: Record<string, unknown>): Array<Record<string, unknown>> {
  return Array.isArray(proposal.page_beats)
    ? proposal.page_beats.filter((beat): beat is Record<string, unknown> => (
      Boolean(beat) && typeof beat === 'object' && !Array.isArray(beat)
    ))
    : [];
}

function proposalText(proposal: Record<string, unknown>): string {
  return proposalBeats(proposal)
    .flatMap((beat) => [beat.scene, beat.summary, beat.emotional_turn])
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
}

function addError(
  errors: TreatmentValidationError[],
  code: string,
  message: string,
  sourceBeatIds: string[] = [],
): void {
  errors.push({ code, message, sourceBeatIds });
}

export function validateTreatmentProposal(
  session: TreatmentProposalSession,
): TreatmentValidationResult {
  const { mode, source, proposal, manifest } = session;
  const errors: TreatmentValidationError[] = [];
  const sourceIds = source.beats.map((beat) => beat.id);
  const sourceIdSet = new Set(sourceIds);
  const coveredIds = manifest.entries.flatMap((entry) => entry.sourceBeatIds);
  const coveredSet = new Set(coveredIds);
  const resultIds = manifest.entries.map((entry) => entry.resultBeatId);
  const proposedBeats = proposalBeats(proposal);
  const coveredCounts = new Map<string, number>();
  coveredIds.forEach((id) => coveredCounts.set(id, (coveredCounts.get(id) ?? 0) + 1));

  for (const id of sourceIds) {
    if (!coveredSet.has(id)) {
      addError(errors, 'missing_source_beat', `Source beat ${id} is not represented.`, [id]);
    }
  }
  for (const id of coveredIds) {
    if (!sourceIdSet.has(id)) {
      addError(errors, 'unknown_source_beat', `Manifest references unknown source beat ${id}.`, [id]);
    }
  }
  for (const id of sourceIds) {
    if ((coveredCounts.get(id) ?? 0) > 1) {
      addError(errors, 'duplicate_source_beat', `Source beat ${id} is represented by more than one result.`, [id]);
    }
  }
  if (new Set(resultIds).size !== resultIds.length) {
    addError(errors, 'duplicate_result_beat', 'Result beat identifiers must be unique.');
  }

  const contract = getTreatmentContract(mode);
  for (const entry of manifest.entries) {
    if (entry.changeType === 'added' && entry.sourceBeatIds.length) {
      addError(errors, 'added_beat_has_source', 'Added beats cannot claim a source identity.', entry.sourceBeatIds);
    }
    if (entry.changeType !== 'added' && entry.sourceBeatIds.length === 0) {
      addError(errors, 'result_missing_source', 'Every non-added result must map to source material.');
    }
    if (!contract.allowAdd && entry.changeType === 'added') {
      addError(errors, 'addition_forbidden', 'This treatment cannot add beats.');
    }
    if (!contract.allowCombine && (entry.changeType === 'combined' || entry.sourceBeatIds.length > 1)) {
      addError(errors, 'combination_forbidden', 'This treatment cannot combine beats.', entry.sourceBeatIds);
    }
    if (!contract.allowReorder && entry.changeType === 'moved') {
      addError(errors, 'preserve_change_forbidden', 'Keep My Order cannot move beats.', entry.sourceBeatIds);
    }
    if (!contract.allowEnhance && entry.changeType === 'enhanced') {
      addError(errors, 'enhancement_forbidden', 'Keep My Order cannot substantially enhance beats.', entry.sourceBeatIds);
    }
  }

  if (mode === 'preserve') {
    const manifestOrder = manifest.entries.flatMap((entry) => entry.sourceBeatIds);
    if (
      manifest.entries.length !== source.beats.length
      || manifest.entries.some((entry) => entry.sourceBeatIds.length !== 1)
      || manifestOrder.some((id, index) => id !== sourceIds[index])
    ) {
      addError(errors, 'preserve_order_changed', 'Keep My Order requires one result per source beat in source order.', sourceIds);
    }
    manifest.entries.forEach((entry) => {
      const sourceBeat = source.beats.find((beat) => beat.id === entry.sourceBeatIds[0]);
      if (sourceBeat?.pageTarget !== entry.proposedPage) {
        addError(errors, 'preserve_page_changed', 'Keep My Order cannot change page assignments.', entry.sourceBeatIds);
      }
      if (!['unchanged', 'language_polished'].includes(entry.changeType)) {
        addError(errors, 'preserve_change_forbidden', 'Keep My Order permits language and formatting changes only.', entry.sourceBeatIds);
      }
    });
  }

  const allowedRange = getTreatmentPageRange(mode, source.pageCount);
  if (
    manifest.proposedPageCount < allowedRange.min
    || manifest.proposedPageCount > allowedRange.max
  ) {
    addError(
      errors,
      'page_tolerance_exceeded',
      `Proposed page count ${manifest.proposedPageCount} is outside ${allowedRange.min}-${allowedRange.max}.`,
    );
  }
  if (manifest.sourcePageCount !== source.pageCount) {
    addError(errors, 'source_page_count_mismatch', 'Manifest source page count does not match the approved source.');
  }
  if (proposedBeats.length !== manifest.proposedPageCount) {
    addError(
      errors,
      'proposal_page_count_mismatch',
      `Proposal contains ${proposedBeats.length} page beats but declares ${manifest.proposedPageCount} pages.`,
    );
  }

  const proposalResultIds = proposedBeats
    .map((beat) => beat.treatment_beat_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  const resultBeatIdSet = new Set(proposalResultIds);
  proposedBeats.forEach((beat, index) => {
    const resultBeatId = beat.treatment_beat_id;
    if (typeof resultBeatId !== 'string' || resultBeatId.length === 0) {
      addError(errors, 'unmapped_result_beat', `Proposal beat ${index + 1} has no manifest identity.`);
    } else if (!resultIds.includes(resultBeatId)) {
      addError(errors, 'unmapped_result_beat', `Proposal beat ${resultBeatId} has no manifest entry.`);
    }
  });
  if (resultBeatIdSet.size !== proposalResultIds.length) {
    addError(errors, 'duplicate_proposal_beat', 'Proposal beat identifiers must be unique.');
  }
  manifest.entries.forEach((entry) => {
    if (!resultBeatIdSet.has(entry.resultBeatId)) {
      addError(errors, 'manifest_result_missing', `Proposal does not contain result beat ${entry.resultBeatId}.`, entry.sourceBeatIds);
    }
  });

  const text = proposalText(proposal).toLocaleLowerCase();
  source.protectedTerms.forEach((term) => {
    if (!text.includes(term.toLocaleLowerCase())) {
      addError(errors, 'protected_term_missing', `Protected name or term "${term}" is missing.`);
    }
  });

  const summary = {
    sourceBeats: source.beats.length,
    preserved: coveredSet.size,
    moved: manifest.entries.filter((entry) => entry.changeType === 'moved').length,
    combined: manifest.entries.filter((entry) => entry.changeType === 'combined').length,
    enhanced: manifest.entries.filter((entry) => entry.changeType === 'enhanced').length,
    added: manifest.entries.filter((entry) => entry.changeType === 'added').length,
    sourcePages: source.pageCount,
    proposedPages: manifest.proposedPageCount,
  };
  return { valid: errors.length === 0, errors, summary };
}

export function rejectTreatmentChange(
  session: TreatmentProposalSession,
  resultBeatId: string,
): TreatmentProposalSession {
  const rejected = session.manifest.entries.find((entry) => entry.resultBeatId === resultBeatId);
  if (!rejected) return session;

  const retainedBeats = proposalBeats(session.proposal)
    .filter((beat) => beat.treatment_beat_id !== resultBeatId);
  const retainedEntries = session.manifest.entries.filter((entry) => entry.resultBeatId !== resultBeatId);
  const restoredBeats = rejected.sourceBeatIds.flatMap((id) => {
    const sourceBeat = session.source.beats.find((beat) => beat.id === id);
    if (!sourceBeat) return [];
    return [{
      ...structuredClone(sourceBeat.original),
      treatment_beat_id: `restored-${sourceBeat.id}`,
    }];
  });
  const restoredEntries = rejected.sourceBeatIds.flatMap((id) => {
    const sourceBeat = session.source.beats.find((beat) => beat.id === id);
    if (!sourceBeat) return [];
    return [{
      resultBeatId: `restored-${sourceBeat.id}`,
      sourceBeatIds: [sourceBeat.id],
      changeType: 'unchanged' as const,
      originalPages: sourceBeat.pageTarget ? [sourceBeat.pageTarget] : [],
      ...(sourceBeat.pageTarget ? { proposedPage: sourceBeat.pageTarget } : {}),
      reason: 'Restored from the approved source.',
    }];
  });
  const nextBeats = [...retainedBeats, ...restoredBeats].sort((left, right) => {
    const leftPage = typeof left.page_target === 'number' ? left.page_target : Number.MAX_SAFE_INTEGER;
    const rightPage = typeof right.page_target === 'number' ? right.page_target : Number.MAX_SAFE_INTEGER;
    return leftPage - rightPage;
  });
  const nextEntries = [...retainedEntries, ...restoredEntries].sort((left, right) => {
    const leftPage = left.proposedPage ?? Number.MAX_SAFE_INTEGER;
    const rightPage = right.proposedPage ?? Number.MAX_SAFE_INTEGER;
    return leftPage - rightPage;
  });
  const proposedPageCount = nextBeats.reduce((max, beat) => (
    typeof beat.page_target === 'number' ? Math.max(max, beat.page_target) : max
  ), Math.max(1, nextBeats.length));

  return {
    ...session,
    proposal: { ...session.proposal, page_beats: nextBeats },
    manifest: {
      ...session.manifest,
      proposedPageCount,
      entries: nextEntries,
    },
  };
}
