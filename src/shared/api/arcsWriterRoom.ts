/**
 * Supabase reads for Writers' Room (writer_* tables).
 */
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';

export type WriterSeriesRow = {
  id: string;
  title: string;
  logline: string | null;
  genre: string | null;
  tone: string | null;
  target_demographic: string | null;
  notes: Record<string, unknown>;
  created_at: string;
  deleted_at: string | null;
};

export type WriterIssueRow = {
  id: string;
  series_id: string;
  issue_number: number;
  title: string | null;
  status: string;
  synopsis: string | null;
  /** Merged JSON; `writer_tool_cache` holds pacing_review / canon_check tool results from Edge. */
  notes: Record<string, unknown>;
  created_at: string;
  deleted_at: string | null;
};

export type WriterVideoShotPlanRow = {
  id: string;
  issue_id: string;
  version: number;
  shot_plan_json: Record<string, unknown>;
  created_at: string;
};

export type WriterPageRow = {
  id: string;
  issue_id: string;
  page_number: number;
  beats_json: Record<string, unknown> | null;
  script_text: string | null;
  created_at: string;
  updated_at: string;
};

export type WriterIssueOutlineRow = {
  id: string;
  issue_id: string;
  version: number;
  outline_json: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
  source_mode: string | null;
};

export type WriterOutlineSourceMode = 'paste_review' | 'outline_import' | 'ai_treatment' | 'pacing_revision';

/** Series lore / worldbuilding cards (injected into writer-tools prompts when include_in_prompt is true). */
export type WriterLoreCardRow = {
  id: string;
  series_id: string;
  title: string;
  category: string;
  body: string;
  include_in_prompt: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const nowUtcIso = () => new Date().toISOString();

export async function listWriterSeries(): Promise<WriterSeriesRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('writer_series')
    .select('id, title, logline, genre, tone, target_demographic, notes, created_at, deleted_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[arcsWriterRoom] listWriterSeries', error.message);
    return [];
  }
  return ((data ?? []) as Array<Omit<WriterSeriesRow, 'notes'> & { notes?: unknown }>).map((r) => ({
    ...r,
    notes:
      r.notes && typeof r.notes === 'object' && !Array.isArray(r.notes)
        ? (r.notes as Record<string, unknown>)
        : {},
  }));
}

/** Insert first row when the workshop DB has no series yet. */
export async function createWriterSeries(input?: { title?: string }): Promise<WriterSeriesRow | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase
    .from('writer_series')
    .insert({ title: input?.title?.trim() || 'Untitled series', notes: {} })
    .select('id, title, logline, genre, tone, target_demographic, notes, created_at, deleted_at')
    .single();
  if (error) {
    console.warn('[arcsWriterRoom] createWriterSeries', error.message);
    return null;
  }
  const r = data as Omit<WriterSeriesRow, 'notes'> & { notes?: unknown };
  return {
    ...r,
    notes:
      r.notes && typeof r.notes === 'object' && !Array.isArray(r.notes)
        ? (r.notes as Record<string, unknown>)
        : {},
  };
}

/** Insert issue for a series (e.g. first issue when list is empty). */
export async function createWriterIssue(input: {
  series_id: string;
  issue_number: number;
  title?: string | null;
}): Promise<WriterIssueRow | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase
    .from('writer_issues')
    .insert({
      series_id: input.series_id,
      issue_number: input.issue_number,
      title: input.title ?? null,
      notes: {},
    })
    .select('id, series_id, issue_number, title, status, synopsis, notes, created_at, deleted_at')
    .single();
  if (error) {
    console.warn('[arcsWriterRoom] createWriterIssue', error.message);
    return null;
  }
  const r = data as {
    id: string;
    series_id: string;
    issue_number: number;
    title: string | null;
    status: string;
    synopsis: string | null;
    notes: unknown;
    created_at: string;
  };
  return {
    ...r,
    notes:
      r.notes && typeof r.notes === 'object' && !Array.isArray(r.notes)
        ? (r.notes as Record<string, unknown>)
        : {},
  } as WriterIssueRow;
}

export async function updateWriterIssue(
  issueId: string,
  patch: {
    title?: string | null;
    synopsis?: string | null;
    /** Replaces issue notes JSON when set (merge client-side if needed). */
    notes?: Record<string, unknown>;
  },
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('writer_issues')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', issueId);
  if (error) {
    console.warn('[arcsWriterRoom] updateWriterIssue', error.message);
    return false;
  }
  return true;
}

/** Move a Writer issue to Recoverable Trash without deleting dependent work. */
export async function trashWriterIssue(issueId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('writer_issues')
    .update({ deleted_at: nowUtcIso(), updated_at: nowUtcIso() })
    .eq('id', issueId)
    .is('deleted_at', null);
  if (error) {
    console.warn('[arcsWriterRoom] trashWriterIssue', error.message);
    return false;
  }
  return true;
}

/** Restore a Writer issue from Recoverable Trash. */
export async function restoreWriterIssue(issueId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('writer_issues')
    .update({ deleted_at: null, updated_at: nowUtcIso() })
    .eq('id', issueId)
    .not('deleted_at', 'is', null);
  if (error) {
    console.warn('[arcsWriterRoom] restoreWriterIssue', error.message);
    return false;
  }
  return true;
}

/** Update the JSON payload of a saved outline row (manual edit in UI). */
export async function updateWriterIssueOutlineJson(
  outlineId: string,
  outlineJson: Record<string, unknown>,
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('writer_issue_outlines')
    .update({ outline_json: outlineJson })
    .eq('id', outlineId);
  if (error) {
    console.warn('[arcsWriterRoom] updateWriterIssueOutlineJson', error.message);
    return false;
  }
  return true;
}

export async function updateWriterPageBeatsJson(
  pageId: string,
  beatsJson: Record<string, unknown> | null,
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('writer_pages')
    .update({ beats_json: beatsJson, updated_at: nowUtcIso() })
    .eq('id', pageId);
  if (error) {
    console.warn('[arcsWriterRoom] updateWriterPageBeatsJson', error.message);
    return false;
  }
  return true;
}

export async function updateWriterPageScriptText(pageId: string, scriptText: string | null): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('writer_pages')
    .update({ script_text: scriptText, updated_at: nowUtcIso() })
    .eq('id', pageId);
  if (error) {
    console.warn('[arcsWriterRoom] updateWriterPageScriptText', error.message);
    return false;
  }
  return true;
}

export async function updateWriterSeries(
  seriesId: string,
  patch: {
    title?: string | null;
    logline?: string | null;
    genre?: string | null;
    tone?: string | null;
    notes?: Record<string, unknown>;
  },
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('writer_series')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', seriesId);
  if (error) {
    console.warn('[arcsWriterRoom] updateWriterSeries', error.message);
    return false;
  }
  return true;
}

/** Move a Writer series to Recoverable Trash without deleting dependent work. */
export async function trashWriterSeries(seriesId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('writer_series')
    .update({ deleted_at: nowUtcIso(), updated_at: nowUtcIso() })
    .eq('id', seriesId)
    .is('deleted_at', null);
  if (error) {
    console.warn('[arcsWriterRoom] trashWriterSeries', error.message);
    return false;
  }
  return true;
}

/** Restore a Writer series from Recoverable Trash. */
export async function restoreWriterSeries(seriesId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('writer_series')
    .update({ deleted_at: null, updated_at: nowUtcIso() })
    .eq('id', seriesId)
    .not('deleted_at', 'is', null);
  if (error) {
    console.warn('[arcsWriterRoom] restoreWriterSeries', error.message);
    return false;
  }
  return true;
}

export async function listWriterIssues(seriesId: string): Promise<WriterIssueRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('writer_issues')
    .select('id, series_id, issue_number, title, status, synopsis, notes, created_at, deleted_at')
    .eq('series_id', seriesId)
    .is('deleted_at', null)
    .order('issue_number', { ascending: true });
  if (error) {
    console.warn('[arcsWriterRoom] listWriterIssues', error.message);
    return [];
  }
  const rows = data ?? [];
  return rows.map((r) => ({
    ...r,
    notes: (r.notes && typeof r.notes === 'object' && !Array.isArray(r.notes)
      ? (r.notes as Record<string, unknown>)
      : {}) as Record<string, unknown>,
  })) as WriterIssueRow[];
}

/** List series that the signed-in owner has moved to Recoverable Trash. */
export async function listTrashedWriterSeries(): Promise<WriterSeriesRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('writer_series')
    .select('id, title, logline, genre, tone, target_demographic, notes, created_at, deleted_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) {
    console.warn('[arcsWriterRoom] listTrashedWriterSeries', error.message);
    return [];
  }
  return ((data ?? []) as Array<Omit<WriterSeriesRow, 'notes'> & { notes?: unknown }>).map((r) => ({
    ...r,
    notes:
      r.notes && typeof r.notes === 'object' && !Array.isArray(r.notes)
        ? (r.notes as Record<string, unknown>)
        : {},
  }));
}

/** List individually trashed issues. Issues inside a trashed series remain attached to that series. */
export async function listTrashedWriterIssues(): Promise<WriterIssueRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('writer_issues')
    .select('id, series_id, issue_number, title, status, synopsis, notes, created_at, deleted_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) {
    console.warn('[arcsWriterRoom] listTrashedWriterIssues', error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    ...r,
    notes: r.notes && typeof r.notes === 'object' && !Array.isArray(r.notes)
      ? (r.notes as Record<string, unknown>)
      : {},
  })) as WriterIssueRow[];
}

/** Return the next never-used issue number, including rows currently in Trash. */
export async function getNextWriterIssueNumber(seriesId: string): Promise<number> {
  if (!isSupabaseConfigured() || !supabase) return 1;
  const { data, error } = await supabase
    .from('writer_issues')
    .select('issue_number')
    .eq('series_id', seriesId)
    .order('issue_number', { ascending: false })
    .limit(1);
  if (error) {
    console.warn('[arcsWriterRoom] getNextWriterIssueNumber', error.message);
    return 1;
  }
  const issueNumber = Number(data?.[0]?.issue_number);
  return Number.isFinite(issueNumber) && issueNumber > 0 ? issueNumber + 1 : 1;
}

export async function listWriterPages(issueId: string): Promise<WriterPageRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('writer_pages')
    .select('id, issue_id, page_number, beats_json, script_text, created_at, updated_at')
    .eq('issue_id', issueId)
    .order('page_number', { ascending: true });
  if (error) {
    console.warn('[arcsWriterRoom] listWriterPages', error.message);
    return [];
  }
  return (data ?? []) as WriterPageRow[];
}

/** Insert a page row for an issue (next page_number must be unique for that issue). */
export async function createWriterPage(input: {
  issue_id: string;
  page_number: number;
}): Promise<WriterPageRow | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase
    .from('writer_pages')
    .insert({
      issue_id: input.issue_id,
      page_number: input.page_number,
    })
    .select('id, issue_id, page_number, beats_json, script_text, created_at, updated_at')
    .single();
  if (error) {
    console.warn('[arcsWriterRoom] createWriterPage', error.message);
    return null;
  }
  return data as WriterPageRow;
}

/**
 * Ensure page rows exist for page numbers 1..targetCount (inclusive). Creates only missing numbers.
 * Caps at 500 to match writer_pages expectations.
 */
export async function ensureWriterPagesToCount(
  issueId: string,
  targetCount: number,
): Promise<{ ok: boolean; created: number }> {
  const n = Math.min(500, Math.max(0, Math.floor(targetCount)));
  if (n < 1) return { ok: true, created: 0 };
  const existing = await listWriterPages(issueId);
  const have = new Set(existing.map((p) => p.page_number));
  let created = 0;
  for (let pageNum = 1; pageNum <= n; pageNum++) {
    if (have.has(pageNum)) continue;
    const row = await createWriterPage({ issue_id: issueId, page_number: pageNum });
    if (!row) return { ok: false, created };
    have.add(pageNum);
    created++;
  }
  return { ok: true, created };
}

/** Delete page rows by id. Returns false if Supabase is off or the delete fails. */
export async function deleteWriterPages(pageIds: string[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || pageIds.length === 0) return false;
  const { error } = await supabase.from('writer_pages').delete().in('id', pageIds);
  if (error) {
    console.warn('[arcsWriterRoom] deleteWriterPages', error.message);
    return false;
  }
  return true;
}

/** Set beats_json to null for the given page ids. */
export async function clearWriterPagesBeatsJson(pageIds: string[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || pageIds.length === 0) return false;
  const { error } = await supabase
    .from('writer_pages')
    .update({ beats_json: null, updated_at: nowUtcIso() })
    .in('id', pageIds);
  if (error) {
    console.warn('[arcsWriterRoom] clearWriterPagesBeatsJson', error.message);
    return false;
  }
  return true;
}

/** Set script_text to null for the given page ids. */
export async function clearWriterPagesScriptText(pageIds: string[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || pageIds.length === 0) return false;
  const { error } = await supabase
    .from('writer_pages')
    .update({ script_text: null, updated_at: nowUtcIso() })
    .in('id', pageIds);
  if (error) {
    console.warn('[arcsWriterRoom] clearWriterPagesScriptText', error.message);
    return false;
  }
  return true;
}

export async function listWriterShotPlansForIssue(issueId: string): Promise<WriterVideoShotPlanRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('writer_video_shot_plans')
    .select('id, issue_id, version, shot_plan_json, created_at')
    .eq('issue_id', issueId)
    .order('version', { ascending: false });
  if (error) {
    console.warn('[arcsWriterRoom] listWriterShotPlansForIssue', error.message);
    return [];
  }
  return (data ?? []) as WriterVideoShotPlanRow[];
}

export async function updateWriterVideoShotPlanJson(
  shotPlanId: string,
  shotPlanJson: Record<string, unknown>,
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('writer_video_shot_plans')
    .update({ shot_plan_json: shotPlanJson })
    .eq('id', shotPlanId);
  if (error) {
    console.warn('[arcsWriterRoom] updateWriterVideoShotPlanJson', error.message);
    return false;
  }
  return true;
}

export async function listWriterOutlinesForIssueResult(
  issueId: string,
): Promise<{ ok: true; rows: WriterIssueOutlineRow[] } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !supabase) return { ok: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await supabase
      .from('writer_issue_outlines')
      .select('id, issue_id, version, outline_json, created_at, created_by, source_mode')
      .eq('issue_id', issueId)
      .order('version', { ascending: false });
    if (error) {
      console.warn('[arcsWriterRoom] listWriterOutlinesForIssue', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, rows: (data ?? []) as WriterIssueOutlineRow[] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected outline list error';
    console.warn('[arcsWriterRoom] listWriterOutlinesForIssue', message);
    return { ok: false, error: message };
  }
}

export async function listWriterOutlinesForIssue(issueId: string): Promise<WriterIssueOutlineRow[]> {
  const result = await listWriterOutlinesForIssueResult(issueId);
  return result.ok ? result.rows : [];
}

/** Inserts a new immutable outline version after reading the current latest version. */
export async function createWriterOutlineVersion(input: {
  issueId: string;
  outlineJson: Record<string, unknown>;
  sourceMode: WriterOutlineSourceMode;
  expectedPreviousId: string | null;
}): Promise<
  | { ok: true; row: WriterIssueOutlineRow; predecessor: WriterIssueOutlineRow | null }
  | {
      ok: false;
      error: string;
      conflict?: boolean;
      predecessor?: WriterIssueOutlineRow | null;
    }
> {
  if (!isSupabaseConfigured() || !supabase) return { ok: false, error: 'Supabase not configured' };
  try {
    const { data: latestData, error: latestError } = await supabase
      .from('writer_issue_outlines')
      .select('id, issue_id, version, outline_json, created_at, created_by, source_mode')
      .eq('issue_id', input.issueId)
      .order('version', { ascending: false })
      .limit(1);
    if (latestError) {
      console.warn('[arcsWriterRoom] createWriterOutlineVersion (latest)', latestError.message);
      return { ok: false, error: latestError.message };
    }
    const latestRows = (latestData ?? []) as WriterIssueOutlineRow[];
    const predecessor = latestRows[0] ?? null;
    if ((predecessor?.id ?? null) !== input.expectedPreviousId) {
      return {
        ok: false,
        conflict: true,
        predecessor,
        error: 'Official outline changed before the reviewed paste could be saved. Reload versions and review again.',
      };
    }
    const nextVersion = (predecessor?.version ?? 0) + 1;
    const { data, error } = await supabase
      .from('writer_issue_outlines')
      .insert({
        issue_id: input.issueId,
        version: nextVersion,
        outline_json: input.outlineJson,
        source_mode: input.sourceMode,
      })
      .select('id, issue_id, version, outline_json, created_at, created_by, source_mode')
      .single();
    if (error || !data) {
      const message = error?.message ?? 'Outline version was not returned after insert';
      console.warn('[arcsWriterRoom] createWriterOutlineVersion', message);
      return { ok: false, error: message };
    }
    return { ok: true, row: data as WriterIssueOutlineRow, predecessor };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected outline version error';
    console.warn('[arcsWriterRoom] createWriterOutlineVersion', message);
    return { ok: false, error: message };
  }
}

/** Deletes one exact outline row, guarded by both owning issue and immutable row id. */
export async function deleteWriterOutlineById(input: {
  issueId: string;
  outlineId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured() || !supabase) return { ok: false, error: 'Supabase not configured' };
  try {
    const { data, error } = await supabase
      .from('writer_issue_outlines')
      .delete()
      .eq('issue_id', input.issueId)
      .eq('id', input.outlineId)
      .select('id');
    if (error) {
      console.warn('[arcsWriterRoom] deleteWriterOutlineById', error.message);
      return { ok: false, error: error.message };
    }
    const deletedRows = (data ?? []) as Array<{ id: string }>;
    if (deletedRows.length !== 1 || deletedRows[0]?.id !== input.outlineId) {
      const message = 'Exact outline row was not returned after deletion';
      console.warn('[arcsWriterRoom] deleteWriterOutlineById', message);
      return { ok: false, error: message };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected outline deletion error';
    console.warn('[arcsWriterRoom] deleteWriterOutlineById', message);
    return { ok: false, error: message };
  }
}

/** Removes the highest-version outline row for this issue (others unchanged). */
export async function deleteLatestWriterOutline(issueId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) return { ok: false, error: 'Supabase not configured' };
  // List in-function so DB errors surface; listWriterOutlinesForIssue returns [] on failure.
  const { data, error: listError } = await supabase
    .from('writer_issue_outlines')
    .select('id')
    .eq('issue_id', issueId)
    .order('version', { ascending: false });
  if (listError) {
    console.warn('[arcsWriterRoom] deleteLatestWriterOutline (list)', listError.message);
    return { ok: false, error: listError.message };
  }
  const rows = (data ?? []) as { id: string }[];
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase.from('writer_issue_outlines').delete().eq('id', rows[0]!.id);
  if (error) {
    console.warn('[arcsWriterRoom] deleteLatestWriterOutline', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Copies an older outline into a new latest version, preserving the full history. */
export async function restoreWriterOutlineAsLatest(input: {
  issueId: string;
  outlineJson: Record<string, unknown>;
  restoredFromVersion: number;
  nextVersion: number;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) return { ok: false, error: 'Supabase not configured' };
  const { error } = await supabase.from('writer_issue_outlines').insert({
    issue_id: input.issueId,
    version: input.nextVersion,
    outline_json: input.outlineJson,
    created_by: 'user_restore',
    source_mode: `rollback:v${input.restoredFromVersion}`,
  });
  if (error) {
    console.warn('[arcsWriterRoom] restoreWriterOutlineAsLatest', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function clearWriterPageBeats(pageId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) return { ok: false, error: 'Supabase not configured' };
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('writer_pages')
    .update({ beats_json: null, updated_at: now })
    .eq('id', pageId);
  if (error) {
    console.warn('[arcsWriterRoom] clearWriterPageBeats', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function clearWriterPageScript(pageId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) return { ok: false, error: 'Supabase not configured' };
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('writer_pages')
    .update({ script_text: null, updated_at: now })
    .eq('id', pageId);
  if (error) {
    console.warn('[arcsWriterRoom] clearWriterPageScript', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function listWriterLoreCards(seriesId: string): Promise<WriterLoreCardRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('writer_lore_cards')
    .select(
      'id, series_id, title, category, body, include_in_prompt, sort_order, created_at, updated_at',
    )
    .eq('series_id', seriesId)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });
  if (error) {
    console.warn('[arcsWriterRoom] listWriterLoreCards', error.message);
    return [];
  }
  return (data ?? []) as WriterLoreCardRow[];
}

export async function createWriterLoreCard(input: {
  series_id: string;
  title: string;
  category?: string;
  body?: string;
  include_in_prompt?: boolean;
  sort_order?: number;
}): Promise<WriterLoreCardRow | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase
    .from('writer_lore_cards')
    .insert({
      series_id: input.series_id,
      title: input.title.trim() || 'Untitled',
      category: (input.category ?? 'world').trim() || 'world',
      body: input.body ?? '',
      include_in_prompt: input.include_in_prompt ?? true,
      sort_order: input.sort_order ?? 0,
    })
    .select(
      'id, series_id, title, category, body, include_in_prompt, sort_order, created_at, updated_at',
    )
    .single();
  if (error) {
    console.warn('[arcsWriterRoom] createWriterLoreCard', error.message);
    return null;
  }
  return data as WriterLoreCardRow;
}

export async function updateWriterLoreCard(
  id: string,
  patch: {
    title?: string;
    category?: string;
    body?: string;
    include_in_prompt?: boolean;
    sort_order?: number;
  },
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('writer_lore_cards')
    .update({ ...patch, updated_at: nowUtcIso() })
    .eq('id', id);
  if (error) {
    console.warn('[arcsWriterRoom] updateWriterLoreCard', error.message);
    return false;
  }
  return true;
}

export async function deleteWriterLoreCard(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase.from('writer_lore_cards').delete().eq('id', id);
  if (error) {
    console.warn('[arcsWriterRoom] deleteWriterLoreCard', error.message);
    return false;
  }
  return true;
}
