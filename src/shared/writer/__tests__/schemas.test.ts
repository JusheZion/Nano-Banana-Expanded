import { describe, expect, it } from 'vitest';
import {
  guidedComicAssistResultSchema,
  ideaAssistResultSchema,
  issueOutlineSchema,
  pageBeatsJsonSchema,
  pacingReviewResultSchema,
  shotPlanJsonSchema,
  writerToolsGuidedComicAssistRequestSchema,
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
      production_defaults: {
        medium_type: 'comic',
        narrative_scope: 'single_issue',
        comic_panel_density: 'standard',
        art_style: 'clean line art',
        character_consistency: 'strict',
        output_format: 'guided_comic_handoff',
        strict_canon: true,
        no_video_assumptions: true,
      },
    });
    expect(r).toMatchObject({
      mode: 'outline_issue',
      outline_supplement: 'Emphasize act breaks at pages 8 and 16.',
      production_defaults: {
        medium_type: 'comic',
        output_format: 'guided_comic_handoff',
        no_video_assumptions: true,
      },
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
      production_defaults: {
        medium_type: 'comic',
        comic_panel_density: 'dense',
        strict_canon: true,
        no_video_assumptions: true,
      },
    });
    expect(r).toMatchObject({
      mode: 'page_beats',
      page_id: id,
      director_notes_for_beats: 'Pages 3–4 spread; left page only.',
      production_defaults: {
        comic_panel_density: 'dense',
      },
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

  it('parses page_beats_issue with skip_existing and batch_limit up to 5', () => {
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

  it('parses page_beats_issue with page_ids', () => {
    const issueId = '550e8400-e29b-41d4-a716-446655440000';
    const p1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const p2 = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
    const r = writerToolsPageBeatsIssueRequestSchema.parse({
      mode: 'page_beats_issue',
      issue_id: issueId,
      page_ids: [p1, p2],
      skip_existing: true,
    });
    expect(r.page_ids).toEqual([p1, p2]);
  });

  it('rejects page_beats_issue duplicate page_ids', () => {
    const issueId = '550e8400-e29b-41d4-a716-446655440000';
    const p1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    expect(() =>
      writerToolsPageBeatsIssueRequestSchema.parse({
        mode: 'page_beats_issue',
        issue_id: issueId,
        page_ids: [p1, p1],
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
      production_defaults: {
        medium_type: 'comic',
        character_consistency: 'strict',
        no_video_assumptions: true,
      },
    });
    expect(r.style).toBe('comic_script');
    expect(r.production_defaults?.character_consistency).toBe('strict');
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
    expect(
      writerToolsRequestSchema.parse({ mode: 'pacing_review', issue_id: id, target_page_count: 24 }),
    ).toMatchObject({ target_page_count: 24 });
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
        production_defaults: {
          medium_type: 'comic',
          no_video_assumptions: true,
        },
      }),
    ).toMatchObject({
      mode: 'plan_shots_from_issue',
      creative_brief: 'Trailer tone',
      production_defaults: {
        no_video_assumptions: true,
      },
    });
  });

  it('parses idea_assist request', () => {
    const issueId = '550e8400-e29b-41d4-a716-446655440000';
    const pageId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const r = writerToolsRequestSchema.parse({
      mode: 'idea_assist',
      issue_id: issueId,
      page_id: pageId,
      prompt: 'Give 3 dialogue variants grounded in beats.',
      include_left: true,
      include_middle: false,
      include_right: true,
      context_left: 'LEFT',
      context_right: 'RIGHT',
    });
    expect(r).toMatchObject({
      mode: 'idea_assist',
      issue_id: issueId,
      page_id: pageId,
      include_middle: false,
    });
  });

  it('parses guided_comic_assist request without writer DB ids', () => {
    const r = writerToolsRequestSchema.parse({
      mode: 'guided_comic_assist',
      action: 'generate_page_plan',
      selectedPageNumber: 2,
      context: {
        currentStep: 'pages',
        setupForm: {
          seriesTitle: 'Astral City',
          issueTitle: 'Gate of the First Sun',
          issueNumber: '1',
          targetPageCount: '4',
          genre: 'Sci-fi',
          tone: 'Cinematic',
          premise: 'A city wakes beneath twin suns.',
        },
        storyForm: {
          premise: 'A city wakes beneath twin suns.',
          mainCharacters: 'Mara, Sol',
          conflict: 'The gate is unstable.',
          setting: 'Orbital city',
          endingGoal: 'Seal the gate.',
        },
        artDirection: {
          artStyle: 'clean line art',
          defaultAspectRatio: 'Match panel layout',
          renderingStyle: 'inked',
          colorMood: 'warm gold',
          lighting: 'sunrise',
          continuityNotes: '',
          excludeTextFromImages: true,
        },
        outlineBeats: [{ id: 'opening-hook', title: 'Opening Hook', description: 'Mara sees the gate.', locked: false }],
        pageCards: [{ pageNumber: 1, summary: 'Mara finds the gate.', panelCount: '4', keyCharacters: 'Mara', keyLocation: 'Gate', panelBeats: ['Wide shot'] }],
      },
    });

    expect(r).toMatchObject({ mode: 'guided_comic_assist', action: 'generate_page_plan', selectedPageNumber: 2 });
    if (r.mode !== 'guided_comic_assist') throw new Error('Expected guided_comic_assist');
    expect(() =>
      writerToolsGuidedComicAssistRequestSchema.parse({
        mode: 'guided_comic_assist',
        action: 'generate_page_plan',
        issue_id: '550e8400-e29b-41d4-a716-446655440000',
        context: r.context,
      }),
    ).toThrow();
  });

  it('allows guided comic character dynamics assistance during story intake', () => {
    const r = writerToolsGuidedComicAssistRequestSchema.parse({
      mode: 'guided_comic_assist',
      action: 'suggest_character_dynamics',
      context: {
        currentStep: 'story',
        setupForm: {
          seriesTitle: 'Astral City',
          issueTitle: 'Gate of the First Sun',
          issueNumber: '1',
          targetPageCount: '4',
          genre: 'Sci-fi',
          tone: 'Cinematic',
          premise: 'A city wakes beneath twin suns.',
        },
        storyForm: {
          premise: 'A city wakes beneath twin suns.',
          mainCharacters: 'Mara, Sol',
          conflict: 'The gate is unstable.',
          setting: 'Orbital city',
          endingGoal: 'Seal the gate.',
        },
        artDirection: {
          artStyle: 'clean line art',
          defaultAspectRatio: 'Match panel layout',
          renderingStyle: 'inked',
          colorMood: 'warm gold',
          lighting: 'sunrise',
          continuityNotes: '',
          excludeTextFromImages: true,
        },
        outlineBeats: [],
        pageCards: [],
      },
    });

    expect(r.action).toBe('suggest_character_dynamics');
  });

  it('ideaAssistResultSchema requires answer_markdown', () => {
    const r = ideaAssistResultSchema.parse({
      answer_markdown: 'Here is the answer.',
      bullets: ['A', 'B'],
    });
    expect(r.answer_markdown).toContain('answer');
  });

  it('guidedComicAssistResultSchema accepts structured preview suggestions', () => {
    const r = guidedComicAssistResultSchema.parse({
      title: 'Page plan',
      summary: 'A tighter four-page plan.',
      suggestions: ['Clarify the midpoint turn.'],
      replacements: {
        setupForm: { premise: 'A stronger premise.' },
        storyForm: { conflict: 'The gate is collapsing.' },
      },
      outlineBeats: [{ id: 'opening-hook', title: 'Opening Hook', description: 'Start with the gate waking.' }],
      pageUpdates: [
        {
          pageNumber: 2,
          summary: 'Mara chooses to cross the gate.',
          panelCount: '4',
          keyCharacters: 'Mara',
          keyLocation: 'Gate bridge',
          panelBeats: ['Wide on gate', 'Close on Mara'],
        },
      ],
      pacingNotes: ['Act two needs a clearer turn.'],
      referenceNeeds: [{ type: 'location', name: 'Gate bridge', reason: 'Recurring setting.' }],
      dialogueNotes: ['Use captions sparingly.'],
    });

    expect(r.pageUpdates?.[0]?.pageNumber).toBe(2);
    expect(r.referenceNeeds?.[0]?.type).toBe('location');
  });

  it('guidedComicAssistResultSchema normalizes object-shaped notes', () => {
    const r = guidedComicAssistResultSchema.parse({
      title: 'Page plan',
      narrationNotes: [
        {
          note: 'Use one caption to bridge the time jump.',
          reason: 'Avoid overloading the first panel.',
        },
      ],
      dialogueNotes: [{ suggestion: 'Keep dialogue sparse.' }],
      pacingNotes: [{ detail: 'Page 3 needs a clearer visual turn.' }],
    });

    expect(r.narrationNotes?.[0]).toContain('Use one caption');
    expect(r.dialogueNotes?.[0]).toContain('Keep dialogue sparse');
    expect(r.pacingNotes?.[0]).toContain('Page 3');
  });

  it('pacingReviewResultSchema requires overall_pacing', () => {
    const r = pacingReviewResultSchema.parse({
      overall_pacing: 'Steady climb; act 2 sags slightly.',
      length_alignment: {
        script_pages: 20,
        outline_beats: 18,
        recommended_pages: { exact: 22 },
        suggested_page_delta: 2,
        suggested_beat_delta: 0,
        rationale: 'Recommend 22 pages for stronger act-two breathing room.',
      },
    });
    expect(r.overall_pacing).toContain('Steady');
  });

  it('pacingReviewResultSchema accepts length_alignment', () => {
    const r = pacingReviewResultSchema.parse({
      overall_pacing: 'Tight.',
      length_alignment: {
        target_pages: 22,
        script_pages: 20,
        outline_beats: 18,
        recommended_pages: { min: 21, max: 23 },
        recommended_action: 'keep_target',
        suggested_page_delta: 2,
        suggested_beat_delta: 0,
        rationale: 'Add two pages for act-two breathing room toward a 10.',
      },
    });
    expect(r.length_alignment?.suggested_page_delta).toBe(2);
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
