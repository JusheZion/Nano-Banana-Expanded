import { describe, expect, it } from 'vitest';
import {
  buildPacingRevisionOutlinePreview,
  buildPacingRevisionOutlinePrompt,
  type PacingRevisionPlan,
} from './pacingRevisionPrompt';

const sourceBeats = Array.from({ length: 70 }, (_, index) => ({
  id: `source-${index + 1}`,
  ordinal: index + 1,
  page_target: index + 1,
  text: `Story event ${index + 1} reaches outcome ${index + 1}.`,
}));

const input = {
  treatmentMode: 'structure' as const,
  sourcePageCount: 70,
  allowedPageRange: { min: 63, max: 77 },
  sourceBeats,
  protectedTerms: [],
};

describe('pacing revision outline planning', () => {
  it('retains all 70 source beats when the model returns only eight edits', () => {
    const operations = Array.from({ length: 8 }, (_, index) => {
      const source = sourceBeats[index * 8]!;
      return {
        item_id: `item-${index + 1}`,
        operation_id: `operation-${index + 1}`,
        operation: 'edit' as const,
        source_beat_ids: [source.id],
        reason: `Improve pacing around page ${source.page_target}.`,
        summary: `${source.text} The consequence now lands before the next escalation.`,
      };
    });
    const plan: PacingRevisionPlan = {
      items: operations.map((operation, index) => ({
        item_id: operation.item_id,
        title: `Pacing intent ${index + 1}`,
        rationale: operation.reason,
        affected_page_numbers: [sourceBeats[index * 8]!.page_target],
      })),
      operations,
    };

    const result = buildPacingRevisionOutlinePreview(plan, input);

    expect(result.patch.proposal.page_beats).toHaveLength(70);
    expect(result.patch.manifest.entries.flatMap((entry) => entry.source_beat_ids)).toHaveLength(70);
    expect(result.outlineChanges).toHaveLength(8);
  });

  it('merges overlapping item ownership before deriving child changes', () => {
    const result = buildPacingRevisionOutlinePreview({
      items: [
        {
          item_id: 'item-a',
          title: 'Delay reveal',
          rationale: 'Let tension build.',
          affected_page_numbers: [10, 11],
        },
        {
          item_id: 'item-b',
          title: 'Tighten negotiation',
          rationale: 'Avoid a duplicate turn.',
          affected_page_numbers: [11, 12],
        },
      ],
      operations: [],
    }, input);

    expect(result.items).toEqual([expect.objectContaining({
      item_id: 'item-a',
      affected_page_numbers: [10, 11, 12],
      title: 'Delay reveal / Tighten negotiation',
    })]);
  });

  it('rejects invalid and cosmetic operations without losing source beats', () => {
    const result = buildPacingRevisionOutlinePreview({
      items: [{
        item_id: 'item-a',
        title: 'Review opening',
        rationale: 'Test invalid changes.',
        affected_page_numbers: [1],
      }],
      operations: [
        {
          item_id: 'item-a',
          operation_id: 'unknown',
          operation: 'edit',
          source_beat_ids: ['missing'],
          summary: 'Unknown source.',
        },
        {
          item_id: 'item-a',
          operation_id: 'cosmetic',
          operation: 'edit',
          source_beat_ids: ['source-1'],
          summary: sourceBeats[0]!.text,
        },
      ],
    }, input);

    expect(result.patch.proposal.page_beats).toHaveLength(70);
    expect(result.patch.operation_notices.map((notice) => notice.code)).toEqual([
      'unknown_source_beat',
      'no_material_change',
    ]);
    expect(result.outlineChanges).toEqual([]);
  });

  it('requires revision item linkage and forbids replacement outlines in the prompt', () => {
    const prompt = buildPacingRevisionOutlinePrompt({
      ...input,
      pacingReview: { overall_pacing: 'The midpoint arrives too early.' },
    });

    expect(prompt).toContain('Every operation must include item_id');
    expect(prompt).toContain('Do not return a replacement outline');
    expect(prompt).toContain('The midpoint arrives too early.');
  });
});
