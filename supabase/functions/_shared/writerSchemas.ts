/**
 * Keep in sync with src/shared/writer/schemas.ts (Edge runtime cannot import app src).
 */
import { z } from 'npm:zod@3.24.2';

/** Must match src/shared/writer/schemas.ts */
export const WRITER_PAGE_BEATS_ISSUE_MAX = 5;

const issueOutlineActSchema = z.object({
  name: z.string().optional(),
  goal: z.string().optional(),
  summary: z.string().optional(),
});

const issueOutlinePageBeatSchema = z.object({
  page_target: z.number().int().positive().max(500).optional(),
  scene: z.string().optional(),
  summary: z.string(),
  emotional_turn: z.string().optional(),
});

export const issueOutlineSchema = z
  .object({
    title: z.string().optional(),
    premise: z.string().optional(),
    acts: z.array(issueOutlineActSchema).max(20).optional(),
    page_beats: z.array(issueOutlinePageBeatSchema).max(200).optional(),
    notes: z.string().optional(),
  })
  .passthrough();

export const writerToolsOutlineIssueRequestSchema = z.object({
  mode: z.literal('outline_issue'),
  issue_id: z.string().uuid(),
  target_page_count: z.number().int().positive().max(200).optional(),
  outline_supplement: z.string().max(8000).optional(),
});

const pageBeatPanelSchema = z.object({
  index: z.number().int().positive().max(99).optional(),
  action: z.string(),
  composition: z.string().optional(),
  emotion: z.string().optional(),
  dialogue_placeholder: z.string().optional(),
  sfx: z.string().optional(),
});

export const pageBeatsJsonSchema = z
  .object({
    page_number_ref: z.number().int().positive().max(500).optional(),
    one_line_hook: z.string().optional(),
    panels: z.array(pageBeatPanelSchema).min(1).max(24),
  })
  .passthrough();

export const writerToolsPageBeatsRequestSchema = z.object({
  mode: z.literal('page_beats'),
  page_id: z.string().uuid(),
  /** Optional; only used for page_beats — layout, spreads, tone. */
  director_notes_for_beats: z.string().max(4000).optional(),
});

/** Refine on the array (not the object) so the request stays a ZodObject for discriminatedUnion. */
const writerToolsPageBeatsIssuePageIdsSchema = z
  .array(z.string().uuid())
  .max(WRITER_PAGE_BEATS_ISSUE_MAX)
  .refine((ids) => ids.length === 0 || new Set(ids).size === ids.length, {
    message: 'page_ids must not contain duplicates',
  });

export const writerToolsPageBeatsIssueRequestSchema = z.object({
  mode: z.literal('page_beats_issue'),
  issue_id: z.string().uuid(),
  skip_existing: z.boolean().optional(),
  /** Pages per request when not using page_ids. Max 5 — keep low for worker limits. */
  batch_limit: z.number().int().min(1).max(WRITER_PAGE_BEATS_ISSUE_MAX).optional(),
  /** When skip_existing is false, next slice start in page_number order. Ignored when skip_existing is true or page_ids is set. */
  batch_offset: z.number().int().min(0).max(500).optional(),
  director_notes_for_beats: z.string().max(4000).optional(),
  page_ids: writerToolsPageBeatsIssuePageIdsSchema.optional(),
});

export const draftDialogueResultSchema = z
  .object({
    script_text: z.string(),
  })
  .passthrough();

export const writerToolsDraftDialogueRequestSchema = z.object({
  mode: z.literal('draft_dialogue'),
  page_id: z.string().uuid(),
  style: z.enum(['comic_script', 'screenplay_light']).optional(),
});

export const pacingLengthAlignmentSchema = z
  .object({
    /** Echo of the planning target provided by the user (if any). */
    target_pages: z.number().int().min(0).max(500).optional(),
    /** Echo of current DB page rows count. */
    script_pages: z.number().int().min(0).max(500),
    /** Echo of outline beat count derived from the latest outline. */
    outline_beats: z.number().int().min(0).max(500),

    /**
     * Editorial recommendation derived from the outline: either a tight range
     * (min/max) or a single exact page count (exact).
     */
    recommended_pages: z.union([
      z.object({ exact: z.number().int().min(1).max(500) }),
      z.object({ min: z.number().int().min(1).max(500), max: z.number().int().min(1).max(500) }),
    ]),

    /** High-level guidance when a target was provided. */
    recommended_action: z.enum(['change_target', 'cut_beats', 'add_beats', 'keep_target']).optional(),

    /** Positive = add pages; negative = trim pages (estimate toward strong pacing / score 10). */
    suggested_page_delta: z.number().int().min(-200).max(200),
    suggested_beat_delta: z.number().int().min(-200).max(200).optional(),

    /** Concrete suggestions for fitting target: plain-text, deterministic bullets. */
    cut_suggestions: z.array(z.string()).max(24).optional(),
    add_suggestions: z.array(z.string()).max(24).optional(),

    /** Optional assumptions the model used (panel density, spread moments, etc.). */
    assumptions: z.array(z.string()).max(24).optional(),

    rationale: z.string().max(4000),
  })
  .passthrough();

export const pacingReviewResultSchema = z
  .object({
    overall_pacing: z.string(),
    score_1_to_10: z.number().int().min(1).max(10).optional(),
    strengths: z.array(z.string()).max(24).optional(),
    risks: z.array(z.string()).max(24).optional(),
    page_level_notes: z
      .array(
        z.object({
          page_number: z.number().int().positive().max(500),
          note: z.string(),
        }),
      )
      .max(200)
      .optional(),
    suggestions: z.array(z.string()).max(24).optional(),
    length_alignment: pacingLengthAlignmentSchema,
  })
  .passthrough();

export const writerToolsPacingReviewRequestSchema = z.object({
  mode: z.literal('pacing_review'),
  issue_id: z.string().uuid(),
  target_page_count: z.number().int().min(1).max(500).optional(),
});

export const canonCheckResultSchema = z
  .object({
    summary: z.string(),
    violations: z
      .array(
        z.object({
          severity: z.enum(['low', 'medium', 'high']),
          detail: z.string(),
          suggestion: z.string().optional(),
        }),
      )
      .max(48)
      .optional(),
    aligned_elements: z.array(z.string()).max(48).optional(),
  })
  .passthrough();

export const writerToolsCanonCheckRequestSchema = z.object({
  mode: z.literal('canon_check'),
  issue_id: z.string().uuid(),
});

const shotPlanShotSchema = z.object({
  shot_index: z.number().int().positive().max(999),
  scene_ref: z.string().max(500).optional(),
  shot_type: z.string().max(120).optional(),
  description: z.string(),
  duration_seconds: z.number().positive().max(3600).optional(),
  audio_notes: z.string().max(2000).optional(),
});

export const shotPlanJsonSchema = z
  .object({
    title: z.string().max(500).optional(),
    shots: z.array(shotPlanShotSchema).min(1).max(120),
  })
  .passthrough();

export const writerToolsPlanShotsRequestSchema = z.object({
  mode: z.literal('plan_shots_from_issue'),
  issue_id: z.string().uuid(),
  creative_brief: z.string().max(4000).optional(),
});

/** LLM output for `idea_assist` (non-persisted brainstorming / analysis). */
export const ideaAssistResultSchema = z
  .object({
    answer_markdown: z.string().max(24_000),
    title: z.string().max(200).optional(),
    bullets: z.array(z.string().max(2000)).max(48).optional(),
    next_steps: z.array(z.string().max(2000)).max(24).optional(),
    risks: z.array(z.string().max(2000)).max(24).optional(),
  })
  .passthrough();

export const writerToolsIdeaAssistRequestSchema = z.object({
  mode: z.literal('idea_assist'),
  issue_id: z.string().uuid(),
  prompt: z.string().min(1).max(12_000),
  include_left: z.boolean().optional(),
  include_middle: z.boolean().optional(),
  include_right: z.boolean().optional(),
  context_left: z.string().max(16_000).optional(),
  context_middle: z.string().max(16_000).optional(),
  context_right: z.string().max(16_000).optional(),
  page_id: z.string().uuid().optional(),
});

export const guidedComicAssistActionSchema = z.enum([
  'improve_premise',
  'suggest_genre_tone',
  'generate_story_foundation',
  'suggest_conflict_stakes_ending',
  'suggest_character_dynamics',
  'generate_issue_outline',
  'generate_page_plan',
  'generate_missing_page_summaries',
  'regenerate_selected_page',
  'generate_panel_beats',
  'suggest_reference_needs',
  'strengthen_panel_prompt',
  'suggest_shot_direction',
  'suggest_layout_pacing',
  'recommend_layouts',
  'review_readiness',
  'find_export_gaps',
]);

export const guidedComicAssistContextSchema = z
  .object({
    currentStep: z.enum(['setup', 'story', 'pages', 'visual-prep', 'art', 'layout', 'export']),
    setupForm: z.record(z.unknown()),
    storyForm: z.record(z.unknown()),
    artDirection: z.record(z.unknown()),
    outlineBeats: z.array(z.unknown()).max(24),
    pageCards: z.array(z.unknown()).max(80),
    selectedPage: z.unknown().optional(),
    selectedPanel: z.unknown().optional(),
    referenceCounts: z
      .object({
        characters: z.number().int().min(0).max(500),
        locations: z.number().int().min(0).max(500),
        npcs: z.number().int().min(0).max(500),
      })
      .optional(),
    missingReferences: z.array(z.string().max(500)).max(200).optional(),
    pacingChecks: z.array(z.unknown()).max(40).optional(),
  })
  .passthrough();

export const writerToolsGuidedComicAssistRequestSchema = z
  .object({
    mode: z.literal('guided_comic_assist'),
    action: guidedComicAssistActionSchema,
    context: guidedComicAssistContextSchema,
    selectedPageNumber: z.number().int().positive().max(500).optional(),
    selectedPanelId: z.string().max(200).optional(),
  })
  .strict();

const guidedComicFieldReplacementSchema = z.object({
  setupForm: z.record(z.string()).optional(),
  storyForm: z.record(z.string()).optional(),
  artDirection: z.record(z.union([z.string(), z.boolean()])).optional(),
});

const guidedComicOutlineBeatSuggestionSchema = z.object({
  id: z.string().max(120).optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(4000),
});

const guidedComicPageUpdateSchema = z.object({
  pageNumber: z.number().int().positive().max(500),
  summary: z.string().max(4000).optional(),
  panelCount: z.string().max(20).optional(),
  keyCharacters: z.string().max(2000).optional(),
  keyLocation: z.string().max(2000).optional(),
  panelBeats: z.array(z.string().max(2000)).max(24).optional(),
  layoutTemplate: z
    .enum(['auto', 'three-panel', 'three-panel-wide-top', 'three-panel-wide-bottom', 'four-panel', 'six-panel-grid', 'splash'])
    .optional(),
  layoutIntent: z.enum(['feature', 'wide', 'tall', 'normal']).optional(),
});

function normalizeGuidedComicNote(note: unknown): string {
  if (typeof note === 'string') return note;
  if (!note || typeof note !== 'object' || Array.isArray(note)) return String(note ?? '');

  const record = note as Record<string, unknown>;
  const preferredKeys = ['note', 'detail', 'suggestion', 'summary', 'text', 'reason', 'title'];
  const parts = preferredKeys
    .map((key) => record[key])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  if (parts.length > 0) return parts.join(' - ');
  return JSON.stringify(record);
}

const guidedComicNoteSchema = z
  .union([z.string(), z.record(z.unknown())])
  .transform(normalizeGuidedComicNote)
  .pipe(z.string().max(2000));

export const guidedComicAssistResultSchema = z
  .object({
    title: z.string().max(200).optional(),
    summary: z.string().max(4000).optional(),
    suggestions: z.array(z.string().max(2000)).max(48).optional(),
    replacements: guidedComicFieldReplacementSchema.optional(),
    outlineBeats: z.array(guidedComicOutlineBeatSuggestionSchema).max(24).optional(),
    pageUpdates: z.array(guidedComicPageUpdateSchema).max(80).optional(),
    pacingNotes: z.array(guidedComicNoteSchema).max(48).optional(),
    referenceNeeds: z
      .array(
        z.object({
          type: z.enum(['character', 'location', 'npc', 'prop', 'style']),
          name: z.string().max(200),
          reason: z.string().max(1000).optional(),
        }),
      )
      .max(80)
      .optional(),
    dialogueNotes: z.array(guidedComicNoteSchema).max(48).optional(),
    narrationNotes: z.array(guidedComicNoteSchema).max(48).optional(),
  })
  .passthrough();

export const writerToolsRequestSchema = z.discriminatedUnion('mode', [
  writerToolsOutlineIssueRequestSchema,
  writerToolsPageBeatsRequestSchema,
  writerToolsPageBeatsIssueRequestSchema,
  writerToolsDraftDialogueRequestSchema,
  writerToolsPacingReviewRequestSchema,
  writerToolsCanonCheckRequestSchema,
  writerToolsPlanShotsRequestSchema,
  writerToolsIdeaAssistRequestSchema,
  writerToolsGuidedComicAssistRequestSchema,
]);
