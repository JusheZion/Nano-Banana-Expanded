import { describe, expect, it } from 'vitest';
import {
  deriveTreatmentReviewBands,
  getTreatmentCoverageErrors,
  type TreatmentReviewBand,
} from './outlineTreatmentCoverage';

const input = {
  treatmentMode: 'structure' as const,
  sourcePageCount: 70,
  allowedPageRange: { min: 63, max: 77 },
  sourceBeats: Array.from({ length: 70 }, (_, index) => ({
    id: `source-${index + 1}`,
    ordinal: index + 1,
    page_target: index + 1,
    text: `Source event ${index + 1}.`,
  })),
  protectedTerms: [],
};

function reviews(
  recommendation: TreatmentReviewBand['recommendation'] = 'no_change',
): TreatmentReviewBand[] {
  return deriveTreatmentReviewBands(70).map((range, index) => ({
    start_ordinal: range.startOrdinal,
    end_ordinal: range.endOrdinal,
    assessment: `Section ${index + 1} was reviewed for pacing, density, sequence, transitions, and page distribution.`,
    recommendation,
    operation_ids: [],
  }));
}

describe('outline treatment semantic coverage', () => {
  it('derives seven contiguous ten-page bands for a 70-beat outline', () => {
    expect(deriveTreatmentReviewBands(70)).toEqual([
      { startOrdinal: 1, endOrdinal: 10 },
      { startOrdinal: 11, endOrdinal: 20 },
      { startOrdinal: 21, endOrdinal: 30 },
      { startOrdinal: 31, endOrdinal: 40 },
      { startOrdinal: 41, endOrdinal: 50 },
      { startOrdinal: 51, endOrdinal: 60 },
      { startOrdinal: 61, endOrdinal: 70 },
    ]);
  });

  it.each([
    ['opening', 0],
    ['middle', 3],
    ['ending', 6],
  ])('rejects a response missing the %s review band', (_label, index) => {
    const sectionReviews = reviews();
    sectionReviews.splice(index, 1);
    expect(getTreatmentCoverageErrors({
      operations: [],
      section_reviews: sectionReviews,
      overall_assessment: 'The complete outline was reviewed for structural pacing and page distribution.',
    }, input)).toContain('section reviews must exactly cover every expected outline range');
  });

  it('rejects overlapping or duplicate ranges', () => {
    const sectionReviews = reviews();
    sectionReviews[1] = { ...sectionReviews[0]! };
    expect(getTreatmentCoverageErrors({
      operations: [],
      section_reviews: sectionReviews,
      overall_assessment: 'The complete outline was reviewed for structural pacing and page distribution.',
    }, input)).toContain('section reviews must exactly cover every expected outline range');
  });

  it('requires every operation to be linked exactly once', () => {
    const sectionReviews = reviews();
    sectionReviews[0]!.operation_ids = ['edit-1'];
    sectionReviews[1]!.operation_ids = ['edit-1', 'unknown'];
    const errors = getTreatmentCoverageErrors({
      operations: [{ operation_id: 'edit-1' }, { operation_id: 'edit-2' }],
      section_reviews: sectionReviews,
      overall_assessment: 'The complete outline was reviewed for structural pacing and page distribution.',
    }, input);
    expect(errors).toContain('every operation must be linked to exactly one section review');
    expect(errors).toContain('section reviews reference unknown operation IDs: unknown');
  });

  it('rejects generic assessments that do not demonstrate review', () => {
    const sectionReviews = reviews();
    sectionReviews[2]!.assessment = 'Looks good as written.';
    expect(getTreatmentCoverageErrors({
      operations: [],
      section_reviews: sectionReviews,
      overall_assessment: 'The complete outline was reviewed for structural pacing and page distribution.',
    }, input)).toContain('every section review must contain a substantive assessment');
  });

  it.each([
    ['preserve', 'structure'],
    ['preserve', 'expand'],
    ['structure', 'expand'],
  ] as const)('rejects %s mode recommendation %s', (treatmentMode, recommendation) => {
    expect(getTreatmentCoverageErrors({
      operations: [],
      section_reviews: reviews(recommendation),
      overall_assessment: 'The complete outline was reviewed under the selected treatment contract.',
    }, { ...input, treatmentMode })).toContain(
      `${recommendation} recommendations are not allowed in ${treatmentMode} mode`,
    );
  });

  it.each(['preserve', 'structure', 'expand'] as const)(
    'accepts complete explicit no-change coverage in %s mode',
    (treatmentMode) => {
      expect(getTreatmentCoverageErrors({
        operations: [],
        section_reviews: reviews(),
        overall_assessment: 'The complete outline was reviewed under the selected treatment contract.',
      }, { ...input, treatmentMode })).toEqual([]);
    },
  );
});
