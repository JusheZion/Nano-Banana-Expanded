import { describe, expect, it } from 'vitest';
import {
  pacingRevisionChangeSchema,
  pacingRevisionSetSchema,
} from '../pacingRevisionSchemas';

const SET_ID = '10000000-0000-4000-8000-000000000001';
const ITEM_ID = '10000000-0000-4000-8000-000000000002';
const CHANGE_ID = '10000000-0000-4000-8000-000000000003';
const ISSUE_ID = '10000000-0000-4000-8000-000000000004';

describe('pacing revision schemas', () => {
  it('preserves current, AI, and edited candidate states independently', () => {
    const parsed = pacingRevisionChangeSchema.parse({
      id: CHANGE_ID,
      item_id: ITEM_ID,
      layer: 'beats',
      target_key: 'page:24:beats',
      page_number: 24,
      current_value: { panels: [{ action: 'Mara opens the letter.' }] },
      ai_proposal: { panels: [{ action: 'Mara pockets the letter.' }] },
      edited_candidate: { panels: [{ action: 'Mara hides the sealed letter.' }] },
      decision: 'approved',
      dependency_ids: [],
      source_fingerprint: 'sha256:source',
      generation_status: 'ready',
      reason: 'Delay the reveal until after the negotiation.',
    });

    expect(parsed.current_value).not.toEqual(parsed.ai_proposal);
    expect(parsed.edited_candidate).not.toEqual(parsed.ai_proposal);
    expect(parsed.decision).toBe('approved');
  });

  it('parses a resumable set with items, changes, progress, and failures', () => {
    const parsed = pacingRevisionSetSchema.parse({
      id: SET_ID,
      issue_id: ISSUE_ID,
      status: 'partially_ready',
      pacing_review_json: { overall_pacing: 'The midpoint arrives early.' },
      source_outline_json: { page_beats: [] },
      proposed_outline_json: { page_beats: [] },
      source_fingerprint: 'sha256:outline',
      progress_json: {
        total_pages: 6,
        completed_pages: [1, 2, 4, 5, 6],
        current_page: null,
        stopped: false,
      },
      failure_ledger: [{ page_number: 3, reason: 'Malformed model output' }],
      items: [{
        id: ITEM_ID,
        revision_set_id: SET_ID,
        position: 1,
        title: 'Delay midpoint reveal',
        rationale: 'Let the failed negotiation land first.',
        affected_page_numbers: [24],
        generation_status: 'ready',
        changes: [],
      }],
    });

    expect(parsed.progress_json.completed_pages).toEqual([1, 2, 4, 5, 6]);
    expect(parsed.failure_ledger[0]?.page_number).toBe(3);
  });

  it('rejects an edited candidate when the AI proposal is absent', () => {
    expect(() => pacingRevisionChangeSchema.parse({
      id: CHANGE_ID,
      item_id: ITEM_ID,
      layer: 'dialogue',
      target_key: 'page:24:dialogue',
      current_value: 'MARA: Open it.',
      edited_candidate: 'MARA: Not yet.',
      decision: 'pending',
      dependency_ids: [],
      source_fingerprint: 'sha256:source',
      generation_status: 'ready',
      reason: 'Delay the reveal.',
    })).toThrow();
  });
});
