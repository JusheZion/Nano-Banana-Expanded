/**
 * Keep in sync with src/shared/writer/schemas.ts (Edge runtime cannot import app src).
 */
import { z } from 'npm:zod@3.24.2';

/** Must match src/shared/writer/schemas.ts */
export const WRITER_PAGE_BEATS_ISSUE_MAX = 5;
/** Must match src/shared/writer/schemas.ts */
export const WRITER_PAGE_BEATS_EDGE_INVOCATION_MAX = 1;

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
  treatment_beat_id: z.string().min(1).max(160).optional(),
});

export const writerProductionDefaultsPayloadSchema = z
  .object({
    medium_type: z.enum(['comic', 'book', 'screenplay', 'video', 'wiki']).optional(),
    narrative_scope: z
      .enum(['single_issue', 'multi_issue_arc', 'book', 'episode', 'shared_universe'])
      .optional(),
    comic_panel_density: z.enum(['sparse', 'standard', 'dense']).optional(),
    art_style: z.string().max(4000).optional(),
    character_consistency: z.enum(['standard', 'strict']).optional(),
    output_format: z
      .enum([
        'issue_pack_json',
        'comic_script_markdown',
        'guided_comic_handoff',
        'fountain_screenplay',
        'prose_manuscript',
        'lore_wiki',
      ])
      .optional(),
    strict_canon: z.boolean().optional(),
    no_video_assumptions: z.boolean().optional(),
  })
  .strict();

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
  save: z.boolean().optional(),
  target_page_count: z.number().int().positive().max(200).optional(),
  outline_supplement: z.string().max(8000).optional(),
  production_defaults: writerProductionDefaultsPayloadSchema.optional(),
});

const outlineClassificationPassageSchema = z.object({
  id: z.string().min(1).max(160),
  text: z.string().min(1).max(4000),
}).strict();

export const writerToolsOutlineClassificationPreviewRequestSchema = z.object({
  mode: z.literal('outline_classification_preview'),
  passages: z.array(outlineClassificationPassageSchema).min(1).max(250)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
      message: 'passage ids must not contain duplicates',
    })
    .refine((items) => items.reduce((total, item) => total + item.text.length, 0) <= 60_000, {
      message: 'passage text must contain at most 60000 characters',
    }),
});

export const outlineClassificationPreviewResultSchema = z.object({
  suggestions: z.array(z.object({
    id: z.string().min(1).max(160),
    assignment: z.enum(['title', 'premise', 'act', 'page_beat', 'notes', 'unassigned']),
    act_name: z.string().max(200).optional(),
    page_target: z.number().int().min(1).max(200).optional(),
    reason: z.string().max(240),
  }).strict()).max(250),
}).strict();

const writerOutlineTreatmentModeSchema = z.enum(['preserve', 'structure', 'expand']);
const treatmentChangeTypeAliases: Record<string, string> = {
  original: 'unchanged',
  preserved: 'unchanged',
  no_change: 'unchanged',
  retained: 'unchanged',
  same: 'unchanged',
  unmodified: 'unchanged',
  untouched: 'unchanged',
  polished: 'language_polished',
  copyedited: 'language_polished',
  edited: 'language_polished',
  revised: 'language_polished',
  rewritten: 'language_polished',
  reordered: 'moved',
  relocated: 'moved',
  repositioned: 'moved',
  shifted: 'moved',
  merged: 'combined',
  consolidated: 'combined',
  compressed: 'combined',
  condensed: 'combined',
  expanded: 'enhanced',
  elaborated: 'enhanced',
  enriched: 'enhanced',
  developed: 'enhanced',
  new: 'added',
  inserted: 'added',
  created: 'added',
  connective: 'added',
};
const treatmentChangeTypeSchema = z.preprocess(
  (value) => typeof value === 'string'
    ? treatmentChangeTypeAliases[value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')] ?? value
    : value,
  z.enum([
    'unchanged',
    'language_polished',
    'moved',
    'combined',
    'enhanced',
    'added',
  ]),
);
const treatmentSourceBeatSchema = z.object({
  id: z.string().min(1).max(160),
  ordinal: z.number().int().min(1).max(200),
  page_target: z.number().int().min(1).max(200).optional(),
  text: z.string().min(1).max(60_000),
}).strict();
const treatmentPageRangeSchema = z.object({
  min: z.number().int().min(1).max(200),
  max: z.number().int().min(1).max(200),
}).strict().refine((range) => range.min <= range.max, {
  message: 'allowed page range minimum must not exceed maximum',
});
const treatmentManifestEntrySchema = z.object({
  result_beat_id: z.string().min(1).max(160),
  source_beat_ids: z.array(z.string().min(1).max(160)).max(200),
  change_type: treatmentChangeTypeSchema,
  original_pages: z.array(z.number().int().min(1).max(200)).max(200),
  proposed_page: z.number().int().min(1).max(200).optional(),
  reason: z.string().min(1).max(1000),
}).strict();

export const outlineTreatmentPatchOperationSchema = z.object({
  operation_id: z.string().min(1).max(160),
  operation: z.enum(['edit', 'move', 'combine', 'add']),
  source_beat_ids: z.array(z.string().min(1).max(160)).max(200),
  anchor_source_beat_id: z.string().min(1).max(160).optional(),
  placement: z.enum(['before', 'after']).optional(),
  reason: z.string().max(1000).optional(),
  scene: z.string().optional(),
  summary: z.string().optional(),
  emotional_turn: z.string().optional(),
}).strict();

export const outlineTreatmentSectionReviewSchema = z.object({
  start_ordinal: z.number().int().min(1).max(200),
  end_ordinal: z.number().int().min(1).max(200),
  assessment: z.string().min(20).max(1200),
  recommendation: z.enum(['no_change', 'language', 'structure', 'expand']),
  operation_ids: z.array(z.string().min(1).max(160)).max(250),
}).strict();

export const outlineTreatmentPatchResultSchema = z.object({
  overall_assessment: z.string().min(40).max(2400),
  section_reviews: z.array(outlineTreatmentSectionReviewSchema).min(1).max(10),
  operations: z.array(outlineTreatmentPatchOperationSchema).max(250),
}).strict();

export const outlineTreatmentOperationNoticeSchema = z.object({
  operation_id: z.string().min(1).max(160),
  status: z.enum(['accepted', 'rejected', 'warning']),
  code: z.string().min(1).max(160),
  message: z.string().min(1).max(1000),
  source_beat_ids: z.array(z.string().min(1).max(160)).max(200),
  proposed: z.object({
    scene: z.string().optional(),
    summary: z.string().optional(),
    emotional_turn: z.string().optional(),
  }).strict().optional(),
}).strict();

export const writerToolsOutlineTreatmentPreviewRequestSchema = z.object({
  mode: z.literal('outline_treatment_preview'),
  issue_id: z.string().uuid(),
  treatment_mode: writerOutlineTreatmentModeSchema,
  source_page_count: z.number().int().min(1).max(200),
  allowed_page_range: treatmentPageRangeSchema,
  source_beats: z.array(treatmentSourceBeatSchema).min(1).max(200)
    .refine((beats) => new Set(beats.map((beat) => beat.id)).size === beats.length, {
      message: 'source beat ids must not contain duplicates',
    })
    .refine((beats) => beats.reduce((total, beat) => total + beat.text.length, 0) <= 60_000, {
      message: 'source beat text must contain at most 60000 characters',
    }),
  protected_terms: z.array(z.string().min(1).max(200)).max(250).optional(),
}).strict();

export const outlineTreatmentPreviewResultSchema = z.object({
  proposal: issueOutlineSchema,
  overall_assessment: z.string().min(40).max(2400),
  section_reviews: z.array(outlineTreatmentSectionReviewSchema).min(1).max(10),
  manifest: z.object({
    treatment_mode: writerOutlineTreatmentModeSchema,
    source_page_count: z.number().int().min(1).max(200),
    proposed_page_count: z.number().int().min(1).max(200),
    entries: z.array(treatmentManifestEntrySchema).max(250),
  }).strict(),
  operation_notices: z.array(outlineTreatmentOperationNoticeSchema).max(250).optional(),
}).strict();

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
    characters: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    art_style: z.string().optional(),
    panels: z.array(pageBeatPanelSchema).min(1).max(24),
  })
  .passthrough();

export const writerToolsPageBeatsRequestSchema = z.object({
  mode: z.literal('page_beats'),
  page_id: z.string().uuid(),
  /** Optional; only used for page_beats — layout, spreads, tone. */
  director_notes_for_beats: z.string().max(4000).optional(),
  production_defaults: writerProductionDefaultsPayloadSchema.optional(),
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
  production_defaults: writerProductionDefaultsPayloadSchema.optional(),
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
  production_defaults: writerProductionDefaultsPayloadSchema.optional(),
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
    emotional_arc: z
      .object({
        summary: z.string(),
        risks: z.array(z.string()).max(24).optional(),
        suggestions: z.array(z.string()).max(24).optional(),
      })
      .optional(),
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

export const writerToolsPacingRegenerationPreviewRequestSchema = z.object({
  mode: z.literal('pacing_regeneration_preview'),
  issue_id: z.string().uuid(),
  page_ids: writerToolsPageBeatsIssuePageIdsSchema,
  include_beats: z.boolean().optional(),
  include_dialogue: z.boolean().optional(),
  production_defaults: writerProductionDefaultsPayloadSchema.optional(),
});

export const pacingRegenerationPreviewResultSchema = z
  .object({
    pages: z
      .array(
        z.object({
          page_id: z.string().uuid(),
          page_number: z.number().int().positive().max(500),
          reason: z.string().max(2000).optional(),
          proposed_beats_json: pageBeatsJsonSchema.optional(),
          proposed_script_text: z.string().max(24_000).optional(),
        }),
      )
      .max(WRITER_PAGE_BEATS_ISSUE_MAX),
  })
  .passthrough();

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
    character_utilization: z
      .object({
        summary: z.string(),
        underused: z.array(z.string()).max(48).optional(),
        overused: z.array(z.string()).max(48).optional(),
        suggestions: z.array(z.string()).max(48).optional(),
      })
      .optional(),
    worldbuilding_density: z
      .object({
        summary: z.string(),
        dense_pages: z.array(z.number().int().positive().max(500)).max(200).optional(),
        thin_pages: z.array(z.number().int().positive().max(500)).max(200).optional(),
        suggestions: z.array(z.string()).max(48).optional(),
      })
      .optional(),
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
  production_defaults: writerProductionDefaultsPayloadSchema.optional(),
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
  writerToolsOutlineClassificationPreviewRequestSchema,
  writerToolsOutlineTreatmentPreviewRequestSchema,
  writerToolsPageBeatsRequestSchema,
  writerToolsPageBeatsIssueRequestSchema,
  writerToolsDraftDialogueRequestSchema,
  writerToolsPacingReviewRequestSchema,
  writerToolsPacingRegenerationPreviewRequestSchema,
  writerToolsCanonCheckRequestSchema,
  writerToolsPlanShotsRequestSchema,
  writerToolsIdeaAssistRequestSchema,
  writerToolsGuidedComicAssistRequestSchema,
]);
