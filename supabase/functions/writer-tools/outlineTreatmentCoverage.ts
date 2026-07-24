import type { OutlineTreatmentPromptInput } from './outlineTreatmentPrompt.ts';

export type TreatmentReviewBand = {
  start_ordinal: number;
  end_ordinal: number;
  assessment: string;
  recommendation: 'no_change' | 'language' | 'structure' | 'expand';
  operation_ids: string[];
};

export type TreatmentCoverageResult = {
  operations: Array<{ operation_id: string }>;
  section_reviews: TreatmentReviewBand[];
  overall_assessment: string;
};

export function deriveTreatmentReviewBands(sourceBeatCount: number): Array<{
  startOrdinal: number;
  endOrdinal: number;
}> {
  const count = Math.max(1, Math.min(200, Math.trunc(sourceBeatCount)));
  const bandCount = Math.min(10, Math.ceil(count / 10));
  const bandSize = Math.ceil(count / bandCount);
  const bands: Array<{ startOrdinal: number; endOrdinal: number }> = [];
  for (let start = 1; start <= count; start += bandSize) {
    bands.push({
      startOrdinal: start,
      endOrdinal: Math.min(count, start + bandSize - 1),
    });
  }
  return bands;
}

function hasSubstantiveAssessment(value: string): boolean {
  const words = value.match(/[\p{L}\p{N}']+/gu) ?? [];
  if (words.length < 8) return false;
  return !/^(looks?|seems?)\s+(good|fine|okay)|^no changes? needed/iu.test(value.trim());
}

const ALLOWED_RECOMMENDATIONS: Record<
  OutlineTreatmentPromptInput['treatmentMode'],
  Set<TreatmentReviewBand['recommendation']>
> = {
  preserve: new Set(['no_change', 'language']),
  structure: new Set(['no_change', 'language', 'structure']),
  expand: new Set(['no_change', 'language', 'structure', 'expand']),
};

export function getTreatmentCoverageErrors(
  result: TreatmentCoverageResult,
  input: OutlineTreatmentPromptInput,
): string[] {
  const errors: string[] = [];
  const expected = deriveTreatmentReviewBands(input.sourceBeats.length);
  const exactRanges = result.section_reviews.length === expected.length
    && result.section_reviews.every((review, index) => (
      review.start_ordinal === expected[index]?.startOrdinal
      && review.end_ordinal === expected[index]?.endOrdinal
    ));
  if (!exactRanges) {
    errors.push('section reviews must exactly cover every expected outline range');
  }

  if (result.section_reviews.some((review) => !hasSubstantiveAssessment(review.assessment))) {
    errors.push('every section review must contain a substantive assessment');
  }

  const allowed = ALLOWED_RECOMMENDATIONS[input.treatmentMode];
  const invalidRecommendations = [
    ...new Set(
      result.section_reviews
        .map((review) => review.recommendation)
        .filter((recommendation) => !allowed.has(recommendation)),
    ),
  ];
  for (const recommendation of invalidRecommendations) {
    errors.push(`${recommendation} recommendations are not allowed in ${input.treatmentMode} mode`);
  }

  const operationIds = result.operations.map((operation) => operation.operation_id);
  const linkedIds = result.section_reviews.flatMap((review) => review.operation_ids);
  if (
    operationIds.some((id) => linkedIds.filter((linkedId) => linkedId === id).length !== 1)
  ) {
    errors.push('every operation must be linked to exactly one section review');
  }
  const operationIdSet = new Set(operationIds);
  const unknownIds = [...new Set(linkedIds.filter((id) => !operationIdSet.has(id)))];
  if (unknownIds.length) {
    errors.push(`section reviews reference unknown operation IDs: ${unknownIds.join(', ')}`);
  }

  return errors;
}
