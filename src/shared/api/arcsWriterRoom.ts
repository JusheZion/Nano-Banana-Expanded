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
  created_at: string;
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

export async function listWriterSeries(): Promise<WriterSeriesRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('writer_series')
    .select('id, title, logline, genre, tone, target_demographic, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[arcsWriterRoom] listWriterSeries', error.message);
    return [];
  }
  return (data ?? []) as WriterSeriesRow[];
}

/** Insert first row when the workshop DB has no series yet. */
export async function createWriterSeries(input?: { title?: string }): Promise<WriterSeriesRow | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase
    .from('writer_series')
    .insert({ title: input?.title?.trim() || 'Untitled series', notes: {} })
    .select('id, title, logline, genre, tone, target_demographic, created_at')
    .single();
  if (error) {
    console.warn('[arcsWriterRoom] createWriterSeries', error.message);
    return null;
  }
  return data as WriterSeriesRow;
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
    .select('id, series_id, issue_number, title, status, synopsis, notes, created_at')
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
  patch: { title?: string | null; synopsis?: string | null },
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

export async function updateWriterSeries(
  seriesId: string,
  patch: { title?: string | null; logline?: string | null; genre?: string | null; tone?: string | null },
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

export async function listWriterIssues(seriesId: string): Promise<WriterIssueRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('writer_issues')
    .select('id, series_id, issue_number, title, status, synopsis, notes, created_at')
    .eq('series_id', seriesId)
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

const nowUtcIso = () => new Date().toISOString();

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

export async function listWriterOutlinesForIssue(issueId: string): Promise<WriterIssueOutlineRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('writer_issue_outlines')
    .select('id, issue_id, version, outline_json, created_at, created_by, source_mode')
    .eq('issue_id', issueId)
    .order('version', { ascending: false });
  if (error) {
    console.warn('[arcsWriterRoom] listWriterOutlinesForIssue', error.message);
    return [];
  }
  return (data ?? []) as WriterIssueOutlineRow[];
}
