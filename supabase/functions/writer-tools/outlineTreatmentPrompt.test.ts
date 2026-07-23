import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildOutlineTreatmentPrompt,
  buildOutlineTreatmentRepairPrompt,
  getOutlineTreatmentConsistencyErrors,
  hydrateOutlineTreatmentResult,
  normalizeCompactTreatmentResult,
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
    expect(prompt).toContain('Every result beat must have a unique treatment_beat_id');
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

  it('derives a consistent manifest from one compact model response', () => {
    const compact = {
      page_beats: [
        {
          treatment_beat_id: 'result-1',
          source_beat_ids: ['source-page-1-1'],
          change_type: 'unchanged',
          reason: 'Preserved.',
          page_target: 1,
          summary: 'The elder begins.',
        },
        {
          treatment_beat_id: 'result-2',
          source_beat_ids: ['source-page-2-2'],
          change_type: 'moved',
          reason: 'Repositioned.',
          page_target: 2,
          summary: 'The warning arrives.',
        },
      ],
    };
    const input = {
      treatmentMode: 'structure' as const,
      sourcePageCount: 2,
      allowedPageRange: { min: 1, max: 3 },
      sourceBeats,
      protectedTerms: [],
    };

    const hydrated = hydrateOutlineTreatmentResult(compact, input);
    expect(getOutlineTreatmentConsistencyErrors(hydrated, input)).toEqual([]);
    expect(hydrated.manifest.entries).toEqual([
      expect.objectContaining({
        result_beat_id: 'result-1',
        source_beat_ids: ['source-page-1-1'],
        original_pages: [1],
      }),
      expect.objectContaining({
        result_beat_id: 'result-2',
        source_beat_ids: ['source-page-2-2'],
        original_pages: [2],
      }),
    ]);

    const repairPrompt = buildOutlineTreatmentRepairPrompt(
      input,
      compact,
      ['source beat IDs must be represented exactly once'],
    );
    expect(repairPrompt).toContain('complete corrected compact page_beats array');
    expect(repairPrompt).toContain('source beat IDs must be represented exactly once');
    expect(repairPrompt).toContain('result-1');
  });

  it('keeps a 70-page prompt single-copy and derives all 70 manifest entries locally', () => {
    const largeSource = Array.from({ length: 70 }, (_, index) => ({
      id: `source-page-${index + 1}`,
      ordinal: index + 1,
      page_target: index + 1,
      text: `Source event ${index + 1}.`,
    }));
    const input = {
      treatmentMode: 'structure' as const,
      sourcePageCount: 70,
      allowedPageRange: { min: 62, max: 78 },
      sourceBeats: largeSource,
      protectedTerms: [],
    };
    const prompt = buildOutlineTreatmentPrompt(input);
    expect(prompt.match(/Source event 1\./g)).toHaveLength(1);
    expect(prompt).not.toContain('"manifest"');

    const compact = {
      page_beats: largeSource.map((beat) => ({
        treatment_beat_id: `result-${beat.ordinal}`,
        source_beat_ids: [beat.id],
        change_type: 'language_polished',
        reason: 'Polished.',
        page_target: beat.page_target,
        summary: `${beat.text} Polished.`,
      })),
    };
    const hydrated = hydrateOutlineTreatmentResult(compact, input);
    expect(hydrated.proposal.page_beats).toHaveLength(70);
    expect(hydrated.manifest.entries).toHaveLength(70);
    expect(getOutlineTreatmentConsistencyErrors(hydrated, input)).toEqual([]);
  });

  it('derives manifest reasons when Gemini omits or blanks explanatory text', () => {
    const input = {
      treatmentMode: 'structure' as const,
      sourcePageCount: 2,
      allowedPageRange: { min: 1, max: 3 },
      sourceBeats,
      protectedTerms: [],
    };
    const hydrated = hydrateOutlineTreatmentResult({
      page_beats: [
        {
          treatment_beat_id: 'result-1',
          source_beat_ids: ['source-page-1-1'],
          change_type: 'language_polished',
          reason: '',
          page_target: 1,
          summary: 'The elder begins.',
        },
        {
          treatment_beat_id: 'result-2',
          source_beat_ids: ['source-page-2-2'],
          change_type: 'moved',
          page_target: 2,
          summary: 'The warning arrives.',
        },
      ],
    }, input);

    expect(hydrated.manifest.entries.map((entry) => entry.reason)).toEqual([
      'Language and formatting polished.',
      'Source beat repositioned for pacing.',
    ]);
  });

  it('repairs duplicate, unknown, and missing source bookkeeping deterministically', () => {
    const input = {
      treatmentMode: 'structure' as const,
      sourcePageCount: 2,
      allowedPageRange: { min: 1, max: 3 },
      sourceBeats,
      protectedTerms: [],
    };
    const normalized = normalizeCompactTreatmentResult({
      page_beats: [
        {
          treatment_beat_id: 'duplicate',
          source_beat_ids: ['source-page-1-1', 'unknown'],
          change_type: 'language_polished',
          summary: 'The elder begins clearly.',
        },
        {
          treatment_beat_id: 'duplicate',
          source_beat_ids: ['source-page-1-1'],
          change_type: 'combined',
          summary: 'Duplicate recap.',
        },
      ],
    }, input);
    const hydrated = hydrateOutlineTreatmentResult(normalized, input);

    expect(normalized.page_beats).toHaveLength(2);
    expect(normalized.page_beats.map((beat) => beat.treatment_beat_id)).toEqual(['beat-1', 'beat-2']);
    expect(normalized.page_beats.flatMap((beat) => beat.source_beat_ids)).toEqual([
      'source-page-1-1',
      'source-page-2-2',
    ]);
    expect(hydrated.proposal.page_beats?.map((beat) => beat.page_target)).toEqual([1, 2]);
    expect(getOutlineTreatmentConsistencyErrors(hydrated, input)).toEqual([]);
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

  it('rejects a declared page count unsupported by the proposal beat count', () => {
    const input = {
      treatmentMode: 'structure' as const,
      sourcePageCount: 2,
      allowedPageRange: { min: 1, max: 3 },
      sourceBeats,
      protectedTerms: [],
    };
    const inconsistent = {
      proposal: {
        page_beats: [{
          treatment_beat_id: 'summary-all',
          page_target: 2,
          summary: 'The full outline summarized.',
        }],
      },
      manifest: {
        treatment_mode: 'structure',
        source_page_count: 2,
        proposed_page_count: 2,
        entries: [{
          result_beat_id: 'summary-all',
          source_beat_ids: sourceBeats.map((beat) => beat.id),
          change_type: 'combined',
          original_pages: [1, 2],
          proposed_page: 2,
          reason: 'Compress the full outline.',
        }],
      },
    };

    expect(getOutlineTreatmentConsistencyErrors(inconsistent, input)).toContain(
      'proposal beat count must match manifest proposed_page_count',
    );
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
    expect(previewBranch).toContain('preferredModel: OUTLINE_TREATMENT_GEMINI_MODEL');
    expect(previewBranch).toContain('thinkingBudget: 0');
  });
});
