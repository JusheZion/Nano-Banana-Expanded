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
};

export type WriterToolsPageBeatsIssuePayload = {
  mode: 'page_beats_issue';
  issue_id: string;
  skip_existing?: boolean;
  batch_limit?: number;
  batch_offset?: number;
  director_notes_for_beats?: string;
};

export type WriterToolsDraftDialoguePayload = {
  mode: 'draft_dialogue';
  page_id: string;
  /** Default: comic_script */
  style?: 'comic_script' | 'screenplay_light';
};

export type WriterToolsPacingReviewPayload = {
  mode: 'pacing_review';
  issue_id: string;
};

export type WriterToolsCanonCheckPayload = {
  mode: 'canon_check';
  issue_id: string;
};

export type WriterToolsPlanShotsPayload = {
  mode: 'plan_shots_from_issue';
  issue_id: string;
  creative_brief?: string;
};

export type WriterToolsRequest =
  | WriterToolsOutlineIssuePayload
  | WriterToolsPageBeatsPayload
  | WriterToolsPageBeatsIssuePayload
  | WriterToolsDraftDialoguePayload
  | WriterToolsPacingReviewPayload
  | WriterToolsCanonCheckPayload
  | WriterToolsPlanShotsPayload;

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
