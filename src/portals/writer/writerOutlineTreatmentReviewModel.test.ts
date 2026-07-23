import { describe, expect, it } from 'vitest';
import type { TreatmentProposalSession } from './writerOutlineTreatmentValidation';
import {
  buildOutlineTreatmentReviewItems,
  normalizeOutlineReviewText,
} from './writerOutlineTreatmentReviewModel';

function makeSession(): TreatmentProposalSession {
  return {
    mode: 'structure',
    source: {
      pageCount: 3,
      protectedTerms: [],
      beats: [
        {
          id: 'beat-opening',
          ordinal: 1,
          pageTarget: 1,
          text: 'Page 1\\tOpening scene',
          original: { page_target: 1, summary: 'Page 1\tOpening scene' },
        },
        {
          id: 'beat-middle',
          ordinal: 2,
          pageTarget: 2,
          text: 'Page 2\tMiddle scene',
          original: { page_target: 2, summary: 'Page 2\tMiddle scene' },
        },
        {
          id: 'beat-ending',
          ordinal: 3,
          pageTarget: 3,
          text: 'Page 3\tEnding scene',
          original: { page_target: 3, summary: 'Page 3\tEnding scene' },
        },
      ],
      outline: {},
    },
    proposal: {
      page_beats: [
        { treatment_beat_id: 'beat-opening', page_target: 1, summary: 'Page 1\tOpening scene' },
        { treatment_beat_id: 'edit-middle', page_target: 2, summary: 'A polished middle scene' },
        { treatment_beat_id: 'beat-ending', page_target: 3, summary: 'Page 3\tEnding scene' },
      ],
    },
    manifest: {
      treatmentMode: 'structure',
      sourcePageCount: 3,
      proposedPageCount: 3,
      entries: [
        {
          resultBeatId: 'beat-opening',
          sourceBeatIds: ['beat-opening'],
          changeType: 'unchanged',
          originalPages: [1],
          proposedPage: 1,
          reason: 'Source beat retained.',
        },
        {
          resultBeatId: 'edit-middle',
          sourceBeatIds: ['beat-middle'],
          changeType: 'language_polished',
          originalPages: [2],
          proposedPage: 2,
          reason: 'Clarify the middle.',
        },
        {
          resultBeatId: 'beat-ending',
          sourceBeatIds: ['beat-ending'],
          changeType: 'unchanged',
          originalPages: [3],
          proposedPage: 3,
          reason: 'Source beat retained.',
        },
      ],
    },
    operationNotices: [{
      operationId: 'rejected-ending',
      status: 'rejected',
      code: 'source_event_mismatch',
      message: 'The original beat was retained.',
      sourceBeatIds: ['beat-ending'],
      proposed: { summary: 'An unrelated replacement ending' },
    }],
  };
}

describe('outline treatment review model', () => {
  it('normalizes actual and escaped tabs for presentation', () => {
    expect(normalizeOutlineReviewText('Page 1\tOpening')).toBe('Page 1 Opening');
    expect(normalizeOutlineReviewText('Page 1\\tOpening')).toBe('Page 1 Opening');
  });

  it('orders page-aware accepted, rejected, and unchanged items chronologically', () => {
    const items = buildOutlineTreatmentReviewItems(makeSession());

    expect(items.map((item) => [item.page, item.status])).toEqual([
      [1, 'unchanged'],
      [2, 'accepted'],
      [3, 'rejected'],
      [3, 'unchanged'],
    ]);
    expect(items[1]).toMatchObject({
      changeLabel: 'Wording polished',
      original: { summary: 'Page 2 Middle scene' },
      proposed: { summary: 'A polished middle scene' },
      reason: 'Clarify the middle.',
    });
    expect(items[2]).toMatchObject({
      changeLabel: 'Change not applied',
      original: { summary: 'Page 3 Ending scene' },
      proposed: { summary: 'An unrelated replacement ending' },
      reason: 'The original beat was retained.',
    });
  });

  it('keeps missing source mappings visible without exposing a false page', () => {
    const session = makeSession();
    session.operationNotices = [{
      operationId: 'missing-source',
      status: 'rejected',
      code: 'unknown_source_beat',
      message: 'The referenced beat was unavailable.',
      sourceBeatIds: ['missing'],
      proposed: { summary: 'Attempted text' },
    }];

    expect(buildOutlineTreatmentReviewItems(session).at(-1)).toMatchObject({
      page: null,
      status: 'rejected',
      original: null,
      proposed: { summary: 'Attempted text' },
    });
  });
});
