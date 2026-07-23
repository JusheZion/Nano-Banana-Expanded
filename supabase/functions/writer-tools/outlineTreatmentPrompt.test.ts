import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildOutlineTreatmentPrompt,
  buildOutlineTreatmentRepairPrompt,
  getOutlineTreatmentConsistencyErrors,
  restorePreserveStructure,
} from './outlineTreatmentPrompt';

const sourceBeats = [
  { id: 'source-page-1-1', ordinal: 1, page_target: 1, text: 'The elder begins.' },
  { id: 'source-page-2-2', ordinal: 2, page_target: 2, text: 'The warning arrives.' },
];

describe('buildOutlineTreatmentPrompt', () => {
  it.each([
    ['preserve', { min: 2, max: 2 }],
    ['structure', { min: 1, max: 3 }],
    ['expand', { min: 1, max: 3 }],
  ] as const)('requires complete traceability in %s mode', (treatmentMode, allowedPageRange) => {
    const prompt = buildOutlineTreatmentPrompt({
      treatmentMode,
      sourcePageCount: 2,
      allowedPageRange,
      sourceBeats,
      protectedTerms: ['Elder'],
    });
    expect(prompt).toContain('Every source beat id must appear');
    expect(prompt).toContain('one manifest entry for every result beat');
    expect(prompt).toContain('Never delete or omit a source beat');
  });

  it('makes Keep My Order structure immutable', () => {
    const prompt = buildOutlineTreatmentPrompt({
      treatmentMode: 'preserve',
      sourcePageCount: 2,
      allowedPageRange: { min: 2, max: 2 },
      sourceBeats,
      protectedTerms: [],
    });
    expect(prompt).toContain('Beat IDs, order, events, outcomes, and page targets are immutable');
    expect(prompt).toContain('language_polished');
    expect(prompt).not.toContain('You may reorder');
  });

  it('permits bounded traceable organization', () => {
    const prompt = buildOutlineTreatmentPrompt({
      treatmentMode: 'structure',
      sourcePageCount: 52,
      allowedPageRange: { min: 46, max: 58 },
      sourceBeats,
      protectedTerms: [],
    });
    expect(prompt).toContain('You may reorder and combine');
    expect(prompt).toContain('Allowed page range: 46-58');
  });

  it('permits bounded enhancement and additions', () => {
    const prompt = buildOutlineTreatmentPrompt({
      treatmentMode: 'expand',
      sourcePageCount: 52,
      allowedPageRange: { min: 41, max: 63 },
      sourceBeats,
      protectedTerms: [],
    });
    expect(prompt).toContain('You may substantially enhance');
    expect(prompt).toContain('add new connective beats');
    expect(prompt).toContain('Allowed page range: 41-63');
  });

  it('reconstructs Keep My Order page order from immutable source identity', () => {
    const restored = restorePreserveStructure({
      proposal: {
        page_beats: [
          { treatment_beat_id: 'result-2', page_target: 99, summary: 'Polished warning.' },
          { treatment_beat_id: 'result-1', page_target: 88, summary: 'Polished opening.' },
        ],
      },
      manifest: {
        entries: [
          { result_beat_id: 'result-2', source_beat_ids: ['source-page-2-2'] },
          { result_beat_id: 'result-1', source_beat_ids: ['source-page-1-1'] },
        ],
      },
    }, {
      treatmentMode: 'preserve',
      sourcePageCount: 2,
      allowedPageRange: { min: 2, max: 2 },
      sourceBeats,
      protectedTerms: [],
    });
    expect(restored.proposal.page_beats).toEqual([
      expect.objectContaining({ treatment_beat_id: 'result-1', page_target: 1, summary: 'Polished opening.' }),
      expect.objectContaining({ treatment_beat_id: 'result-2', page_target: 2, summary: 'Polished warning.' }),
    ]);
  });

  it('diagnoses inconsistent result IDs and requests one complete repaired response', () => {
    const inconsistent = {
      proposal: {
        page_beats: [
          { treatment_beat_id: 'proposal-1', page_target: 1, summary: 'The elder begins.' },
          { treatment_beat_id: 'proposal-2', page_target: 2, summary: 'The warning arrives.' },
        ],
      },
      manifest: {
        treatment_mode: 'structure',
        source_page_count: 2,
        proposed_page_count: 2,
        entries: [
          {
            result_beat_id: 'manifest-1',
            source_beat_ids: ['source-page-1-1'],
            change_type: 'unchanged',
            original_pages: [1],
            proposed_page: 1,
            reason: 'Preserved.',
          },
          {
            result_beat_id: 'manifest-2',
            source_beat_ids: ['source-page-2-2'],
            change_type: 'moved',
            original_pages: [2],
            proposed_page: 2,
            reason: 'Repositioned.',
          },
        ],
      },
    };
    const input = {
      treatmentMode: 'structure' as const,
      sourcePageCount: 2,
      allowedPageRange: { min: 1, max: 3 },
      sourceBeats,
      protectedTerms: [],
    };

    const errors = getOutlineTreatmentConsistencyErrors(inconsistent, input);
    expect(errors).toContain('proposal result beat IDs do not match manifest result beat IDs');

    const repairPrompt = buildOutlineTreatmentRepairPrompt(input, inconsistent, errors);
    expect(repairPrompt).toContain('Return the complete corrected proposal and manifest');
    expect(repairPrompt).toContain('proposal result beat IDs do not match manifest result beat IDs');
    expect(repairPrompt).toContain('manifest-1');
  });

  it('keeps the Edge preview branch free of outline persistence calls', () => {
    const indexSource = readFileSync(
      join(process.cwd(), 'supabase/functions/writer-tools/index.ts'),
      'utf8',
    );
    const branchStart = indexSource.indexOf("parsedReq.data.mode === 'outline_treatment_preview'");
    const branchEnd = indexSource.indexOf("parsedReq.data.mode === 'guided_comic_assist'", branchStart);
    const previewBranch = indexSource.slice(branchStart, branchEnd);
    expect(branchStart).toBeGreaterThan(-1);
    expect(branchEnd).toBeGreaterThan(branchStart);
    expect(previewBranch).not.toMatch(/\.insert\s*\(/);
    expect(previewBranch).not.toMatch(/\.update\s*\(/);
    expect(previewBranch).not.toContain('writer_issue_outlines');
  });
});
