import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertPacingRevisionProposalReachesTarget,
  buildPacingRevisionOutlinePreview,
  buildPacingRevisionOutlinePrompt,
  derivePacingRevisionExpansionTarget,
  pacingRevisionAllowedPageRange,
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

const structuralSourceBeats = Array.from({ length: 4 }, (_, index) => ({
  id: `structural-${index + 1}`,
  ordinal: index + 1,
  page_target: index + 1,
  text: `Structural event ${index + 1} reaches outcome ${index + 1}.`,
}));
const structuralInput = {
  treatmentMode: 'structure' as const,
  sourcePageCount: 4,
  allowedPageRange: { min: 3, max: 5 },
  sourceBeats: structuralSourceBeats,
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

  it('does not persist overlapping model ownership claims without accepted changes', () => {
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

    expect(result.items).toEqual([]);
  });

  it('drops model item pages that have no accepted deterministic Outline change', () => {
    const result = buildPacingRevisionOutlinePreview({
      items: [
        {
          item_id: 'item-backed',
          title: 'Strengthen the opening',
          rationale: 'Land the consequence.',
          affected_page_numbers: [199],
        },
        {
          item_id: 'item-unbacked',
          title: 'Invent a future page',
          rationale: 'Attempt unsupported ownership.',
          affected_page_numbers: [72],
        },
      ],
      operations: [
        {
          item_id: 'item-backed',
          operation_id: 'accepted-edit',
          operation: 'edit',
          source_beat_ids: ['source-1'],
          reason: 'Make the first consequence arrive earlier.',
          summary: 'Story event 1 reaches outcome 1, forcing an immediate costly response.',
        },
        {
          item_id: 'item-unbacked',
          operation_id: 'rejected-edit',
          operation: 'edit',
          source_beat_ids: ['missing-source'],
          reason: 'This must not authorize page 72.',
          summary: 'Unsupported future event.',
        },
      ],
    }, input);

    expect(result.items).toEqual([
      expect.objectContaining({
        item_id: 'item-backed',
        affected_page_numbers: [1],
      }),
    ]);
    expect(result.outlineChanges.map((change) => change.item_id)).toEqual(['item-backed']);
  });

  it('derives a future item page from an accepted deterministic add instead of model claims', () => {
    const result = buildPacingRevisionOutlinePreview({
      items: [{
        item_id: 'item-future',
        title: 'Add a denouement',
        rationale: 'Give the ending room.',
        affected_page_numbers: [199],
      }],
      operations: [{
        item_id: 'item-future',
        operation_id: 'accepted-add',
        operation: 'add',
        source_beat_ids: [],
        anchor_source_beat_id: 'source-70',
        placement: 'after',
        reason: 'Add one connective ending beat.',
        summary: 'The survivors absorb the final cost before choosing what comes next.',
      }],
    }, {
      ...input,
      allowedPageRange: { min: 70, max: 71 },
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        item_id: 'item-future',
        affected_page_numbers: [71],
      }),
    ]);
    expect(result.outlineChanges).toEqual([
      expect.objectContaining({
        item_id: 'item-future',
        page_number: 71,
      }),
    ]);
  });

  it('derives every changed page when a source beat moves from page 2 to page 4', () => {
    const result = buildPacingRevisionOutlinePreview({
      items: [{
        item_id: 'item-move',
        title: 'Delay the second event',
        rationale: 'Let the other beats land first.',
        affected_page_numbers: [4],
      }],
      operations: [{
        item_id: 'item-move',
        operation_id: 'move-2-to-4',
        operation: 'move',
        source_beat_ids: ['structural-2'],
        anchor_source_beat_id: 'structural-4',
        placement: 'after',
        reason: 'Delay event 2 until after event 4.',
      }],
    }, structuralInput);

    expect(result.items).toEqual([
      expect.objectContaining({
        item_id: 'item-move',
        affected_page_numbers: [2, 3, 4],
      }),
    ]);
  });

  it('derives the changed combine page and every later shifted source page', () => {
    const result = buildPacingRevisionOutlinePreview({
      items: [{
        item_id: 'item-combine',
        title: 'Combine the middle turn',
        rationale: 'Remove a redundant transition.',
        affected_page_numbers: [2],
      }],
      operations: [{
        item_id: 'item-combine',
        operation_id: 'combine-2-3',
        operation: 'combine',
        source_beat_ids: ['structural-2', 'structural-3'],
        reason: 'Combine the related middle events.',
        summary: 'Structural events 2 and 3 reach their outcomes in one escalating turn.',
      }],
    }, structuralInput);

    expect(result.items).toEqual([
      expect.objectContaining({
        item_id: 'item-combine',
        affected_page_numbers: [2, 3, 4],
      }),
    ]);
  });

  it('derives a mid-outline insertion page and every later shifted or future page', () => {
    const result = buildPacingRevisionOutlinePreview({
      items: [{
        item_id: 'item-add',
        title: 'Add connective escalation',
        rationale: 'Bridge the middle turns.',
        affected_page_numbers: [3],
      }],
      operations: [{
        item_id: 'item-add',
        operation_id: 'add-after-2',
        operation: 'add',
        source_beat_ids: [],
        anchor_source_beat_id: 'structural-2',
        placement: 'after',
        reason: 'Add the missing connective event.',
        summary: 'A new complication forces the third event onto a later page.',
      }],
    }, structuralInput);

    expect(result.items).toEqual([
      expect.objectContaining({
        item_id: 'item-add',
        affected_page_numbers: [3, 4, 5],
      }),
    ]);
  });

  it('preserves one-page ownership for a wording edit', () => {
    const result = buildPacingRevisionOutlinePreview({
      items: [{
        item_id: 'item-edit',
        title: 'Strengthen page 2',
        rationale: 'Clarify the consequence.',
        affected_page_numbers: [99],
      }],
      operations: [{
        item_id: 'item-edit',
        operation_id: 'edit-page-2',
        operation: 'edit',
        source_beat_ids: ['structural-2'],
        reason: 'Clarify event 2.',
        summary: 'Structural event 2 reaches outcome 2 and immediately costs the hero an ally.',
      }],
    }, structuralInput);

    expect(result.items).toEqual([
      expect.objectContaining({
        item_id: 'item-edit',
        affected_page_numbers: [2],
      }),
    ]);
  });

  it('preserves contiguous future ownership for an append-only 71-to-85 expansion', () => {
    const expansionSourceBeats = Array.from({ length: 71 }, (_, index) => ({
      id: `expansion-${index + 1}`,
      ordinal: index + 1,
      page_target: index + 1,
      text: `Expansion event ${index + 1} reaches outcome ${index + 1}.`,
    }));
    const result = buildPacingRevisionOutlinePreview({
      items: [{
        item_id: 'item-expansion',
        title: 'Expand the ending',
        rationale: 'Give the denouement fourteen pages.',
        affected_page_numbers: [72],
      }],
      operations: Array.from({ length: 14 }, (_, index) => ({
        item_id: 'item-expansion',
        operation_id: `append-${index + 72}`,
        operation: 'add' as const,
        source_beat_ids: [],
        anchor_source_beat_id: 'expansion-71',
        placement: 'after' as const,
        reason: `Add ending beat ${index + 72}.`,
        summary: `The ending develops consequence ${index + 72} before the final choice.`,
      })),
    }, {
      treatmentMode: 'structure',
      sourcePageCount: 71,
      allowedPageRange: { min: 71, max: 85 },
      sourceBeats: expansionSourceBeats,
      protectedTerms: [],
    });

    expect(result.patch.proposal.page_beats).toHaveLength(85);
    expect(result.items).toEqual([
      expect.objectContaining({
        item_id: 'item-expansion',
        affected_page_numbers: Array.from({ length: 14 }, (_, index) => index + 72),
      }),
    ]);
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
      expansionTarget: null,
    });

    expect(prompt).toContain('Every operation must include item_id');
    expect(prompt).toContain('Do not return a replacement outline');
    expect(prompt).toContain('The midpoint arrives too early.');
  });

  it('derives an exact 71-to-85 expansion target and expands the allowed range', () => {
    const pacingReview = {
      length_alignment: {
        recommended_pages: { exact: 85 },
      },
    };

    const target = derivePacingRevisionExpansionTarget(pacingReview, 71);

    expect(target).toBe(85);
    expect(pacingRevisionAllowedPageRange(71, target)).toEqual({ min: 71, max: 85 });
  });

  it('uses the established deterministic range target and ignores contraction', () => {
    expect(derivePacingRevisionExpansionTarget({
      length_alignment: { recommended_pages: { min: 85, max: 82 } },
    }, 71)).toBe(82);
    expect(derivePacingRevisionExpansionTarget({
      length_alignment: { recommended_pages: { min: 68, max: 74 } },
    }, 71)).toBeNull();
    expect(derivePacingRevisionExpansionTarget({
      length_alignment: { recommended_pages: { exact: 65 } },
    }, 71)).toBeNull();
  });

  it('clamps an expansion recommendation to the supported 200-page maximum', () => {
    expect(derivePacingRevisionExpansionTarget({
      length_alignment: { recommended_pages: { exact: 250 } },
    }, 71)).toBe(200);
  });

  it('never allows the pacing proposal to delete source pages', () => {
    expect(pacingRevisionAllowedPageRange(71, null)).toEqual({ min: 71, max: 79 });
  });

  it('requires the prompt to materialize sequential page beats through the expansion target', () => {
    const prompt = buildPacingRevisionOutlinePrompt({
      ...input,
      allowedPageRange: { min: 63, max: 85 },
      pacingReview: {
        length_alignment: { recommended_pages: { exact: 85 } },
      },
      expansionTarget: 85,
    });

    expect(prompt).toContain('exactly 85 sequential page beats');
    expect(prompt).toContain('page_target 1 through 85');
  });

  it('rejects a deterministic proposal that stops before the expansion target', () => {
    const underfilledProposal = {
      page_beats: Array.from({ length: 84 }, (_, index) => ({
        page_target: index + 1,
        summary: `Beat ${index + 1}`,
      })),
    };

    expect(() => assertPacingRevisionProposalReachesTarget(
      underfilledProposal,
      85,
    )).toThrow('sequential page beats through page 85');
  });

  it('rejects a deterministic proposal with a page-number gap before the target', () => {
    const gappedProposal = {
      page_beats: Array.from({ length: 85 }, (_, index) => ({
        page_target: index === 71 ? 73 : index + 1,
        summary: `Beat ${index + 1}`,
      })),
    };

    expect(() => assertPacingRevisionProposalReachesTarget(
      gappedProposal,
      85,
    )).toThrow('sequential page beats through page 85');
  });

  it('accepts a deterministic proposal with sequential page beats through the target', () => {
    const completeProposal = {
      page_beats: Array.from({ length: 85 }, (_, index) => ({
        page_target: index + 1,
        summary: `Beat ${index + 1}`,
      })),
    };

    expect(() => assertPacingRevisionProposalReachesTarget(
      completeProposal,
      85,
    )).not.toThrow();
  });

  it('wires the saved expansion target into the outline-preview handler', () => {
    const indexSource = readFileSync(
      join(process.cwd(), 'supabase/functions/writer-tools/index.ts'),
      'utf8',
    );
    const branchStart = indexSource.indexOf("parsedReq.data.mode === 'pacing_revision_outline_preview'");
    const branchEnd = indexSource.indexOf("parsedReq.data.mode === 'pacing_revision_page_preview'", branchStart);
    const outlineBranch = indexSource.slice(branchStart, branchEnd);

    expect(outlineBranch).toContain('derivePacingRevisionExpansionTarget');
    expect(outlineBranch).toContain('pacingRevisionAllowedPageRange');
    expect(outlineBranch).toContain('expansionTarget');
    expect(outlineBranch).toContain('assertPacingRevisionProposalReachesTarget');
  });
});
