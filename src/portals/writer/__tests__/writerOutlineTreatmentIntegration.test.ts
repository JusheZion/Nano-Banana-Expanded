import { describe, expect, it } from 'vitest';
import {
  buildOutlineTreatmentPreviewRequest,
  buildPersistedTreatmentOutline,
  parseOutlineTreatmentPreview,
  preserveTreatmentSourceMetadata,
} from '../writerOutlineTreatmentIntegration';
import {
  OUTLINE_TREATMENT_PROTECTED_TERMS,
  OUTLINE_TREATMENT_SOURCE_26,
} from './fixtures/outlineTreatmentSource';
import { normalizeTreatmentSource } from '../writerOutlineTreatmentValidation';

const sourceOutline = {
  title: 'Harbor',
  page_beats: [
    { page_target: 1, summary: 'Pony arrives.' },
    { page_target: 2, summary: 'Onyx answers.' },
  ],
};
const [sourceId1, sourceId2] = normalizeTreatmentSource(sourceOutline).beats.map((beat) => beat.id);

const response = {
  proposal: {
    title: 'Harbor',
    page_beats: [
      { treatment_beat_id: 'result-1', page_target: 1, summary: 'Pony arrives quietly.' },
      { treatment_beat_id: 'result-2', page_target: 2, summary: 'Onyx answers clearly.' },
    ],
  },
  manifest: {
    treatment_mode: 'preserve' as const,
    source_page_count: 2,
    proposed_page_count: 2,
    entries: [
      {
        result_beat_id: 'result-1',
        source_beat_ids: [sourceId1!],
        change_type: 'language_polished' as const,
        original_pages: [1],
        proposed_page: 1,
        reason: 'Language.',
      },
      {
        result_beat_id: 'result-2',
        source_beat_ids: [sourceId2!],
        change_type: 'language_polished' as const,
        original_pages: [2],
        proposed_page: 2,
        reason: 'Language.',
      },
    ],
  },
};

describe('preserveTreatmentSourceMetadata', () => {
  it('inherits official metadata when a saved source contains page beats only', () => {
    expect(preserveTreatmentSourceMetadata(
      { page_beats: [{ page_target: 1, summary: 'Replacement beat.' }] },
      {
        title: 'Official title',
        premise: 'Official premise',
        acts: [{ name: 'Act IV', summary: 'Official act summary.' }],
        page_beats: [{ page_target: 1, summary: 'Old beat.' }],
        treatment_manifest: { stale: true },
      },
    )).toEqual({
      title: 'Official title',
      premise: 'Official premise',
      acts: [{ name: 'Act IV', summary: 'Official act summary.' }],
      page_beats: [{ page_target: 1, summary: 'Replacement beat.' }],
    });
  });

  it('keeps metadata explicitly supplied by the saved source', () => {
    expect(preserveTreatmentSourceMetadata(
      {
        title: 'Source title',
        acts: [{ name: 'Act III', summary: 'Source act summary.' }],
        page_beats: [{ page_target: 1, summary: 'Source beat.' }],
      },
      {
        title: 'Official title',
        acts: [{ name: 'Act II', summary: 'Official act summary.' }],
      },
    )).toMatchObject({
      title: 'Source title',
      acts: [{ name: 'Act III', summary: 'Source act summary.' }],
    });
  });
});

describe('operation notices', () => {
  it('maps accepted and rejected patch operations into the review session', () => {
    const built = buildOutlineTreatmentPreviewRequest({
      issueId: '550e8400-e29b-41d4-a716-446655440000',
      mode: 'preserve',
      sourceOutline,
      protectedTerms: [],
    });
    const parsed = parseOutlineTreatmentPreview({
      ...response,
      operation_notices: [
        {
          operation_id: 'edit-1',
          status: 'accepted',
          code: 'operation_applied',
          message: 'Language polished.',
          source_beat_ids: [sourceId1!],
        },
        {
          operation_id: 'move-invalid',
          status: 'rejected',
          code: 'operation_forbidden',
          message: 'Keep My Order cannot move beats.',
          source_beat_ids: [sourceId2!],
          proposed: { summary: 'Attempted reordered wording.' },
        },
      ],
    }, built.source);

    expect(parsed.session.operationNotices).toEqual([
      {
        operationId: 'edit-1',
        status: 'accepted',
        code: 'operation_applied',
        message: 'Language polished.',
        sourceBeatIds: [sourceId1!],
      },
      {
        operationId: 'move-invalid',
        status: 'rejected',
        code: 'operation_forbidden',
        message: 'Keep My Order cannot move beats.',
        sourceBeatIds: [sourceId2!],
        proposed: { summary: 'Attempted reordered wording.' },
      },
    ]);
  });
});

describe('writer outline treatment integration', () => {
  it('builds preview input from detected source pages rather than a UI target', () => {
    const built = buildOutlineTreatmentPreviewRequest({
      issueId: '550e8400-e29b-41d4-a716-446655440000',
      mode: 'preserve',
      sourceOutline,
      protectedTerms: ['Pony', 'Onyx'],
    });
    expect(built.request).toMatchObject({
      mode: 'outline_treatment_preview',
      source_page_count: 2,
      allowed_page_range: { min: 2, max: 2 },
    });
    expect(built.source.beats).toHaveLength(2);
  });

  it('accepts a valid response and blocks an invalid source omission', () => {
    const built = buildOutlineTreatmentPreviewRequest({
      issueId: '550e8400-e29b-41d4-a716-446655440000',
      mode: 'preserve',
      sourceOutline,
      protectedTerms: ['Pony', 'Onyx'],
    });
    expect(parseOutlineTreatmentPreview(response, built.source).validation.valid).toBe(true);
    expect(() => parseOutlineTreatmentPreview({
      ...response,
      manifest: { ...response.manifest, entries: response.manifest.entries.slice(0, 1) },
    }, built.source)).toThrow(/could not be promoted safely/i);
  });

  it('preserves non-beat fields when the compact Edge response contains treated beats only', () => {
    const outlineWithMetadata = {
      title: 'Original title',
      premise: 'Original premise',
      acts: [{ name: 'Act III', summary: 'Keep this act summary.' }],
      notes: 'Keep these notes.',
      page_beats: [{ page_target: 1, summary: 'Original event.' }],
    };
    const built = buildOutlineTreatmentPreviewRequest({
      issueId: '550e8400-e29b-41d4-a716-446655440000',
      mode: 'preserve',
      sourceOutline: outlineWithMetadata,
    });
    const parsed = parseOutlineTreatmentPreview({
      proposal: {
        page_beats: [{
          treatment_beat_id: 'result-1',
          page_target: 1,
          summary: 'Original event, polished.',
        }],
      },
      manifest: {
        treatment_mode: 'preserve',
        source_page_count: 1,
        proposed_page_count: 1,
        entries: [{
          result_beat_id: 'result-1',
          source_beat_ids: [built.source.beats[0].id],
          change_type: 'language_polished',
          original_pages: [1],
          proposed_page: 1,
          reason: 'Language polish only.',
        }],
      },
    }, built.source);

    expect(parsed.session.proposal).toMatchObject({
      title: 'Original title',
      premise: 'Original premise',
      acts: [{ name: 'Act III', summary: 'Keep this act summary.' }],
      notes: 'Keep these notes.',
    });
    expect(parsed.session.proposal.page_beats).toEqual([
      expect.objectContaining({ summary: 'Original event, polished.' }),
    ]);
  });

  it('embeds the validated manifest only when building the promoted outline', () => {
    const built = buildOutlineTreatmentPreviewRequest({
      issueId: '550e8400-e29b-41d4-a716-446655440000',
      mode: 'preserve',
      sourceOutline,
      protectedTerms: [],
    });
    const session = parseOutlineTreatmentPreview(response, built.source).session;
    expect(session.proposal).not.toHaveProperty('treatment_manifest');
    expect(buildPersistedTreatmentOutline(session)).toMatchObject({
      title: 'Harbor',
      treatment_manifest: {
        treatment_mode: 'preserve',
        source_page_count: 2,
      },
    });
  });

  it.each([
    ['preserve', { min: 26, max: 26 }],
    ['structure', { min: 23, max: 29 }],
    ['expand', { min: 20, max: 32 }],
  ] as const)('builds the %s contract from the same 26-beat source', (mode, expectedRange) => {
    const built = buildOutlineTreatmentPreviewRequest({
      issueId: '550e8400-e29b-41d4-a716-446655440000',
      mode,
      sourceOutline: OUTLINE_TREATMENT_SOURCE_26,
      protectedTerms: OUTLINE_TREATMENT_PROTECTED_TERMS,
    });
    expect(built.request.source_beats).toHaveLength(26);
    expect(built.request.source_page_count).toBe(26);
    expect(built.request.allowed_page_range).toEqual(expectedRange);
    expect(new Set(built.request.source_beats.map((beat) => beat.id)).size).toBe(26);
  });

  it('round-trips a promoted manifest and exact prior outline for reload-safe Undo', () => {
    const built = buildOutlineTreatmentPreviewRequest({
      issueId: '550e8400-e29b-41d4-a716-446655440000',
      mode: 'preserve',
      sourceOutline,
      protectedTerms: [],
    });
    const session = parseOutlineTreatmentPreview(response, built.source).session;
    const prior = structuredClone(sourceOutline);
    const promoted = buildPersistedTreatmentOutline(session);
    const reloadedPromoted = JSON.parse(JSON.stringify(promoted));
    const reloadedPrior = JSON.parse(JSON.stringify(prior));
    expect(reloadedPromoted.treatment_manifest).toMatchObject({
      treatment_mode: 'preserve',
      source_page_count: 2,
    });
    expect(reloadedPrior).toEqual(prior);
    expect(reloadedPrior).not.toHaveProperty('treatment_manifest');
  });
});
