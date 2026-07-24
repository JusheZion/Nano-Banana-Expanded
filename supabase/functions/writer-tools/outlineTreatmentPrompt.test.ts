import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildOutlineTreatmentPrompt,
  getOutlineTreatmentConsistencyErrors,
} from './outlineTreatmentPrompt';

const sourceBeats = [
  { id: 'source-page-1-1', ordinal: 1, page_target: 1, text: 'The elder begins.' },
  { id: 'source-page-2-2', ordinal: 2, page_target: 2, text: 'The warning arrives.' },
];

describe('buildOutlineTreatmentPrompt', () => {
  it('requests explicit operations instead of a replacement outline', () => {
    const prompt = buildOutlineTreatmentPrompt({
      treatmentMode: 'structure',
      sourcePageCount: 2,
      allowedPageRange: { min: 1, max: 3 },
      sourceBeats,
      protectedTerms: [],
    });

    expect(prompt).toContain('Do not return a replacement outline');
    expect(prompt).toContain('Omit unchanged beats');
    expect(prompt).toContain('Source beat IDs are opaque tokens');
    expect(prompt).toContain('Never derive, renumber, or repair an ID');
    expect(prompt).toContain('"operations"');
    expect(prompt).not.toContain('"page_beats"');
  });

  it.each([
    ['preserve', { min: 2, max: 2 }],
    ['structure', { min: 1, max: 3 }],
    ['expand', { min: 1, max: 3 }],
  ] as const)('supplies source identity and patch constraints in %s mode', (treatmentMode, allowedPageRange) => {
    const prompt = buildOutlineTreatmentPrompt({
      treatmentMode,
      sourcePageCount: 2,
      allowedPageRange,
      sourceBeats,
      protectedTerms: ['Elder'],
    });
    expect(prompt).toContain('Every operation_id must be unique');
    expect(prompt).toContain('Never claim a source ID');
    expect(prompt.match(/source-page-1-1/g)).toHaveLength(1);
    expect(prompt).toContain('Preserve these terms exactly');
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
    expect(prompt).toContain('Return edit operations only');
    expect(prompt).not.toContain('You may return edit, move');
  });

  it('permits bounded traceable organization', () => {
    const prompt = buildOutlineTreatmentPrompt({
      treatmentMode: 'structure',
      sourcePageCount: 52,
      allowedPageRange: { min: 46, max: 58 },
      sourceBeats,
      protectedTerms: [],
    });
    expect(prompt).toContain('edit, move, combine, and narrowly connective add operations');
    expect(prompt).toContain('Allowed page range: 46-58');
    expect(prompt).toContain('pacing, density, sequence, transitions, and page distribution');
  });

  it('permits bounded enhancement and additions', () => {
    const prompt = buildOutlineTreatmentPrompt({
      treatmentMode: 'expand',
      sourcePageCount: 52,
      allowedPageRange: { min: 41, max: 63 },
      sourceBeats,
      protectedTerms: [],
    });
    expect(prompt).toContain('creative add operations');
    expect(prompt).toContain('Allowed page range: 41-63');
    expect(prompt).toContain('emotional development, escalation, connective scenes, and bounded creative opportunities');
  });

  it('requires explicit opening-through-ending section reviews', () => {
    const largeSource = Array.from({ length: 70 }, (_, index) => ({
      id: `source-page-${index + 1}`,
      ordinal: index + 1,
      page_target: index + 1,
      text: `Source event ${index + 1}.`,
    }));
    const prompt = buildOutlineTreatmentPrompt({
      treatmentMode: 'preserve',
      sourcePageCount: 70,
      allowedPageRange: { min: 70, max: 70 },
      sourceBeats: largeSource,
      protectedTerms: [],
    });
    expect(prompt).toContain('"startOrdinal":1,"endOrdinal":10');
    expect(prompt).toContain('"startOrdinal":61,"endOrdinal":70');
    expect(prompt).toContain('Return one section_reviews record for every range');
    expect(prompt).toContain('grammar, clarity, consistency, and formatting');
    expect(prompt).toContain('"overall_assessment"');
  });

  it('keeps a 70-page prompt single-copy and does not request a manifest', () => {
    const largeSource = Array.from({ length: 70 }, (_, index) => ({
      id: `source-page-${index + 1}`,
      ordinal: index + 1,
      page_target: index + 1,
      text: `Source event ${index + 1}.`,
    }));
    const prompt = buildOutlineTreatmentPrompt({
      treatmentMode: 'structure',
      sourcePageCount: 70,
      allowedPageRange: { min: 63, max: 77 },
      sourceBeats: largeSource,
      protectedTerms: [],
    });
    expect(prompt.match(/Source event 1\./g)).toHaveLength(1);
    expect(prompt).not.toContain('"manifest"');
    expect(prompt).not.toContain('Every source beat id must appear');
  });

  it('rejects unmapped proposal beats and duplicate source consumption', () => {
    const input = {
      treatmentMode: 'structure' as const,
      sourcePageCount: 2,
      allowedPageRange: { min: 1, max: 3 },
      sourceBeats,
      protectedTerms: [],
    };
    const inconsistent = {
      proposal: {
        page_beats: [
          { page_target: 1, summary: 'The elder begins.' },
          { treatment_beat_id: 'result-2', page_target: 2, summary: 'The complete story summarized.' },
        ],
      },
      manifest: {
        treatment_mode: 'structure',
        source_page_count: 2,
        proposed_page_count: 2,
        entries: [
          {
            result_beat_id: 'result-1',
            source_beat_ids: ['source-page-1-1'],
            change_type: 'unchanged',
            original_pages: [1],
            proposed_page: 1,
            reason: 'Retained.',
          },
          {
            result_beat_id: 'result-2',
            source_beat_ids: ['source-page-1-1', 'source-page-2-2'],
            change_type: 'combined',
            original_pages: [1, 2],
            proposed_page: 2,
            reason: 'Summarized.',
          },
        ],
      },
    };

    expect(getOutlineTreatmentConsistencyErrors(inconsistent, input)).toEqual(expect.arrayContaining([
      'every proposal beat must have a treatment_beat_id',
      'source beat IDs must be represented exactly once',
    ]));
  });

  it('keeps the Edge preview branch non-mutating and patch-based', () => {
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
    expect(previewBranch).toContain('outlineTreatmentPatchResultSchema.safeParse');
    expect(previewBranch).toContain('applyOutlineTreatmentPatches');
    expect(previewBranch).not.toContain('normalizeCompactTreatmentResult');
    expect(previewBranch).not.toContain('buildOutlineTreatmentRepairPrompt');
    expect(previewBranch).toContain('preferredModel: OUTLINE_TREATMENT_GEMINI_MODEL');
    expect(previewBranch).toContain('thinkingBudget: 0');
  });
});
