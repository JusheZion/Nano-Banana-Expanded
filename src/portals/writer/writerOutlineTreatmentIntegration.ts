import {
  issueOutlineSchema,
  outlineTreatmentPreviewResultSchema,
  writerToolsOutlineTreatmentPreviewRequestSchema,
} from '@/shared/writer/schemas';
import type {
  IssueOutline,
  WriterToolsOutlineTreatmentPreviewPayload,
} from '@/shared/writer/types';
import { getTreatmentPageRange, type WriterOutlineTreatmentMode } from './writerOutlineTreatmentContracts';
import {
  normalizeTreatmentSource,
  validateTreatmentProposal,
  type NormalizedTreatmentSource,
  type TreatmentManifest,
  type TreatmentProposalSession,
  type TreatmentValidationResult,
} from './writerOutlineTreatmentValidation';

export function preserveTreatmentSourceMetadata(
  sourceOutline: IssueOutline,
  currentOfficialOutline: Record<string, unknown> | null,
): IssueOutline {
  const merged: Record<string, unknown> = {
    ...(currentOfficialOutline ?? {}),
    ...sourceOutline,
    page_beats: sourceOutline.page_beats ?? [],
  };
  delete merged.treatment_manifest;
  return issueOutlineSchema.parse(merged);
}

export function buildOutlineTreatmentPreviewRequest(input: {
  issueId: string;
  mode: WriterOutlineTreatmentMode;
  sourceOutline: IssueOutline;
  protectedTerms?: string[];
}): {
  request: WriterToolsOutlineTreatmentPreviewPayload;
  source: NormalizedTreatmentSource;
} {
  const source = normalizeTreatmentSource(input.sourceOutline, input.protectedTerms);
  if (!source.beats.length) {
    throw new Error('Your source outline needs at least one recognized page beat before AI treatment.');
  }
  const range = getTreatmentPageRange(input.mode, source.pageCount);
  const request = writerToolsOutlineTreatmentPreviewRequestSchema.parse({
    mode: 'outline_treatment_preview',
    issue_id: input.issueId,
    treatment_mode: input.mode,
    source_page_count: source.pageCount,
    allowed_page_range: range,
    source_beats: source.beats.map((beat) => ({
      id: beat.id,
      ordinal: beat.ordinal,
      ...(beat.pageTarget === undefined ? {} : { page_target: beat.pageTarget }),
      text: beat.text,
    })),
    ...(source.protectedTerms.length ? { protected_terms: source.protectedTerms } : {}),
  });
  return { request, source };
}

function toManifest(raw: ReturnType<typeof outlineTreatmentPreviewResultSchema.parse>['manifest']): TreatmentManifest {
  return {
    treatmentMode: raw.treatment_mode,
    sourcePageCount: raw.source_page_count,
    proposedPageCount: raw.proposed_page_count,
    entries: raw.entries.map((entry) => ({
      resultBeatId: entry.result_beat_id,
      sourceBeatIds: entry.source_beat_ids,
      changeType: entry.change_type,
      originalPages: entry.original_pages,
      proposedPage: entry.proposed_page,
      reason: entry.reason,
    })),
  };
}

export function parseOutlineTreatmentPreview(
  raw: unknown,
  source: NormalizedTreatmentSource,
): {
  session: TreatmentProposalSession;
  validation: TreatmentValidationResult;
} {
  const parsed = outlineTreatmentPreviewResultSchema.parse(raw);
  const proposal = {
    ...(source.outline ?? {}),
    ...parsed.proposal,
    page_beats: parsed.proposal.page_beats ?? [],
  };
  const session: TreatmentProposalSession = {
    mode: parsed.manifest.treatment_mode,
    source,
    proposal,
    manifest: toManifest(parsed.manifest),
    ...(parsed.operation_notices
      ? {
          operationNotices: parsed.operation_notices.map((notice) => ({
            operationId: notice.operation_id,
            status: notice.status,
            code: notice.code,
            message: notice.message,
            sourceBeatIds: notice.source_beat_ids,
          })),
        }
      : {}),
  };
  const validation = validateTreatmentProposal(session);
  if (!validation.valid) {
    throw new Error('The AI proposal could not be promoted safely. Regenerate it or choose a stricter treatment.');
  }
  return { session, validation };
}

export function buildPersistedTreatmentOutline(
  session: TreatmentProposalSession,
): Record<string, unknown> {
  const validation = validateTreatmentProposal(session);
  if (!validation.valid) {
    throw new Error('This proposal no longer satisfies the selected treatment contract.');
  }
  return {
    ...session.proposal,
    treatment_manifest: {
      treatment_mode: session.manifest.treatmentMode,
      source_page_count: session.manifest.sourcePageCount,
      proposed_page_count: session.manifest.proposedPageCount,
      entries: session.manifest.entries.map((entry) => ({
        result_beat_id: entry.resultBeatId,
        source_beat_ids: entry.sourceBeatIds,
        change_type: entry.changeType,
        original_pages: entry.originalPages,
        ...(entry.proposedPage === undefined ? {} : { proposed_page: entry.proposedPage }),
        reason: entry.reason,
      })),
      validation_summary: validation.summary,
    },
  };
}
