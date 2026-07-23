import { describe, expect, it } from 'vitest';
import {
  buildOutlineTreatmentPreviewRequest,
  buildPersistedTreatmentOutline,
  parseOutlineTreatmentPreview,
} from '../writerOutlineTreatmentIntegration';
import {
  OUTLINE_TREATMENT_PROTECTED_TERMS,
  OUTLINE_TREATMENT_SOURCE_26,
} from './fixtures/outlineTreatmentSource';

const sourceOutline = {
  title: 'Harbor',
  page_beats: [
    { page_target: 1, summary: 'Pony arrives.' },
    { page_target: 2, summary: 'Onyx answers.' },
  ],
};

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
        source_beat_ids: ['source-page-1-1'],
        change_type: 'language_polished' as const,
        original_pages: [1],
        proposed_page: 1,
        reason: 'Language.',
      },
      {
        result_beat_id: 'result-2',
        source_beat_ids: ['source-page-2-2'],
        change_type: 'language_polished' as const,
        original_pages: [2],
        proposed_page: 2,
        reason: 'Language.',
      },
    ],
  },
};

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
