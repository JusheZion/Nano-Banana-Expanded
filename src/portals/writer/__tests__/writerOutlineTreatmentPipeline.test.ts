import { describe, expect, it } from 'vitest';
import {
  outlineTreatmentPreviewResultSchema,
  writerToolsOutlineTreatmentPreviewRequestSchema,
} from '@/shared/writer/schemas';
import {
  buildOutlineTreatmentPrompt,
} from '../../../../supabase/functions/writer-tools/outlineTreatmentPrompt';
import { getTreatmentPageRange } from '../writerOutlineTreatmentContracts';
import {
  normalizeTreatmentSource,
  validateTreatmentProposal,
} from '../writerOutlineTreatmentValidation';

describe('outline treatment pipeline audit', () => {
  it('traces detected source pages through schema, prompt, response, and validation', () => {
    const source = normalizeTreatmentSource({
      title: 'Populated issue',
      page_beats: Array.from({ length: 12 }, (_, index) => ({
        page_target: index + 1,
        summary: `Source event ${index + 1} reaches its intended outcome.`,
      })),
    }, ['Source']);
    const range = getTreatmentPageRange('structure', source.pageCount);
    const request = writerToolsOutlineTreatmentPreviewRequestSchema.parse({
      mode: 'outline_treatment_preview',
      issue_id: '550e8400-e29b-41d4-a716-446655440000',
      treatment_mode: 'structure',
      source_page_count: source.pageCount,
      allowed_page_range: range,
      source_beats: source.beats.map((beat) => ({
        id: beat.id,
        ordinal: beat.ordinal,
        page_target: beat.pageTarget,
        text: beat.text,
      })),
      protected_terms: source.protectedTerms,
    });
    const prompt = buildOutlineTreatmentPrompt({
      treatmentMode: request.treatment_mode,
      sourcePageCount: request.source_page_count,
      allowedPageRange: request.allowed_page_range,
      sourceBeats: request.source_beats,
      protectedTerms: request.protected_terms ?? [],
    });
    expect(request.source_page_count).toBe(12);
    expect(request.source_page_count).not.toBe(22);
    expect(prompt).toContain(`Allowed page range: ${range.min}-${range.max}`);

    const response = outlineTreatmentPreviewResultSchema.parse({
      overall_assessment: 'The complete twelve-page outline was reviewed for pacing, sequence, density, and transitions.',
      section_reviews: [
        {
          start_ordinal: 1,
          end_ordinal: 6,
          assessment: 'Pages 1 through 6 benefit from careful language improvements that preserve their sequence.',
          recommendation: 'language',
          operation_ids: Array.from({ length: 6 }, (_, index) => `result-${index + 1}`),
        },
        {
          start_ordinal: 7,
          end_ordinal: 12,
          assessment: 'Pages 7 through 12 benefit from careful language improvements that preserve their sequence.',
          recommendation: 'language',
          operation_ids: Array.from({ length: 6 }, (_, index) => `result-${index + 7}`),
        },
      ],
      proposal: {
        title: 'Populated issue',
        page_beats: source.beats.map((beat, index) => ({
          treatment_beat_id: `result-${index + 1}`,
          page_target: beat.pageTarget,
          summary: `${beat.text} Source wording polished.`,
        })),
      },
      manifest: {
        treatment_mode: 'structure',
        source_page_count: source.pageCount,
        proposed_page_count: source.pageCount,
        entries: source.beats.map((beat, index) => ({
          result_beat_id: `result-${index + 1}`,
          source_beat_ids: [beat.id],
          change_type: 'language_polished',
          original_pages: [beat.pageTarget],
          proposed_page: beat.pageTarget,
          reason: 'Language polish with identity preserved.',
        })),
      },
    });
    const validation = validateTreatmentProposal({
      mode: response.manifest.treatment_mode,
      source,
      proposal: response.proposal,
      manifest: {
        treatmentMode: response.manifest.treatment_mode,
        sourcePageCount: response.manifest.source_page_count,
        proposedPageCount: response.manifest.proposed_page_count,
        entries: response.manifest.entries.map((entry) => ({
          resultBeatId: entry.result_beat_id,
          sourceBeatIds: entry.source_beat_ids,
          changeType: entry.change_type,
          originalPages: entry.original_pages,
          proposedPage: entry.proposed_page,
          reason: entry.reason,
        })),
      },
    });
    expect(validation).toMatchObject({
      valid: true,
      summary: {
        sourceBeats: 12,
        preserved: 12,
        sourcePages: 12,
        proposedPages: 12,
      },
    });
  });
});
