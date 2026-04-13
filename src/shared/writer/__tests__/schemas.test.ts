import { describe, expect, it } from 'vitest';
import {
  issueOutlineSchema,
  pageBeatsJsonSchema,
  pacingReviewResultSchema,
  shotPlanJsonSchema,
  writerToolsDraftDialogueRequestSchema,
  writerToolsOutlineIssueRequestSchema,
  writerToolsPageBeatsIssueRequestSchema,
  writerToolsPageBeatsRequestSchema,
  writerToolsRequestSchema,
} from '../schemas';

describe('issueOutlineSchema', () => {
  it('accepts minimal valid outline', () => {
    const parsed = issueOutlineSchema.parse({
      title: 'Issue 1',
      page_beats: [{ summary: 'Cold open' }],
    });
    expect(parsed.title).toBe('Issue 1');
    expect(parsed.page_beats).toHaveLength(1);
  });

  it('allows extra top-level keys (passthrough for LLM drift)', () => {
    const parsed = issueOutlineSchema.parse({
      title: 'X',
      extra: 1,
    });
    expect((parsed as { extra?: number }).extra).toBe(1);
  });
});

describe('writerToolsRequestSchema', () => {
  it('parses outline_issue', () => {
    const r = writerToolsRequestSchema.parse({
      mode: 'outline_issue',
      issue_id: '550e8400-e29b-41d4-a716-446655440000',
      target_page_count: 22,
    });
    expect(r).toMatchObject({ mode: 'outline_issue', target_page_count: 22 });
  });

  it('parses outline_issue with outline_supplement', () => {
    const r = writerToolsRequestSchema.parse({
      mode: 'outline_issue',
      issue_id: '550e8400-e29b-41d4-a716-446655440000',
      outline_supplement: 'Emphasize act breaks at pages 8 and 16.',
    });
    expect(r).toMatchObject({
      mode: 'outline_issue',
      outline_supplement: 'Emphasize act breaks at pages 8 and 16.',
    });
  });

  it('outline_issue rejects invalid uuid', () => {
    expect(() =>
      writerToolsOutlineIssueRequestSchema.parse({
        mode: 'outline_issue',
        issue_id: 'not-a-uuid',
      }),
    ).toThrow();
  });

  it('parses page_beats', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const r = writerToolsRequestSchema.parse({ mode: 'page_beats', page_id: id });
    expect(r).toMatchObject({ mode: 'page_beats', page_id: id });
  });

  it('parses page_beats with director_notes_for_beats', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const r = writerToolsRequestSchema.parse({
      mode: 'page_beats',
      page_id: id,
      director_notes_for_beats: 'Pages 3–4 spread; left page only.',
    });
    expect(r).toMatchObject({
      mode: 'page_beats',
      page_id: id,
      director_notes_for_beats: 'Pages 3–4 spread; left page only.',
    });
  });

  it('parses page_beats_issue with defaults', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const r = writerToolsRequestSchema.parse({
      mode: 'page_beats_issue',
      issue_id: id,
    });
    expect(r).toMatchObject({ mode: 'page_beats_issue', issue_id: id });
  });

  it('parses page_beats_issue with skip_existing and batch_limit', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const r = writerToolsPageBeatsIssueRequestSchema.parse({
      mode: 'page_beats_issue',
      issue_id: id,
      skip_existing: false,
      batch_limit: 5,
    });
    expect(r.batch_limit).toBe(5);
    expect(r.skip_existing).toBe(false);
  });

  it('rejects page_beats_issue batch_limit above server cap', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(() =>
      writerToolsPageBeatsIssueRequestSchema.parse({
        mode: 'page_beats_issue',
        issue_id: id,
        batch_limit: 8,
      }),
    ).toThrow();
  });

  it('parses page_beats_issue with batch_offset for full-regeneration batches', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const r = writerToolsPageBeatsIssueRequestSchema.parse({
      mode: 'page_beats_issue',
      issue_id: id,
      skip_existing: false,
      batch_limit: 5,
      batch_offset: 10,
    });
    expect(r.batch_offset).toBe(10);
  });

  it('parses page_beats_issue with director_notes_for_beats', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const r = writerToolsPageBeatsIssueRequestSchema.parse({
      mode: 'page_beats_issue',
      issue_id: id,
      director_notes_for_beats: 'Vary panel shapes; cinematic lighting.',
    });
    expect(r.director_notes_for_beats).toContain('lighting');
  });

  it('parses draft_dialogue', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const r = writerToolsDraftDialogueRequestSchema.parse({
      mode: 'draft_dialogue',
      page_id: id,
      style: 'comic_script',
    });
    expect(r.style).toBe('comic_script');
  });

  it('pageBeatsJsonSchema requires panels with action', () => {
    const p = pageBeatsJsonSchema.parse({
      panels: [{ action: 'Wide establishing shot' }],
    });
    expect(p.panels).toHaveLength(1);
  });

  it('parses pacing_review request', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(writerToolsRequestSchema.parse({ mode: 'pacing_review', issue_id: id })).toMatchObject({
      mode: 'pacing_review',
      issue_id: id,
    });
  });

  it('parses canon_check request', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(writerToolsRequestSchema.parse({ mode: 'canon_check', issue_id: id })).toMatchObject({
      mode: 'canon_check',
    });
  });

  it('parses plan_shots_from_issue request', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(
      writerToolsRequestSchema.parse({
        mode: 'plan_shots_from_issue',
        issue_id: id,
        creative_brief: 'Trailer tone',
      }),
    ).toMatchObject({ mode: 'plan_shots_from_issue', creative_brief: 'Trailer tone' });
  });

  it('pacingReviewResultSchema requires overall_pacing', () => {
    const r = pacingReviewResultSchema.parse({ overall_pacing: 'Steady climb; act 2 sags slightly.' });
    expect(r.overall_pacing).toContain('Steady');
  });

  it('shotPlanJsonSchema requires shots', () => {
    const s = shotPlanJsonSchema.parse({
      shots: [{ shot_index: 1, description: 'Wide on skyline' }],
    });
    expect(s.shots).toHaveLength(1);
  });
});

describe('writerToolsPageBeatsRequestSchema', () => {
  it('rejects invalid page uuid', () => {
    expect(() =>
      writerToolsPageBeatsRequestSchema.parse({ mode: 'page_beats', page_id: 'x' }),
    ).toThrow();
  });
});
