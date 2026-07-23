import { describe, expect, it } from 'vitest';
import {
  normalizeTreatmentSource,
  rejectTreatmentChange,
  validateTreatmentProposal,
  type TreatmentManifest,
} from '../writerOutlineTreatmentValidation';

const sourceOutline = {
  page_beats: [
    { page_target: 1, scene: 'Campfire', summary: 'Pony hears the warning.' },
    { page_target: 2, scene: 'Crossroads', summary: 'Onyx refuses the prophecy.' },
    { page_target: 3, scene: 'Threshold', summary: 'Pony and Onyx leave together.' },
  ],
};

const source = normalizeTreatmentSource(sourceOutline, ['Pony', 'Onyx']);

const manifest = (entries: TreatmentManifest['entries'], proposedPageCount = 3): TreatmentManifest => ({
  treatmentMode: 'structure',
  sourcePageCount: 3,
  proposedPageCount,
  entries,
});

describe('writer outline treatment validation', () => {
  it('normalizes source beats with request-stable structural ids', () => {
    expect(source.beats.map((beat) => beat.id)).toEqual([
      'source-page-1-1',
      'source-page-2-2',
      'source-page-3-3',
    ]);
    expect(source.pageCount).toBe(3);
    expect(source.protectedTerms).toEqual(['Pony', 'Onyx']);
  });

  it('uses source order when pages are absent and highest explicit page when present', () => {
    expect(normalizeTreatmentSource({
      page_beats: [
        { summary: 'Unnumbered opening.' },
        { page_target: 26, summary: 'Numbered ending.' },
      ],
    }).pageCount).toBe(26);
    expect(normalizeTreatmentSource({
      page_beats: [{ summary: 'One.' }, { summary: 'Two.' }],
    }).pageCount).toBe(2);
  });

  it('rejects a missing source beat in every treatment mode', () => {
    const entries: TreatmentManifest['entries'] = [
      {
        resultBeatId: 'result-1',
        sourceBeatIds: ['source-page-1-1'],
        changeType: 'language_polished',
        originalPages: [1],
        proposedPage: 1,
        reason: 'Copyedit.',
      },
      {
        resultBeatId: 'result-2',
        sourceBeatIds: ['source-page-2-2'],
        changeType: 'moved',
        originalPages: [2],
        proposedPage: 2,
        reason: 'Pacing.',
      },
    ];
    const proposal = { page_beats: [
      { page_target: 1, summary: 'Pony hears the warning.', treatment_beat_id: 'result-1' },
      { page_target: 2, summary: 'Onyx refuses the prophecy.', treatment_beat_id: 'result-2' },
    ] };

    for (const mode of ['preserve', 'structure', 'expand'] as const) {
      const result = validateTreatmentProposal({
        mode,
        source,
        proposal,
        manifest: { ...manifest(entries), treatmentMode: mode },
      });
      expect(result.errors).toContainEqual(expect.objectContaining({ code: 'missing_source_beat' }));
    }
  });

  it('rejects movement and page changes in Keep My Order', () => {
    const result = validateTreatmentProposal({
      mode: 'preserve',
      source,
      proposal: { page_beats: [
        { page_target: 2, summary: 'Onyx refuses the prophecy.', treatment_beat_id: 'result-2' },
        { page_target: 1, summary: 'Pony hears the warning.', treatment_beat_id: 'result-1' },
        { page_target: 3, summary: 'Pony and Onyx leave together.', treatment_beat_id: 'result-3' },
      ] },
      manifest: {
        treatmentMode: 'preserve',
        sourcePageCount: 3,
        proposedPageCount: 3,
        entries: [
          { resultBeatId: 'result-2', sourceBeatIds: ['source-page-2-2'], changeType: 'moved', originalPages: [2], proposedPage: 2, reason: 'Moved.' },
          { resultBeatId: 'result-1', sourceBeatIds: ['source-page-1-1'], changeType: 'moved', originalPages: [1], proposedPage: 1, reason: 'Moved.' },
          { resultBeatId: 'result-3', sourceBeatIds: ['source-page-3-3'], changeType: 'unchanged', originalPages: [3], proposedPage: 3, reason: 'Unchanged.' },
        ],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      'preserve_order_changed',
      'preserve_change_forbidden',
    ]));
  });

  it('accepts a traceable combination within Organize and Polish', () => {
    const result = validateTreatmentProposal({
      mode: 'structure',
      source,
      proposal: { page_beats: [
        { page_target: 1, summary: 'Pony hears the warning.', treatment_beat_id: 'result-1' },
        { page_target: 2, summary: 'Onyx refuses the prophecy, then they leave.', treatment_beat_id: 'result-2-3' },
      ] },
      manifest: manifest([
        { resultBeatId: 'result-1', sourceBeatIds: ['source-page-1-1'], changeType: 'language_polished', originalPages: [1], proposedPage: 1, reason: 'Copyedit.' },
        { resultBeatId: 'result-2-3', sourceBeatIds: ['source-page-2-2', 'source-page-3-3'], changeType: 'combined', originalPages: [2, 3], proposedPage: 2, reason: 'Combine related departure beats.' },
      ], 3),
    });
    expect(result.valid).toBe(true);
    expect(result.summary).toMatchObject({ preserved: 3, combined: 1, sourcePages: 3, proposedPages: 3 });
  });

  it('accepts a mapped creative addition and rejects unknown source ids', () => {
    const validEntries: TreatmentManifest['entries'] = [
      { resultBeatId: 'result-1', sourceBeatIds: ['source-page-1-1'], changeType: 'enhanced', originalPages: [1], proposedPage: 1, reason: 'Heighten warning.' },
      { resultBeatId: 'result-2', sourceBeatIds: ['source-page-2-2'], changeType: 'enhanced', originalPages: [2], proposedPage: 2, reason: 'Heighten refusal.' },
      { resultBeatId: 'result-3', sourceBeatIds: ['source-page-3-3'], changeType: 'enhanced', originalPages: [3], proposedPage: 3, reason: 'Heighten departure.' },
      { resultBeatId: 'added-1', sourceBeatIds: [], changeType: 'added', originalPages: [], proposedPage: 4, reason: 'Add connective aftermath.' },
    ];
    const proposal = { page_beats: [
      { page_target: 1, summary: 'Pony hears the warning.', treatment_beat_id: 'result-1' },
      { page_target: 2, summary: 'Onyx refuses the prophecy.', treatment_beat_id: 'result-2' },
      { page_target: 3, summary: 'Pony and Onyx leave together.', treatment_beat_id: 'result-3' },
      { page_target: 4, summary: 'The fire dims behind them.', treatment_beat_id: 'added-1' },
    ] };
    expect(validateTreatmentProposal({
      mode: 'expand',
      source,
      proposal,
      manifest: { ...manifest(validEntries, 4), treatmentMode: 'expand' },
    }).valid).toBe(true);

    const unknown = structuredClone(validEntries);
    unknown[0]!.sourceBeatIds = ['source-page-99-99'];
    expect(validateTreatmentProposal({
      mode: 'expand',
      source,
      proposal,
      manifest: { ...manifest(unknown, 4), treatmentMode: 'expand' },
    }).errors).toContainEqual(expect.objectContaining({ code: 'unknown_source_beat' }));
  });

  it('enforces page tolerance and protected names', () => {
    const entries: TreatmentManifest['entries'] = source.beats.map((beat, index) => ({
      resultBeatId: `result-${index + 1}`,
      sourceBeatIds: [beat.id],
      changeType: 'enhanced' as const,
      originalPages: beat.pageTarget ? [beat.pageTarget] : [],
      proposedPage: index + 1,
      reason: 'Enhance.',
    }));
    const result = validateTreatmentProposal({
      mode: 'structure',
      source,
      proposal: { page_beats: [
        { page_target: 1, summary: 'The warning is heard.', treatment_beat_id: 'result-1' },
        { page_target: 2, summary: 'The prophecy is refused.', treatment_beat_id: 'result-2' },
        { page_target: 8, summary: 'They leave together.', treatment_beat_id: 'result-3' },
      ] },
      manifest: { ...manifest(entries, 8), treatmentMode: 'structure' },
    });
    expect(result.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      'page_tolerance_exceeded',
      'protected_term_missing',
    ]));
  });

  it('restores immutable source beats when an Advanced combination is rejected', () => {
    const session = {
      mode: 'structure' as const,
      source,
      proposal: { page_beats: [
        { page_target: 1, summary: 'Pony hears the warning.', treatment_beat_id: 'result-1' },
        { page_target: 2, summary: 'Onyx refuses, then they leave.', treatment_beat_id: 'result-2-3' },
      ] },
      manifest: manifest([
        { resultBeatId: 'result-1', sourceBeatIds: ['source-page-1-1'], changeType: 'language_polished', originalPages: [1], proposedPage: 1, reason: 'Copyedit.' },
        { resultBeatId: 'result-2-3', sourceBeatIds: ['source-page-2-2', 'source-page-3-3'], changeType: 'combined', originalPages: [2, 3], proposedPage: 2, reason: 'Combine.' },
      ]),
    };
    const restored = rejectTreatmentChange(session, 'result-2-3');
    expect(restored.proposal.page_beats).toEqual(expect.arrayContaining([
      expect.objectContaining({ page_target: 2, treatment_beat_id: 'restored-source-page-2-2' }),
      expect.objectContaining({ page_target: 3, treatment_beat_id: 'restored-source-page-3-3' }),
    ]));
    expect(validateTreatmentProposal(restored).valid).toBe(true);
  });
});
