import { describe, expect, it } from 'vitest';
import { applyOutlineTreatmentPatches } from './outlineTreatmentPatch';

function makeInput(count: number, treatmentMode: 'preserve' | 'structure' | 'expand' = 'structure') {
  return {
    treatmentMode,
    sourcePageCount: count,
    allowedPageRange: treatmentMode === 'preserve'
      ? { min: count, max: count }
      : treatmentMode === 'structure'
        ? { min: Math.floor(count * 0.9), max: Math.ceil(count * 1.1) }
        : { min: Math.floor(count * 0.8), max: Math.ceil(count * 1.2) },
    sourceBeats: Array.from({ length: count }, (_, index) => ({
      id: `source-page-${index + 1}-${index + 1}`,
      ordinal: index + 1,
      page_target: index + 1,
      text: index === count - 1 ? 'The concluding campfire beat remains last.' : `Source event ${index + 1}.`,
    })),
    protectedTerms: [],
  };
}

describe('applyOutlineTreatmentPatches', () => {
  it('keeps untouched beats in place when AI returns only eight late-story edits', () => {
    const input = makeInput(70);
    const result = applyOutlineTreatmentPatches({
      operations: input.sourceBeats.slice(62).map((beat, index) => ({
        operation_id: `late-${index + 1}`,
        operation: 'edit' as const,
        source_beat_ids: [beat.id],
        reason: 'Polish the ending.',
        summary: `Polished ${beat.text}`,
      })),
    }, input);

    expect(result.proposal.page_beats).toHaveLength(70);
    expect(result.proposal.page_beats?.[0]?.summary).toBe(input.sourceBeats[0]?.text);
    expect(result.proposal.page_beats?.[61]?.summary).toBe(input.sourceBeats[61]?.text);
    expect(result.proposal.page_beats?.[62]?.summary).toBe(`Polished ${input.sourceBeats[62]?.text}`);
    expect(result.proposal.page_beats?.at(-1)?.summary).toBe(`Polished ${input.sourceBeats[69]?.text}`);
    expect(result.manifest.entries.flatMap((entry) => entry.source_beat_ids)).toEqual(
      input.sourceBeats.map((beat) => beat.id),
    );
  });

  it('applies explicit moves while retaining every source exactly once', () => {
    const input = makeInput(4);
    const result = applyOutlineTreatmentPatches({
      operations: [{
        operation_id: 'move-4',
        operation: 'move',
        source_beat_ids: [input.sourceBeats[3]!.id],
        anchor_source_beat_id: input.sourceBeats[1]!.id,
        placement: 'before',
        reason: 'Move the reveal earlier.',
      }],
    }, input);

    expect(result.proposal.page_beats?.map((beat) => beat.summary)).toEqual([
      'Source event 1.',
      'The concluding campfire beat remains last.',
      'Source event 2.',
      'Source event 3.',
    ]);
    expect(result.manifest.entries.flatMap((entry) => entry.source_beat_ids)).toEqual([
      input.sourceBeats[0]!.id,
      input.sourceBeats[3]!.id,
      input.sourceBeats[1]!.id,
      input.sourceBeats[2]!.id,
    ]);
  });

  it('combines sources in place and rejects a later conflicting edit', () => {
    const input = makeInput(4);
    input.allowedPageRange = { min: 3, max: 5 };
    const result = applyOutlineTreatmentPatches({
      operations: [
        {
          operation_id: 'combine-2-3',
          operation: 'combine',
          source_beat_ids: [input.sourceBeats[1]!.id, input.sourceBeats[2]!.id],
          reason: 'These events share one page.',
          summary: 'Combined middle events.',
        },
        {
          operation_id: 'edit-consumed',
          operation: 'edit',
          source_beat_ids: [input.sourceBeats[1]!.id],
          reason: 'Conflicting edit.',
          summary: 'This must not appear.',
        },
      ],
    }, input);

    expect(result.proposal.page_beats?.map((beat) => beat.summary)).toEqual([
      'Source event 1.',
      'Combined middle events.',
      'The concluding campfire beat remains last.',
    ]);
    expect(result.operation_notices.at(-1)).toMatchObject({
      operation_id: 'edit-consumed',
      status: 'rejected',
      code: 'conflicting_operation',
    });
  });

  it('inserts an added beat at its anchor and enforces the maximum page count', () => {
    const input = makeInput(3);
    input.allowedPageRange = { min: 2, max: 4 };
    const result = applyOutlineTreatmentPatches({
      operations: [
        {
          operation_id: 'add-valid',
          operation: 'add',
          source_beat_ids: [],
          anchor_source_beat_id: input.sourceBeats[0]!.id,
          placement: 'after',
          reason: 'Add a transition.',
          summary: 'A connective transition.',
        },
        {
          operation_id: 'add-overflow',
          operation: 'add',
          source_beat_ids: [],
          anchor_source_beat_id: input.sourceBeats[1]!.id,
          placement: 'after',
          reason: 'This exceeds the range.',
          summary: 'An excessive addition.',
        },
      ],
    }, input);

    expect(result.proposal.page_beats?.map((beat) => beat.summary)).toEqual([
      'Source event 1.',
      'A connective transition.',
      'Source event 2.',
      'The concluding campfire beat remains last.',
    ]);
    expect(result.operation_notices.at(-1)).toMatchObject({
      status: 'rejected',
      code: 'page_range_exceeded',
    });
  });

  it('rejects unknown, self-anchored, and preserve-forbidden operations without changing source', () => {
    const input = makeInput(3, 'preserve');
    const result = applyOutlineTreatmentPatches({
      operations: [
        {
          operation_id: 'unknown',
          operation: 'edit',
          source_beat_ids: ['missing'],
          reason: 'Unknown.',
          summary: 'Unknown edit.',
        },
        {
          operation_id: 'self-anchor',
          operation: 'move',
          source_beat_ids: [input.sourceBeats[0]!.id],
          anchor_source_beat_id: input.sourceBeats[0]!.id,
          placement: 'after',
          reason: 'Invalid anchor.',
        },
        {
          operation_id: 'forbidden-add',
          operation: 'add',
          source_beat_ids: [],
          anchor_source_beat_id: input.sourceBeats[0]!.id,
          placement: 'after',
          reason: 'Forbidden addition.',
          summary: 'Do not add.',
        },
      ],
    }, input);

    expect(result.proposal.page_beats?.map((beat) => beat.summary)).toEqual(
      input.sourceBeats.map((beat) => beat.text),
    );
    expect(result.operation_notices.map((notice) => notice.code)).toEqual([
      'unknown_source_beat',
      'self_anchor',
      'operation_forbidden',
    ]);
  });

  it('assigns unique result ids and sequential page targets', () => {
    const input = makeInput(3);
    const result = applyOutlineTreatmentPatches({ operations: [] }, input);
    const beats = result.proposal.page_beats ?? [];

    expect(beats.map((beat) => beat.page_target)).toEqual([1, 2, 3]);
    expect(new Set(beats.map((beat) => beat.treatment_beat_id)).size).toBe(3);
    expect(result.operation_notices).toEqual([]);
  });

  it('derives a useful explanation when AI omits the optional reason', () => {
    const input = makeInput(2);
    const result = applyOutlineTreatmentPatches({
      operations: [{
        operation_id: 'edit-without-reason',
        operation: 'edit',
        source_beat_ids: [input.sourceBeats[0]!.id],
        summary: 'Polished source event 1.',
      }],
    }, input);

    expect(result.manifest.entries[0]?.reason).toBe('Language and formatting updated.');
    expect(result.operation_notices[0]?.message).toBe('AI change applied.');
  });

  it('rejects an edit that rewrites a valid source id with a different event', () => {
    const input = makeInput(2);
    input.sourceBeats[1]!.text = [
      'Concluding campfire scene: The fire crackles, the stars shimmer,',
      'and the elder says the tale may begin again.',
    ].join(' ');

    const result = applyOutlineTreatmentPatches({
      operations: [{
        operation_id: 'wrong-ending-edit',
        operation: 'edit',
        source_beat_ids: [input.sourceBeats[1]!.id],
        reason: 'Polish the ending.',
        summary: [
          'The elder reveals that the tale is timeless and explains that Solfa and Kaleid',
          'return whenever humanity forgets itself.',
        ].join(' '),
      }],
    }, input);

    expect(result.proposal.page_beats?.at(-1)?.summary).toBe(input.sourceBeats[1]!.text);
    expect(result.operation_notices.at(-1)).toMatchObject({
      operation_id: 'wrong-ending-edit',
      status: 'rejected',
      code: 'source_event_mismatch',
      proposed: {
        summary: [
          'The elder reveals that the tale is timeless and explains that Solfa and Kaleid',
          'return whenever humanity forgets itself.',
        ].join(' '),
      },
    });
  });
});
