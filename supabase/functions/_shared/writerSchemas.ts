/**
 * Keep in sync with src/shared/writer/schemas.ts (Edge runtime cannot import app src).
 */
import { z } from 'npm:zod@3.24.2';

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

export const writerToolsPageBeatsIssueRequestSchema = z.object({
  mode: z.literal('page_beats_issue'),
  issue_id: z.string().uuid(),
  skip_existing: z.boolean().optional(),
  /** Pages to process per request (sequential LLM calls). Client may loop while has_more. */
  batch_limit: z.number().int().min(1).max(5).optional(),
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

export const writerToolsRequestSchema = z.discriminatedUnion('mode', [
  writerToolsOutlineIssueRequestSchema,
  writerToolsPageBeatsRequestSchema,
  writerToolsPageBeatsIssueRequestSchema,
  writerToolsDraftDialogueRequestSchema,
  writerToolsPacingReviewRequestSchema,
  writerToolsCanonCheckRequestSchema,
  writerToolsPlanShotsRequestSchema,
]);
