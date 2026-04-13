import { z } from 'zod';

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

/** Validates LLM output before persisting to writer_issue_outlines.outline_json */
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
  /** Optional author notes appended to the outline prompt (e.g. coverage boost). Not stored on the issue row. */
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

/** Validates LLM output for writer_pages.beats_json */
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
  /** Optional; only sent to page_beats — not outline_issue. Layout / spread / pacing notes for the artist. */
  director_notes_for_beats: z.string().max(4000).optional(),
});

export const writerToolsPageBeatsIssueRequestSchema = z.object({
  mode: z.literal('page_beats_issue'),
  issue_id: z.string().uuid(),
  skip_existing: z.boolean().optional(),
  batch_limit: z.number().int().min(1).max(5).optional(),
  /** When skip_existing is false, 0-based index into the ordered page list for the next batch (regenerate-all pass). Ignored when skip_existing is true. */
  batch_offset: z.number().int().min(0).max(500).optional(),
  director_notes_for_beats: z.string().max(4000).optional(),
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

/** LLM output merged into writer_issues.notes.writer_tool_cache.pacing_review */
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
  })
  .passthrough();

export const writerToolsPacingReviewRequestSchema = z.object({
  mode: z.literal('pacing_review'),
  issue_id: z.string().uuid(),
});

/** LLM output merged into writer_issues.notes.writer_tool_cache.canon_check */
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

/** Persists to writer_video_shot_plans.shot_plan_json */
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

export const writerToolsRequestSchema = z.discriminatedUnion('mode', [
  writerToolsOutlineIssueRequestSchema,
  writerToolsPageBeatsRequestSchema,
  writerToolsPageBeatsIssueRequestSchema,
  writerToolsDraftDialogueRequestSchema,
  writerToolsPacingReviewRequestSchema,
  writerToolsCanonCheckRequestSchema,
  writerToolsPlanShotsRequestSchema,
]);

const writerToolsSuccessSchema = z.object({
  success: z.literal(true),
  mode: z.string(),
  data: z.unknown(),
  outline_id: z.string().uuid().optional(),
  version: z.number().int().optional(),
  page_id: z.string().uuid().optional(),
  issue_id: z.string().uuid().optional(),
  shot_plan_id: z.string().uuid().optional(),
});

const writerToolsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.string().optional(),
});

export const writerToolsResponseSchema = z.union([writerToolsSuccessSchema, writerToolsErrorSchema]);

export function parseWriterToolsResponse(raw: unknown): z.infer<typeof writerToolsResponseSchema> {
  return writerToolsResponseSchema.parse(raw);
}
