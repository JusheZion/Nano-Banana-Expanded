/**
 * Shared JSON shapes for Writers' Room tools (client + edge function contract).
 */

export type IssueOutlineAct = {
  name?: string;
  goal?: string;
  summary?: string;
};

export type IssueOutlinePageBeat = {
  page_target?: number;
  scene?: string;
  summary: string;
  emotional_turn?: string;
};

/** Stored in writer_issue_outlines.outline_json */
export type IssueOutline = {
  title?: string;
  premise?: string;
  acts?: IssueOutlineAct[];
  page_beats?: IssueOutlinePageBeat[];
  notes?: string;
};

export type WriterToolsOutlineIssuePayload = {
  mode: 'outline_issue';
  issue_id: string;
  target_page_count?: number;
  outline_supplement?: string;
  production_defaults?: WriterProductionDefaultsPayload;
};

export type WriterProductionDefaultsPayload = {
  medium_type?: 'comic' | 'book' | 'screenplay' | 'video' | 'wiki';
  narrative_scope?: 'single_issue' | 'multi_issue_arc' | 'book' | 'episode' | 'shared_universe';
  comic_panel_density?: 'sparse' | 'standard' | 'dense';
  art_style?: string;
  character_consistency?: 'standard' | 'strict';
  strict_canon?: boolean;
  no_video_assumptions?: boolean;
};

/** Stored in writer_pages.beats_json */
export type PageBeatsJson = {
  page_number_ref?: number;
  one_line_hook?: string;
  panels: Array<{
    index?: number;
    action: string;
    composition?: string;
    emotion?: string;
    dialogue_placeholder?: string;
    sfx?: string;
  }>;
};

export type WriterToolsPageBeatsPayload = {
  mode: 'page_beats';
  page_id: string;
  director_notes_for_beats?: string;
  production_defaults?: WriterProductionDefaultsPayload;
};

export type WriterToolsPageBeatsIssuePayload = {
  mode: 'page_beats_issue';
  issue_id: string;
  skip_existing?: boolean;
  batch_limit?: number;
  batch_offset?: number;
  director_notes_for_beats?: string;
  /** Max 5; when set, only these pages run (in issue order); batch_limit / batch_offset ignored. */
  page_ids?: string[];
  production_defaults?: WriterProductionDefaultsPayload;
};

export type WriterToolsDraftDialoguePayload = {
  mode: 'draft_dialogue';
  page_id: string;
  /** Default: comic_script */
  style?: 'comic_script' | 'screenplay_light';
  production_defaults?: WriterProductionDefaultsPayload;
};

export type WriterToolsPacingReviewPayload = {
  mode: 'pacing_review';
  issue_id: string;
  /** Optional; matches Outline tab target. Batch pacing uses the same value for every issue. */
  target_page_count?: number;
};

export type WriterToolsCanonCheckPayload = {
  mode: 'canon_check';
  issue_id: string;
};

export type WriterToolsPlanShotsPayload = {
  mode: 'plan_shots_from_issue';
  issue_id: string;
  creative_brief?: string;
  production_defaults?: WriterProductionDefaultsPayload;
};

export type WriterToolsIdeaAssistPayload = {
  mode: 'idea_assist';
  issue_id: string;
  prompt: string;
  include_left?: boolean;
  include_middle?: boolean;
  include_right?: boolean;
  context_left?: string;
  context_middle?: string;
  context_right?: string;
  page_id?: string;
};

export type GuidedComicAssistAction =
  | 'improve_premise'
  | 'suggest_genre_tone'
  | 'generate_story_foundation'
  | 'suggest_conflict_stakes_ending'
  | 'suggest_character_dynamics'
  | 'generate_issue_outline'
  | 'generate_page_plan'
  | 'generate_missing_page_summaries'
  | 'regenerate_selected_page'
  | 'generate_panel_beats'
  | 'suggest_reference_needs'
  | 'strengthen_panel_prompt'
  | 'suggest_shot_direction'
  | 'suggest_layout_pacing'
  | 'recommend_layouts'
  | 'review_readiness'
  | 'find_export_gaps';

export type GuidedComicAssistPayload = {
  mode: 'guided_comic_assist';
  action: GuidedComicAssistAction;
  context: Record<string, unknown>;
  selectedPageNumber?: number;
  selectedPanelId?: string;
};

export type GuidedComicAssistResult = {
  title?: string;
  summary?: string;
  suggestions?: string[];
  replacements?: {
    setupForm?: Record<string, string>;
    storyForm?: Record<string, string>;
    artDirection?: Record<string, string | boolean>;
  };
  outlineBeats?: Array<{
    id?: string;
    title?: string;
    description: string;
  }>;
  pageUpdates?: Array<{
    pageNumber: number;
    summary?: string;
    panelCount?: string;
    keyCharacters?: string;
    keyLocation?: string;
    panelBeats?: string[];
    layoutTemplate?: 'auto' | 'three-panel' | 'three-panel-wide-top' | 'three-panel-wide-bottom' | 'four-panel' | 'six-panel-grid' | 'splash';
    layoutIntent?: 'feature' | 'wide' | 'tall' | 'normal';
  }>;
  pacingNotes?: string[];
  referenceNeeds?: Array<{
    type: 'character' | 'location' | 'npc' | 'prop' | 'style';
    name: string;
    reason?: string;
  }>;
  dialogueNotes?: string[];
  narrationNotes?: string[];
};

export type WriterToolsRequest =
  | WriterToolsOutlineIssuePayload
  | WriterToolsPageBeatsPayload
  | WriterToolsPageBeatsIssuePayload
  | WriterToolsDraftDialoguePayload
  | WriterToolsPacingReviewPayload
  | WriterToolsCanonCheckPayload
  | WriterToolsPlanShotsPayload
  | WriterToolsIdeaAssistPayload
  | GuidedComicAssistPayload;

export type WriterToolsSuccessResponse = {
  success: true;
  mode: string;
  data: unknown;
  outline_id?: string;
  version?: number;
  page_id?: string;
  issue_id?: string;
  shot_plan_id?: string;
};

export type WriterToolsErrorResponse = {
  success: false;
  error: string;
  details?: string;
};

export type WriterToolsResponse = WriterToolsSuccessResponse | WriterToolsErrorResponse;

/** DB row type: see `WriterIssueOutlineRow` in `arcsWriterRoom.ts`. */
